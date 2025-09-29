from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from api.models import Store, Product, Price, ScrapingLog
from scraper.scrapers import get_all_scrapers
from scraper.test_scraper import get_test_scrapers
import logging
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Scrape butter prices from NZ supermarkets and store in database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--stores',
            nargs='+',
            type=str,
            help='Specific stores to scrape (countdown, paknsave, newworld)',
            default=['countdown', 'paknsave', 'newworld']
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Use test scrapers instead of real scrapers'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run scraping without saving to database'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        
        self.stdout.write(
            self.style.SUCCESS('🧈 Starting ButterUp Price Scraping...')
        )
        
        # Create scraping log entry (using first store as default)
        first_store = Store.objects.filter(chain__icontains=options['stores'][0]).first()
        if not first_store:
            first_store = Store.objects.first()
        
        scraping_log = ScrapingLog.objects.create(
            store=first_store,
            status='success',  # Will be updated later
            started_at=start_time
        )
        
        try:
            # Get or create stores
            stores = self._setup_stores(options['stores'])
            
            # Get scrapers
            scrapers = self._get_scrapers(options['test'])
            
            # Run scraping
            results = self._run_scraping(scrapers, stores, options)
            
            # Update scraping log
            scraping_log.status = 'success' if not results['errors'] else 'partial'
            scraping_log.completed_at = timezone.now()
            scraping_log.products_scraped = results['total_products']
            scraping_log.errors = '\n'.join(results['errors']) if results['errors'] else ''
            scraping_log.duration_seconds = (scraping_log.completed_at - scraping_log.started_at).total_seconds()
            scraping_log.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Scraping completed successfully!\n'
                    f'📊 Total products: {results["total_products"]}\n'
                    f'🏪 Stores processed: {results["stores_processed"]}\n'
                    f'⏱️  Duration: {timezone.now() - start_time}'
                )
            )
            
        except Exception as e:
            # Update scraping log with error
            scraping_log.status = 'failed'
            scraping_log.completed_at = timezone.now()
            scraping_log.errors = str(e)
            scraping_log.duration_seconds = (scraping_log.completed_at - scraping_log.started_at).total_seconds()
            scraping_log.save()
            
            self.stdout.write(
                self.style.ERROR(f'❌ Scraping failed: {e}')
            )
            if options['verbose']:
                self.stdout.write(traceback.format_exc())

    def _setup_stores(self, store_names):
        """Setup stores in database"""
        stores = {}
        store_chains = {
            'countdown': 'Countdown',
            'paknsave': 'Pak\'nSave',
            'newworld': 'New World'
        }
        
        for store_name in store_names:
            chain = store_chains.get(store_name.lower(), store_name.title())
            store, created = Store.objects.get_or_create(
                name=f"{chain} Store",
                chain=chain,
                defaults={
                    'location': 'Online',
                    'region': 'NZ',
                    'is_active': True
                }
            )
            stores[store_name.lower()] = store
            if created:
                self.stdout.write(f'🏪 Created store: {store.name}')
        
        return stores

    def _get_scrapers(self, use_test):
        """Get appropriate scrapers"""
        if use_test:
            scrapers = get_test_scrapers()
            self.stdout.write('🧪 Using TEST scrapers (generating sample data)')
        else:
            scrapers = get_all_scrapers()
            self.stdout.write('🌐 Using REAL scrapers (scraping actual websites)')
        
        return scrapers

    def _run_scraping(self, scrapers, stores, options):
        """Run the actual scraping process"""
        total_products = 0
        stores_processed = 0
        errors = []
        
        for scraper in scrapers:
            # Extract store name from scraper class name
            class_name = scraper.__class__.__name__
            if 'Test' in class_name:
                store_name = class_name.replace('TestScraper', '').lower()
            else:
                store_name = class_name.replace('Scraper', '').lower()
            
            if store_name not in stores:
                self.stdout.write(f'⏭️  Skipping {store_name} - not in stores list')
                continue

            self.stdout.write(f'🔄 Scraping {store_name.title()}...')
            
            try:
                # Scrape butter prices
                products = scraper.scrape_butter_prices()
                self.stdout.write(f'📦 Found {len(products)} products from {store_name}')
                
                store_products = 0
                
                for product_data in products:
                    try:
                        if not options['dry_run']:
                            with transaction.atomic():
                                # Get or create product
                                product, created = Product.objects.get_or_create(
                                    name=product_data['name'],
                                    brand=product_data['brand'],
                                    weight_grams=product_data['weight_grams'],
                                    defaults={
                                        'package_type': 'Block',
                                        'is_active': True
                                    }
                                )

                                # Create price record
                                price = Price.objects.create(
                                    store=stores[store_name],
                                    product=product,
                                    price=product_data['price'],
                                    recorded_at=timezone.now(),
                                    scraped_at=timezone.now()
                                )
                                
                                total_products += 1
                                store_products += 1
                                
                                if options['verbose']:
                                    if created:
                                        self.stdout.write(f'  ➕ Created product: {product.name}')
                                    self.stdout.write(f'  💰 Added price: ${price.price} for {product.name}')
                        
                        else:
                            # Dry run - just count
                            total_products += 1
                            store_products += 1
                            if options['verbose']:
                                self.stdout.write(f'  🔍 Would add: ${product_data["price"]} for {product_data["name"]}')

                    except Exception as e:
                        error_msg = f'Error processing product {product_data.get("name", "Unknown")}: {e}'
                        errors.append(error_msg)
                        self.stdout.write(self.style.ERROR(f'  ❌ {error_msg}'))
                
                self.stdout.write(f'✅ {store_name.title()}: {store_products} products processed')
                stores_processed += 1

            except Exception as e:
                error_msg = f'Error scraping {store_name}: {e}'
                errors.append(error_msg)
                self.stdout.write(self.style.ERROR(f'❌ {error_msg}'))
                if options['verbose']:
                    self.stdout.write(traceback.format_exc())
        
        return {
            'total_products': total_products,
            'stores_processed': stores_processed,
            'errors': errors
        } 