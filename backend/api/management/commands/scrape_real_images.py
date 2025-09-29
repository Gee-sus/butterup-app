from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Product, Store, ImageAsset
from scraper.real_image_scraper import RealProductImageScraper
import logging
from typing import List, Dict
import time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Scrape real product images from actual store URLs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--store',
            type=str,
            help='Specific store to scrape (paknsave, countdown, new_world)',
        )
        parser.add_argument(
            '--product',
            type=str,
            help='Specific product name to scrape',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-scrape even if images already exist',
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Test mode - only scrape one product per store',
        )

    def handle(self, *args, **options):
        store_filter = options['store']
        product_filter = options['product']
        force = options['force']
        test_mode = options['test']

        self.stdout.write(
            self.style.SUCCESS(f'Starting REAL image scraping...')
        )

        # Initialize the real image scraper
        scraper = RealProductImageScraper()
        
        success_count = 0
        error_count = 0

        # Get products to process
        products_to_scrape = self._get_products_to_scrape(scraper, store_filter, product_filter, test_mode)
        
        if not products_to_scrape:
            self.stdout.write(
                self.style.WARNING('No products found to scrape')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {len(products_to_scrape)} products to scrape')
        )

        for product_data in products_to_scrape:
            try:
                store = product_data['store']
                product_name = product_data['name']
                gtin = product_data.get('gtin')
                
                self.stdout.write(f"Processing: {product_name} at {store}")
                
                # Check if we already have images for this product/store combination
                if not force and gtin:
                    existing_images = ImageAsset.objects.filter(
                        source='STORE',
                        is_active=True
                    ).filter(
                        product__gtin=gtin,
                        store__chain=store
                    )
                    if existing_images.exists():
                        self.stdout.write(
                            self.style.WARNING(f"Images already exist for {product_name} at {store}")
                        )
                        continue

                # Scrape real images
                images = scraper.scrape_real_product_images(store, product_name)
                
                if not images:
                    self.stdout.write(
                        self.style.WARNING(f"No real images found for {product_name} at {store}")
                    )
                    continue

                # Save images to database
                saved_count = self._save_real_images(images, product_name, store, scraper, gtin)
                
                if saved_count > 0:
                    success_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Saved {saved_count} real images for {product_name} at {store}")
                    )
                else:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"Failed to save real images for {product_name} at {store}")
                    )

                # Add delay between requests
                time.sleep(3)

            except Exception as e:
                error_count += 1
                logger.error(f"Error processing {product_data['name']} at {product_data['store']}: {e}")
                self.stdout.write(
                    self.style.ERROR(f"Error processing {product_data['name']}: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(f'Real image scraping completed! Success: {success_count}, Errors: {error_count}')
        )

    def _get_products_to_scrape(self, scraper, store_filter, product_filter, test_mode):
        """Get products to scrape from the real product URLs"""
        products_to_scrape = []
        
        for store, products in scraper.real_product_urls.items():
            # Skip if store filter is specified and doesn't match
            if store_filter and store.lower() != store_filter.lower():
                continue
            
            store_products = []
            for product_key, product_data in products.items():
                # Skip if product filter is specified and doesn't match
                if product_filter and product_filter.lower() not in product_data['name'].lower():
                    continue
                
                store_products.append({
                    'store': store,
                    'name': product_data['name'],
                    'gtin': product_data.get('gtin'),
                    'url': product_data['url']
                })
                
                # In test mode, only process one product per store
                if test_mode:
                    break
            
            products_to_scrape.extend(store_products)
        
        return products_to_scrape

    def _save_real_images(self, images: List[Dict], product_name: str, store: str, scraper, gtin: str = None) -> int:
        """Save scraped real images to the database"""
        saved_count = 0
        
        # Get or create store (handle duplicates)
        try:
            store_obj = Store.objects.get(chain=store.lower())
        except Store.DoesNotExist:
            store_obj = Store.objects.create(
                name=store.title(), 
                chain=store.lower()
            )
        except Store.MultipleObjectsReturned:
            # If multiple stores exist, use the first one
            store_obj = Store.objects.filter(chain=store.lower()).first()
        
        # Get or create product
        product_obj = None
        if gtin:
            product_obj, created = Product.objects.get_or_create(
                gtin=gtin,
                defaults={
                    'name': product_name,
                    'brand': product_name.split()[0],  # First word as brand
                    'weight_grams': 500,  # Default for butter
                    'package_type': 'Block'
                }
            )
        else:
            # Try to find by name
            product_obj = Product.objects.filter(name__icontains=product_name).first()
            if not product_obj:
                # Create new product
                product_obj = Product.objects.create(
                    name=product_name,
                    brand=product_name.split()[0],
                    weight_grams=500,
                    package_type='Block'
                )
        
        for image_data in images[:3]:  # Limit to 3 images per product
            try:
                # Download the real image
                download_result = scraper.download_real_image(
                    image_data['url'],
                    product_name,
                    store
                )
                
                if not download_result:
                    continue
                
                django_file, checksum = download_result
                
                # Check if we already have this image (by checksum)
                existing_image = ImageAsset.objects.filter(
                    source='STORE',
                    checksum=checksum
                ).first()
                
                if existing_image:
                    logger.info(f"Real image already exists for {product_name} at {store}")
                    continue
                
                # Create new image asset
                with transaction.atomic():
                    image_asset = ImageAsset.objects.create(
                        product=product_obj,
                        store=store_obj,
                        source='STORE',
                        file=django_file,
                        url=image_data['url'],
                        original_url=image_data['url'],
                        attribution_text=f"Real product image from {store}",
                        attribution_url=image_data['url'],
                        checksum=checksum,
                        is_active=True
                    )
                    
                    saved_count += 1
                    logger.info(f"Saved real image for {product_name} at {store}")
                
            except Exception as e:
                logger.error(f"Error saving real image for {product_name} at {store}: {e}")
                continue
        
        return saved_count


def test_real_image_scraping():
    """Test the real image scraping functionality"""
    import os
    import sys
    import django
    
    # Setup Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'butter_tracker.settings')
    django.setup()
    
    print("🧈 Testing Real Image Scraping...")
    print("=" * 60)
    
    scraper = RealProductImageScraper()
    
    # Test with Pak'nSave Anchor Butter
    store = 'paknsave'
    product_name = 'Anchor Butter 500g'
    
    print(f"Testing: {product_name} at {store}")
    
    images = scraper.scrape_real_product_images(store, product_name)
    
    if images:
        print(f"✅ Found {len(images)} real images:")
        for i, img in enumerate(images[:2], 1):
            print(f"  {i}. URL: {img['url']}")
            print(f"     Alt: {img['alt_text']}")
            
            # Try to download
            download_result = scraper.download_real_image(
                img['url'],
                product_name,
                store
            )
            
            if download_result:
                django_file, checksum = download_result
                print(f"     ✅ Downloaded: {django_file.name}")
            else:
                print(f"     ❌ Failed to download")
    else:
        print("❌ No real images found")
    
    return images


if __name__ == "__main__":
    test_real_image_scraping()
