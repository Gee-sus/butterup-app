from django.core.management.base import BaseCommand
from decimal import Decimal
from pricing.models import Store, Product, Price


class Command(BaseCommand):
    help = 'Seed the database with stores, products, and prices'

    def handle(self, *args, **options):
        self.stdout.write('Seeding butterup database...')
        
        # Create stores
        stores_data = [
            "Pak'nSave",
            "Woolworths", 
            "New World",
            "Asian Mart"
        ]
        
        stores = {}
        for store_name in stores_data:
            store, created = Store.objects.get_or_create(name=store_name)
            stores[store_name] = store
            if created:
                self.stdout.write(f'Created store: {store_name}')
        
        # Create products
        products_data = [
            ("Anchor", "500g"),
            ("Mainland", "500g")
        ]
        
        products = {}
        for brand, size in products_data:
            product, created = Product.objects.get_or_create(brand=brand, size=size)
            products[f"{brand} {size}"] = product
            if created:
                self.stdout.write(f'Created product: {brand} {size}')
        
        # Create prices
        prices_data = [
            # Anchor 500g prices
            ("Anchor 500g", "Pak'nSave", Decimal('6.49'), Decimal('1.30')),
            ("Anchor 500g", "Woolworths", Decimal('6.99'), Decimal('1.40')),
            ("Anchor 500g", "New World", Decimal('7.29'), Decimal('1.46')),
            
            # Mainland 500g prices
            ("Mainland 500g", "Pak'nSave", Decimal('7.29'), Decimal('1.46')),
            ("Mainland 500g", "Woolworths", Decimal('7.49'), Decimal('1.50')),
            ("Mainland 500g", "New World", Decimal('7.89'), Decimal('1.58')),
        ]
        
        for product_key, store_name, price, unit in prices_data:
            product = products[product_key]
            store = stores[store_name]
            
            # Create or update price
            price_obj, created = Price.objects.get_or_create(
                product=product,
                store=store,
                defaults={'price': price, 'unit': unit}
            )
            
            if not created:
                # Update existing price
                price_obj.price = price
                price_obj.unit = unit
                price_obj.save()
            
            self.stdout.write(f'Set price: {product} at {store} = ${price} (${unit}/100g)')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded butterup database!')
        )
