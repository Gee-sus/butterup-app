from django.db import models
from django.db.models import Q, CheckConstraint
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import hashlib
from PIL import Image
import os
import json
from django.utils.text import slugify


class Store(models.Model):
    """Supermarket store model"""
    CHAIN_CHOICES = [
        ('paknsave', 'Pak\'nSave'),
        ('countdown', 'Woolworths'),
        ('new_world', 'New World'),
    ]

    name = models.CharField(max_length=100)
    chain = models.CharField(max_length=50, choices=CHAIN_CHOICES)
    location = models.CharField(max_length=200, blank=True)
    region = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=80, db_index=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.CharField(max_length=300, blank=True)
    store_code = models.CharField(max_length=80, blank=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'chain', 'city']
        constraints = [
            CheckConstraint(
                check=Q(chain__in=['paknsave', 'woolworths', 'new_world']),
                name='store_chain_valid'
            )
        ]

    def save(self, *args, **kwargs):
        # Normalize chain defensively
        self.chain = (self.chain or '').strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.chain} - {self.name}"


class Brand(models.Model):
    """Butter brand model"""
    name = models.CharField(max_length=100, unique=True, help_text="Brand name as it appears in product names")
    display_name = models.CharField(max_length=100, help_text="How to display the brand to users")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """Butter product model enriched for detail experiences."""
    CATEGORY_CHOICES = [
        ('block', 'Block'),
        ('spreadable', 'Spreadable'),
        ('tub', 'Tub'),
    ]

    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100)
    slug = models.SlugField(max_length=150, unique=True, blank=True)
    gtin = models.CharField(max_length=14, unique=True, blank=True, null=True,
                          help_text="Global Trade Item Number (8, 12, 13, or 14 digits)")
    weight_grams = models.IntegerField(help_text="Weight in grams")
    package_type = models.CharField(max_length=50, blank=True)  # Block, spreadable, etc.
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='block',
                                help_text="Presentation format used in the app")
    image = models.ImageField(upload_to="products/", blank=True, null=True)  # Direct image field
    is_active = models.BooleanField(default=True)
    is_healthy_option = models.BooleanField(default=False)
    serving_size_g = models.PositiveIntegerField(default=10,
        help_text="Default serving size (grams) for calorie equivalence")
    versatility_tags = models.JSONField(default=list, blank=True,
        help_text="Recipe or usage tags surfaced to the user")
    nutrition_profile = models.OneToOneField('NutritionProfile', on_delete=models.SET_NULL,
        related_name='product', null=True, blank=True)
    healthy_alternatives = models.ManyToManyField('self', symmetrical=False, blank=True,
        related_name='healthy_alternative_for', help_text="Suggested healthier swaps")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'brand', 'weight_grams']

    def __str__(self):
        return f"{self.brand} {self.name} ({self.weight_grams}g)"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(" ".join(filter(None, [self.brand, self.name, f"{self.weight_grams}g" if self.weight_grams else None])))
            if not base:
                base = slugify(self.name or self.brand or 'product')
            slug_candidate = base or 'product'
            suffix = 1
            while Product.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                suffix += 1
                slug_candidate = f"{base}-{suffix}"
            self.slug = slug_candidate
        return super().save(*args, **kwargs)

    @property
    def brand_display_name(self):
        """Get the display name for the brand using the Brand database"""
        try:
            from api.utils.brand_extractor import BrandExtractor
            return BrandExtractor.extract_brand_from_name(self.brand)
        except Exception:
            return self.brand

    @property
    def primary_image(self):
        """Get the primary image, preferring STORE > GS1 > OFF > UPLOAD"""
        from django.db.models import Case, When, IntegerField

        return (
            self.image_assets
            .filter(is_active=True, file__isnull=False)
            .annotate(priority=Case(
                When(source='STORE', then=0),
                When(source='GS1', then=1),
                When(source='OFF', then=2),
                When(source='UPLOAD', then=3),
                default=9, output_field=IntegerField(),
            ))
            .order_by('priority', '-last_fetched_at')
            .first()
        )

    def get_score_snapshot(self):
        return getattr(self, 'score_snapshot', None)

    def get_system_scores(self):
        snapshot = self.get_score_snapshot()
        return snapshot.as_dict() if snapshot else None

    def get_user_rating_summary(self):
        from django.db.models import Avg, Count

        stats = self.user_ratings.aggregate(
            avg_overall=Avg('overall_score'),
            avg_cost=Avg('cost_score'),
            avg_texture=Avg('texture_score'),
            avg_recipe=Avg('recipe_score'),
            count=Count('id'),
        ) if hasattr(self, 'user_ratings') else {
            'avg_overall': None,
            'avg_cost': None,
            'avg_texture': None,
            'avg_recipe': None,
            'count': 0,
        }

        def _to_float(val):
            return round(float(val), 1) if val is not None else None

        return {
            'average_overall': _to_float(stats.get('avg_overall')),
            'average_cost': _to_float(stats.get('avg_cost')),
            'average_texture': _to_float(stats.get('avg_texture')),
            'average_recipe': _to_float(stats.get('avg_recipe')),
            'count': stats.get('count') or 0,
        }

    def get_blended_score(self, system_weight: float = 0.7):
        system = self.get_system_scores()
        community = self.get_user_rating_summary()
        system_score = system.get('overall') if system else None
        crowd_score = community.get('average_overall')
        if system_score is not None and crowd_score is not None:
            blended = (system_weight * float(system_score)) + ((1 - system_weight) * float(crowd_score))
            return round(blended, 1)
        return system_score if system_score is not None else crowd_score

    def get_pairs_well_with(self):
        snapshot = self.get_score_snapshot()
        if snapshot and snapshot.pairs_well_with:
            return snapshot.pairs_well_with
        return self.versatility_tags or []

    def get_serving_calories(self):
        profile = self.nutrition_profile
        if not profile:
            return None
        return profile.get_calories_per_serving(self.serving_size_g)

    def get_calorie_burn_equivalents(self):
        calories = self.get_serving_calories()
        if calories is None:
            return {}
        mets = {
            'brisk_walk': 4.3,
            'jogging': 7.0,
            'cycling': 6.0,
            'yoga': 3.0,
        }
        weight_kg = 70
        equivalents = {}
        for label, met in mets.items():
            minutes = max(1, round((calories * 200) / (met * weight_kg)))
            equivalents[label] = int(minutes)
        return equivalents


