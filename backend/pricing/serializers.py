from rest_framework import serializers
from .models import Store, Product, Price


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'brand', 'size']


class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = ['id', 'product', 'store', 'price', 'unit', 'updated_at']


class GroupedPriceSerializer(serializers.Serializer):
    """Serializer for grouped prices endpoint"""
    brand = serializers.CharField()
    size = serializers.CharField()
    unit = serializers.DecimalField(max_digits=5, decimal_places=2)
    prices = serializers.DictField(child=serializers.DecimalField(max_digits=6, decimal_places=2))
