from rest_framework import serializers


class SuggestionSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    name = serializers.CharField()


class CandidateSerializer(serializers.Serializer):
    score = serializers.FloatField()
    product_id = serializers.IntegerField(allow_null=True)
    product_name = serializers.CharField(allow_null=True)
    lines = serializers.ListField(child=serializers.CharField())
    suggestions = SuggestionSerializer(many=True, required=False)


class PriceRowSerializer(serializers.Serializer):
    store_id = serializers.IntegerField()
    store_name = serializers.CharField()
    chain = serializers.CharField()
    distance_km = serializers.FloatField()
    price = serializers.FloatField()
    currency = serializers.CharField()
    is_cheapest = serializers.BooleanField()
    savings_vs_cheapest = serializers.FloatField()
    updated_at = serializers.DateTimeField()


class ProductSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class SummarySerializer(serializers.Serializer):
    cheapest = serializers.FloatField(allow_null=True)
    max_savings = serializers.FloatField(allow_null=True)


class CompareResponseSerializer(serializers.Serializer):
    product = ProductSummarySerializer()
    prices = PriceRowSerializer(many=True)
    summary = SummarySerializer()


class PhotoInputSerializer(serializers.Serializer):
    photo = serializers.ImageField()