class ProductScoreSnapshot(models.Model):
    """System-curated scores and narratives for a product."""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='score_snapshot')
    overall_score = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'))
    affordability_score = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'))
    fat_quality_score = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'))
    recipe_friendly_score = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'))
    affordability_note = models.TextField(blank=True)
    fat_water_note = models.TextField(blank=True)
    recipe_note = models.TextField(blank=True)
    healthy_swap_note = models.TextField(blank=True)
    pairs_well_with = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Product Score Snapshot"
        verbose_name_plural = "Product Score Snapshots"

    def as_dict(self):
        return {
            'overall': float(self.overall_score) if self.overall_score is not None else None,
            'affordability': float(self.affordability_score) if self.affordability_score is not None else None,
            'fat_quality': float(self.fat_quality_score) if self.fat_quality_score is not None else None,
            'recipe_friendly': float(self.recipe_friendly_score) if self.recipe_friendly_score is not None else None,
            'notes': {
                'affordability': self.affordability_note,
                'fat_water': self.fat_water_note,
                'recipe': self.recipe_note,
                'healthy_swap': self.healthy_swap_note,
            },
            'pairs_well_with': self.pairs_well_with or [],
        }


class ProductUserRating(models.Model):
    """Crowd contributed product ratings with multiple criteria."""
    SCORE_VALIDATORS = [MinValueValidator(0), MaxValueValidator(10)]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='user_ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_ratings')
    overall_score = models.DecimalField(max_digits=4, decimal_places=1, validators=SCORE_VALIDATORS)
    cost_score = models.DecimalField(max_digits=4, decimal_places=1, validators=SCORE_VALIDATORS)
    texture_score = models.DecimalField(max_digits=4, decimal_places=1, validators=SCORE_VALIDATORS)
    recipe_score = models.DecimalField(max_digits=4, decimal_places=1, validators=SCORE_VALIDATORS)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'user']
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):
        if self.overall_score is None:
            scores = [self.cost_score, self.texture_score, self.recipe_score]
            scores = [float(s) for s in scores if s is not None]
            if scores:
                self.overall_score = round(sum(scores) / len(scores), 1)
            else:
                self.overall_score = Decimal('0.0')
        return super().save(*args, **kwargs)



