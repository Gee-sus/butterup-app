from django.contrib import admin
from .models import Store, Product, Price, PriceAlert, ImageAsset, NutritionProfile, Brand

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
    # Show brand first in the Name column, e.g. "Anchor Pure Butter"
    fields = ("name", "brand", "weight_grams", "package_type", "image", "is_active")
    
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
