from django.contrib import admin

from .models import Product, Store, Price


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'brand', 'name', 'size_g', 'gtin')
    search_fields = ('name', 'brand', 'alt_names', 'gtin')
    list_filter = ('brand',)


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'chain', 'name', 'lat', 'lng')
    search_fields = ('chain', 'name', 'address')
    list_filter = ('chain',)


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'store', 'price', 'currency', 'updated_at')
    list_filter = ('currency', 'store__chain')
    search_fields = ('product__name', 'store__name')
