from rest_framework import serializers
from .models import Store, Product, Price, PriceAlert, ImageAsset, NutritionProfile, EconomicIndicator, EmailSubscription, ScrapingLog, ListItem, PriceContribution
import re
from django.utils.text import slugify as dj_slug



def first(*vals):
    for v in vals:
        if v is not None:
            return v
    return None

def to_num(v):
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "").replace("$", ""))
    except Exception:
        return None

def cents(v):
    return None if v is None else to_num(v) / 100.0

def parse_grams_from_text(*texts):
    text = " ".join([t for t in texts if t]) or ""
    # 1 kg, 0.5 kg, 250 g, 500g
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g)\b", text, re.I)
    if not m:
        return None
    val = float(m.group(1))
    unit = m.group(2).lower()
    return int(round(val * 1000)) if unit == "kg" else int(round(val))

def _to_urlish(v):
    if not v:
        return None
    # Support Django File/ImageField objects
    if hasattr(v, "url"):
        try:
            return v.url
        except Exception:
            return None
    return str(v)

def absolutize(urlish, request):
    s = _to_urlish(urlish)
    if not s:
        return None
    if s.startswith(("http://", "https://", "data:")):
        return s
    s = s if s.startswith("/") else f"/{s}"
    return request.build_absolute_uri(s)

def pick_image_url(p, request):
    
    image_field = getattr(p, "image", None)
    
    if image_field and image_field.name.startswith("products/"):
        
        url = image_field.url
        return request.build_absolute_uri(url) if request else url
    
    brand = getattr(p, "brand_display_name", None)
    if request and brand:
        return request.build_absolute_uri(f"/static/brands/{dj_slug(brand)}.png")
    return None



class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = '__all__'


