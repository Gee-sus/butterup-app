from django.core.management.base import BaseCommand
from api.models import Store, Product, Price, ScrapingLog
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Check butter price database contents'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recent',
            action='store_true',
            help='Show only recent data (last 7 days)'
        )
        parser.add_argument(
            '--store',
            type=str,
            choices=['paknsave', 'countdown', 'all'],
            default='all',
            help='Filter by store'
        )

    def handle(self, *args, **options):
        recent_only = options['recent']
        store_filter = options['store']
        
        self.stdout.write("🧈 ButterUp Database Check")
        self.stdout.write("=" * 50)
        
        # Check stores
        self._check_stores(store_filter)
        
        # Check products
        self._check_products()
        
        # Check prices
        self._check_prices(recent_only, store_filter)
        
        # Check scraping logs
        self._check_scraping_logs()

    def _check_stores(self, store_filter):
        """Check stores in database"""
        self.stdout.write("\n🏪 STORES:")
        
        if store_filter == 'all':
            stores = Store.objects.all()
        else:
            stores = Store.objects.filter(chain=store_filter)
        
        if stores.exists():
            for store in stores:
                self.stdout.write(f"  • {store.chain.title()} - {store.name} ({store.city})")
        else:
            self.stdout.write("  No stores found")

    def _check_products(self):
        """Check products in database"""
        self.stdout.write("\n🧈 PRODUCTS:")
        
        products = Product.objects.all()
        
        if products.exists():
            self.stdout.write(f"  Total products: {products.count()}")
            
            # Group by brand
            brands = {}
            for product in products:
                brand = product.brand
                if brand not in brands:
                    brands[brand] = []
                brands[brand].append(product)
            
            for brand, brand_products in brands.items():
                self.stdout.write(f"  {brand}: {len(brand_products)} products")
                for product in brand_products[:3]:  # Show first 3
                    self.stdout.write(f"    - {product.name} ({product.weight_grams}g)")
                if len(brand_products) > 3:
                    self.stdout.write(f"    ... and {len(brand_products) - 3} more")
        else:
            self.stdout.write("  No products found")

    def _check_prices(self, recent_only, store_filter):
        """Check prices in database"""
        self.stdout.write("\n💰 PRICES:")
        
        prices = Price.objects.all()
        
        if store_filter != 'all':
            prices = prices.filter(store__chain=store_filter)
        
        if recent_only:
            cutoff_date = timezone.now() - timedelta(days=7)
            prices = prices.filter(recorded_at__gte=cutoff_date)
            self.stdout.write("  (Last 7 days only)")
        
        if prices.exists():
            self.stdout.write(f"  Total price records: {prices.count()}")
            
            # Get latest prices for each product
            latest_prices = {}
            for price in prices.order_by('-recorded_at'):
                key = f"{price.product.name} - {price.store.chain}"
                if key not in latest_prices:
                    latest_prices[key] = price
            
            self.stdout.write(f"  Latest prices for {len(latest_prices)} products:")
            
            # Group by store
            by_store = {}
            for key, price in latest_prices.items():
                store = price.store.chain
                if store not in by_store:
                    by_store[store] = []
                by_store[store].append(price)
            
            for store, store_prices in by_store.items():
                self.stdout.write(f"\n  {store.title()}:")
                for price in sorted(store_prices, key=lambda x: x.price):
                    self.stdout.write(f"    ${price.price:.2f} - {price.product.name}")
        else:
            self.stdout.write("  No prices found")

    def _check_scraping_logs(self):
        """Check scraping logs"""
        self.stdout.write("\n📊 SCRAPING LOGS:")
        
        logs = ScrapingLog.objects.all().order_by('-started_at')[:10]
        
        if logs.exists():
            self.stdout.write("  Recent scraping activities:")
            for log in logs:
                status_emoji = "✅" if log.status == "success" else "❌"
                duration = ""
                if log.duration_seconds:
                    duration = f" ({log.duration_seconds:.1f}s)"
                
                self.stdout.write(
                    f"    {status_emoji} {log.store.chain.title()} - "
                    f"{log.products_scraped} products - "
                    f"{log.started_at.strftime('%Y-%m-%d %H:%M')}{duration}"
                )
        else:
            self.stdout.write("  No scraping logs found")



