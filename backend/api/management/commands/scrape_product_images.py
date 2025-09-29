from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Product, Store, ImageAsset, Price
from scraper.image_scraper import StoreImageScraper
import logging
from typing import List, Dict
import time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Scrape product images from store websites'

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
            '--limit',
            type=int,
            default=10,
            help='Maximum number of products to process',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-scrape even if images already exist',
        )

    def handle(self, *args, **options):
        store_filter = options['store']
        product_filter = options['product']
        limit = options['limit']
        force = options['force']

        self.stdout.write(
            self.style.SUCCESS(f'Starting image scraping...')
        )

        # Get products to process
        products = self._get_products_to_process(store_filter, product_filter, limit)
        
        if not products:
            self.stdout.write(
                self.style.WARNING('No products found to process')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {len(products)} products to process')
        )

        # Initialize scraper
        scraper = StoreImageScraper()
        
        success_count = 0
        error_count = 0

        for product_data in products:
            try:
                self.stdout.write(f"Processing: {product_data['product'].name} at {product_data['store'].name}")
                
                # Check if we already have images for this product/store combination
                if not force:
                    existing_images = ImageAsset.objects.filter(
                        product=product_data['product'],
                        store=product_data['store'],
                        source='STORE',
                        is_active=True
                    )
                    if existing_images.exists():
                        self.stdout.write(
                            self.style.WARNING(f"Images already exist for {product_data['product'].name} at {product_data['store'].name}")
                        )
                        continue

                # Get product URL from price data
                product_url = self._get_product_url(product_data['product'], product_data['store'])
                if not product_url:
                    self.stdout.write(
                        self.style.WARNING(f"No URL found for {product_data['product'].name} at {product_data['store'].name}")
                    )
                    continue

                # Scrape images
                images = scraper.scrape_product_images(product_url, product_data['store'].chain)
                
                if not images:
                    self.stdout.write(
                        self.style.WARNING(f"No images found for {product_data['product'].name} at {product_data['store'].name}")
                    )
                    continue

                # Save images to database
                saved_count = self._save_images(images, product_data['product'], product_data['store'], scraper)
                
                if saved_count > 0:
                    success_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"Saved {saved_count} images for {product_data['product'].name} at {product_data['store'].name}")
                    )
                else:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"Failed to save images for {product_data['product'].name} at {product_data['store'].name}")
                    )

                # Add delay between requests
                time.sleep(2)

            except Exception as e:
                error_count += 1
                logger.error(f"Error processing {product_data['product'].name} at {product_data['store'].name}: {e}")
                self.stdout.write(
                    self.style.ERROR(f"Error processing {product_data['product'].name}: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(f'Image scraping completed! Success: {success_count}, Errors: {error_count}')
        )

    def _get_products_to_process(self, store_filter: str, product_filter: str, limit: int) -> List[Dict]:
        """Get products that need image scraping"""
        # Get recent prices to find products with URLs
        recent_prices = Price.objects.select_related('product', 'store').order_by('-recorded_at')
        
        if store_filter:
            recent_prices = recent_prices.filter(store__chain=store_filter)
        
        if product_filter:
            recent_prices = recent_prices.filter(product__name__icontains=product_filter)
        
        # Get unique product/store combinations
        processed_combinations = set()
        products_to_process = []
        
        for price in recent_prices[:limit * 10]:  # Get more to account for duplicates
            combination = (price.product.id, price.store.id)
            if combination not in processed_combinations:
                processed_combinations.add(combination)
                products_to_process.append({
                    'product': price.product,
                    'store': price.store
                })
                
                if len(products_to_process) >= limit:
                    break
        
        return products_to_process

    def _get_product_url(self, product: Product, store: Store) -> str:
        """Get the product URL from the most recent price record"""
        # This is a placeholder - you'll need to implement this based on your data structure
        # You might need to add a URL field to your Price model or store URLs elsewhere
        
        # For now, we'll try to construct URLs based on store patterns
        if store.chain == 'paknsave':
            # Example Pak'nSave URL pattern
            return f"https://www.paknsave.co.nz/product/{product.gtin}"
        elif store.chain == 'countdown':
            # Example Countdown URL pattern
            return f"https://shop.countdown.co.nz/product/{product.gtin}"
        elif store.chain == 'new_world':
            # Example New World URL pattern
            return f"https://shop.newworld.co.nz/product/{product.gtin}"
        
        return None

    def _save_images(self, images: List[Dict], product: Product, store: Store, scraper: StoreImageScraper) -> int:
        """Save scraped images to the database"""
        saved_count = 0
        
        for image_data in images[:3]:  # Limit to 3 images per product
            try:
                # Download the image
                download_result = scraper.download_image(
                    image_data['url'],
                    product.name,
                    store.chain
                )
                
                if not download_result:
                    continue
                
                django_file, checksum = download_result
                
                # Check if we already have this image (by checksum)
                existing_image = ImageAsset.objects.filter(
                    product=product,
                    store=store,
                    source='STORE',
                    checksum=checksum
                ).first()
                
                if existing_image:
                    logger.info(f"Image already exists for {product.name} at {store.name}")
                    continue
                
                # Create new image asset
                with transaction.atomic():
                    image_asset = ImageAsset.objects.create(
                        product=product,
                        store=store,
                        source='STORE',
                        file=django_file,
                        url=image_data['url'],
                        original_url=image_data['url'],
                        attribution_text=f"Product image from {store.name}",
                        attribution_url=image_data['url'],
                        checksum=checksum,
                        is_active=True
                    )
                    
                    saved_count += 1
                    logger.info(f"Saved image for {product.name} at {store.name}")
                
            except Exception as e:
                logger.error(f"Error saving image for {product.name} at {store.name}: {e}")
                continue
        
        return saved_count