class DetailedImageAssetSerializer(serializers.ModelSerializer):
    """Detailed serializer for ImageAsset model"""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageAsset
        fields = [
            'id', 'product', 'source', 'file', 'file_url', 'url', 
            'last_fetched_at', 'attribution_text', 'attribution_url',
            'is_active', 'checksum', 'width', 'height'
        ]
        read_only_fields = ['id', 'last_fetched_at', 'checksum', 'width', 'height']
    
    def get_file_url(self, obj):
        """Get the URL for the image file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MinimalProductSerializer(serializers.ModelSerializer):
    """Minimal product serializer for nested use"""
    primary_image = DetailedImageAssetSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'brand', 'gtin', 'weight_grams', 'primary_image']


class ProductListSerializer(serializers.ModelSerializer):
    grams = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    brand_display_name = serializers.ReadOnlyField()
    name_with_brand = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "brand", "brand_display_name", "grams", "slug", "image_url", "price", "name_with_brand"]

    def get_grams(self, obj):
        g = first(
            to_num(getattr(obj, "grams", None)),
            to_num(getattr(obj, "size_g", None)),
            to_num(getattr(obj, "size_grams", None)),
            to_num(getattr(obj, "weight_g", None)),
            to_num(getattr(obj, "weight_grams", None)),
        )
        if g:
            return int(g)
        # parse from text
        return parse_grams_from_text(
            getattr(obj, "size_text", None), 
            obj.name, 
            getattr(obj, "title", None)
        )

    def get_slug(self, obj):
        grams = self.get_grams(obj)
        brand_name = obj.brand_display_name
        base = " ".join([
            brand_name, 
            obj.name or "", 
            f"{grams}g" if grams else ""
        ]).strip()
        s = dj_slug(base) or dj_slug(obj.name or "") or f"product-{obj.pk}"
        return s
    def get_name_with_brand(self, obj):
        brand_name = obj.brand if obj.brand else ""
        return f"{brand_name} {obj.name}".strip()

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = pick_image_url(obj, request) if request else getattr(obj, "image_url", None)
        if not url and obj.brand:
            # optional brand fallback path (serve from /static/brands/<brand>.png if you have it)
            return request.build_absolute_uri(f"/static/brands/{dj_slug(obj.brand_display_name)}.png") if request else None
        return url

    def get_price(self, obj):
        store_id = self.context.get("store_id")
        qs = Price.objects.filter(product=obj)
        if store_id:
            qs = qs.filter(store_id=store_id)
        val = qs.order_by("-recorded_at").values_list("price", flat=True).first()
        # if amount stored in cents, convert here instead:
        return float(val) if val is not None else None


class ProductSerializer(serializers.ModelSerializer):
    """Full product serializer with image assets"""
    image_assets = DetailedImageAssetSerializer(many=True, read_only=True)
    primary_image = DetailedImageAssetSerializer(read_only=True)
    latest_price = serializers.SerializerMethodField()
    brand_display_name = serializers.ReadOnlyField()
    name_with_brand = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'brand', 'brand_display_name', 'gtin', 'weight_grams', 'package_type',
            'is_active', 'created_at', 'updated_at', 'image_assets', 
            'primary_image', 'latest_price', 'name_with_brand'
        ]
    def get_name_with_brand(self, obj):
        brand_name = obj.brand if obj.brand else ""
        return f"{brand_name} {obj.name}".strip()

    def get_latest_price(self, obj):
        """Get the latest price for this product"""
        latest_price = obj.prices.order_by('-recorded_at').first()
        if latest_price:
            return {
                'price': str(latest_price.price),
                'price_per_kg': str(latest_price.price_per_kg),
                'store': latest_price.store.name,
                'recorded_at': latest_price.recorded_at
            }
        return None


class PriceSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    product = MinimalProductSerializer(read_only=True)
    
    class Meta:
        model = Price
        fields = '__all__'


class StoreFlatPriceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product_name = serializers.CharField()
    price = serializers.DecimalField(max_digits=6, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    timestamp = serializers.DateTimeField()
    store = StoreSerializer(read_only=True)


class EconomicIndicatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EconomicIndicator
        fields = '__all__'


class PriceAlertSerializer(serializers.ModelSerializer):
    product = MinimalProductSerializer(read_only=True)
    store = StoreSerializer(read_only=True)
    
    class Meta:
        model = PriceAlert
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'last_triggered']


class EmailSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSubscription
        fields = '__all__'
        read_only_fields = ['created_at', 'last_sent']


class ScrapingLogSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    
    class Meta:
        model = ScrapingLog
        fields = '__all__'
        read_only_fields = ['started_at', 'completed_at', 'duration_seconds']


# Analytics serializers
class PriceTrendSerializer(serializers.Serializer):
    date = serializers.DateField()
    avg_price = serializers.DecimalField(max_digits=6, decimal_places=2)
    min_price = serializers.DecimalField(max_digits=6, decimal_places=2)
    max_price = serializers.DecimalField(max_digits=6, decimal_places=2)
    store_count = serializers.IntegerField()


class StoreComparisonSerializer(serializers.Serializer):
    store = serializers.CharField()
    avg_price = serializers.DecimalField(max_digits=6, decimal_places=2)
    price_change = serializers.DecimalField(max_digits=5, decimal_places=2)
    price_change_percent = serializers.DecimalField(max_digits=5, decimal_places=2)


class EconomicCorrelationSerializer(serializers.Serializer):
    date = serializers.DateField()
    butter_price = serializers.DecimalField(max_digits=6, decimal_places=2)
    cpi_value = serializers.DecimalField(max_digits=10, decimal_places=4, allow_null=True)
    inflation_rate = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True) 


class ImageFetchResponseSerializer(serializers.Serializer):
    """Serializer for image fetch API responses"""
    success = serializers.BooleanField()
    message = serializers.CharField()
    asset = DetailedImageAssetSerializer(required=False)
    task_id = serializers.CharField(required=False) 


class ListItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating list items"""
    class Meta:
        model = ListItem
        fields = ['product', 'store', 'unit']
        extra_kwargs = {
            'unit': {'default': 'each'}
        }


