import os
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings
from api.models import Product, ImageAsset

class Command(BaseCommand):
    help = "Link butter product images from manual_images directory to products"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be linked without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Mapping of image files to product matching criteria
        image_mappings = [
            {
                "filename": "anchor_butter_500g.png",
                "brand": "Anchor",
                "name_contains": "Pure Butter",
                "weight": 500
            },
            {
                "filename": "lewis_road_butter_250g_salted.png",
                "brand": "Lewis Road Creamery",
                "name_contains": "Lightly Salted",
                "weight": 250
            },
            {
                "filename": "lewis_road_butter_250g_unsalted.png",
                "brand": "Lewis Road Creamery",
                "name_contains": "Unsalted",
                "weight": 250
            },
            {
                "filename": "mainland_butter_500g_salted.png",
                "brand": "Mainland",
                "name_contains": "Butter Salted",
                "weight": 500
            },
            {
                "filename": "mainland_butter_500g_unsalted.png",
                "brand": "Mainland",
                "name_contains": "Unsalted",
                "weight": 500
            },
            {
                "filename": "organic_times_butter_250g.png",
                "brand": "Organic Times",
                "name_contains": "Salted",
                "weight": 250
            },
            {
                "filename": "pams_butter_500g.png",
                "brand": "Pams",
                "name_contains": "Pure",
                "weight": 500
            },
            {
                "filename": "petit_normand_butter_200g_salted.png",
                "brand": "Petit Normand",
                "name_contains": "Salted Butter",
                "weight": 200
            },
            {
                "filename": "petit_normand_butter_200g_unsalted.png",
                "brand": "Petit Normand",
                "name_contains": "Unsalted",
                "weight": 200
            },
        ]

        manual_images_dir = os.path.join(settings.BASE_DIR, "manual_images")
        
        if not os.path.exists(manual_images_dir):
            self.stdout.write(self.style.ERROR(f"Manual images directory not found: {manual_images_dir}"))
            return

        self.stdout.write("🔗 Linking butter product images...")
        
        linked_count = 0
        not_found_count = 0
        
        for mapping in image_mappings:
            # Find matching product
            try:
                if mapping["name_contains"] == "Salted Butter":
                    # More specific matching for Petit Normand Salted
                    product = Product.objects.get(
                        brand__iexact=mapping["brand"],
                        name__iexact=mapping["name_contains"],
                        weight_grams=mapping["weight"]
                    )
                else:
                    product = Product.objects.get(
                        brand__iexact=mapping["brand"],
                        name__icontains=mapping["name_contains"],
                        weight_grams=mapping["weight"]
                    )
            except Product.DoesNotExist:
                self.stdout.write(f"❌ Product not found: {mapping['brand']} - {mapping['name_contains']} ({mapping['weight']}g)")
                not_found_count += 1
                continue
            except Product.MultipleObjectsReturned:
                self.stdout.write(f"⚠️  Multiple products found for: {mapping['brand']} - {mapping['name_contains']} ({mapping['weight']}g)")
                not_found_count += 1
                continue

            # Check if image file exists
            image_path = os.path.join(manual_images_dir, mapping["filename"])
            if not os.path.exists(image_path):
                self.stdout.write(f"❌ Image file not found: {mapping['filename']}")
                not_found_count += 1
                continue

            # Check if product already has an image
            if product.image:
                self.stdout.write(f"⏭️  Skipped: {product} - already has image")
                continue

            if dry_run:
                self.stdout.write(f"[DRY RUN] Would link: {mapping['filename']} -> {product}")
                linked_count += 1
            else:
                # Link the image to the product
                with open(image_path, 'rb') as f:
                    product.image.save(
                        mapping["filename"],
                        File(f),
                        save=True
                    )
                self.stdout.write(self.style.SUCCESS(f"✅ Linked: {mapping['filename']} -> {product}"))
                linked_count += 1

        self.stdout.write(f"\n===== SUMMARY =====")
        self.stdout.write(f"Linked: {linked_count}")
        self.stdout.write(f"Not found: {not_found_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN complete. No changes saved."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Successfully linked {linked_count} product images!"))
