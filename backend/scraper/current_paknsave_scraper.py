import asyncio
import re
import logging
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)


class CurrentPaknSaveScraper:
    """Scraper that gets current real prices from Pak'nSave"""
    
    def __init__(self):
        self.browser = None
        self.playwright = None
        
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
    
    async def get_current_butter_prices(self) -> List[Dict]:
        """Get current real butter prices from Pak'nSave"""
        try:
            logger.info("Getting current butter prices from Pak'nSave")
            
            page = await self.browser.new_page()
            
            # Set realistic headers
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-NZ,en;q=0.9',
            })
            
            # Try multiple approaches to get prices
            all_products = []
            
            # Approach 1: Search for butter
            try:
                await page.goto('https://www.paknsave.co.nz/shop/search?q=butter')
                await page.wait_for_timeout(5000)
                
                if "Just a moment" not in await page.title():
                    products = await self._extract_products_from_page(page)
                    all_products.extend(products)
                    logger.info(f"Found {len(products)} products from search")
                
            except Exception as e:
                logger.error(f"Search approach failed: {e}")
            
            # Approach 2: Try specific product URLs
            specific_urls = [
                'https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter',
                'https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter',
                'https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter',
            ]
            
            for url in specific_urls:
                try:
                    await page.goto(url)
                    await page.wait_for_timeout(3000)
                    
                    if "Just a moment" not in await page.title():
                        product = await self._extract_single_product(page, url)
                        if product:
                            all_products.append(product)
                            logger.info(f"Found product from {url}: {product['name']} - ${product['price']}")
                
                except Exception as e:
                    logger.error(f"Failed to scrape {url}: {e}")
                    continue
            
            await page.close()
            
            # Remove duplicates
            unique_products = self._deduplicate_products(all_products)
            
            logger.info(f"Current scraping completed. Found {len(unique_products)} unique products")
            return unique_products
            
        except Exception as e:
            logger.error(f"Current scraping failed: {e}")
            return []
    
    async def _extract_products_from_page(self, page) -> List[Dict]:
        """Extract products from a page"""
        products = []
        
        try:
            # Get page content
            content = await page.content()
            
            # Look for various price patterns
            patterns = [
                # Pattern: "Brand Butter500g1234ea$X.XX/100g"
                r'([A-Za-z\s]+Butter)500g(\d+)ea\$([\d.]+)/100g',
                # Pattern: "Brand Butter 500g $X.XX"
                r'([A-Za-z\s]+Butter)\s*500g\s*\$([\d.]+)',
                # Pattern: "Brand Butter $X.XX"
                r'([A-Za-z\s]+Butter)\s*\$([\d.]+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    try:
                        if len(match) == 3:  # Pattern with ea and price per 100g
                            name, ea, price_per_100g = match
                            total_price = (float(price_per_100g) / 100) * 500
                        elif len(match) == 2:  # Pattern with direct price
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
                            'source': 'current_scraping'
                        }
                        
                        products.append(product)
                        logger.info(f"Extracted: {product['name']} - ${product['price']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing match {match}: {e}")
                        continue
            
        except Exception as e:
            logger.error(f"Error extracting products from page: {e}")
        
        return products
    
    async def _extract_single_product(self, page, url: str) -> Optional[Dict]:
        """Extract a single product from a product page"""
        try:
            # Get page content
            content = await page.content()
            
            # Look for product name and price
            name_match = re.search(r'<h1[^>]*>([^<]+)</h1>', content)
            price_match = re.search(r'\$([\d.]+)', content)
            
            if name_match and price_match:
                name = name_match.group(1).strip()
                price = float(price_match.group(1))
                
                # Extract brand from name
                brand = name.split()[0] if name else 'Unknown'
                
                return {
                    'name': name,
                    'price': Decimal(str(price)),
                    'brand': brand,
                    'weight_grams': 500,  # Assume 500g for butter
                    'store': 'Pak\'nSave',
                    'scraped_at': datetime.now(),
                    'source': 'current_scraping',
                    'url': url
                }
        
        except Exception as e:
            logger.error(f"Error extracting single product: {e}")
        
        return None
    
    def _deduplicate_products(self, products: List[Dict]) -> List[Dict]:
        """Remove duplicate products"""
        seen = set()
        unique_products = []
        
        for product in products:
            key = (product['name'].lower().strip(), product['price'])
            if key not in seen:
                seen.add(key)
                unique_products.append(product)
        
        return unique_products
    
    async def get_verified_current_prices(self) -> List[Dict]:
        """Get verified current prices (you can manually update these)"""
        # Based on your verification that Olivani is $4.99
        return [
            {
                'name': 'Olivani Original 500g',
                'price': Decimal('4.99'),  # Verified by you
                'brand': 'Olivani',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'user_verified'
            },
            # Add more verified prices as you check them
        ]


# Synchronous wrapper
class CurrentPaknSaveScraperSync:
    """Synchronous wrapper for current Pak'nSave scraper"""
    
    def __init__(self):
        self.scraper = None
    
    def get_current_butter_prices(self) -> List[Dict]:
        """Synchronous method to get current prices"""
        return asyncio.run(self._get_current_async())
    
    def get_verified_prices(self) -> List[Dict]:
        """Get verified prices"""
        return asyncio.run(self._get_verified_async())
    
    async def _get_current_async(self) -> List[Dict]:
        async with CurrentPaknSaveScraper() as scraper:
            return await scraper.get_current_butter_prices()
    
    async def _get_verified_async(self) -> List[Dict]:
        async with CurrentPaknSaveScraper() as scraper:
            return await scraper.get_verified_current_prices()


# Test function
async def test_current_scraper():
    """Test the current scraper"""
    print("🧈 Testing Current Pak'nSave Scraper...")
    
    async with CurrentPaknSaveScraper() as scraper:
        # Try automated scraping
        products = await scraper.get_current_butter_prices()
        
        if not products:
            print("Automated scraping failed, using verified data...")
            products = await scraper.get_verified_current_prices()
        
        print(f"\n✅ Found {len(products)} current products:")
        for i, product in enumerate(products, 1):
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
            print(f"     Source: {product['source']}")
    
    return products


if __name__ == "__main__":
    asyncio.run(test_current_scraper())














