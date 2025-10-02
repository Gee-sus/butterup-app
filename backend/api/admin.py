from django.contrib import admin
from .models import Store, Product, Price, PriceAlert, ImageAsset, NutritionProfile, Brand, ProductScoreSnapshot, ProductUserRating

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'chain', 'address']
    list_filter = ['chain']
    search_fields = ['name', 'address']

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    exclude = ['display_name']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    ordering = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    fields = (
        'name', 'brand', 'slug', 'weight_grams', 'package_type', 'category', 'image',
        'is_active', 'is_healthy_option', 'serving_size_g', 'versatility_tags',
        'nutrition_profile', 'healthy_alternatives'
    )
    list_display = ('name', 'brand', 'category', 'is_healthy_option', 'is_active')
    list_filter = ('category', 'is_healthy_option', 'is_active')
    search_fields = ('name', 'brand', 'slug')
    prepopulated_fields = {'slug': ('brand', 'name')}
    autocomplete_fields = ('nutrition_profile', 'healthy_alternatives')
    filter_horizontal = ('healthy_alternatives',)
    
@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ['product', 'store', 'price', 'price_per_kg', 'recorded_at']
    list_filter = ['store__chain', 'product__brand', 'recorded_at']
    search_fields = ['product__name', 'store__name']

@admin.register(PriceAlert)
class PriceAlertAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'store', 'target_price', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'store__chain']
    search_fields = ['user__username', 'product__name']

@admin.register(ImageAsset)
class ImageAssetAdmin(admin.ModelAdmin):
    list_display = ['sku', 'source', 'last_fetched_at']
    list_filter = ['source', 'last_fetched_at']
    search_fields = ['sku', 'alt_text']

@admin.register(NutritionProfile)
class NutritionProfileAdmin(admin.ModelAdmin):
    list_display = ['slug', 'origin', 'serving_g', 'last_verified_at', 'source', 'is_stale_display']
    list_filter = ['origin', 'last_verified_at', 'source']
    search_fields = ['slug', 'origin']
    readonly_fields = ['created_at', 'updated_at']
    
    def is_stale_display(self, obj):
        return "Yes" if obj.is_stale() else "No"
    is_stale_display.short_description = "Data Stale"

@admin.register(ProductScoreSnapshot)
class ProductScoreSnapshotAdmin(admin.ModelAdmin):
    list_display = ('product', 'overall_score', 'affordability_score', 'fat_quality_score', 'recipe_friendly_score', 'updated_at')
    search_fields = ('product__name', 'product__brand')
    autocomplete_fields = ('product',)


@admin.register(ProductUserRating)
class ProductUserRatingAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'overall_score', 'cost_score', 'texture_score', 'recipe_score', 'updated_at')
    search_fields = ('product__name', 'product__brand', 'user__username')
    list_filter = ('updated_at',)
    autocomplete_fields = ('product', 'user')