class ListItemSerializer(serializers.ModelSerializer):
    """Serializer for user's shopping list items"""
    product = MinimalProductSerializer(read_only=True)
    store = StoreSerializer(read_only=True)
    
    class Meta:
        model = ListItem
        fields = ['id', 'product', 'store', 'price_at_add', 'unit', 'created_at']
        read_only_fields = ['id', 'created_at', 'price_at_add']


class NutritionProfileSerializer(serializers.ModelSerializer):
    nutrition_per_100g = serializers.SerializerMethodField()
    nutrition_per_serving = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionProfile
        fields = [
            'slug', 'origin', 'allergens', 'claims', 'storage', 'warnings',
            'serving_g', 'nutrition_per_100g', 'nutrition_per_serving',
            'last_verified_at', 'source', 'is_stale'
        ]
    
    def get_nutrition_per_100g(self, obj):
        return obj.get_nutrition_per_100g()
    
    def get_nutrition_per_serving(self, obj):
        return obj.get_nutrition_per_serving()
    
    def get_is_stale(self, obj):
        return obj.is_stale()


class PriceContributionSerializer(serializers.ModelSerializer):
    """Serializer for price contributions"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_brand = serializers.CharField(source='product.brand', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_chain = serializers.CharField(source='store.chain', read_only=True)
    
    class Meta:
        model = PriceContribution
        fields = [
            'id', 'product', 'store', 'price', 'unit', 'is_verified', 'created_at',
            'product_name', 'product_brand', 'store_name', 'store_chain'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']


class PriceContributionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating price contributions"""
    product_id = serializers.IntegerField()
    store_id = serializers.IntegerField()
    
    class Meta:
        model = PriceContribution
        fields = ['product_id', 'store_id', 'price', 'unit']
    
    def validate_product_id(self, value):
        """Validate that the product exists"""
        from .models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product with this ID does not exist.")
        return value
    
    def validate_store_id(self, value):
        """Validate that the store exists"""
        from .models import Store
        try:
            Store.objects.get(id=value)
        except Store.DoesNotExist:
            raise serializers.ValidationError("Store with this ID does not exist.")
        return value
    
    def validate_price(self, value):
        """Validate that the price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value
    
    def create(self, validated_data):
        # Get or create a test user for MVP
        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com'}
        )
        
        # Get the product and store objects (already validated)
        from .models import Product, Store
        product = Product.objects.get(id=validated_data['product_id'])
        store = Store.objects.get(id=validated_data['store_id'])
        
        # Create the contribution
        contribution = PriceContribution.objects.create(
            user=user,
            product=product,
            store=store,
            price=validated_data['price'],
            unit=validated_data.get('unit', 'each')
        )
        
        # Upsert the Price record
        from .models import Price
        price, created = Price.objects.update_or_create(
            store=store,
            product=product,
            defaults={
                'price': contribution.price,
                'scraped_at': contribution.created_at,
                'recorded_at': contribution.created_at
            }
        )
        
        return contribution


class QuickCompareStoreSnapshotSerializer(serializers.Serializer):
    """Serializer for a single store price snapshot in quick compare"""
    store = serializers.CharField()
    price = serializers.FloatField(allow_null=True)
    recorded_at = serializers.DateTimeField(allow_null=True)


class QuickCompareBrandSerializer(serializers.Serializer):
    """Serializer for quick compare table rows"""
    brand_name = serializers.CharField()
    brand_display_name = serializers.CharField()
    image_url = serializers.CharField(allow_null=True, required=False)
    stores = QuickCompareStoreSnapshotSerializer(many=True)
    cheapest_price = serializers.FloatField(allow_null=True)


class UserProfileSerializer(serializers.Serializer):
    """Serializer for user profile data"""
    name = serializers.CharField()
    email = serializers.EmailField()
    avatar_url = serializers.URLField()
    provider = serializers.CharField() 
