from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Min, Max, Count, Q
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
import requests
from jose import jwt
from jose.exceptions import JWTError
import logging
from typing import List, Dict, Optional
import os
import hashlib
from collections import OrderedDict
from decimal import Decimal, InvalidOperation

from .models import (
    Store, Product, Price, EconomicIndicator, PriceAlert, EmailSubscription,
    ScrapingLog, ImageAsset, NutritionProfile, ListItem, PriceContribution,
    ProductScoreSnapshot, ProductUserRating
)
from .serializers import (
    StoreSerializer, ProductSerializer, PriceSerializer, EconomicIndicatorSerializer,
    PriceAlertSerializer, EmailSubscriptionSerializer, ScrapingLogSerializer,
    PriceTrendSerializer, StoreComparisonSerializer, EconomicCorrelationSerializer,
    DetailedImageAssetSerializer, ImageFetchResponseSerializer,
    NutritionProfileSerializer, MinimalProductSerializer, StoreFlatPriceSerializer,
    ProductListSerializer, ListItemSerializer, ListItemCreateSerializer,
    PriceContributionSerializer, PriceContributionCreateSerializer, UserProfileSerializer,
    QuickCompareBrandSerializer, QuickCompareStoreSnapshotSerializer,
    ProductDetailSerializer, ProductUserRatingSerializer,
    ProductRatingSubmissionSerializer, pick_image_url
)
from .services.image_cache import ImageCacheService
from .services.off_client import OFFClient
from .services.gs1_client import GS1Client
from .tasks import fetch_product_image
from .utils.gtin import normalize_gtin

logger = logging.getLogger(__name__)
off_client = OFFClient()


def _parse_fields_param(raw: Optional[str]) -> Optional[List[str]]:
    if not raw:
        return None
    fields = [part.strip() for part in raw.split(",") if part.strip()]
    return fields or None


OFF_MAX_PAGE_SIZE = 50
OFF_MAX_BATCH_SIZE = 50


def _gravatar_url(email: str) -> str:
    """Return a gravatar/identicon URL for an email (works for empty emails too)."""
    safe_email = (email or "").strip().lower()
    digest = hashlib.md5(safe_email.encode("utf-8")).hexdigest()
    # d=identicon gives a nice fallback if no gravatar exists
    return f"https://www.gravatar.com/avatar/{digest}?d=identicon"
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        name = (request.data.get('name') or '').strip()
        if not email or not password:
            return Response({'detail': 'Email and password are required'}, status=400)
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Email already registered'}, status=400)
        user = User.objects.create(
            username=email,
            email=email,
            first_name=name.split(' ')[0] if name else '',
            last_name=' '.join(name.split(' ')[1:]) if name and len(name.split(' '))>1 else '',
            password=make_password(password),
        )
        refresh = RefreshToken.for_user(user)
        avatar_url = _gravatar_url(user.email)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.get_full_name() or user.username or user.email,
                'avatar_url': avatar_url,
                'provider': 'email',
            },
        })


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get('id_token')
        # Optional client-provided aud (not trusted). We'll validate against env.
        _client_aud = request.data.get('aud')
        if not id_token:
            return Response({'detail': 'id_token required'}, status=400)
        # Verify with Google tokeninfo (simpler) or JWKs (more robust)
        try:
            resp = requests.get('https://oauth2.googleapis.com/tokeninfo', params={'id_token': id_token}, timeout=5)
            if resp.status_code != 200:
                return Response({'detail': 'Invalid Google token'}, status=400)
            data = resp.json()
            # Server-side audience check using env (supports comma-separated list)
            allowed = os.getenv('GOOGLE_CLIENT_IDS') or os.getenv('GOOGLE_CLIENT_ID', '')
            allowed_list = [a.strip() for a in allowed.split(',') if a.strip()]
            if allowed_list and data.get('aud') not in allowed_list:
                logger.warning("Google audience mismatch: %s not in %s", data.get('aud'), allowed_list)
                return Response({'detail': 'Audience mismatch'}, status=400)
            email = (data.get('email') or '').lower()
            sub = data.get('sub')
            picture = data.get('picture')
            given_name = data.get('given_name') or ''
            family_name = data.get('family_name') or ''
            if not email and not sub:
                return Response({'detail': 'Token missing subject/email'}, status=400)
            User = get_user_model()
            user = User.objects.filter(email=email).first() if email else None
            if not user:
                username = email or f'google_{sub}'
                user = User.objects.create(username=username, email=email)
            # Update names if available (best-effort)
            if (given_name or family_name) and (not user.first_name and not user.last_name):
                try:
                    user.first_name = given_name
                    user.last_name = family_name
                    user.save(update_fields=['first_name', 'last_name'])
                except Exception:
                    pass
            refresh = RefreshToken.for_user(user)
            avatar_url = picture or _gravatar_url(user.email)
            name = (user.get_full_name() or data.get('name') or user.username or user.email)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': name,
                    'avatar_url': avatar_url,
                    'provider': 'google',
                }
            })
        except Exception as e:
            logger.exception('Google verification failed')
            return Response({'detail': 'Google verification failed'}, status=400)


class AppleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get('id_token')
        aud = request.data.get('aud')  # client-provided; prefer env APPLE_AUDIENCE
        env_aud = os.getenv('APPLE_AUDIENCE')
        if not id_token:
            return Response({'detail': 'id_token required'}, status=400)
        try:
            # Fetch Apple JWKs
            jwks = requests.get('https://appleid.apple.com/auth/keys', timeout=5).json()
            header = jwt.get_unverified_header(id_token)
            key = next((k for k in jwks['keys'] if k['kid'] == header.get('kid')), None)
            if not key:
                return Response({'detail': 'Apple key not found'}, status=400)
            audience = env_aud or aud
            payload = jwt.decode(
                id_token,
                key,
                algorithms=[header.get('alg')],
                audience=audience,
                issuer='https://appleid.apple.com'
            )
            sub = payload.get('sub')
            email = (payload.get('email') or '').lower()
            User = get_user_model()
            user = None
            if email:
                user = User.objects.filter(email=email).first()
            if not user:
                username = email or f'apple_{sub}'
                user = User.objects.create(username=username, email=email)
            refresh = RefreshToken.for_user(user)
            avatar_url = _gravatar_url(user.email)
            name = user.get_full_name() or user.username or user.email or 'Apple User'
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': name,
                    'avatar_url': avatar_url,
                    'provider': 'apple',
                }
            })
        except JWTError:
            return Response({'detail': 'Invalid Apple token'}, status=400)
        except Exception:
            logger.exception('Apple verification failed')
            return Response({'detail': 'Apple verification failed'}, status=400)


def _product_detail_queryset():
    return (
        Product.objects.filter(is_active=True)
        .select_related('score_snapshot', 'nutrition_profile')
        .prefetch_related(
            'healthy_alternatives__score_snapshot',
            'healthy_alternatives__nutrition_profile',
            'prices__store',
            'user_ratings__user'
        )
    )

# -----------------------------
# NEW: ensure serializers see the request (for absolute URLs)
# -----------------------------
class RequestContextMixin:
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # DRF uses request to build absolute URIs for File/Image fields
        ctx['request'] = getattr(self, 'request', None)
        return ctx


class StoreViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    """API endpoint for stores"""
    queryset = Store.objects.filter(is_active=True)
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['chain', 'region']
    search_fields = ['name', 'location']
    ordering_fields = ['name', 'chain', 'created_at']

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """Find stores near user's location - GPS Store Detection for ButterUp MVP"""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = float(request.query_params.get('radius', 10))  # Default 10km radius
        chains_filter = request.query_params.get('chains', '')  # Optional chain filter

        if not lat or not lng:
            return Response(
                {'error': 'Latitude and longitude parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lat = float(lat); lng = float(lng)
        except ValueError:
            return Response(
                {'error': 'Invalid latitude or longitude values'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Log GPS store detection request
        logger.info(f"🏪 GPS Store Detection: lat={lat}, lng={lng}, radius={radius}km")

        # Simple Haversine distance calculation
        from math import radians, cos, sin, asin, sqrt
        def haversine_distance(lat1, lng1, lat2, lng2):
            R = 6371  # Earth's radius in kilometers
            lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
            dlat = lat2 - lat1; dlng = lng2 - lng1
            a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlng/2)**2
            return 2 * R * asin(sqrt(a))

        # Get base queryset
        queryset = self.get_queryset()
        
        # Filter by main chains if specified (for MVP: paknsave, countdown, new_world)
        if chains_filter:
            chain_list = [c.strip() for c in chains_filter.split(',')]
            queryset = queryset.filter(chain__in=chain_list)
            logger.info(f"🔍 Filtering by chains: {chain_list}")

        nearby_stores = []
        total_stores_checked = 0
        
        for store in queryset:
            total_stores_checked += 1
            if store.latitude and store.longitude:
                distance = haversine_distance(lat, lng, float(store.latitude), float(store.longitude))
                if distance <= radius:
                    store_data = self.get_serializer(store).data
                    store_data['distance'] = round(distance, 2)
                    nearby_stores.append(store_data)

        # Sort by distance (closest first)
        nearby_stores.sort(key=lambda x: x['distance'])
        
        # Log results for MVP tracking
        logger.info(f"🎯 GPS Detection Results: Found {len(nearby_stores)} stores within {radius}km (checked {total_stores_checked} total stores)")
        
        # Group by chain for easy mobile app consumption
        chains_summary = {}
        for store in nearby_stores:
            chain = store['chain']
            if chain not in chains_summary:
                chains_summary[chain] = {'count': 0, 'closest_distance': None}
            chains_summary[chain]['count'] += 1
            if chains_summary[chain]['closest_distance'] is None or store['distance'] < chains_summary[chain]['closest_distance']:
                chains_summary[chain]['closest_distance'] = store['distance']

        return Response({
            'stores': nearby_stores,
            'user_location': {'lat': lat, 'lng': lng},
            'radius_km': radius,
            'total_found': len(nearby_stores),
            'chains_summary': chains_summary,
            'mvp_chains': ['paknsave', 'countdown', 'new_world']  # MVP focus chains
        })

    @action(detail=False, methods=['get'])
    def list_filtered(self, request):
        city = request.query_params.get('city')
        chain = request.query_params.get('chain')
        qs = self.get_queryset()
        if city:
            qs = qs.filter(city__iexact=city)
        if chain:
            qs = qs.filter(chain=chain)
        qs = qs.order_by('chain', 'name')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def chains(self, request):
        chains = Store.objects.filter(is_active=True).values_list('chain', flat=True).distinct()
        return Response({'chains': list(chains)})

    @action(detail=False, methods=['get'], url_path='by-chain/(?P<chain>[^/.]+)')
    def by_chain(self, request, chain=None):
        """Get all stores for a specific chain"""
        stores = Store.objects.filter(is_active=True, chain=chain).order_by('city', 'name')
        serializer = self.get_serializer(stores, many=True)
        return Response({
            'chain': chain,
            'stores': serializer.data,
            'total_count': stores.count()
        })


class ProductViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    """API endpoint for products"""
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand', 'package_type']
    search_fields = ['name', 'brand']
    ordering_fields = ['name', 'brand', 'weight_grams']

    @action(detail=False, methods=['get'], url_path='by-store/(?P<store_id>[^/.]+)')
    def by_store(self, request, store_id=None):
        """Get products available at a specific store with latest prices."""
        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get products that have prices at this store
        products_with_prices = Product.objects.filter(
            is_active=True,
            prices__store=store
        ).distinct().select_related().prefetch_related('prices')

        # If no products found for this specific store, fall back to chain
        if not products_with_prices.exists():
            products_with_prices = Product.objects.filter(
                is_active=True,
                prices__store__chain=store.chain
            ).distinct().select_related().prefetch_related('prices')

        serializer = self.get_serializer(products_with_prices, many=True)
        
        return Response({
            'store': {
                'id': store.id,
                'name': store.name,
                'chain': store.chain,
                'city': store.city
            },
            'products': serializer.data,
            'total_count': products_with_prices.count()
        })

    @action(detail=True, methods=['get'])
    def image(self, request, pk=None):
        """
        Get the primary image for a product.

        CHANGED: use DetailedImageAssetSerializer (absolute URL) and pass request context.
        """
        product = self.get_object()
        primary_image = product.primary_image
        if not primary_image:
            return Response({"detail": "No image found for this product"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DetailedImageAssetSerializer(primary_image, context={'request': request})  # CHANGED
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def fetch_image(self, request, pk=None):
        """Fetch image for a product by GTIN (sync or async)."""
        product = self.get_object()
        if not product.gtin:
            return Response({"detail": "Product has no GTIN"}, status=status.HTTP_400_BAD_REQUEST)

        async_mode = request.data.get('async', False)
        refresh = request.query_params.get('refresh', 'false').lower() == 'true'

        if async_mode:
            task = fetch_product_image.delay(product.gtin, prefer_refresh=refresh)
            return Response({"success": True, "message": "Image fetch started", "task_id": task.id})

        try:
            service = ImageCacheService()
            asset = service.fetch_product_image(product.gtin, prefer_refresh=refresh)
            if asset:
                ser = DetailedImageAssetSerializer(asset, context={'request': request})  # CHANGED
                return Response({"success": True, "message": "Image fetched successfully", "asset": ser.data})
            return Response({"detail": "No image found for GTIN"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching image for product {product.id}: {e}")
            return Response({"detail": "Error fetching image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProductListView(ListAPIView):
    """List view for products with store-specific pricing and absolute image URLs"""
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).prefetch_related('image_assets', 'prices')

        # optional text search
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(brand__icontains=q))

        # optional package filter
        package = self.request.query_params.get("package")
        if package:
            qs = qs.filter(package_type__iexact=package)

        # IMPORTANT: only include products that have a price for this store if provided
        store_id = self.request.query_params.get("store") or self.request.query_params.get("store_id")
        if store_id:
            qs = qs.filter(prices__store_id=store_id)

        # kill duplicates created by joining through prices
        return qs.distinct().order_by("brand", "name")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["store_id"] = self.request.query_params.get("store") or self.request.query_params.get("store_id")
        return ctx




class QuickCompareView(APIView):
    """Quick compare table listing up to five butter brands across the main supermarkets"""
    permission_classes = [IsAuthenticatedOrReadOnly]

    MAIN_CHAIN_LABELS = OrderedDict([
        ("paknsave", "Pak'nSave"),
        ("countdown", "Woolworths"),
        ("new_world", "New World"),
    ])

    RAW_CHAIN_ALIASES = {
        "paknsave": "paknsave",
        "pak'n save": "paknsave",
        "pak n save": "paknsave",
        "pak'nsave": "paknsave",
        "pak n'save": "paknsave",
        "countdown": "countdown",
        "woolworths": "countdown",
        "woolworth's": "countdown",
        "new world": "new_world",
        "new_world": "new_world",
        "nw": "new_world",
    }

    @staticmethod
    def _canonicalise(value: str) -> str:
        cleaned = value.replace("\u2019", "'").replace("_", " ")
        cleaned = " ".join(cleaned.strip().lower().split())
        return cleaned


    @classmethod
    def normalise_chain(cls, chain_value):
        if not chain_value:
            return None
        canonical = cls._canonicalise(str(chain_value))
        if canonical in cls.RAW_CHAIN_ALIASES:
            return cls.RAW_CHAIN_ALIASES[canonical]
        compact = canonical.replace(" ", "")
        return cls.RAW_CHAIN_ALIASES.get(compact)

    @classmethod
    def empty_store_map(cls):
        return OrderedDict(
            (label, {"store": label, "price": None, "recorded_at": None})
            for label in cls.MAIN_CHAIN_LABELS.values()
        )

    def get(self, request):
        prices = (
            Price.objects
            .select_related("product", "store")
            .filter(product__is_active=True, store__is_active=True)
            .order_by('-recorded_at')
        )

        latest = {}
        for price in prices:
            key = (price.product_id, price.store_id)
            if key not in latest:
                latest[key] = price

        brand_rows = {}
        for price in latest.values():
            normalised_chain = self.normalise_chain(price.store.chain)
            if not normalised_chain:
                continue

            store_label = self.MAIN_CHAIN_LABELS.get(normalised_chain)
            if not store_label:
                continue

            product = price.product
            brand_display = (
                getattr(product, 'brand_display_name', None)
                or product.brand
                or product.name
                or 'Unknown'
            )
            brand_key = brand_display

            if brand_key not in brand_rows:
                brand_rows[brand_key] = {
                    'brand_name': product.brand or brand_display,
                    'brand_display_name': brand_display,
                    'image_url': pick_image_url(product, request),
                    'stores': self.empty_store_map(),
                }

            row = brand_rows[brand_key]
            if not row['image_url']:
                row['image_url'] = pick_image_url(product, request)

            row['stores'][store_label] = {
                'store': store_label,
                'price': float(price.price) if price.price is not None else None,
                'recorded_at': price.recorded_at,
            }

        payload = []
        for row in brand_rows.values():
            stores_list = list(row['stores'].values())
            available_prices = [
                entry['price'] for entry in stores_list if entry['price'] is not None
            ]
            if not available_prices:
                continue

            payload.append({
                'brand_name': row['brand_name'],
                'brand_display_name': row['brand_display_name'],
                'image_url': row['image_url'],
                'stores': stores_list,
                'cheapest_price': min(available_prices),
            })

        payload.sort(key=lambda item: item['cheapest_price'])
        payload = payload[:5]

        if not payload:
            logger.warning("QuickCompareView returned no rows (unique price entries=%s)", len(latest))

        serializer = QuickCompareBrandSerializer(payload, many=True)
        return Response(serializer.data)

class PriceViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    """API endpoint for prices"""
    queryset = Price.objects.select_related('store', 'product').all()
    serializer_class = PriceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['store', 'product', 'is_on_special']
    search_fields = ['store__name', 'product__name', 'product__brand']
    ordering_fields = ['price', 'recorded_at', 'price_per_kg']

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get the most recent price per product-store pair."""
        latest_prices = Price.objects.select_related('store', 'product').order_by('-recorded_at')
        unique_prices, seen = [], set()
        for p in latest_prices:
            key = (p.product_id, p.store_id)
            if key not in seen:
                unique_prices.append(p); seen.add(key)
        unique_prices.sort(key=lambda x: x.recorded_at, reverse=True)
        return Response(self.get_serializer(unique_prices, many=True).data)

    @action(detail=False, methods=['get'], url_path='by-store/(?P<store_id>[^/.]+)/latest')
    def by_store_latest(self, request, store_id=None):
        """Latest butter prices for a specific store (fallback to chain if empty)."""
        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

        prices = (
            Price.objects.filter(store=store, product__name__icontains='butter')
            .select_related('store', 'product').order_by('-recorded_at')[:40]
        )
        if not prices:
            prices = (
                Price.objects.filter(store__chain=store.chain, product__name__icontains='butter')
                .select_related('store', 'product').order_by('-recorded_at')[:40]
            )
        return Response(self.get_serializer(prices, many=True).data)

    @action(detail=False, methods=['post'], url_path='scrape/by-store/(?P<store_id>[^/.]+)')
    def scrape_by_store(self, request, store_id=None):
        """Stub: queue scraping for a specific store."""
        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'queued-or-done', 'store_id': store.id, 'chain': store.chain}, status=status.HTTP_202_ACCEPTED)

    # (other actions unchanged)
    # trends, comparison, history, analytics
    # ... keep your existing implementations ...


class EconomicIndicatorViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    """API endpoint for economic indicators"""
    queryset = EconomicIndicator.objects.all()
    serializer_class = EconomicIndicatorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['indicator_type', 'period']
    ordering_fields = ['date', 'value']

    # correlation() unchanged (omitted for brevity)


class PriceAlertViewSet(RequestContextMixin, viewsets.ModelViewSet):
    """API endpoint for price alerts"""
    serializer_class = PriceAlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'alert_type', 'is_active']
    ordering_fields = ['created_at', 'target_price']

    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmailSubscriptionViewSet(RequestContextMixin, viewsets.ModelViewSet):
    """API endpoint for email subscriptions"""
    queryset = EmailSubscription.objects.all()
    serializer_class = EmailSubscriptionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['frequency', 'is_active']
    ordering_fields = ['created_at', 'email']


class ScrapingLogViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    """API endpoint for scraping logs"""
    queryset = ScrapingLog.objects.select_related('store').all()
    serializer_class = ScrapingLogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['store', 'status']
    ordering_fields = ['started_at', 'completed_at']

    # trigger_scraping() unchanged


class ImageUploadView(APIView):
    """API endpoint for uploading images"""
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "file required"}, status=400)

        asset = ImageAsset.objects.create(
            sku=request.data.get("sku") or None,
            alt_text=request.data.get("alt_text") or ""
        )
        asset.file.save(f.name, f, save=True)
        # Return absolute file_url + metadata
        data = DetailedImageAssetSerializer(asset, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class ScanSubmitAPIView(APIView):
    """
    Accepts a photo + barcode + location (+ typed price) and stores a contribution.
    """

    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]

    def post(self, request):
        # 1) Validate inputs
        upload = request.FILES.get("photo")
        gtin_raw = (request.data.get("gtin") or "").strip()
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        price_text = (request.data.get("price_text") or "").strip()

        if not gtin_raw:
            return Response({"detail": "gtin required"}, status=400)
        if not lat or not lng:
            return Response({"detail": "lat and lng required"}, status=400)

        try:
            latf = float(lat)
            lngf = float(lng)
        except ValueError:
            return Response({"detail": "lat/lng invalid"}, status=400)

        # 2) Product by GTIN-14
        try:
            gtin14 = normalize_gtin(gtin_raw)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        product, _ = Product.objects.get_or_create(
            gtin=gtin14,
            defaults={"name": "", "brand": "", "weight_grams": 0, "is_active": True},
        )

        # 3) Nearest store (300 m radius default)
        from .utils.geo import nearest_store
        stores = Store.objects.filter(latitude__isnull=False, longitude__isnull=False)
        store, distance_m = nearest_store(stores, latf, lngf, radius_m=300.0)
        if not store:
            return Response({"detail": "No nearby store found within 300m"}, status=400)

        # 4) Save photo (optional)
        asset = None
        if upload:
            asset = ImageAsset.objects.create(
                product=product,
                store=store,
                source="UPLOAD",
                alt_text=f"{product.name or 'Unknown product'} at {store.name}",
            )
            asset.file.save(upload.name, upload, save=True)

        # 5) Parse price (typed MVP)
        if not price_text:
            return Response({"detail": "price_text required for now"}, status=400)
        try:
            price_val = Decimal(price_text.replace("$", "").replace(",", ""))
        except InvalidOperation:
            return Response({"detail": "price_text invalid"}, status=400)

        # 6) Create contribution (upserts Price via existing logic)
        PriceContribution.objects.create(
            user=request.user if request.user and request.user.is_authenticated else None,
            product=product,
            store=store,
            price=price_val,
            unit="each",
            is_verified=False,
        )

        Price.objects.update_or_create(
            store=store,
            product=product,
            defaults={
                "price": price_val,
                "price_per_kg": (
                    (price_val * Decimal(1000)) / Decimal(product.weight_grams)
                    if product.weight_grams
                    else None
                ),
                "is_on_special": False,
                "special_price": None,
                "special_end_date": None,
            },
        )

        # 7) Compute cheapest & nearby list (latest per store)
        latest_by_store = {}
        prices = (
            Price.objects.filter(product=product)
            .select_related("store")
            .order_by("store_id", "-recorded_at")
        )
        for price_obj in prices:
            if price_obj.store_id not in latest_by_store:
                latest_by_store[price_obj.store_id] = price_obj

        nearby = []
        from .utils.geo import haversine_m
        for price_obj in latest_by_store.values():
            store_obj = price_obj.store
            if store_obj.latitude is None or store_obj.longitude is None:
                continue
            dist = haversine_m(latf, lngf, store_obj.latitude, store_obj.longitude)
            if dist is None or dist > 5000.0:
                continue
            nearby.append(
                {
                    "store": {
                        "id": store_obj.id,
                        "chain": store_obj.chain,
                        "name": store_obj.name,
                    },
                    "price": str(price_obj.price),
                    "distance_m": round(dist, 1),
                }
            )
        nearby.sort(key=lambda entry: (Decimal(entry["price"]), entry["distance_m"]))
        nearby = nearby[:10]

        cheapest = None
        if latest_by_store:
            cheapest_price = min(latest_by_store.values(), key=lambda obj: obj.price)
            cheapest = {
                "store": {
                    "id": cheapest_price.store.id,
                    "chain": cheapest_price.store.chain,
                    "name": cheapest_price.store.name,
                },
                "price": str(cheapest_price.price),
            }

        # 8) Response payload
        return Response(
            {
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "brand": product.brand,
                    "gtin": product.gtin,
                    "size_grams": product.weight_grams,
                },
                "observed": {
                    "store": {
                        "id": store.id,
                        "chain": store.chain,
                        "name": store.name,
                    },
                    "distance_m": round(distance_m, 1),
                    "price": str(price_val),
                    "unit_cents_per_100g": (
                        int(
                            round(
                                (
                                    (price_val * Decimal(100)) / Decimal(product.weight_grams)
                                )
                                * 100
                            )
                        )
                        if product.weight_grams
                        else None
                    ),
                },
                "cheapest_overall": cheapest,
                "nearby_options": nearby,
                "image_asset_id": asset.id if asset else None,
            },
            status=201,
        )


class NutritionProfileViewSet(RequestContextMixin, viewsets.ReadOnlyModelViewSet):
    queryset = NutritionProfile.objects.all()
    serializer_class = NutritionProfileSerializer

    def retrieve(self, request, pk=None):
        """Get nutrition profile by slug"""
        nutrition = get_object_or_404(NutritionProfile, slug=pk)
        return Response(self.get_serializer(nutrition).data)


class ListItemViewSet(RequestContextMixin, viewsets.ModelViewSet):
    """API endpoint for user's shopping list items"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['store', 'product']
    ordering_fields = ['created_at', 'price_at_add']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ListItemCreateSerializer
        return ListItemSerializer

    def get_queryset(self):
        # For MVP, use user=1 if no authenticated user
        user = self.request.user if self.request.user.is_authenticated else None
        if not user:
            # Create or get a test user for MVP
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='test_user',
                defaults={'email': 'test@example.com'}
            )
        return ListItem.objects.filter(user=user).select_related('product', 'store')

    def perform_create(self, serializer):
        # For MVP, use user=1 if no authenticated user
        user = self.request.user if self.request.user.is_authenticated else None
        if not user:
            from django.contrib.auth.models import User
            user, created = User.objects.get_or_create(
                username='test_user',
                defaults={'email': 'test@example.com'}
            )
        
        # Get current price for the product at the store
        product = serializer.validated_data['product']
        store = serializer.validated_data['store']
        
        # Get the latest price for this product at this store
        latest_price = Price.objects.filter(
            product=product,
            store=store
        ).order_by('-recorded_at').first()
        
        if not latest_price:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f'No price found for {product.name} at {store.name}')
        
        serializer.save(user=user, price_at_add=latest_price.price)
    
    def create(self, request, *args, **kwargs):
        """Override create to return full object data"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Return the full object data using the read serializer
            full_serializer = ListItemSerializer(serializer.instance, context={'request': request})
            headers = self.get_success_headers(full_serializer.data)
            return Response(full_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            from django.db import IntegrityError
            if isinstance(e, IntegrityError):
                return Response(
                    {'error': 'This item is already in your list'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            raise


class CheapestView(APIView):
    """API endpoint to get the cheapest butter product across specified stores"""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        """Get cheapest butter product across specified stores"""
        stores_param = request.query_params.get('stores', '')
        
        if not stores_param:
            return Response(
                {'error': 'stores parameter is required (comma-separated store IDs)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Parse store IDs
            store_ids = [int(s.strip()) for s in stores_param.split(',') if s.strip()]
            if not store_ids:
                return Response(
                    {'error': 'No valid store IDs provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get stores
            stores = Store.objects.filter(id__in=store_ids, is_active=True)
            if not stores.exists():
                return Response(
                    {'error': 'No active stores found with provided IDs'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the cheapest butter product across all specified stores
            # First, get all butter products with prices at these stores
            butter_products = Product.objects.filter(
                is_active=True,
                name__icontains='butter',
                prices__store__in=stores
            ).distinct()
            
            if not butter_products.exists():
                return Response(
                    {'error': 'No butter products found at specified stores'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            cheapest_item = None
            lowest_price = float('inf')
            
            # Find the cheapest product across all stores
            for product in butter_products:
                # Get latest price for this product at each store
                latest_prices = Price.objects.filter(
                    product=product,
                    store__in=stores
                ).select_related('store').order_by('-recorded_at')
                
                # Group by store to get latest price per store
                store_prices = {}
                for price in latest_prices:
                    if price.store.id not in store_prices:
                        store_prices[price.store.id] = price
                
                # Find the lowest price for this product
                for store_id, price in store_prices.items():
                    if price.price < lowest_price:
                        lowest_price = price.price
                        cheapest_item = {
                            'brand': product.brand,
                            'size': f"{product.weight_grams}g",
                            'store': price.store.name,
                            'price': float(price.price),
                            'unit': float(price.price_per_kg) if price.price_per_kg else None,
                            'product_id': product.id,
                            'store_id': price.store.id,
                            'product_name': product.name,
                            'store_chain': price.store.chain
                        }
            
            if not cheapest_item:
                return Response(
                    {'error': 'No prices found for butter products at specified stores'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(cheapest_item)
            
        except ValueError:
            return Response(
                {'error': 'Invalid store ID format. Please provide comma-separated integers.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in cheapest endpoint: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(APIView):
    """API endpoint for user profile data (real user when authenticated)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        email = getattr(user, 'email', '') or ''
        name = user.get_full_name() or user.username or email or 'User'
        avatar_url = _gravatar_url(email)

        # Infer provider heuristically from username if created via social
        username = getattr(user, 'username', '') or ''
        provider = 'google' if username.startswith('google_') else (
            'apple' if username.startswith('apple_') else 'email'
        )

        serializer = UserProfileSerializer({
            'name': name,
            'email': email,
            'avatar_url': avatar_url,
            'provider': provider,
        })
        return Response(serializer.data)


class PriceContributionViewSet(RequestContextMixin, viewsets.ModelViewSet):
    """API endpoint for price contributions"""
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'store', 'is_verified']
    ordering_fields = ['created_at', 'price']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PriceContributionCreateSerializer
        return PriceContributionSerializer
    
    def get_queryset(self):
        return PriceContribution.objects.select_related('product', 'store', 'user').all()
    
    def create(self, request, *args, **kwargs):
        """Create a new price contribution and upsert the price"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            contribution = serializer.save()
            
            # Return the full contribution data
            full_serializer = PriceContributionSerializer(contribution, context={'request': request})
            headers = self.get_success_headers(full_serializer.data)
            return Response(full_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"Error creating price contribution: {e}")
            return Response(
                {'error': 'Failed to create price contribution'},
                status=status.HTTP_400_BAD_REQUEST
            )

class ProductDetailAPIView(RequestContextMixin, APIView):
    """Retrieve full product detail payload including pricing and scores."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_product(self, identifier: str) -> Product:
        queryset = _product_detail_queryset()
        filters = Q(slug__iexact=identifier)
        if str(identifier).isdigit():
            filters |= Q(pk=int(identifier))
        product = queryset.filter(filters).first()
        if not product:
            raise Http404("Product not found")
        return product

    def get(self, request, slug: str):
        product = self._get_product(slug)
        serializer = ProductDetailSerializer(product, context={'request': request})
        return Response(serializer.data)


class ProductRatingSubmitAPIView(RequestContextMixin, APIView):
    """Allow users (or demo guests) to submit ratings for a product."""
    permission_classes = [AllowAny]

    def _get_product(self, slug: str) -> Product:
        queryset = _product_detail_queryset()
        filters = Q(slug__iexact=slug)
        if str(slug).isdigit():
            filters |= Q(pk=int(slug))
        product = queryset.filter(filters).first()
        if not product:
            raise Http404('Product not found')
        return product

    def _resolve_user(self, request, create_if_missing: bool = False):
        if request.user and request.user.is_authenticated:
            return request.user
        username = None
        headers = getattr(request, 'headers', {})
        if headers:
            username = headers.get('X-ButterUp-User') or headers.get('x-butterup-user')
        if not username and isinstance(getattr(request, 'data', None), dict):
            username = request.data.get('username')
        if not username:
            if not create_if_missing:
                return None
            username = 'butterup-guest'
        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(username=username)
            return user
        except UserModel.DoesNotExist:
            if not create_if_missing:
                return None
        user, created = UserModel.objects.get_or_create(
            username=username,
            defaults={'email': f'{username}@example.com'}
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        return user

    def get(self, request, slug: str):
        product = self._get_product(slug)
        user = self._resolve_user(request, create_if_missing=False)
        rating = None
        if user:
            rating = product.user_ratings.filter(user=user).first()
        return Response({
            'user_rating': ProductUserRatingSerializer(rating).data if rating else None,
            'community_rating': product.get_user_rating_summary(),
            'blended_score': product.get_blended_score(),
            'system_scores': product.get_system_scores(),
        })

    def post(self, request, slug: str):
        product = self._get_product(slug)
        input_serializer = ProductRatingSubmissionSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        payload = input_serializer.validated_data
        user = self._resolve_user(request, create_if_missing=True)

        rating, _ = ProductUserRating.objects.update_or_create(
            product=product,
            user=user,
            defaults={
                'overall_score': payload.get('overall_score'),
                'cost_score': payload.get('cost_score'),
                'texture_score': payload.get('texture_score'),
                'recipe_score': payload.get('recipe_score'),
                'comment': payload.get('comment') or '',
            }
        )

        product = self._get_product(slug)
        detail_serializer = ProductDetailSerializer(
            product,
            context={'request': request, 'current_user': user}
        )

        return Response({
            'rating': ProductUserRatingSerializer(rating).data,
            'product': detail_serializer.data,
        }, status=status.HTTP_200_OK)


class PricesByGTINView(APIView):
    """Get product prices by GTIN (barcode) with nearby stores"""
    permission_classes = [AllowAny]

    def get(self, request):
        gtin = request.GET.get('gtin', '').strip()
        lat_str = request.GET.get('lat', '')
        lng_str = request.GET.get('lng', '')
        radius_m = int(request.GET.get('radius_m', 5000))

        if not gtin:
            return Response({'detail': 'GTIN is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except (ValueError, TypeError):
            return Response({'detail': 'Valid lat/lng coordinates are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize GTIN
        try:
            normalized_gtin = normalize_gtin(gtin)
        except ValueError as e:
            return Response({
                'detail': f'Invalid barcode: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find product by GTIN
        product = Product.objects.filter(gtin=normalized_gtin, is_active=True).first()
        
        if not product:
            return Response({
                'detail': f'Product with GTIN {gtin} not found in our database'
            }, status=status.HTTP_404_NOT_FOUND)

        # Get all stores
        from .utils.geo import haversine_m
        stores = list(Store.objects.all())
        
        # Calculate distances and find stores within radius
        nearby_stores = []
        for store in stores:
            if store.latitude is not None and store.longitude is not None:
                distance_m = haversine_m(lat, lng, store.latitude, store.longitude)
                if distance_m <= radius_m:
                    nearby_stores.append({
                        'store': store,
                        'distance_m': distance_m
                    })
        
        # Sort by distance
        nearby_stores.sort(key=lambda x: x['distance_m'])
        
        # Get latest prices for these stores
        nearby_options = []
        cheapest_overall = None
        cheapest_price = None
        
        for item in nearby_stores:
            store = item['store']
            distance_m = item['distance_m']
            
            # Get latest price for this product at this store
            price_obj = Price.objects.filter(
                product=product,
                store=store
            ).order_by('-recorded_at').first()
            
            if price_obj:
                price_value = float(price_obj.price)
                
                nearby_options.append({
                    'store': {
                        'id': store.id,
                        'chain': store.chain,
                        'name': store.name,
                        'address': store.address or '',
                        'city': store.city or '',
                    },
                    'price': price_value,
                    'distance_m': distance_m,
                    'recorded_at': price_obj.recorded_at.isoformat() if price_obj.recorded_at else None,
                })
                
                # Track cheapest
                if cheapest_price is None or price_value < cheapest_price:
                    cheapest_price = price_value
                    cheapest_overall = nearby_options[-1]
        
        return Response({
            'product': {
                'id': product.id,
                'name': product.name,
                'brand': product.brand,
                'gtin': product.gtin,
                'size_grams': product.weight_grams,
            },
            'nearby_options': nearby_options,
            'cheapest_overall': cheapest_overall,
        })


class OFFAnonRateThrottle(AnonRateThrottle):
    scope = "off_anon"


class OFFUserRateThrottle(UserRateThrottle):
    scope = "off_user"


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok"})


class OFFProductDetailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OFFAnonRateThrottle, OFFUserRateThrottle]

    def get(self, request, code: str):
        fields = _parse_fields_param(request.query_params.get("fields"))
        product = off_client.get_product(code, fields=fields)
        if not product:
            return Response({"error": "NOT_FOUND"}, status=status.HTTP_404_NOT_FOUND)
        return Response(product)


class OFFProductSearchView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OFFAnonRateThrottle, OFFUserRateThrottle]

    def get(self, request, *args, **kwargs):
        query = (request.query_params.get("q") or "").strip()
        if not query:
            return Response(
                {"detail": "Query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_raw = request.query_params.get("page", "1")
        page_size_raw = request.query_params.get("page_size", str(settings.REST_FRAMEWORK.get("PAGE_SIZE", 20)))

        try:
            page = max(1, int(page_raw))
        except (TypeError, ValueError):
            return Response({"detail": "Parameter 'page' must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            page_size = int(page_size_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Parameter 'page_size' must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

        if page_size < 1:
            return Response({"detail": "Parameter 'page_size' must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)
        if page_size > OFF_MAX_PAGE_SIZE:
            return Response(
                {"detail": f"Parameter 'page_size' cannot exceed {OFF_MAX_PAGE_SIZE}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fields = _parse_fields_param(request.query_params.get("fields"))
        brands = request.query_params.get("brands")
        categories = request.query_params.get("categories")

        results = off_client.search_products(
            query,
            page=page,
            page_size=page_size,
            brands=brands,
            categories=categories,
            fields=fields,
        )
        return Response(results)


class OFFProductBatchView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OFFAnonRateThrottle, OFFUserRateThrottle]

    def post(self, request, *args, **kwargs):
        if not isinstance(request.data, dict):
            return Response(
                {"detail": 'Request body must be a JSON object with a "codes" list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        codes = request.data.get("codes")
        if not isinstance(codes, list):
            return Response({"detail": '"codes" must be a list of product codes.'}, status=status.HTTP_400_BAD_REQUEST)

        if not codes:
            return Response({"detail": '"codes" list cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(codes) > OFF_MAX_BATCH_SIZE:
            return Response(
                {"detail": f'"codes" list cannot exceed {OFF_MAX_BATCH_SIZE} items.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fields may be provided as query param or within the request body.
        fields = _parse_fields_param(request.query_params.get("fields"))
        if not fields:
            body_fields = request.data.get("fields")
            if isinstance(body_fields, list):
                fields = [str(field).strip() for field in body_fields if str(field).strip()]
                fields = fields or None
            elif isinstance(body_fields, str):
                fields = _parse_fields_param(body_fields)

        result = off_client.get_products_batch(codes, fields=fields)
        return Response(result)
