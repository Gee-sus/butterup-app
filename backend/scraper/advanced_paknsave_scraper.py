import asyncio
import re
import logging
import random
import time
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, Page

logger = logging.getLogger(__name__)


class AdvancedPaknSaveScraper:
    """Advanced scraper that can bypass Cloudflare and get real prices"""
    
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
            
            # Use stealth browser with anti-detection features
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # Use visible browser to avoid detection
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            )
            logger.info("Successfully connected to stealth browser")
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
    
    async def scrape_all_butter_prices(self) -> List[Dict]:
        """Scrape all butter prices using multiple strategies"""
        try:
            logger.info("Starting advanced butter price scraping")
            
            page = await self.browser.new_page()
            
            # Set up stealth mode
            await self._setup_stealth_mode(page)
            
            all_products = []
            
            # Strategy 1: Direct search
            products = await self._scrape_via_search(page)
            all_products.extend(products)
            
            # Strategy 2: Category browsing
            products = await self._scrape_via_category(page)
            all_products.extend(products)
            
            # Strategy 3: Specific product URLs
            products = await self._scrape_specific_products(page)
            all_products.extend(products)
            
            await page.close()
            
            # Remove duplicates and return
            unique_products = self._deduplicate_products(all_products)
            
            logger.info(f"Advanced scraping completed. Found {len(unique_products)} unique products")
            return unique_products
            
        except Exception as e:
            logger.error(f"Advanced scraping failed: {e}")
            return []
    
    async def _setup_stealth_mode(self, page: Page):
        """Set up stealth mode to avoid detection"""
        try:
            # Override navigator.webdriver
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            """)
            
            # Set realistic viewport
            await page.set_viewport_size({"width": 1920, "height": 1080})
            
            # Set realistic headers
            await page.set_extra_http_headers({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-NZ,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            })
            
            # Add random delay
            await page.wait_for_timeout(random.randint(1000, 3000))
            
        except Exception as e:
            logger.error(f"Error setting up stealth mode: {e}")
    
    async def _scrape_via_search(self, page: Page) -> List[Dict]:
        """Scrape via search functionality"""
        products = []
        
        try:
            logger.info("Trying search-based scraping...")
            
            # Navigate to search
            await page.goto('https://www.paknsave.co.nz/shop/search?q=butter', wait_until='networkidle')
            
            # Wait for Cloudflare challenge if present
            await self._wait_for_cloudflare(page)
            
            # Wait for products to load
            await page.wait_for_timeout(5000)
            
            # Extract products
            products = await self._extract_products_from_page(page)
            
            logger.info(f"Search scraping found {len(products)} products")
            
        except Exception as e:
            logger.error(f"Search scraping failed: {e}")
        
        return products
    
    async def _scrape_via_category(self, page: Page) -> List[Dict]:
        """Scrape via category browsing"""
        products = []
        
        try:
            logger.info("Trying category-based scraping...")
            
            # Navigate to dairy category
            await page.goto('https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge/butter-margarine', wait_until='networkidle')
            
            # Wait for Cloudflare challenge if present
            await self._wait_for_cloudflare(page)
            
            # Wait for products to load
            await page.wait_for_timeout(5000)
            
            # Extract products
            products = await self._extract_products_from_page(page)
            
            logger.info(f"Category scraping found {len(products)} products")
            
        except Exception as e:
            logger.error(f"Category scraping failed: {e}")
        
        return products
    
    async def _scrape_specific_products(self, page: Page) -> List[Dict]:
        """Scrape specific known product URLs"""
        products = []
        
        # Known product URLs
        product_urls = [
            'https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter',
            'https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter',
            'https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter',
        ]
        
        for url in product_urls:
            try:
                logger.info(f"Scraping specific product: {url}")
                
                await page.goto(url, wait_until='networkidle')
                
                # Wait for Cloudflare challenge if present
                await self._wait_for_cloudflare(page)
                
                # Wait for product to load
                await page.wait_for_timeout(3000)
                
                # Extract single product
                product = await self._extract_single_product(page, url)
                if product:
                    products.append(product)
                    logger.info(f"Found: {product['name']} - ${product['price']}")
                
                # Random delay between requests
                await page.wait_for_timeout(random.randint(2000, 5000))
                
            except Exception as e:
                logger.error(f"Failed to scrape {url}: {e}")
                continue
        
        return products
    
    async def _wait_for_cloudflare(self, page: Page, max_wait: int = 30):
        """Wait for Cloudflare challenge to complete"""
        try:
            for i in range(max_wait):
                title = await page.title()
                if "Just a moment" not in title:
                    logger.info("Cloudflare challenge completed")
                    return True
                
                await page.wait_for_timeout(1000)
                logger.info(f"Waiting for Cloudflare... {i+1}/{max_wait}")
            
            logger.warning("Cloudflare challenge may not have completed")
            return False
            
        except Exception as e:
            logger.error(f"Error waiting for Cloudflare: {e}")
            return False
    
    async def _extract_products_from_page(self, page: Page) -> List[Dict]:
        """Extract products from a page using multiple methods"""
        products = []
        
        try:
            # Method 1: JavaScript extraction
            js_products = await page.evaluate("""
                () => {
                    const products = [];
                    
                    // Look for product elements
                    const productElements = document.querySelectorAll('[data-testid*="product"], .product-tile, .product-item, [class*="product"]');
                    
                    productElements.forEach(el => {
                        try {
                            const text = el.textContent?.trim();
                            
                            // Look for butter products with prices
                            if (text && text.includes('Butter') && text.includes('$')) {
                                // Try to extract name and price
                                const lines = text.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
                                
                                let name = '';
                                let price = '';
                                
                                // Find product name
                                for (const line of lines) {
                                    if (line.includes('Butter') && line.length > 5 && line.length < 100) {
                                        name = line;
                                        break;
                                    }
                                }
                                
                                // Find price
                                for (const line of lines) {
                                    if (line.includes('$') && line.length < 20) {
                                        price = line;
                                        break;
                                    }
                                }
                                
                                if (name && price) {
                                    products.push({
                                        name: name,
                                        price: price,
                                        rawText: text
                                    });
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    });
                    
                    return products;
                }
            """)
            
            # Process JavaScript results
            for js_product in js_products:
                try:
                    product = self._parse_product_data(js_product)
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.error(f"Error parsing JS product: {e}")
                    continue
            
            # Method 2: Regex extraction from page content
            content = await page.content()
            regex_products = self._extract_products_with_regex(content)
            products.extend(regex_products)
            
        except Exception as e:
            logger.error(f"Error extracting products from page: {e}")
        
        return products
    
    async def _extract_single_product(self, page: Page, url: str) -> Optional[Dict]:
        """Extract a single product from a product page"""
        try:
            # Get product data using JavaScript
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
                    
                    return data;
                }
            """)
            
            if product_data.get('name') and product_data.get('price'):
                return self._parse_product_data(product_data)
            
        except Exception as e:
            logger.error(f"Error extracting single product: {e}")
        
        return None
    
    def _extract_products_with_regex(self, content: str) -> List[Dict]:
        """Extract products using regex patterns"""
        products = []
        
        try:
            # Various regex patterns for different price formats
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
                            'source': 'advanced_scraping'
                        }
                        
                        products.append(product)
                        logger.info(f"Regex extracted: {product['name']} - ${product['price']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing regex match {match}: {e}")
                        continue
            
        except Exception as e:
            logger.error(f"Error with regex extraction: {e}")
        
        return products
    
    def _parse_product_data(self, data: Dict) -> Optional[Dict]:
        """Parse and clean product data"""
        try:
            name = data.get('name', '').strip()
            price_text = data.get('price', '').strip()
            
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
                'weight_grams': weight or 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'advanced_scraping'
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
        
        # Look for weight patterns
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
            words = name.strip().split()
            if words:
                return words[0]
            else:
                return "Unknown"
        except Exception as e:
            logger.warning(f"Error extracting brand from '{name}': {e}")
            return "Unknown"
    
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
class AdvancedPaknSaveScraperSync:
    """Synchronous wrapper for advanced Pak'nSave scraper"""
    
    def __init__(self):
        self.scraper = None
    
    def scrape_all_butter_prices(self) -> List[Dict]:
        """Synchronous method to scrape all butter prices"""
        return asyncio.run(self._scrape_async())
    
    async def _scrape_async(self) -> List[Dict]:
        async with AdvancedPaknSaveScraper() as scraper:
            return await scraper.scrape_all_butter_prices()


# Test function
async def test_advanced_scraper():
    """Test the advanced scraper"""
    print("🧈 Testing Advanced Pak'nSave Scraper...")
    
    async with AdvancedPaknSaveScraper() as scraper:
        products = await scraper.scrape_all_butter_prices()
        
        print(f"\n✅ Found {len(products)} products:")
        for i, product in enumerate(products, 1):
            print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
            print(f"     Source: {product['source']}")
    
    return products


if __name__ == "__main__":
    asyncio.run(test_advanced_scraper())