class ImageAsset(models.Model):
    """Product image asset model"""
    SOURCE_CHOICES = [
        ('OFF', 'Open Food Facts'),
        ('GS1', 'GS1 NZ'),
        ('STORE', 'Store Website'),  # New source for store website images
        ('UPLOAD', 'User Upload'),  # New source for user uploaded images
    ]

    # General fields for simple image assets
    sku = models.CharField(max_length=100, blank=True, null=True, help_text="SKU or identifier for the image")
    alt_text = models.CharField(max_length=200, blank=True, help_text="Alt text for accessibility")
    
    # Product-specific fields
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='image_assets', null=True, blank=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='product_images', null=True, blank=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='UPLOAD')
    file = models.ImageField(upload_to='products/', null=True, blank=True)
    url = models.URLField(max_length=500, blank=True)
    original_url = models.URLField(max_length=500, blank=True, help_text="Original URL where image was found")
    last_fetched_at = models.DateTimeField(auto_now_add=True)
    attribution_text = models.CharField(max_length=200, blank=True)
    attribution_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    checksum = models.CharField(max_length=32, blank=True, help_text="MD5 hash of image content")
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True)
    file_size = models.IntegerField(null=True, blank=True, help_text="File size in bytes")

    class Meta:
        ordering = ['-last_fetched_at']
        # Only enforce uniqueness for product-specific images
        unique_together = ['product', 'store', 'source', 'checksum']

    def __str__(self):
        store_name = f" - {self.store.name}" if self.store else ""
        return f"{self.product}{store_name} - {self.source} - {self.last_fetched_at}"

    def save(self, *args, **kwargs):
        # Update image dimensions if file exists
        if self.file and not self.width:
            try:
                with Image.open(self.file.path) as img:
                    self.width, self.height = img.size
            except Exception:
                pass
        
        # Update file size if file exists
        if self.file and not self.file_size:
            try:
                self.file_size = self.file.size
            except Exception:
                pass
        
        # Update checksum if file exists
        if self.file and not self.checksum:
            self.checksum = self._compute_checksum()
        
        super().save(*args, **kwargs)

    def _compute_checksum(self):
        """Compute MD5 checksum of image file"""
        if not self.file:
            return ""
        
        try:
            with open(self.file.path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""

    def get_file_path(self):
        """Get the file path for this image asset"""
        if self.file:
            return self.file.path
        return None

    def get_image_url(self):
        """Get the URL to serve this image"""
        if self.file:
            return f"/media/{self.file.name}"
        return self.url


class Price(models.Model):
    """Price record model"""
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='prices')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='prices')
    price = models.DecimalField(max_digits=6, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_on_special = models.BooleanField(default=False)
    special_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    special_end_date = models.DateField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    scraped_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['store', 'product', 'recorded_at']
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.store} - {self.product} - ${self.price}"

    def save(self, *args, **kwargs):
        # Calculate price per kg
        if self.price and self.product.weight_grams:
            self.price_per_kg = (self.price / self.product.weight_grams) * 1000
        super().save(*args, **kwargs)


class EconomicIndicator(models.Model):
    """Economic indicators like CPI, inflation rates"""
    indicator_type = models.CharField(max_length=50)  # CPI, inflation, etc.
    value = models.DecimalField(max_digits=10, decimal_places=4)
    period = models.CharField(max_length=20)  # Monthly, quarterly, yearly
    date = models.DateField()
    source = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['indicator_type', 'date', 'period']
        ordering = ['-date']

    def __str__(self):
        return f"{self.indicator_type} - {self.date} - {self.value}"


