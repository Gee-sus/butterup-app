from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Min, Max, Count, Q
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.contrib.auth import get_user_model
import logging
from typing import List, Dict
from collections import OrderedDict

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

logger = logging.getLogger(__name__)


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
    """API endpoint for user profile data"""
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get(self, request):
        """Get user profile data with mock values for MVP"""
        # For MVP, return mock user data
        profile_data = {
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'avatar_url': 'https://via.placeholder.com/150/007bff/ffffff?text=JD',
            'provider': 'google'
        }
        
        serializer = UserProfileSerializer(profile_data)
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
