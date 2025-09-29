from django.core.management.base import BaseCommand
from scraper.smart_paknsave_scraper import SmartPaknSaveScraperSync
from api.models import Store, Product, Price
from django.utils import timezone
from decimal import Decimal

class Command(BaseCommand):
    help = 'Update butter prices manually or automatically'

    def add_arguments(self, parser):
        parser.add_argument(
            '--product',
            type=str,
            help='Product name to update (e.g., "Pams Pure Butter 500g")'
        )
        parser.add_argument(
            '--price',
            type=float,
            help='New price for the product'
        )
        parser.add_argument(
            '--brand',
            type=str,
            help='Brand name (optional)'
        )
        parser.add_argument(
            '--auto',
            action='store_true',
            help='Try automatic scraping'
        )
        parser.add_argument(
            '--save',
            action='store_true',
            help='Save updated prices to database'
        )
        parser.add_argument(
            '--status',
            action='store_true',
            help='Show data status'
        )

    def handle(self, *args, **options):
        scraper = SmartPaknSaveScraperSync()
        
        # Show status
        if options['status']:
            self._show_status(scraper)
            return
        
        # Update specific product
        if options['product'] and options['price']:
            self._update_product(scraper, options)
            return
        
        # Try automatic scraping
        if options['auto']:
            self._auto_scrape(scraper, options)
            return
        
        # Show help
        self._show_help()

    def _show_status(self, scraper):
        """Show current data status"""
        status = scraper.get_data_status()
        
        self.stdout.write("📊 Smart Scraper Status:")
        self.stdout.write(f"  Last Updated: {status['last_updated'] or 'Never'}")
        self.stdout.write(f"  Product Count: {status['product_count']}")
        self.stdout.write(f"  Data Stale: {'Yes' if status['is_stale'] else 'No'}")
        self.stdout.write(f"  Sources: {status['sources']}")

    def _update_product(self, scraper, options):
        """Update a specific product price"""
        product_name = options['product']
        price = options['price']
        brand = options.get('brand')
        
        self.stdout.write(f"🔄 Updating {product_name} to ${price}")
        
        scraper.update_verified_price(product_name, price, brand)
        
        self.stdout.write(
            self.style.SUCCESS(f"✅ Updated {product_name} to ${price}")
        )
        
        if options['save']:
            self._save_to_database(scraper)

    def _auto_scrape(self, scraper, options):
        """Try automatic scraping"""
        self.stdout.write("🤖 Attempting automatic scraping...")
        
        products = scraper.get_butter_prices(force_refresh=True)
        
        if products:
            self.stdout.write(
                self.style.SUCCESS(f"✅ Found {len(products)} products:")
            )
            for product in products:
                self.stdout.write(f"  • {product['name']} - ${product['price']} ({product['source']})")
        else:
            self.stdout.write(
                self.style.WARNING("⚠️  No products found via automatic scraping")
            )
        
        if options['save'] and products:
            self._save_to_database(scraper)

    def _save_to_database(self, scraper):
        """Save products to database"""
        self.stdout.write("💾 Saving to database...")
        
        products = scraper.get_butter_prices()
        
        try:
            # Get or create store
            store, created = Store.objects.get_or_create(
                chain='paknsave',
                name="Pak'nSave Main Store",
                defaults={
                    'location': 'New Zealand',
                    'region': 'NZ',
                    'city': 'Auckland',
                    'is_active': True
                }
            )
            
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
                        self.style.WARNING(f"⚠️  Error saving {product_data['name']}: {e}")
                    )
                    continue
            
            self.stdout.write(
                self.style.SUCCESS(f"✅ Saved {saved_count} products to database")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Error saving to database: {e}")
            )

    def _show_help(self):
        """Show usage help"""
        self.stdout.write("🧈 Butter Price Update Tool")
        self.stdout.write("=" * 50)
        self.stdout.write("")
        self.stdout.write("Usage Examples:")
        self.stdout.write("")
        self.stdout.write("1. Update a specific product:")
        self.stdout.write("   python manage.py update_butter_prices --product 'Pams Pure Butter 500g' --price 8.30 --save")
        self.stdout.write("")
        self.stdout.write("2. Try automatic scraping:")
        self.stdout.write("   python manage.py update_butter_prices --auto --save")
        self.stdout.write("")
        self.stdout.write("3. Check data status:")
        self.stdout.write("   python manage.py update_butter_prices --status")
        self.stdout.write("")
        self.stdout.write("4. Update multiple products:")
        self.stdout.write("   python manage.py update_butter_prices --product 'Anchor Butter 500g' --price 10.50 --save")
        self.stdout.write("   python manage.py update_butter_prices --product 'Mainland Butter 500g' --price 11.20 --save")
        self.stdout.write("")
        self.stdout.write("Options:")
        self.stdout.write("  --product NAME    Product name to update")
        self.stdout.write("  --price AMOUNT    New price (e.g., 8.30)")
        self.stdout.write("  --brand NAME      Brand name (optional)")
        self.stdout.write("  --auto            Try automatic scraping")
        self.stdout.write("  --save            Save to database")
        self.stdout.write("  --status          Show data status")

