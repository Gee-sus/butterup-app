from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Product

class Command(BaseCommand):
    help = "Add butter products from the provided images"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Product data extracted from images
        products_data = [
            {
                "name": "Pure Butter",
                "brand": "Anchor",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Salted Butter",
                "brand": "Market Kitchen",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Butter Unsalted",
                "brand": "Mainland",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Butter Salted",
                "brand": "Mainland",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Spread with Olive Oil",
                "brand": "Olivani",
                "weight_grams": 500,
                "package_type": "Tub",
            },
            {
                "name": "Buttery Dairy Free",
                "brand": "Nuttelex",
                "weight_grams": 375,
                "package_type": "Tub",
            },
            {
                "name": "Salted Butter",
                "brand": "Organic Times",
                "weight_grams": 250,
                "package_type": "Block",
            },
            {
                "name": "Plant Based Butter",
                "brand": "Vutter",
                "weight_grams": 250,
                "package_type": "Tub",
            },
            {
                "name": "Pure Butter",
                "brand": "Pams",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Premium New Zealand Butter Unsalted",
                "brand": "Lewis Road Creamery",
                "weight_grams": 250,
                "package_type": "Block",
            },
            {
                "name": "Premium Lightly Salted Butter",
                "brand": "Lewis Road Creamery",
                "weight_grams": 250,
                "package_type": "Block",
            },
            {
                "name": "Salted Butter",
                "brand": "Woolworths",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Salted Butter",
                "brand": "Lurpak",
                "weight_grams": 200,
                "package_type": "Block",
            },
            {
                "name": "Salted Butter",
                "brand": "Petit Normand",
                "weight_grams": 200,
                "package_type": "Block",
            },
            {
                "name": "Grass Fed Salted Butter",
                "brand": "Westgold",
                "weight_grams": 400,
                "package_type": "Block",
            },
            {
                "name": "Salted Butter",
                "brand": "Rolling Meadow",
                "weight_grams": 500,
                "package_type": "Block",
            },
            {
                "name": "Unsalted Butter",
                "brand": "Petit Normand",
                "weight_grams": 200,
                "package_type": "Block",
            },
            {
                "name": "Grass Fed Unsalted Butter",
                "brand": "Westgold",
                "weight_grams": 400,
                "package_type": "Block",
            },
        ]

        self.stdout.write("🧈 Adding butter products to database...")
        
        created_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for product_data in products_data:
                # Check if product already exists
                existing = Product.objects.filter(
                    name=product_data["name"],
                    brand=product_data["brand"],
                    weight_grams=product_data["weight_grams"]
                ).first()
                
                if existing:
                    self.stdout.write(f"⏭️  Skipped: {product_data['brand']} {product_data['name']} ({product_data['weight_grams']}g) - already exists")
                    skipped_count += 1
                    continue
                
                if dry_run:
                    self.stdout.write(f"[DRY RUN] Would create: {product_data['brand']} {product_data['name']} ({product_data['weight_grams']}g)")
                    created_count += 1
                else:
                    product = Product.objects.create(**product_data)
                    self.stdout.write(self.style.SUCCESS(f"✅ Created: {product}"))
                    created_count += 1

        self.stdout.write(f"\n===== SUMMARY =====")
        self.stdout.write(f"Created: {created_count}")
        self.stdout.write(f"Skipped: {skipped_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN complete. No changes saved."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Successfully added {created_count} butter products!"))
