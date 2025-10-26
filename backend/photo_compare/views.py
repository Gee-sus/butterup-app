from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from haversine import haversine
from rapidfuzz import fuzz, process
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView

from photo_compare.models import Price, Product, Store
from photo_compare.serializers import (
    CandidateSerializer,
    CompareResponseSerializer,
    PriceRowSerializer,
    SuggestionSerializer,
    PhotoInputSerializer,
)
from photo_compare.utils.ocr import resize_image_bytes, guess_product

ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_UPLOAD_SIZE = 3 * 1024 * 1024  # 3 MB
SCORE_THRESHOLD = 70.0


def json_error(message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({'error': message}, status=status_code)


def build_price_rows(product: Product, lat: float, lng: float) -> tuple[List[Dict[str, Any]], Optional[float], Optional[float]]:
    prices = list(
        Price.objects.select_related('store')
        .filter(product=product)
    )

    if not prices:
        return [], None, None

    entries: List[tuple[float, Price]] = []
    for price in prices:
        store: Store = price.store
        distance = haversine((lat, lng), (store.lat, store.lng))
        entries.append((distance, price))

    entries.sort(key=lambda item: (float(item[1].price), item[0]))
    cheapest_price = float(entries[0][1].price)
    max_savings = 0.0

    rows: List[Dict[str, Any]] = []
    for distance, price in entries:
        store = price.store
        price_value = float(price.price)
        savings = max(0.0, round(price_value - cheapest_price, 2))
        max_savings = max(max_savings, savings)
        rows.append({
            'store_id': store.id,
            'store_name': store.name,
            'chain': store.chain,
            'distance_km': round(distance, 2),
            'price': price_value,
            'currency': price.currency,
            'is_cheapest': price_value == cheapest_price,
            'savings_vs_cheapest': savings,
            'updated_at': price.updated_at,
        })
    return rows, cheapest_price, (max_savings if max_savings > 0 else None)


class IdentifyByPhoto(GenericAPIView):
    parser_classes = [MultiPartParser]
    throttle_classes = [AnonRateThrottle]
    permission_classes = [AllowAny]
    serializer_class = PhotoInputSerializer

    def post(self, request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo = serializer.validated_data['photo']

        if photo.size and photo.size > MAX_UPLOAD_SIZE:
            return json_error('Image exceeds maximum size of 3MB.')

        content_type = getattr(photo, 'content_type', None)
        if content_type not in ALLOWED_CONTENT_TYPES:
            return json_error('Unsupported image type.')

        data = photo.read()
        if not data:
            return json_error('Empty image.')

        try:
            resized = resize_image_bytes(data)
            guess = guess_product(resized)
        except Exception:
            return json_error('Failed to process image.', status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload: Dict[str, Any] = {
            'score': float(guess.get('score') or 0.0),
            'product_id': guess.get('product_id'),
            'product_name': guess.get('product_name'),
            'lines': guess.get('lines', []),
        }

        suggestions = guess.get('suggestions') or []
        if suggestions:
            payload['suggestions'] = [
                {'product_id': item['product_id'], 'name': item['name']}
                for item in suggestions
            ]

        serializer = CandidateSerializer(payload)

        if payload['product_id'] is None or payload['score'] < SCORE_THRESHOLD:
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.data, status=status.HTTP_200_OK)


class ComparePrices(APIView):
    throttle_classes = [AnonRateThrottle]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs) -> Response:
        try:
            product_id = int(request.query_params.get('product_id', ''))
        except (TypeError, ValueError):
            return json_error('product_id must be an integer.')

        try:
            lat = float(request.query_params.get('lat', ''))
            lng = float(request.query_params.get('lng', ''))
        except (TypeError, ValueError):
            return json_error('lat and lng must be valid floats.')

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return json_error('Product not found.', status.HTTP_404_NOT_FOUND)

        rows, cheapest_price, max_savings = build_price_rows(product, lat, lng)

        serializer = CompareResponseSerializer({
            'product': {
                'id': product.id,
                'name': str(product),
            },
            'prices': PriceRowSerializer(rows, many=True).data,
            'summary': {
                'cheapest': cheapest_price,
                'max_savings': max_savings,
            },
        })
        return Response(serializer.data)


class SuggestProducts(APIView):
    throttle_classes = [AnonRateThrottle]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs) -> Response:
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response([], status=status.HTTP_200_OK)

        choices: List[tuple[str, int]] = []
        lookup: Dict[int, str] = {}

        for product in Product.objects.all():
            lookup[product.id] = str(product)
            for alias in product.aliases():
                alias_clean = alias.strip()
                if alias_clean:
                    choices.append((alias_clean.lower(), product.id))

        if not choices:
            return Response([], status=status.HTTP_200_OK)

        matches = process.extract(
            query.lower(),
            choices,
            scorer=fuzz.partial_ratio,
            limit=20,
        )

        seen: set[int] = set()
        suggestions: List[Dict[str, Any]] = []
        for _, score, product_id in matches:
            if product_id in seen:
                continue
            seen.add(product_id)
            suggestions.append({
                'product_id': product_id,
                'name': lookup.get(product_id, ''),
                'score': float(score),
            })
            if len(suggestions) >= 5:
                break

        serializer = SuggestionSerializer(
            [{'product_id': item['product_id'], 'name': item['name']} for item in suggestions],
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
