"""
Management command to add comprehensive New Zealand butter varieties to the database
"""
from django.core.management.base import BaseCommand
from api.models import Product, Store, Price
from decimal import Decimal
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Add comprehensive New Zealand butter varieties to the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be added without actually adding to database',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be saved'))
        
        # Comprehensive butter data
        butter_products = [
            # Westgold Butter (Award-winning from Hokitika)
            {
                'name': 'Westgold Pure Butter',
                'brand': 'Westgold',
                'weight_grams': 500,
                'package_type': 'Block',
                'gtin': '9415007001000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007001001'},
                    {'type': 'Unsalted', 'gtin': '9415007001002'},
                ]
            },
            {
                'name': 'Westgold Spreadable Butter',
                'brand': 'Westgold',
                'weight_grams': 500,
                'package_type': 'Spreadable',
                'gtin': '9415007001003',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007001004'},
                ]
            },
            
            # NZMP Butter (Fonterra)
            {
                'name': 'NZMP Pure Butter',
                'brand': 'NZMP',
                'weight_grams': 500,
                'package_type': 'Block',
                'gtin': '9415007002000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007002001'},
                    {'type': 'Unsalted', 'gtin': '9415007002002'},
                ]
            },
            {
                'name': 'NZMP Organic Salted Butter',
                'brand': 'NZMP',
                'weight_grams': 500,
                'package_type': 'Organic',
                'gtin': '9415007002003',
                'variants': [
                    {'type': 'Organic Salted', 'gtin': '9415007002004'},
                ]
            },
            
            # Pāmu Butter (Grass-fed)
            {
                'name': 'Pāmu Grass-fed Butter',
                'brand': 'Pāmu',
                'weight_grams': 500,
                'package_type': 'Grass-fed',
                'gtin': '9415007003000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007003001'},
                    {'type': 'Unsalted', 'gtin': '9415007003002'},
                ]
            },
            {
                'name': 'Pāmu Organic Butter',
                'brand': 'Pāmu',
                'weight_grams': 500,
                'package_type': 'Organic',
                'gtin': '9415007003003',
                'variants': [
                    {'type': 'Organic Salted', 'gtin': '9415007003004'},
                ]
            },
            
            # Lewis Road Creamery - Additional sizes
            {
                'name': 'Lewis Road Creamery Cultured Butter',
                'brand': 'Lewis Road Creamery',
                'weight_grams': 250,
                'package_type': 'Cultured',
                'gtin': '9415007004000',
                'variants': [
                    {'type': 'Unsalted', 'gtin': '9415007004001'},
                    {'type': 'Salted', 'gtin': '9415007004002'},
                ]
            },
            
            # Anchor - Additional varieties
            {
                'name': 'Anchor Original Soft Spreadable',
                'brand': 'Anchor',
                'weight_grams': 500,
                'package_type': 'Spreadable',
                'gtin': '9415007005000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007005001'},
                ]
            },
            {
                'name': 'Anchor Unsalted Butter',
                'brand': 'Anchor',
                'weight_grams': 500,
                'package_type': 'Block',
                'gtin': '9415007005002',
                'variants': [
                    {'type': 'Unsalted', 'gtin': '9415007005003'},
                ]
            },
            
            # Mainland - Additional varieties
            {
                'name': 'Mainland Spreadable Butter',
                'brand': 'Mainland',
                'weight_grams': 500,
                'package_type': 'Spreadable',
                'gtin': '9415007006000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007006001'},
                ]
            },
            
            # Vegan/Dairy-free alternatives
            {
                'name': 'Nuttelex Original',
                'brand': 'Nuttelex',
                'weight_grams': 500,
                'package_type': 'Dairy-free',
                'gtin': '9415007007000',
                'variants': [
                    {'type': 'Original', 'gtin': '9415007007001'},
                ]
            },
            {
                'name': 'Nuttelex Coconut',
                'brand': 'Nuttelex',
                'weight_grams': 500,
                'package_type': 'Dairy-free',
                'gtin': '9415007007002',
                'variants': [
                    {'type': 'Coconut', 'gtin': '9415007007003'},
                ]
            },
            {
                'name': 'Olivani Original',
                'brand': 'Olivani',
                'weight_grams': 500,
                'package_type': 'Dairy-free',
                'gtin': '9415007008000',
                'variants': [
                    {'type': 'Original', 'gtin': '9415007008001'},
                ]
            },
            {
                'name': 'Vutter Plant-based Butter',
                'brand': 'Vutter',
                'weight_grams': 500,
                'package_type': 'Dairy-free',
                'gtin': '9415007009000',
                'variants': [
                    {'type': 'Original', 'gtin': '9415007009001'},
                ]
            },
            
            # Additional sizes for existing brands
            {
                'name': 'Westgold Pure Butter',
                'brand': 'Westgold',
                'weight_grams': 250,
                'package_type': 'Block',
                'gtin': '9415007010000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007010001'},
                    {'type': 'Unsalted', 'gtin': '9415007010002'},
                ]
            },
            {
                'name': 'Anchor Pure Butter',
                'brand': 'Anchor',
                'weight_grams': 250,
                'package_type': 'Block',
                'gtin': '9415007011000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007011001'},
                ]
            },
            {
                'name': 'Mainland Butter',
                'brand': 'Mainland',
                'weight_grams': 250,
                'package_type': 'Block',
                'gtin': '9415007012000',
                'variants': [
                    {'type': 'Salted', 'gtin': '9415007012001'},
                    {'type': 'Unsalted', 'gtin': '9415007012002'},
                ]
            },
        ]
        
        # Get stores
        stores = Store.objects.filter(is_active=True)
        if not stores.exists():
            self.stdout.write(self.style.ERROR('No active stores found. Please add stores first.'))
            return
        
        added_count = 0
        updated_count = 0
        
        for product_data in butter_products:
            for variant in product_data['variants']:
                # Create product name with variant
                full_name = f"{product_data['name']} {variant['type']}"
                
                # Check if product already exists
                existing_product = Product.objects.filter(
                    name=full_name,
                    brand=product_data['brand'],
                    weight_grams=product_data['weight_grams']
                ).first()
                
                if existing_product:
                    if not dry_run:
                        # Update existing product
                        existing_product.gtin = variant['gtin']
                        existing_product.package_type = product_data['package_type']
                        existing_product.save()
                    updated_count += 1
                    self.stdout.write(f"Updated: {full_name}")
                else:
                    if not dry_run:
                        # Create new product
                        product = Product.objects.create(
                            name=full_name,
                            brand=product_data['brand'],
                            gtin=variant['gtin'],
                            weight_grams=product_data['weight_grams'],
                            package_type=product_data['package_type'],
                            is_active=True
                        )
                        
                        # Add sample prices for each store
                        self._add_sample_prices(product, stores, dry_run)
                    
                    added_count += 1
                    self.stdout.write(f"Added: {full_name}")
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'DRY RUN: Would add {added_count} products and update {updated_count} products'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully added {added_count} products and updated {updated_count} products'))
    
    def _add_sample_prices(self, product, stores, dry_run=False):
        """Add sample prices for a product across all stores"""
        if dry_run:
            return
        
        # Base price ranges by brand (per 100g)
        brand_prices = {
            'Lewis Road Creamery': (0.35, 0.45),  # Premium
            'Westgold': (0.25, 0.35),  # Mid-range
            'NZMP': (0.20, 0.30),  # Mid-range
            'Pāmu': (0.30, 0.40),  # Premium organic
            'Anchor': (0.20, 0.28),  # Standard
            'Mainland': (0.20, 0.28),  # Standard
            'Organic Times': (0.30, 0.40),  # Organic
            'Pams': (0.15, 0.25),  # Budget
            'Petit Normand': (0.25, 0.35),  # Mid-range
            'Nuttelex': (0.25, 0.35),  # Dairy-free
            'Olivani': (0.30, 0.40),  # Dairy-free
            'Vutter': (0.35, 0.45),  # Premium dairy-free
        }
        
        # Adjust for package type
        package_multipliers = {
            'Organic': 1.2,
            'Grass-fed': 1.15,
            'Cultured': 1.1,
            'Dairy-free': 1.1,
            'Spreadable': 1.05,
            'Block': 1.0,
        }
        
        base_range = brand_prices.get(product.brand, (0.20, 0.30))
        multiplier = package_multipliers.get(product.package_type, 1.0)
        
        min_price_per_100g = base_range[0] * multiplier
        max_price_per_100g = base_range[1] * multiplier
        
        for store in stores:
            # Random price within range
            price_per_100g = random.uniform(min_price_per_100g, max_price_per_100g)
            total_price = (price_per_100g * product.weight_grams) / 100
            
            # Round to nearest 5 cents
            total_price = round(total_price * 20) / 20
            
            # Create price record
            Price.objects.create(
                store=store,
                product=product,
                price=Decimal(str(total_price)),
                is_on_special=random.choice([True, False, False, False]),  # 25% chance of being on special
                recorded_at=datetime.now() - timedelta(days=random.randint(0, 7))
            )
