import asyncio
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from scraper.zenrows_scraper import ZenRowsScraperSync
from api.models import Store, Product, Price, ScrapingLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Test ZenRows scraper for PakNSave and Woolworths butter products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--store',
            type=str,
            choices=['paknsave', 'countdown', 'all'],
            default='all',
            help='Which store to scrape (default: all)'
        )
        parser.add_argument(
            '--save',
            action='store_true',
            help='Save scraped data to database'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )

    def handle(self, *args, **options):
        store_choice = options['store']
        save_data = options['save']
        verbose = options['verbose']
        
        if verbose:
            logging.basicConfig(level=logging.INFO)
        
        self.stdout.write(
            self.style.SUCCESS(f'🧈 Starting ZenRows scraper test for {store_choice}')
        )
        
        # Initialize scraper
        scraper = ZenRowsScraperSync()
        
        try:
            if store_choice == 'all':
                self._test_all_stores(scraper, save_data)
            elif store_choice == 'paknsave':
                self._test_paknsave(scraper, save_data)
            elif store_choice == 'countdown':
                self._test_countdown(scraper, save_data)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Scraping failed: {e}')
            )
            logger.error(f"Scraping failed: {e}")
            raise

    def _test_all_stores(self, scraper, save_data):
        """Test scraping from all stores"""
        self.stdout.write("🔄 Testing all stores...")
        
        results = scraper.scrape_all_butter()
        
        # Display results
        self._display_results(results)
        
        # Save to database if requested
        if save_data:
            self._save_results_to_db(results)

    def _test_paknsave(self, scraper, save_data):
        """Test Pak'nSave scraping"""
        self.stdout.write("🔄 Testing Pak'nSave...")
        
        products = scraper.scrape_paknsave_butter()
        
        # Display results
        self.stdout.write(f"✅ Found {len(products)} Pak'nSave products:")
        for i, product in enumerate(products, 1):
            self.stdout.write(
                f"  {i}. {product['name']} - ${product['price']} ({product['brand']})"
            )
        
        # Save to database if requested
        if save_data:
            self._save_products_to_db(products, 'paknsave')

    def _test_countdown(self, scraper, save_data):
        """Test Woolworths scraping"""
        self.stdout.write("🔄 Testing Woolworths...")
        
        products = scraper.scrape_countdown_butter()
        
        # Display results
        self.stdout.write(f"✅ Found {len(products)} Woolworths products:")
        for i, product in enumerate(products, 1):
            self.stdout.write(
                f"  {i}. {product['name']} - ${product['price']} ({product['brand']})"
            )
        
        # Save to database if requested
        if save_data:
            self._save_products_to_db(products, 'countdown')

    def _display_results(self, results):
        """Display scraping results"""
        paknsave_products = results.get('paknsave', [])
        countdown_products = results.get('countdown', [])
        
        self.stdout.write(f"\n📊 Scraping Results:")
        self.stdout.write(f"  Pak'nSave: {len(paknsave_products)} products")
        self.stdout.write(f"  Woolworths: {len(countdown_products)} products")
        self.stdout.write(f"  Total: {len(paknsave_products) + len(countdown_products)} products")
        
        # Show sample products
        if paknsave_products:
            self.stdout.write(f"\n🛒 Pak'nSave Sample Products:")
            for i, product in enumerate(paknsave_products[:3], 1):
                self.stdout.write(
                    f"  {i}. {product['name']} - ${product['price']} ({product['brand']})"
                )
        
        if countdown_products:
            self.stdout.write(f"\n🏪 Woolworths Sample Products:")
            for i, product in enumerate(countdown_products[:3], 1):
                self.stdout.write(
                    f"  {i}. {product['name']} - ${product['price']} ({product['brand']})"
                )

    def _save_results_to_db(self, results):
        """Save all results to database"""
        self.stdout.write("\n💾 Saving results to database...")
        
        paknsave_products = results.get('paknsave', [])
        countdown_products = results.get('countdown', [])
        
        if paknsave_products:
            self._save_products_to_db(paknsave_products, 'paknsave')
        
        if countdown_products:
            self._save_products_to_db(countdown_products, 'countdown')

    def _save_products_to_db(self, products, store_chain):
        """Save products to database"""
        try:
            # Get or create store
            store, created = Store.objects.get_or_create(
                chain=store_chain,
                name=f"{store_chain.title()} Main Store",
                defaults={
                    'location': 'New Zealand',
                    'region': 'NZ',
                    'city': 'Auckland',
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f"  ✅ Created new store: {store}")
            else:
                self.stdout.write(f"  📍 Using existing store: {store}")
            
            saved_count = 0
            
            for product_data in products:
                try:
                    # Get or create product
                    product, created = Product.objects.get_or_create(
                        name=product_data['name'],
                        brand=product_data['brand'],
                        weight_grams=product_data.get('weight_grams', 500),
                        defaults={
                            'package_type': 'Block',
                            'is_active': True
                        }
                    )
                    
                    if created:
                        self.stdout.write(f"    ✅ Created product: {product}")
                    
                    # Create price record
                    price = Price.objects.create(
                        store=store,
                        product=product,
                        price=product_data['price'],
                        is_on_special=False,
                        scraped_at=timezone.now()
                    )
                    
                    saved_count += 1
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"    ⚠️  Error saving product {product_data['name']}: {e}")
                    )
                    continue
            
            # Create scraping log
            ScrapingLog.objects.create(
                store=store,
                status='success',
                products_scraped=saved_count,
                completed_at=timezone.now()
            )
            
            self.stdout.write(
                self.style.SUCCESS(f"  ✅ Saved {saved_count} products to database")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"  ❌ Error saving to database: {e}")
            )
            logger.error(f"Error saving products to database: {e}")

