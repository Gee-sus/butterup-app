from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Store, Product, Price
from scraper.scrapers import get_all_scrapers
from scraper.test_scraper import get_test_scrapers
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Scrape butter prices from NZ supermarkets'

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

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting butter price scraping...')
        )

        # Get or create stores
        stores = {}
        store_chains = {
            'countdown': 'Countdown',
            'paknsave': 'Pak\'nSave',
            'newworld': 'New World'
        }
        
        for store_name in options['stores']:
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
                self.stdout.write(f'Created store: {store.name}')

        # Get scrapers (real or test)
        if options['test']:
            scrapers = get_test_scrapers()
            self.stdout.write('Using TEST scrapers (generating sample data)')
        else:
            scrapers = get_all_scrapers()
            self.stdout.write('Using REAL scrapers (scraping actual websites)')

        total_products = 0

        for scraper in scrapers:
            # Extract store name from scraper class name
            class_name = scraper.__class__.__name__
            if 'Test' in class_name:
                # Handle test scrapers
                store_name = class_name.replace('TestScraper', '').lower()
            else:
                # Handle real scrapers
                store_name = class_name.replace('Scraper', '').lower()
            
            if store_name not in stores:
                self.stdout.write(f'Skipping {store_name} - not in stores list')
                continue

            self.stdout.write(f'Scraping {store_name.title()}...')
            
            try:
                # Scrape butter prices
                products = scraper.scrape_butter_prices()
                self.stdout.write(f'Found {len(products)} products from {store_name}')
                
                for product_data in products:
                    try:
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
                        
                        if created:
                            self.stdout.write(f'  Created product: {product.name}')
                        self.stdout.write(f'  Added price: ${price.price} for {product.name}')

                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Error processing product: {e}')
                        )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error scraping {store_name}: {e}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Scraping completed! Added {total_products} price records.')
        ) 