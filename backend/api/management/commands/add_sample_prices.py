from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Product, Store, Price
from decimal import Decimal
import random

class Command(BaseCommand):
    help = "Add sample prices for butter products at various stores"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Get some stores to add prices for
        stores = Store.objects.all()[:10]  # First 10 stores
        products = Product.objects.all()

        if not stores.exists():
            self.stdout.write(self.style.ERROR("No stores found in database"))
            return

        if not products.exists():
            self.stdout.write(self.style.ERROR("No products found in database"))
            return

        self.stdout.write(f"💰 Adding sample prices for {products.count()} products at {stores.count()} stores...")

        # Base prices per 100g in NZD (realistic New Zealand butter prices)
        base_prices = {
            'anchor': 1.20,
            'mainland': 1.15,
            'lewis road creamery': 2.50,
            'organic times': 2.80,
            'petit normand': 3.20,
            'lurpak': 2.90,
            'westgold': 1.80,
            'pams': 0.95,
            'countdown': 1.10,
            'market kitchen': 1.05,
            'olivani': 1.40,
            'nuttelex': 1.60,
            'vutter': 1.80,
            'rolling meadow': 1.25,
        }

        created_count = 0
        skipped_count = 0

        with transaction.atomic():
            for product in products:
                brand_key = product.brand.lower()
                base_price_per_100g = base_prices.get(brand_key, 1.20)  # Default to $1.20/100g
                
                # Calculate base price for this product's weight
                base_price = Decimal(str(base_price_per_100g * product.weight_grams / 100))

                for store in stores:
                    # Check if price already exists
                    if Price.objects.filter(product=product, store=store).exists():
                        skipped_count += 1
                        continue

                    # Add some variation based on store chain
                    price_multiplier = {
                        'paknsave': 0.85,  # Pak'nSave is typically cheaper
                        'countdown': 1.0,   # Countdown baseline
                        'new_world': 1.15,  # New World typically more expensive
                    }.get(store.chain, 1.0)

                    # Add some random variation (±10%)
                    random_variation = 1 + (random.random() - 0.5) * 0.2
                    final_price = base_price * Decimal(str(price_multiplier)) * Decimal(str(random_variation))
                    final_price = final_price.quantize(Decimal('0.01'))  # Round to 2 decimal places

                    # Ensure minimum price
                    final_price = max(final_price, Decimal('1.00'))

                    if dry_run:
                        self.stdout.write(f"[DRY RUN] Would create: {product.brand} {product.name} at {store.name} - ${final_price}")
                        created_count += 1
                    else:
                        Price.objects.create(
                            product=product,
                            store=store,
                            price=final_price
                        )
                        created_count += 1

        self.stdout.write(f"\n===== SUMMARY =====")
        self.stdout.write(f"Created: {created_count}")
        self.stdout.write(f"Skipped: {skipped_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN complete. No changes saved."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Successfully added {created_count} price records!"))
