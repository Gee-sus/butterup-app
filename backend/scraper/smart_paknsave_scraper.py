import asyncio
import json
import logging
import os
from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)


class SmartPaknSaveScraper:
    """
    Smart scraper that combines automated scraping with intelligent data management
    - Tries automated scraping first
    - Falls back to cached/verified data
    - Allows easy manual updates
    - Tracks data freshness and sources
    """
    
    def __init__(self, data_file: str = "paknsave_data.json"):
        self.data_file = data_file
        self.browser = None
        self.playwright = None
        self.cached_data = self._load_cached_data()
        
    def _load_cached_data(self) -> Dict:
        """Load cached data from file"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading cached data: {e}")
        
        return {
            'products': [],
            'last_updated': None,
            'sources': {}
        }
    
    def _save_cached_data(self, data: Dict):
        """Save data to cache file"""
        try:
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.info(f"Saved cached data to {self.data_file}")
        except Exception as e:
            logger.error(f"Error saving cached data: {e}")
    
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def connect(self):
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            logger.info("Successfully connected to browser")
        except Exception as e:
            logger.error(f"Failed to connect to browser: {e}")
            raise
    
    async def close(self):
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser connection closed")
        except Exception as e:
            logger.error(f"Error closing browser connection: {e}")
    
    async def get_butter_prices(self, force_refresh: bool = False) -> List[Dict]:
        """
        Get butter prices using smart strategy:
        1. Try automated scraping if data is stale or force_refresh
        2. Use cached data if fresh
        3. Fall back to verified data
        """
        try:
            # Check if we need to refresh data
            if force_refresh or self._is_data_stale():
                logger.info("Data is stale or force refresh requested, trying automated scraping")
                
                # Try automated scraping
                fresh_products = await self._try_automated_scraping()
                if fresh_products:
                    logger.info(f"Automated scraping successful: {len(fresh_products)} products")
                    self._update_cached_data(fresh_products, 'automated_scraping')
                    return fresh_products
                else:
                    logger.warning("Automated scraping failed, using cached data")
            
            # Use cached data if available and fresh
            if self.cached_data.get('products'):
                logger.info(f"Using cached data: {len(self.cached_data['products'])} products")
                return self._convert_cached_to_products()
            
            # Fall back to verified data
            logger.info("Using verified fallback data")
            return self._get_verified_data()
            
        except Exception as e:
            logger.error(f"Smart scraping failed: {e}")
            return self._get_verified_data()
    
    def _is_data_stale(self) -> bool:
        """Check if cached data is stale (older than 24 hours)"""
        if not self.cached_data.get('last_updated'):
            return True
        
        try:
            last_updated = datetime.fromisoformat(self.cached_data['last_updated'])
            return datetime.now() - last_updated > timedelta(hours=24)
        except:
            return True
    
    async def _try_automated_scraping(self) -> List[Dict]:
        """Try automated scraping with multiple strategies"""
        try:
            page = await self.browser.new_page()
            
            # Set up stealth mode
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-NZ,en;q=0.9',
            })
            
            # Try different URLs
            urls = [
                'https://www.paknsave.co.nz/shop/search?q=butter',
                'https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge/butter-margarine',
            ]
            
            for url in urls:
                try:
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    await page.wait_for_timeout(5000)
                    
                    title = await page.title()
                    if "Just a moment" not in title:
                        products = await self._extract_products_from_page(page)
                        if products:
                            await page.close()
                            return products
                
                except Exception as e:
                    logger.debug(f"URL {url} failed: {e}")
                    continue
            
            await page.close()
            return []
            
        except Exception as e:
            logger.error(f"Automated scraping failed: {e}")
            return []
    
    async def _extract_products_from_page(self, page) -> List[Dict]:
        """Extract products from page"""
        try:
            # Get page content
            content = await page.content()
            
            # Look for product patterns
            import re
            patterns = [
                r'([A-Za-z\s]+Butter)500g(\d+)ea\$([\d.]+)/100g',
                r'([A-Za-z\s]+Butter)\s*500g\s*\$([\d.]+)',
            ]
            
            products = []
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    try:
                        if len(match) == 3:
                            name, ea, price_per_100g = match
                            total_price = (float(price_per_100g) / 100) * 500
                        elif len(match) == 2:
                            name, price = match
                            total_price = float(price)
                        else:
                            continue
                        
                        brand = name.split()[0] if name else 'Unknown'
                        
                        product = {
                            'name': f"{name.strip()} 500g",
                            'price': Decimal(str(round(total_price, 2))),
                            'brand': brand,
                            'weight_grams': 500,
                            'store': 'Pak\'nSave',
                            'scraped_at': datetime.now(),
                            'source': 'automated_scraping'
                        }
                        
                        products.append(product)
                        logger.info(f"Extracted: {product['name']} - ${product['price']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing match {match}: {e}")
                        continue
            
            return products
            
        except Exception as e:
            logger.error(f"Error extracting products: {e}")
            return []
    
    def _update_cached_data(self, products: List[Dict], source: str):
        """Update cached data with new products"""
        self.cached_data = {
            'products': [
                {
                    'name': p['name'],
                    'price': float(p['price']),
                    'brand': p['brand'],
                    'weight_grams': p['weight_grams'],
                    'source': p['source']
                }
                for p in products
            ],
            'last_updated': datetime.now().isoformat(),
            'sources': {
                source: len(products)
            }
        }
        self._save_cached_data(self.cached_data)
    
    def _convert_cached_to_products(self) -> List[Dict]:
        """Convert cached data to product format"""
        products = []
        for item in self.cached_data.get('products', []):
            products.append({
                'name': item['name'],
                'price': Decimal(str(item['price'])),
                'brand': item['brand'],
                'weight_grams': item['weight_grams'],
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': item.get('source', 'cached_data')
            })
        return products
    
    def _get_verified_data(self) -> List[Dict]:
        """Get verified data (manually updated)"""
        return [
            {
                'name': 'Olivani Original 500g',
                'price': Decimal('4.99'),  # Verified by user
                'brand': 'Olivani',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'user_verified'
            },
            # Add more verified products here as you check them
        ]
    
    def update_verified_price(self, product_name: str, price: float, brand: str = None):
        """Manually update a verified price"""
        try:
            # Load current data
            data = self._load_cached_data()
            
            # Find and update the product
            updated = False
            for product in data.get('products', []):
                if product['name'].lower() == product_name.lower():
                    product['price'] = price
                    product['source'] = 'user_verified'
                    if brand:
                        product['brand'] = brand
                    updated = True
                    break
            
            # If not found, add new product
            if not updated:
                if not data.get('products'):
                    data['products'] = []
                
                data['products'].append({
                    'name': product_name,
                    'price': price,
                    'brand': brand or 'Unknown',
                    'weight_grams': 500,
                    'source': 'user_verified'
                })
            
            # Update timestamp
            data['last_updated'] = datetime.now().isoformat()
            
            # Save updated data
            self._save_cached_data(data)
            self.cached_data = data
            
            logger.info(f"Updated verified price: {product_name} - ${price}")
            
        except Exception as e:
            logger.error(f"Error updating verified price: {e}")
    
    def get_data_status(self) -> Dict:
        """Get status of cached data"""
        return {
            'last_updated': self.cached_data.get('last_updated'),
            'product_count': len(self.cached_data.get('products', [])),
            'is_stale': self._is_data_stale(),
            'sources': self.cached_data.get('sources', {})
        }


# Synchronous wrapper
class SmartPaknSaveScraperSync:
    """Synchronous wrapper for smart scraper"""
    
    def __init__(self, data_file: str = "paknsave_data.json"):
        self.scraper = None
        self.data_file = data_file
    
    def get_butter_prices(self, force_refresh: bool = False) -> List[Dict]:
        """Synchronous method to get butter prices"""
        return asyncio.run(self._get_prices_async(force_refresh))
    
    def update_verified_price(self, product_name: str, price: float, brand: str = None):
        """Update verified price"""
        scraper = SmartPaknSaveScraper(self.data_file)
        scraper.update_verified_price(product_name, price, brand)
    
    def get_data_status(self) -> Dict:
        """Get data status"""
        scraper = SmartPaknSaveScraper(self.data_file)
        return scraper.get_data_status()
    
    async def _get_prices_async(self, force_refresh: bool) -> List[Dict]:
        async with SmartPaknSaveScraper(self.data_file) as scraper:
            return await scraper.get_butter_prices(force_refresh)


# Test function
async def test_smart_scraper():
    """Test the smart scraper"""
    print("🧈 Testing Smart Pak'nSave Scraper...")
    
    async with SmartPaknSaveScraper() as scraper:
        # Get data status
        status = scraper.get_data_status()
        print(f"Data status: {status}")
        
        # Get prices
        products = await scraper.get_butter_prices()
        
        print(f"\n✅ Found {len(products)} products:")
        for i, product in enumerate(products, 1):
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
            print(f"     Source: {product['source']}")
    
    return products


if __name__ == "__main__":
    asyncio.run(test_smart_scraper())



















