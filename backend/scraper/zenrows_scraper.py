import asyncio
import logging
import re
import time
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, Page
import os
from django.conf import settings

logger = logging.getLogger(__name__)


class ZenRowsScraper:
    """Advanced scraper using ZenRows for reliable data extraction"""
    
    def __init__(self, api_key: str = None):
        """
        Initialize ZenRows scraper
        
        Args:
            api_key: ZenRows API key. If None, will try to get from environment
        """
        self.api_key = api_key or os.getenv('ZENROWS_API_KEY', '8237fc726410751cc9e66eb0963f4c720cc0dba8')
        self.connection_url = f'wss://browser.zenrows.com?apikey={self.api_key}'
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
        """Connect to ZenRows browser"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.connect_over_cdp(self.connection_url)
            logger.info("Successfully connected to ZenRows browser")
        except Exception as e:
            logger.error(f"Failed to connect to ZenRows: {e}")
            raise
    
    async def close(self):
        """Close browser connection"""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("ZenRows browser connection closed")
        except Exception as e:
            logger.error(f"Error closing ZenRows connection: {e}")
    
    async def scrape_paknsave_butter(self) -> List[Dict]:
        """Scrape butter products from Pak'nSave"""
        try:
            logger.info("Starting Pak'nSave butter scraping with ZenRows")
            
            page = await self.browser.new_page()
            
            # Set realistic viewport and user agent
            await page.set_viewport_size({"width": 1920, "height": 1080})
            await page.set_extra_http_headers({
                'Accept-Language': 'en-NZ,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            })
            
            # Navigate to Pak'nSave butter category
            butter_urls = [
                "https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge/butter-margarine",
                "https://www.paknsave.co.nz/shop/search?q=butter",
            ]
            
            all_products = []
            
            for url in butter_urls:
                try:
                    logger.info(f"Scraping Pak'nSave URL: {url}")
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    
                    # Wait for products to load
                    await page.wait_for_timeout(3000)
                    
                    # Extract products from the page
                    products = await self._extract_paknsave_products(page, url)
                    all_products.extend(products)
                    
                    logger.info(f"Found {len(products)} products from {url}")
                    
                except Exception as e:
                    logger.error(f"Error scraping {url}: {e}")
                    continue
            
            # Also try specific product URLs
            specific_urls = [
                "https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter",
                "https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter",
                "https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter",
            ]
            
            for url in specific_urls:
                try:
                    product = await self._scrape_specific_paknsave_product(page, url)
                    if product:
                        all_products.append(product)
                except Exception as e:
                    logger.error(f"Error scraping specific product {url}: {e}")
                    continue
            
            await page.close()
            
            # Remove duplicates and filter for butter products
            unique_products = self._deduplicate_products(all_products)
            butter_products = [p for p in unique_products if 'butter' in p['name'].lower()]
            
            logger.info(f"Pak'nSave scraping completed. Found {len(butter_products)} unique butter products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Pak'nSave scraping failed: {e}")
            return []
    
    async def scrape_countdown_butter(self) -> List[Dict]:
        """Scrape butter products from Countdown"""
        try:
            logger.info("Starting Countdown butter scraping with ZenRows")
            
            page = await self.browser.new_page()
            
            # Set realistic viewport and user agent
            await page.set_viewport_size({"width": 1920, "height": 1080})
            await page.set_extra_http_headers({
                'Accept-Language': 'en-NZ,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            })
            
            # Navigate to Countdown butter category
            butter_urls = [
                "https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine",
                "https://www.countdown.co.nz/shop/search?q=butter",
            ]
            
            all_products = []
            
            for url in butter_urls:
                try:
                    logger.info(f"Scraping Countdown URL: {url}")
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    
                    # Wait for products to load
                    await page.wait_for_timeout(3000)
                    
                    # Extract products from the page
                    products = await self._extract_countdown_products(page, url)
                    all_products.extend(products)
                    
                    logger.info(f"Found {len(products)} products from {url}")
                    
                except Exception as e:
                    logger.error(f"Error scraping {url}: {e}")
                    continue
            
            await page.close()
            
            # Remove duplicates and filter for butter products
            unique_products = self._deduplicate_products(all_products)
            butter_products = [p for p in unique_products if 'butter' in p['name'].lower()]
            
            logger.info(f"Countdown scraping completed. Found {len(butter_products)} unique butter products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Countdown scraping failed: {e}")
            return []
    
    async def _extract_paknsave_products(self, page: Page, base_url: str) -> List[Dict]:
        """Extract products from Pak'nSave page"""
        products = []
        
        try:
            # Wait for page to load completely
            await page.wait_for_timeout(5000)
            
            # Try to find any elements that might contain products
            try:
                await page.wait_for_selector('div', timeout=10000)
            except:
                pass  # Continue even if no specific selector found
            
            # Extract products using JavaScript - this is more reliable
            js_products = await page.evaluate("""
                () => {
                    const products = [];
                    
                    // Look for all divs that might contain product information
                    const allDivs = document.querySelectorAll('div');
                    
                    allDivs.forEach(div => {
                        try {
                            const text = div.textContent?.trim();
                            
                            // Check if this div contains product information
                            if (text && text.includes('Butter') && (text.includes('$') || text.includes('ea'))) {
                                // Try to extract name and price from the text
                                const lines = text.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
                                
                                let name = '';
                                let price = '';
                                
                                // Look for product name (usually contains "Butter")
                                for (const line of lines) {
                                    if (line.includes('Butter') && line.length > 5 && line.length < 100) {
                                        name = line;
                                        break;
                                    }
                                }
                                
                                // Look for price (contains $ or ea)
                                for (const line of lines) {
                                    if ((line.includes('$') || line.includes('ea')) && line.length < 50) {
                                        price = line;
                                        break;
                                    }
                                }
                                
                                if (name && price) {
                                    // Find the link if it exists
                                    const linkEl = div.querySelector('a[href*="/product/"]');
                                    const url = linkEl ? linkEl.href : '';
                                    
                                    products.push({
                                        name: name,
                                        price: price,
                                        url: url
                                    });
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    });
                    
                    // Remove duplicates
                    const uniqueProducts = [];
                    const seen = new Set();
                    
                    products.forEach(product => {
                        const key = product.name + product.price;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueProducts.push(product);
                        }
                    });
                    
                    return uniqueProducts;
                }
            """)
            
            for js_product in js_products:
                try:
                    product = self._parse_product_data(js_product, 'Pak\'nSave')
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.debug(f"Error parsing JS product: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting Pak'nSave products: {e}")
        
        return products
    
    async def _extract_countdown_products(self, page: Page, base_url: str) -> List[Dict]:
        """Extract products from Countdown page"""
        products = []
        
        try:
            # Wait for product elements to load
            await page.wait_for_selector('.product-tile, .product-item, [data-testid="product"]', timeout=10000)
            
            # Get all product elements
            product_elements = await page.query_selector_all('.product-tile, .product-item, [data-testid="product"], [class*="product"]')
            
            for element in product_elements:
                try:
                    product = await self._extract_product_from_element(element, 'Countdown')
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.debug(f"Error extracting product from element: {e}")
                    continue
            
            # Also try to extract from page content using JavaScript
            js_products = await page.evaluate("""
                () => {
                    const products = [];
                    
                    // Look for product data in various formats
                    const productElements = document.querySelectorAll('.product-tile, .product-item, [data-testid="product"]');
                    
                    productElements.forEach(el => {
                        try {
                            const nameEl = el.querySelector('.product-name, .title, h3, h4, [data-testid="product-name"]');
                            const priceEl = el.querySelector('.price, .cost, [class*="price"], [data-testid="price"]');
                            const linkEl = el.querySelector('a[href*="/product/"]');
                            
                            if (nameEl && priceEl) {
                                const name = nameEl.textContent?.trim();
                                const priceText = priceEl.textContent?.trim();
                                const url = linkEl ? linkEl.href : '';
                                
                                if (name && priceText) {
                                    products.push({
                                        name: name,
                                        price: priceText,
                                        url: url
                                    });
                                }
                            }
                        } catch (e) {
                            console.log('Error extracting product:', e);
                        }
                    });
                    
                    return products;
                }
            """)
            
            for js_product in js_products:
                try:
                    product = self._parse_product_data(js_product, 'Countdown')
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.debug(f"Error parsing JS product: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting Countdown products: {e}")
        
        return products
    
    async def _extract_product_from_element(self, element, store: str) -> Optional[Dict]:
        """Extract product data from a single element"""
        try:
            # Get product name using the actual selectors we found
            name_selectors = [
                'p.owfhtz4',
                '.owfhtz4',
                'p',
                'h3',
                'h4',
                '[class*="name"]',
                '[data-testid*="name"]'
            ]
            
            name = None
            for selector in name_selectors:
                try:
                    name_el = await element.query_selector(selector)
                    if name_el:
                        name = await name_el.text_content()
                        if name and name.strip() and len(name.strip()) > 5:
                            name = name.strip()
                            break
                except:
                    continue
            
            # Get price using the actual selectors we found
            price_selectors = [
                '[class*="owfhtz"]',
                '[data-testid*="price"]',
                '.price',
                '.cost'
            ]
            
            price_text = None
            for selector in price_selectors:
                try:
                    price_el = await element.query_selector(selector)
                    if price_el:
                        price_text = await price_el.text_content()
                        if price_text and price_text.strip() and ('$' in price_text or 'ea' in price_text):
                            price_text = price_text.strip()
                            break
                except:
                    continue
            
            # Get product URL
            url = None
            try:
                link_el = await element.query_selector('a[href*="/product/"]')
                if link_el:
                    url = await link_el.get_attribute('href')
            except:
                pass
            
            if name and price_text:
                return self._parse_product_data({
                    'name': name,
                    'price': price_text,
                    'url': url
                }, store)
            
        except Exception as e:
            logger.debug(f"Error extracting product from element: {e}")
        
        return None
    
    async def _scrape_specific_paknsave_product(self, page: Page, url: str) -> Optional[Dict]:
        """Scrape a specific Pak'nSave product page"""
        try:
            logger.info(f"Scraping specific Pak'nSave product: {url}")
            
            await page.goto(url, wait_until='networkidle', timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Extract product data using JavaScript
            product_data = await page.evaluate("""
                () => {
                    const data = {};
                    
                    // Get product name
                    const nameSelectors = [
                        'h1[data-testid="product-name"]',
                        '.product-name',
                        '.product-title',
                        'h1',
                        '[class*="product-name"]'
                    ];
                    
                    for (const selector of nameSelectors) {
                        const el = document.querySelector(selector);
                        if (el && el.textContent?.trim()) {
                            data.name = el.textContent.trim();
                            break;
                        }
                    }
                    
                    // Get price
                    const priceSelectors = [
                        '[data-testid="price"]',
                        '.price',
                        '.product-price',
                        '.price-value',
                        '[class*="price"]'
                    ];
                    
                    for (const selector of priceSelectors) {
                        const el = document.querySelector(selector);
                        if (el && el.textContent?.trim()) {
                            data.price = el.textContent.trim();
                            break;
                        }
                    }
                    
                    // Get product image
                    const imgEl = document.querySelector('.product-image img, .product-photo img, [class*="product-image"] img');
                    if (imgEl) {
                        data.image_url = imgEl.src;
                    }
                    
                    return data;
                }
            """)
            
            if product_data.get('name') and product_data.get('price'):
                return self._parse_product_data(product_data, 'Pak\'nSave')
            
        except Exception as e:
            logger.error(f"Error scraping specific product {url}: {e}")
        
        return None
    
    def _parse_product_data(self, data: Dict, store: str) -> Optional[Dict]:
        """Parse and clean product data"""
        try:
            name = data.get('name', '').strip()
            price_text = data.get('price', '').strip()
            url = data.get('url', '')
            image_url = data.get('image_url', '')
            
            if not name or not price_text:
                return None
            
            # Extract price
            price = self._extract_price(price_text)
            if not price:
                return None
            
            # Extract weight and brand
            weight = self._extract_weight(name)
            brand = self._extract_brand(name)
            
            return {
                'name': name,
                'price': price,
                'brand': brand,
                'weight_grams': weight,
                'store': store,
                'url': url,
                'image_url': image_url,
                'scraped_at': datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error parsing product data: {e}")
            return None
    
    def _extract_price(self, price_text: str) -> Optional[Decimal]:
        """Extract price from text"""
        if not price_text:
            return None
        
        # Remove currency symbols and whitespace
        price_text = re.sub(r'[^\d.]', '', price_text.strip())
        
        try:
            return Decimal(price_text)
        except (ValueError, TypeError):
            logger.warning(f"Could not parse price: {price_text}")
            return None
    
    def _extract_weight(self, text: str) -> Optional[int]:
        """Extract weight in grams from text"""
        if not text:
            return None
        
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
    
    def _deduplicate_products(self, products: List[Dict]) -> List[Dict]:
        """Remove duplicate products based on name and price"""
        seen = set()
        unique_products = []
        
        for product in products:
            # Create a key based on name and price
            key = (product['name'].lower().strip(), product['price'])
            
            if key not in seen:
                seen.add(key)
                unique_products.append(product)
        
        return unique_products
    
    async def scrape_all_butter(self) -> Dict[str, List[Dict]]:
        """Scrape butter from both Pak'nSave and Countdown"""
        try:
            logger.info("Starting comprehensive butter scraping with ZenRows")
            
            results = {
                'paknsave': [],
                'countdown': []
            }
            
            # Scrape Pak'nSave
            try:
                results['paknsave'] = await self.scrape_paknsave_butter()
                logger.info(f"Pak'nSave: Found {len(results['paknsave'])} products")
            except Exception as e:
                logger.error(f"Pak'nSave scraping failed: {e}")
            
            # Scrape Countdown
            try:
                results['countdown'] = await self.scrape_countdown_butter()
                logger.info(f"Countdown: Found {len(results['countdown'])} products")
            except Exception as e:
                logger.error(f"Countdown scraping failed: {e}")
            
            total_products = len(results['paknsave']) + len(results['countdown'])
            logger.info(f"Total butter products found: {total_products}")
            
            return results
            
        except Exception as e:
            logger.error(f"Comprehensive scraping failed: {e}")
            return {'paknsave': [], 'countdown': []}


# Synchronous wrapper for easier integration with Django
class ZenRowsScraperSync:
    """Synchronous wrapper for ZenRows scraper"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.scraper = None
    
    def scrape_paknsave_butter(self) -> List[Dict]:
        """Synchronous method to scrape Pak'nSave butter"""
        return asyncio.run(self._scrape_paknsave_async())
    
    def scrape_countdown_butter(self) -> List[Dict]:
        """Synchronous method to scrape Countdown butter"""
        return asyncio.run(self._scrape_countdown_async())
    
    def scrape_all_butter(self) -> Dict[str, List[Dict]]:
        """Synchronous method to scrape all butter"""
        return asyncio.run(self._scrape_all_async())
    
    async def _scrape_paknsave_async(self) -> List[Dict]:
        async with ZenRowsScraper(self.api_key) as scraper:
            return await scraper.scrape_paknsave_butter()
    
    async def _scrape_countdown_async(self) -> List[Dict]:
        async with ZenRowsScraper(self.api_key) as scraper:
            return await scraper.scrape_countdown_butter()
    
    async def _scrape_all_async(self) -> Dict[str, List[Dict]]:
        async with ZenRowsScraper(self.api_key) as scraper:
            return await scraper.scrape_all_butter()


# Test function
async def test_zenrows_scraper():
    """Test the ZenRows scraper"""
    print("🧈 Testing ZenRows Scraper...")
    
    async with ZenRowsScraper() as scraper:
        # Test Pak'nSave
        print("\n📦 Testing Pak'nSave...")
        paknsave_products = await scraper.scrape_paknsave_butter()
        print(f"Found {len(paknsave_products)} Pak'nSave products")
        
        for i, product in enumerate(paknsave_products[:5], 1):  # Show first 5
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
        
        # Test Countdown
        print("\n🏪 Testing Countdown...")
        countdown_products = await scraper.scrape_countdown_butter()
        print(f"Found {len(countdown_products)} Countdown products")
        
        for i, product in enumerate(countdown_products[:5], 1):  # Show first 5
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
    
    return paknsave_products, countdown_products


if __name__ == "__main__":
    asyncio.run(test_zenrows_scraper())
