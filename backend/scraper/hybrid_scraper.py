import logging
from typing import List, Dict, Optional
from datetime import datetime
from decimal import Decimal

# Import existing scrapers
from scraper.paknsave_scraper import PaknSaveSpecificScraper
from scraper.paknsave_api_scraper import PaknSaveAPIScraper
from scraper.zenrows_scraper import ZenRowsScraperSync
from scraper.simple_paknsave_scraper import SimplePaknSaveScraperSync
from scraper.smart_paknsave_scraper import SmartPaknSaveScraperSync
from working_paknsave_scraper import WorkingPaknSaveScraper

logger = logging.getLogger(__name__)


class HybridButterScraper:
    """
    Hybrid scraper that tries multiple methods to get butter prices:
    1. ZenRows (most reliable, bypasses anti-bot)
    2. Existing Pak'nSave scrapers (fallback)
    3. Mock data (last resort)
    """
    
    def __init__(self, zenrows_api_key: str = None):
        self.zenrows_api_key = zenrows_api_key
        self.zenrows_scraper = None
        self.paknsave_scraper = None
        self.paknsave_api_scraper = None
        
    def scrape_paknsave_butter(self) -> List[Dict]:
        """Scrape Pak'nSave butter with fallback methods"""
        logger.info("Starting Pak'nSave butter scraping with hybrid approach")
        
        # Try Working API Scraper first (BEST approach - gets real data!)
        try:
            logger.info("Attempting Working Pak'nSave API scraper...")
            self.working_scraper = WorkingPaknSaveScraper()
            products = self.working_scraper.search_butter_products()
            
            if products and len(products) > 0:
                logger.info(f"✅ Working API scraper successful: Found {len(products)} products")
                return products
            else:
                logger.warning("Working API scraper returned no products, trying fallback methods...")
                
        except Exception as e:
            logger.warning(f"Working API scraper failed: {e}, trying fallback methods...")
        
        # Try Smart Scraper as fallback
        try:
            logger.info("Attempting Smart Pak'nSave scraper...")
            self.smart_scraper = SmartPaknSaveScraperSync()
            products = self.smart_scraper.get_butter_prices()
            
            if products and len(products) > 0:
                logger.info(f"✅ Smart scraper successful: Found {len(products)} products")
                return products
            else:
                logger.warning("Smart scraper returned no products, trying fallback methods...")
                
        except Exception as e:
            logger.warning(f"Smart scraper failed: {e}, trying fallback methods...")
        
        # Try ZenRows as fallback
        try:
            logger.info("Attempting ZenRows scraping...")
            self.zenrows_scraper = ZenRowsScraperSync(self.zenrows_api_key)
            products = self.zenrows_scraper.scrape_paknsave_butter()
            
            if products and len(products) > 0:
                logger.info(f"✅ ZenRows successful: Found {len(products)} products")
                return products
            else:
                logger.warning("ZenRows returned no products, trying fallback methods...")
                
        except Exception as e:
            logger.warning(f"ZenRows failed: {e}, trying fallback methods...")
        
        # Try real Pak'nSave scraper
        try:
            logger.info("Attempting real Pak'nSave scraper...")
            
            self.simple_scraper = SimplePaknSaveScraperSync()
            products = self.simple_scraper.scrape_butter_products()
            
            if products and len(products) > 0:
                logger.info(f"✅ Real scraper successful: Found {len(products)} products")
                return products
            else:
                logger.warning("Real scraper returned no products, trying manual data...")
                products = self.simple_scraper.get_manual_prices()
                if products and len(products) > 0:
                    logger.info(f"✅ Manual data successful: Found {len(products)} products")
                    return products
                
        except Exception as e:
            logger.warning(f"Real scraper failed: {e}, trying existing scrapers...")
        
        # Try existing Pak'nSave scrapers as fallback
        try:
            logger.info("Attempting existing Pak'nSave scrapers...")
            
            # Try API scraper first
            self.paknsave_api_scraper = PaknSaveAPIScraper()
            products = self.paknsave_api_scraper.scrape_butter_products()
            
            if products and len(products) > 0:
                logger.info(f"✅ API scraper successful: Found {len(products)} products")
                return products
            else:
                logger.warning("API scraper returned no products, trying specific scraper...")
                
        except Exception as e:
            logger.warning(f"API scraper failed: {e}, trying specific scraper...")
        
        try:
            # Try specific scraper
            self.paknsave_scraper = PaknSaveSpecificScraper()
            products = self.paknsave_scraper.scrape_butter_products()
            
            if products and len(products) > 0:
                logger.info(f"✅ Specific scraper successful: Found {len(products)} products")
                return products
            else:
                logger.warning("Specific scraper returned no products, using mock data...")
                
        except Exception as e:
            logger.warning(f"Specific scraper failed: {e}, using mock data...")
        
        # Fallback to mock data
        logger.info("Using mock data as fallback")
        return self._get_mock_paknsave_data()
    
    def scrape_countdown_butter(self) -> List[Dict]:
        """Scrape Woolworths butter with fallback methods"""
        logger.info("Starting Woolworths butter scraping with hybrid approach")
        
        # Try ZenRows first
        try:
            logger.info("Attempting ZenRows scraping...")
            if not self.zenrows_scraper:
                self.zenrows_scraper = ZenRowsScraperSync(self.zenrows_api_key)
            
            products = self.zenrows_scraper.scrape_countdown_butter()
            
            if products and len(products) > 0:
                logger.info(f"✅ ZenRows successful: Found {len(products)} products")
                return products
            else:
                logger.warning("ZenRows returned no products, using mock data...")
                
        except Exception as e:
            logger.warning(f"ZenRows failed: {e}, using mock data...")
        
        # Fallback to mock data for Woolworths
        logger.info("Using mock data for Woolworths")
        return self._get_mock_countdown_data()
    
    def scrape_all_butter(self) -> Dict[str, List[Dict]]:
        """Scrape butter from all stores"""
        logger.info("Starting comprehensive butter scraping")
        
        results = {
            'paknsave': [],
            'countdown': []
        }
        
        # Scrape Pak'nSave
        try:
            results['paknsave'] = self.scrape_paknsave_butter()
            logger.info(f"Pak'nSave: Found {len(results['paknsave'])} products")
        except Exception as e:
            logger.error(f"Pak'nSave scraping failed: {e}")
            results['paknsave'] = self._get_mock_paknsave_data()
        
        # Scrape Woolworths
        try:
            results['countdown'] = self.scrape_countdown_butter()
            logger.info(f"Woolworths: Found {len(results['countdown'])} products")
        except Exception as e:
            logger.error(f"Woolworths scraping failed: {e}")
            results['countdown'] = self._get_mock_countdown_data()
        
        total_products = len(results['paknsave']) + len(results['countdown'])
        logger.info(f"Total butter products found: {total_products}")
        
        return results
    
    def _get_mock_paknsave_data(self) -> List[Dict]:
        """Mock Pak'nSave data for testing/fallback"""
        return [
            {
                'name': 'Anchor Pure Butter 500g',
                'price': Decimal('10.50'),
                'brand': 'Anchor',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Mainland Butter 500g',
                'price': Decimal('10.90'),
                'brand': 'Mainland',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Westgold Pure Butter 500g',
                'price': Decimal('13.50'),
                'brand': 'Westgold',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Pams Pure Butter 500g',
                'price': Decimal('8.50'),
                'brand': 'Pams',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Lewis Road Creamery Butter 250g',
                'price': Decimal('8.50'),
                'brand': 'Lewis Road Creamery',
                'weight_grams': 250,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            }
        ]
    
    def _get_mock_countdown_data(self) -> List[Dict]:
        """Mock Woolworths data for testing/fallback"""
        return [
            {
                'name': 'Anchor Pure Butter 500g',
                'price': Decimal('10.80'),
                'brand': 'Anchor',
                'weight_grams': 500,
                'store': 'Woolworths',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Mainland Butter 500g',
                'price': Decimal('11.20'),
                'brand': 'Mainland',
                'weight_grams': 500,
                'store': 'Woolworths',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Westgold Pure Butter 500g',
                'price': Decimal('13.80'),
                'brand': 'Westgold',
                'weight_grams': 500,
                'store': 'Woolworths',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Pams Pure Butter 500g',
                'price': Decimal('8.80'),
                'brand': 'Pams',
                'weight_grams': 500,
                'store': 'Woolworths',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            },
            {
                'name': 'Lewis Road Creamery Butter 250g',
                'price': Decimal('8.80'),
                'brand': 'Lewis Road Creamery',
                'weight_grams': 250,
                'store': 'Woolworths',
                'scraped_at': datetime.now(),
                'source': 'mock_data'
            }
        ]


# Test function
def test_hybrid_scraper():
    """Test the hybrid scraper"""
    print("🧈 Testing Hybrid Butter Scraper...")
    
    scraper = HybridButterScraper()
    
    # Test Pak'nSave
    print("\n📦 Testing Pak'nSave...")
    paknsave_products = scraper.scrape_paknsave_butter()
    print(f"Found {len(paknsave_products)} Pak'nSave products")
    
    for i, product in enumerate(paknsave_products[:3], 1):
        print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']}) - {product.get('source', 'unknown')}")
    
    # Test Woolworths
    print("\n🏪 Testing Woolworths...")
    countdown_products = scraper.scrape_countdown_butter()
    print(f"Found {len(countdown_products)} Woolworths products")
    
    for i, product in enumerate(countdown_products[:3], 1):
        print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']}) - {product.get('source', 'unknown')}")
    
    return paknsave_products, countdown_products


if __name__ == "__main__":
    test_hybrid_scraper()
