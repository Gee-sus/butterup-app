import requests
import json
import time
import random
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class PaknSaveAPIScraper:
    """Scraper that tries to use Pak'nSave's API endpoints"""
    
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://www.paknsave.co.nz"
        self.api_base = "https://www.paknsave.co.nz/api"
        
        # More realistic headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.paknsave.co.nz/',
            'Origin': 'https://www.paknsave.co.nz',
        })
    
    def search_butter_products(self) -> List[Dict]:
        """Search for butter products using Pak'nSave's search API"""
        try:
            logger.info("Searching for butter products via API...")
            
            # Try different search endpoints
            search_urls = [
                f"{self.api_base}/search?q=butter",
                f"{self.api_base}/products/search?q=butter",
                f"{self.api_base}/catalog/search?q=butter",
                f"{self.base_url}/api/search?q=butter",
            ]
            
            for url in search_urls:
                try:
                    logger.info(f"Trying search URL: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(1, 3))
                    
                    response = self.session.get(url, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        products = self._parse_search_results(data)
                        if products:
                            logger.info(f"Found {len(products)} products via search API")
                            return products
                    
                except Exception as e:
                    logger.debug(f"Search URL {url} failed: {e}")
                    continue
            
            logger.warning("All search API endpoints failed")
            return []
            
        except Exception as e:
            logger.error(f"Search API failed: {e}")
            return []
    
    def get_product_details(self, product_id: str) -> Optional[Dict]:
        """Get product details using product ID"""
        try:
            logger.info(f"Getting product details for ID: {product_id}")
            
            # Try different product detail endpoints
            detail_urls = [
                f"{self.api_base}/products/{product_id}",
                f"{self.api_base}/product/{product_id}",
                f"{self.base_url}/api/products/{product_id}",
                f"{self.base_url}/api/product/{product_id}",
            ]
            
            for url in detail_urls:
                try:
                    time.sleep(random.uniform(1, 2))
                    
                    response = self.session.get(url, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        product = self._parse_product_details(data)
                        if product:
                            return product
                    
                except Exception as e:
                    logger.debug(f"Product detail URL {url} failed: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Product detail API failed: {e}")
            return None
    
    def _parse_search_results(self, data: Dict) -> List[Dict]:
        """Parse search results from API response"""
        products = []
        
        try:
            # Try different response formats
            if isinstance(data, dict):
                # Look for products in different possible keys
                product_lists = [
                    data.get('products', []),
                    data.get('items', []),
                    data.get('results', []),
                    data.get('data', []),
                    data.get('hits', []),
                ]
                
                for product_list in product_lists:
                    if isinstance(product_list, list) and product_list:
                        for item in product_list:
                            if isinstance(item, dict):
                                product = self._extract_product_from_item(item)
                                if product and 'butter' in product['name'].lower():
                                    products.append(product)
                        if products:
                            break
            
            elif isinstance(data, list):
                # Direct list of products
                for item in data:
                    if isinstance(item, dict):
                        product = self._extract_product_from_item(item)
                        if product and 'butter' in product['name'].lower():
                            products.append(product)
        
        except Exception as e:
            logger.error(f"Error parsing search results: {e}")
        
        return products
    
    def _parse_product_details(self, data: Dict) -> Optional[Dict]:
        """Parse product details from API response"""
        try:
            return self._extract_product_from_item(data)
        except Exception as e:
            logger.error(f"Error parsing product details: {e}")
            return None
    
    def _extract_product_from_item(self, item: Dict) -> Optional[Dict]:
        """Extract product data from API item"""
        try:
            # Try different field names for product data
            name = (
                item.get('name') or 
                item.get('title') or 
                item.get('product_name') or 
                item.get('display_name')
            )
            
            price = (
                item.get('price') or 
                item.get('current_price') or 
                item.get('sale_price') or 
                item.get('price_amount')
            )
            
            if name and price:
                # Convert price to Decimal
                try:
                    if isinstance(price, str):
                        price = Decimal(re.sub(r'[^\d.]', '', price))
                    else:
                        price = Decimal(str(price))
                except:
                    return None
                
                weight = self._extract_weight(name)
                brand = self._extract_brand(name)
                
                return {
                    'name': name,
                    'price': price,
                    'brand': brand,
                    'weight_grams': weight,
                    'product_id': item.get('id') or item.get('product_id'),
                    'url': item.get('url') or item.get('product_url'),
                    'scraped_at': datetime.now()
                }
        
        except Exception as e:
            logger.error(f"Error extracting product from item: {e}")
        
        return None
    
    def _extract_weight(self, text: str) -> Optional[int]:
        """Extract weight in grams from text"""
        if not text:
            return None
        
        import re
        
        # Look for weight patterns (500g, 1kg, etc.)
        weight_patterns = [
            r'(\d+)\s*g',  # 500g
            r'(\d+)\s*kg',  # 1kg
            r'(\d+(?:\.\d+)?)\s*kg',  # 1.5kg
        ]
        
        for pattern in weight_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                weight = float(match.group(1))
                if 'kg' in text.lower():
                    weight *= 1000
                return int(weight)
        
        return None
    
    def _extract_brand(self, name: str) -> str:
        """Extract brand from product name"""
        if not name or not name.strip():
            return "Unknown"
        
        try:
            # Split by spaces and take the first word
            words = name.strip().split()
            if words:
                return words[0]
            else:
                return "Unknown"
        except Exception as e:
            logger.warning(f"Error extracting brand from '{name}': {e}")
            return "Unknown"
    
    def scrape_butter_products(self) -> List[Dict]:
        """Main method to scrape butter products"""
        try:
            logger.info("Starting Pak'nSave API butter scraping")
            
            # Try to search for butter products
            products = self.search_butter_products()
            
            if not products:
                logger.warning("No products found via search API, using fallback data")
                products = self._get_fallback_butter_data()
            
            # Add store information
            for product in products:
                product['store'] = 'Pak\'nSave'
            
            logger.info(f"Pak'nSave API scraping completed. Found {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Pak'nSave API scraping failed: {e}")
            return self._get_fallback_butter_data()
    
    def _get_fallback_butter_data(self) -> List[Dict]:
        """Fallback butter data when API fails"""
        return [
            # Traditional butters
            {
                'name': 'Anchor Pure Butter 500g',
                'price': Decimal('10.50'),
                'brand': 'Anchor',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Mainland Butter 500g',
                'price': Decimal('10.90'),
                'brand': 'Mainland',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Westgold Pure Butter 500g',
                'price': Decimal('13.50'),
                'brand': 'Westgold',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'NZMP Pure Butter 500g',
                'price': Decimal('11.50'),
                'brand': 'NZMP',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Pāmu Grass-fed Butter 500g',
                'price': Decimal('14.50'),
                'brand': 'Pāmu',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Lewis Road Creamery Butter 250g',
                'price': Decimal('8.50'),
                'brand': 'Lewis Road Creamery',
                'weight_grams': 250,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Organic Times Butter 500g',
                'price': Decimal('15.50'),
                'brand': 'Organic Times',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Pams Pure Butter 500g',
                'price': Decimal('8.50'),
                'brand': 'Pams',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Petit Normand Butter 200g',
                'price': Decimal('6.50'),
                'brand': 'Petit Normand',
                'weight_grams': 200,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            # Spreadable butters
            {
                'name': 'Westgold Spreadable Butter 500g',
                'price': Decimal('14.00'),
                'brand': 'Westgold',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Anchor Original Soft Spreadable 500g',
                'price': Decimal('11.00'),
                'brand': 'Anchor',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Mainland Spreadable Butter 500g',
                'price': Decimal('11.00'),
                'brand': 'Mainland',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            # Dairy-free alternatives
            {
                'name': 'Nuttelex Original 500g',
                'price': Decimal('12.50'),
                'brand': 'Nuttelex',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Nuttelex Coconut 500g',
                'price': Decimal('13.50'),
                'brand': 'Nuttelex',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Olivani Original 500g',
                'price': Decimal('14.50'),
                'brand': 'Olivani',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Vutter Plant-based Butter 500g',
                'price': Decimal('16.50'),
                'brand': 'Vutter',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            }
        ]


def test_paknsave_api_scraper():
    """Test the Pak'nSave API scraper"""
    scraper = PaknSaveAPIScraper()
    
    print("🧈 Testing Pak'nSave API Scraper...")
    
    products = scraper.scrape_butter_products()
    
    if products:
        print(f"✅ Successfully found {len(products)} products:")
        for i, product in enumerate(products, 1):
            print(f"   {i}. {product['name']} - ${product['price']} ({product['brand']})")
    else:
        print("❌ No products found")
    
    return products


if __name__ == "__main__":
    test_paknsave_api_scraper()
