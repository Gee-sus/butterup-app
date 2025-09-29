from django.db.models import Min, Subquery, OuterRef
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Store, Product, Price
from .serializers import StoreSerializer, GroupedPriceSerializer


class StoreListView(generics.ListAPIView):
    """List all stores"""
    queryset = Store.objects.all()
    serializer_class = StoreSerializer


@api_view(['GET'])
def grouped_prices(request):
    """
    GET /api/grouped-prices/?stores=A,B,C
    Returns grouped prices by brand+size, sorted by min price ascending
    """
    stores_param = request.GET.get('stores', '')
    if not stores_param:
        return Response({'error': 'stores parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    store_names = [name.strip() for name in stores_param.split(',')]
    
    # Get stores by name
    stores = Store.objects.filter(name__in=store_names)
    if not stores.exists():
        return Response({'error': 'No valid stores found'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the latest prices for each product-store combination
    latest_prices = []
    for store in stores:
        store_prices = Price.objects.filter(store=store).select_related('product').order_by('product', '-updated_at')
        # Group by product and get the latest price for each
        seen_products = set()
        for price in store_prices:
            product_key = (price.product.brand, price.product.size)
            if product_key not in seen_products:
                latest_prices.append(price)
                seen_products.add(product_key)
    
    # Group by product (brand + size) and find the unit from the cheapest price
    product_prices = {}
    for price in latest_prices:
        product_key = (price.product.brand, price.product.size)
        if product_key not in product_prices:
            product_prices[product_key] = {
                'brand': price.product.brand,
                'size': price.product.size,
                'unit': None,  # Will be set later
                'prices': {}
            }
        product_prices[product_key]['prices'][price.store.name] = price.price
    
    # Now set the unit based on the store with the minimum price for each product
    for product_key, data in product_prices.items():
        if data['prices']:
            # Find the store with minimum price
            min_price = min(data['prices'].values())
            min_price_store = None
            for store_name, price_val in data['prices'].items():
                if price_val == min_price:
                    min_price_store = store_name
                    break
            
            # Get the unit from that store's price
            if min_price_store:
                for price in latest_prices:
                    if (price.product.brand == data['brand'] and 
                        price.product.size == data['size'] and 
                        price.store.name == min_price_store):
                        data['unit'] = price.unit
                        break
    
    # Convert to list and sort by minimum price
    result = []
    for product_key, data in product_prices.items():
        if data['prices']:  # Only include if there are prices
            min_price = min(data['prices'].values())
            result.append({
                'brand': data['brand'],
                'size': data['size'],
                'unit': float(data['unit']),
                'prices': {k: float(v) for k, v in data['prices'].items()},
                '_min_price': float(min_price)  # For sorting
            })
    
    # Sort by minimum price ascending
    result.sort(key=lambda x: x['_min_price'])
    
    # Remove the sorting helper field
    for item in result:
        del item['_min_price']
    
    return Response(result)