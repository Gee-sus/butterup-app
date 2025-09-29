import random
from decimal import Decimal
from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class TestScraper:
    """Test scraper that generates sample butter price data"""
    
    def __init__(self):
        self.butter_brands = [
            "Anchor", "Mainland", "Lurpak", "Westgold", "Dairyworks", 
            "Pam's", "Countdown", "Pak'nSave", "New World"
        ]
        
        self.butter_types = [
            "Salted Butter", "Unsalted Butter", "Spreadable Butter",
            "Cultured Butter", "Organic Butter", "Grass Fed Butter"
        ]
        
        self.weights = [250, 500, 1000]  # grams
        
        self.base_prices = {
            "Anchor": 4.50,
            "Mainland": 4.20,
            "Lurpak": 6.80,
            "Westgold": 3.90,
            "Dairyworks": 4.10,
            "Pam's": 3.70,
            "Countdown": 3.80,
            "Pak'nSave": 3.75,
            "New World": 4.00
        }
    
    def generate_sample_data(self, store_name: str) -> List[Dict]:
        """Generate sample butter price data for a store"""
        products = []
        
        # Generate 3-6 products per store
        num_products = random.randint(3, 6)
        
        for i in range(num_products):
            brand = random.choice(self.butter_brands)
            butter_type = random.choice(self.butter_types)
            weight = random.choice(self.weights)
            
            # Base price with some variation
            base_price = self.base_prices.get(brand, 4.00)
            price_variation = random.uniform(-0.50, 0.50)
            price = Decimal(str(round(base_price + price_variation, 2)))
            
            # Add some store-specific pricing
            if store_name == "Pak'nSave":
                price *= Decimal('0.95')  # Slightly cheaper
            elif store_name == "New World":
                price *= Decimal('1.05')  # Slightly more expensive
            
            product_name = f"{brand} {butter_type} {weight}g"
            
            products.append({
                'name': product_name,
                'brand': brand,
                'price': price,
                'weight_grams': weight,
                'store': store_name,
                'scraped_at': datetime.now()
            })
        
        return products


class CountdownTestScraper(TestScraper):
    """Test scraper for Countdown"""
    
    def scrape_butter_prices(self) -> List[Dict]:
        logger.info("Starting Countdown test scraper")
        products = self.generate_sample_data("Countdown")
        logger.info(f"Countdown test scraper completed. Generated {len(products)} products")
        return products


class PaknSaveTestScraper(TestScraper):
    """Test scraper for Pak'nSave"""
    
    def scrape_butter_prices(self) -> List[Dict]:
        logger.info("Starting Pak'nSave test scraper")
        products = self.generate_sample_data("Pak'nSave")
        logger.info(f"Pak'nSave test scraper completed. Generated {len(products)} products")
        return products


class NewWorldTestScraper(TestScraper):
    """Test scraper for New World"""
    
    def scrape_butter_prices(self) -> List[Dict]:
        logger.info("Starting New World test scraper")
        products = self.generate_sample_data("New World")
        logger.info(f"New World test scraper completed. Generated {len(products)} products")
        return products


def get_test_scrapers():
    """Get all test scrapers"""
    return [
        CountdownTestScraper(),
        PaknSaveTestScraper(),
        NewWorldTestScraper()
    ] 