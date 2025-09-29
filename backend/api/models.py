from django.db import models
from django.db.models import Q, CheckConstraint
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import hashlib
from PIL import Image
import os
import json


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
    """Butter product model"""
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100)
    gtin = models.CharField(max_length=14, unique=True, blank=True, null=True, 
                          help_text="Global Trade Item Number (8, 12, 13, or 14 digits)")
    weight_grams = models.IntegerField(help_text="Weight in grams")
    package_type = models.CharField(max_length=50, blank=True)  # Block, spreadable, etc.
    image = models.ImageField(upload_to="products/", blank=True, null=True)  # Direct image field
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'brand', 'weight_grams']

    def __str__(self):
        return f"{self.brand} {self.name} ({self.weight_grams}g)"
    
    @property
    def brand_display_name(self):
        """Get the display name for the brand using the Brand database"""
        try:
            from api.utils.brand_extractor import BrandExtractor
            return BrandExtractor.extract_brand_from_name(self.brand)
        except:
            return self.brand

    @property
    def primary_image(self):
        """Get the primary image for this product, preferring STORE > GS1 > OFF > UPLOAD and only images with files"""
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
    
    def get_nutrition_per_100g(self):
        """Calculate nutrition per 100g"""
        factor = 100 / self.serving_g
        return {
            'energy_kj': round(self.energy_kj * factor, 1),
            'fat_g': round(self.fat_g * factor, 1),
            'sat_fat_g': round(self.sat_fat_g * factor, 1),
            'carbs_g': round(self.carbs_g * factor, 1),
            'sugars_g': round(self.sugars_g * factor, 1),
            'protein_g': round(self.protein_g * factor, 1),
            'sodium_mg': round(self.sodium_mg * factor, 1),
        }
    
    def get_nutrition_per_serving(self):
        """Get nutrition per serving"""
        return {
            'energy_kj': self.energy_kj,
            'fat_g': self.fat_g,
            'sat_fat_g': self.sat_fat_g,
            'carbs_g': self.carbs_g,
            'sugars_g': self.sugars_g,
            'protein_g': self.protein_g,
            'sodium_mg': self.sodium_mg,
        } 