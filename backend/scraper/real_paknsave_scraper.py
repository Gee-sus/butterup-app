import asyncio
import re
import logging
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, Page

logger = logging.getLogger(__name__)


class RealPaknSaveScraper:
    """Scraper that can actually extract real prices from Pak'nSave"""
    
    def __init__(self):
        self.browser = None
        self.playwright = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def connect(self):
        """Connect to browser"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            logger.info("Successfully connected to browser")
        except Exception as e:
            logger.error(f"Failed to connect to browser: {e}")
            raise
    
    async def close(self):
        """Close browser connection"""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser connection closed")
        except Exception as e:
            logger.error(f"Error closing browser connection: {e}")
    
    async def scrape_butter_products(self) -> List[Dict]:
        """Scrape real butter products from Pak'nSave"""
        try:
            logger.info("Starting real Pak'nSave butter scraping")
            
            page = await self.browser.new_page()
            
            # Set realistic headers
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-NZ,en;q=0.9',
            })
            
            # Navigate to Pak'nSave butter search
            await page.goto('https://www.paknsave.co.nz/shop/search?q=butter')
            await page.wait_for_timeout(8000)
            
            # Extract products using JavaScript
            products = await page.evaluate("""
                () => {
                    const products = [];
                    const allElements = document.querySelectorAll('*');
                    
                    for (let el of allElements) {
                        const text = el.textContent?.trim();
                        
                        // Look for product patterns like "Pams Pure Butter500g829ea$1.66/100g"
                        if (text && text.includes('Butter') && text.includes('$') && text.includes('/100g')) {
                            // Try to extract product info
                            const match = text.match(/([A-Za-z\\s]+Butter)\\s*(\\d+)g\\s*(\\d+)ea\\$([\\d.]+)\\/100g/);
                            if (match) {
                                const [, name, weight, ea, pricePer100g] = match;
                                products.push({
                                    name: name.trim(),
                                    weight: parseInt(weight),
                                    ea: parseInt(ea),
                                    pricePer100g: parseFloat(pricePer100g),
                                    fullText: text
                                });
                            }
                        }
                    }
                    
                    return products;
                }
            """)
            
            # Process the extracted products
            processed_products = []
            for product in products:
                try:
                    # Calculate total price
                    total_price = (product['pricePer100g'] / 100) * product['weight']
                    
                    # Extract brand from name
                    brand = product['name'].split()[0] if product['name'] else 'Unknown'
                    
                    processed_product = {
                        'name': f"{product['name']} {product['weight']}g",
                        'price': Decimal(str(round(total_price, 2))),
                        'brand': brand,
                        'weight_grams': product['weight'],
                        'store': 'Pak\'nSave',
                        'scraped_at': datetime.now(),
                        'source': 'real_scraping',
                        'price_per_100g': product['pricePer100g'],
                        'raw_text': product['fullText']
                    }
                    
                    processed_products.append(processed_product)
                    logger.info(f"Extracted: {processed_product['name']} - ${processed_product['price']}")
                    
                except Exception as e:
                    logger.error(f"Error processing product {product}: {e}")
                    continue
            
            await page.close()
            
            logger.info(f"Real Pak'nSave scraping completed. Found {len(processed_products)} products")
            return processed_products
            
        except Exception as e:
            logger.error(f"Real Pak'nSave scraping failed: {e}")
            return []
    
    async def scrape_specific_butter_brands(self) -> List[Dict]:
        """Scrape specific butter brands we know exist"""
        try:
            logger.info("Starting specific butter brand scraping")
            
            page = await self.browser.new_page()
            
            # Set realistic headers
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-NZ,en;q=0.9',
            })
            
            # Try different search terms
            search_terms = ['butter', 'anchor butter', 'mainland butter', 'pams butter', 'rolling meadow butter']
            all_products = []
            
            for search_term in search_terms:
                try:
                    logger.info(f"Searching for: {search_term}")
                    
                    await page.goto(f'https://www.paknsave.co.nz/shop/search?q={search_term}')
                    await page.wait_for_timeout(5000)
                    
                    # Extract products
                    products = await self._extract_products_from_page(page, search_term)
                    all_products.extend(products)
                    
                except Exception as e:
                    logger.error(f"Error searching for {search_term}: {e}")
                    continue
            
            await page.close()
            
            # Remove duplicates
            unique_products = self._deduplicate_products(all_products)
            
            logger.info(f"Specific brand scraping completed. Found {len(unique_products)} unique products")
            return unique_products
            
        except Exception as e:
            logger.error(f"Specific brand scraping failed: {e}")
            return []
    
    async def _extract_products_from_page(self, page: Page, search_term: str) -> List[Dict]:
        """Extract products from a single page"""
        products = []
        
        try:
            # Get all text content and look for product patterns
            content = await page.content()
            
            # Look for patterns like "Brand Butter500g1234ea$X.XX/100g"
            pattern = r'([A-Za-z\s]+Butter)\s*(\d+)g\s*(\d+)ea\$([\d.]+)/100g'
            matches = re.findall(pattern, content)
            
            for match in matches:
                try:
                    name, weight_str, ea_str, price_per_100g_str = match
                    
                    weight = int(weight_str)
                    price_per_100g = float(price_per_100g_str)
                    
                    # Calculate total price
                    total_price = (price_per_100g / 100) * weight
                    
                    # Extract brand
                    brand = name.split()[0] if name else 'Unknown'
                    
                    product = {
                        'name': f"{name.strip()} {weight}g",
                        'price': Decimal(str(round(total_price, 2))),
                        'brand': brand,
                        'weight_grams': weight,
                        'store': 'Pak\'nSave',
                        'scraped_at': datetime.now(),
                        'source': 'real_scraping',
                        'search_term': search_term,
                        'price_per_100g': price_per_100g
                    }
                    
                    products.append(product)
                    logger.info(f"Found: {product['name']} - ${product['price']}")
                    
                except Exception as e:
                    logger.error(f"Error processing match {match}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting products from page: {e}")
        
        return products
    
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


# Synchronous wrapper
class RealPaknSaveScraperSync:
    """Synchronous wrapper for real Pak'nSave scraper"""
    
    def __init__(self):
        self.scraper = None
    
    def scrape_butter_products(self) -> List[Dict]:
        """Synchronous method to scrape butter products"""
        return asyncio.run(self._scrape_async())
    
    async def _scrape_async(self) -> List[Dict]:
        async with RealPaknSaveScraper() as scraper:
            return await scraper.scrape_butter_products()


# Test function
async def test_real_scraper():
    """Test the real scraper"""
    print("🧈 Testing Real Pak'nSave Scraper...")
    
    async with RealPaknSaveScraper() as scraper:
        products = await scraper.scrape_butter_products()
        
        print(f"\n✅ Found {len(products)} real products:")
        for i, product in enumerate(products, 1):
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
            print(f"     Price per 100g: ${product['price_per_100g']}")
    
    return products


if __name__ == "__main__":
    asyncio.run(test_real_scraper())



















