from django.core.management.base import BaseCommand
from api.models import Product, ImageAsset
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Link existing image files to products'

    def handle(self, *args, **options):
        products = Product.objects.all()
        created_count = 0
        
        # Mapping of product names to image filenames
        image_mapping = {
            'Anchor': 'anchor_butter_500g.png',
            'Olivani': 'nuttelex_original_500g.png',  # Using similar spread image
            'Lewis Road Creamery': 'lewis_road_butter_250g_salted.png',
            'Vutter': 'vutter_original_265g.png',
            'Mainland': 'mainland_butter_500g_salted.png',
            'Petit Normand': 'petit_normand_butter_200g_unsalted.png',
            'Westgold': 'westgold_butter_500g_salted.png',
            'Nuttelex': 'nuttelex_original_500g.png',
            'Pams': 'anchor_butter_500g.png',  # Using similar butter image
            'Woolworths': 'woolworths_salted_500g.png',
            'Lurpak': 'lurpak_salted_200g.png',
            'Market Kitchen': 'market_kitchen_salted_500g.png',
            'Rolling Meadow': 'rolling_meadow_salted_500g.png',
        }
        
        for product in products:
            # Try to find matching image
            image_filename = None
            
            # First try exact brand match
            if product.brand in image_mapping:
                image_filename = image_mapping[product.brand]
            else:
                # Try to find by brand name pattern
                brand_lower = product.brand.lower().replace(' ', '_')
                possible_names = [
                    f'{brand_lower}_butter_{product.weight_grams}g.png',
                    f'{brand_lower}_{product.weight_grams}g.png',
                    f'{brand_lower}_salted_{product.weight_grams}g.png',
                    f'{brand_lower}_unsalted_{product.weight_grams}g.png'
                ]
                
                for name in possible_names:
                    full_path = os.path.join(settings.MEDIA_ROOT, 'products', name)
                    if os.path.exists(full_path):
                        image_filename = name
                        break
            
            if image_filename:
                # Check if image asset already exists
                existing_asset = ImageAsset.objects.filter(
                    product=product,
                    file=f'products/{image_filename}'
                ).first()
                
                if not existing_asset:
                    # Create new image asset
                    ImageAsset.objects.create(
                        product=product,
                        source='UPLOAD',
                        file=f'products/{image_filename}',
                        is_active=True
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Linked {image_filename} to {product.brand} {product.name}')
                    )
                else:
                    self.stdout.write(f'Image already linked: {product.brand} {product.name}')
            else:
                self.stdout.write(
                    self.style.WARNING(f'No image found for {product.brand} {product.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully linked {created_count} images to products')
        )