class PriceAlert(models.Model):
    """User price alerts"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_alerts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='alerts')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    target_price = models.DecimalField(max_digits=6, decimal_places=2)
    threshold_percent = models.DecimalField(
        max_digits=5, decimal_places=2, 
        default=5.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage change threshold to trigger alert"
    )
    alert_type = models.CharField(max_length=20, choices=[
        ('below', 'Price drops below'),
        ('above', 'Price rises above'),
        ('change', 'Price changes by %'),
    ])
    change_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, 
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_triggered = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.product} - ${self.target_price}"


class EmailSubscription(models.Model):
    """Email subscription for price updates"""
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    frequency = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ], default='weekly')
    preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_sent = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.email} - {self.frequency}"


class ScrapingLog(models.Model):
    """Log of scraping activities"""
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='scraping_logs')
    status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial'),
    ])
    products_scraped = models.IntegerField(default=0)
    errors = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.store} - {self.status} - {self.started_at}" 

class ListItem(models.Model):
    """User's shopping list items"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='list_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='list_items')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='list_items')
    price_at_add = models.DecimalField(max_digits=6, decimal_places=2, help_text="Price when item was added to list")
    unit = models.CharField(max_length=20, default='each', help_text="Unit of measurement (each, kg, g, etc.)")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'product', 'store']
    
    def __str__(self):
        return f"{self.user.username} - {self.product} at {self.store}"


class PriceContribution(models.Model):
    """User-contributed price data"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_contributions', null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='contributions')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='contributions')
    price = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.CharField(max_length=20, default='each', help_text="Unit of measurement (each, kg, g, etc.)")
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.product} at {self.store}: ${self.price} (contributed by {self.user or 'anonymous'})"


class NutritionProfile(models.Model):
    slug = models.CharField(max_length=100, unique=True)
    origin = models.CharField(max_length=100)
    allergens = models.JSONField(default=list)
    claims = models.JSONField(default=list)
    storage = models.TextField()
    warnings = models.JSONField(default=list)
    serving_g = models.IntegerField()
    energy_kj = models.DecimalField(max_digits=8, decimal_places=2)
    fat_g = models.DecimalField(max_digits=6, decimal_places=2)
    sat_fat_g = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=2)
    sugars_g = models.DecimalField(max_digits=6, decimal_places=2)
    protein_g = models.DecimalField(max_digits=6, decimal_places=2)
    sodium_mg = models.DecimalField(max_digits=8, decimal_places=2)
    water_g = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.0'))
    calories_kcal = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Optional calories per serving override")
    last_verified_at = models.DateTimeField()
    source = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.slug} - {self.origin}"

    def is_stale(self):
        """Check if nutrition data is older than 90 days"""
        from django.utils import timezone
        from datetime import timedelta
        return self.last_verified_at < (timezone.now() - timedelta(days=90))

    def _calories_per_serving(self):
        if self.calories_kcal is not None:
            return Decimal(self.calories_kcal)
        try:
            return Decimal(self.energy_kj) * Decimal('0.239006')
        except Exception:
            return None

    def get_nutrition_per_100g(self):
        """Calculate nutrition per 100g"""
        if not self.serving_g:
            return {}
        factor = Decimal('100') / Decimal(self.serving_g)
        calories = self._calories_per_serving()
        def _round(val):
            return round(float(Decimal(val) * factor), 1) if val is not None else None
        return {
            'energy_kj': _round(self.energy_kj),
            'fat_g': _round(self.fat_g),
            'sat_fat_g': _round(self.sat_fat_g),
            'carbs_g': _round(self.carbs_g),
            'sugars_g': _round(self.sugars_g),
            'protein_g': _round(self.protein_g),
            'sodium_mg': _round(self.sodium_mg),
            'water_g': _round(self.water_g),
            'calories_kcal': round(float(calories * factor), 1) if calories is not None else None,
        }

    def get_nutrition_per_serving(self):
        """Get nutrition per serving"""
        calories = self._calories_per_serving()
        return {
            'energy_kj': self.energy_kj,
            'fat_g': self.fat_g,
            'sat_fat_g': self.sat_fat_g,
            'carbs_g': self.carbs_g,
            'sugars_g': self.sugars_g,
            'protein_g': self.protein_g,
            'sodium_mg': self.sodium_mg,
            'water_g': self.water_g,
            'calories_kcal': round(float(calories), 1) if calories is not None else None,
        }

    def get_calories_per_serving(self, serving_size_g: int):
        calories_per_100 = self.get_nutrition_per_100g().get('calories_kcal')
        if calories_per_100 is None:
            return None
        return round(float(calories_per_100) * (serving_size_g / 100.0), 1)
