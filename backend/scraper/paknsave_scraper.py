import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from decimal import Decimal
import re
import logging
from typing import List, Dict, Optional
from datetime import datetime
import time
import json
import random

logger = logging.getLogger(__name__)


class PaknSaveSpecificScraper:
    """Specific scraper for Pak'nSave website"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        })
    
    def get_selenium_driver(self):
        """Get configured Selenium WebDriver"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-plugins')
        chrome_options.add_argument('--disable-images')
        chrome_options.add_argument('--disable-javascript')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return driver
        except Exception as e:
            logger.error(f"Failed to create Chrome driver: {e}")
            return None
    
    def scrape_specific_product(self, url: str) -> Optional[Dict]:
        """Scrape a specific product page"""
        try:
            logger.info(f"Scraping specific product: {url}")
            
            # Try with Selenium first (more likely to work with anti-bot protection)
            product = self._scrape_with_selenium(url)
            
            if not product:
                logger.info("Selenium failed, trying requests...")
                product = self._scrape_with_requests(url)
            
            return product
            
        except Exception as e:
            logger.error(f"Error scraping specific product: {e}")
            return None
    
    def _scrape_with_requests(self, url: str) -> Optional[Dict]:
        """Try scraping with requests"""
        try:
            logger.info("Trying requests method...")
            
            # Add random delay to avoid detection
            time.sleep(random.uniform(1, 3))
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for product data in JSON-LD format
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict) and data.get('@type') == 'Product':
                        return self._extract_from_json_ld(data)
                except:
                    continue
            
            # Look for product data in other script tags
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'product' in script.string.lower():
                    try:
                        # Look for price patterns
                        price_match = re.search(r'"price":\s*"?(\d+\.?\d*)"?', script.string)
                        name_match = re.search(r'"name":\s*"([^"]+)"', script.string)
                        
                        if price_match and name_match:
                            return {
                                'name': name_match.group(1),
                                'price': Decimal(price_match.group(1)),
                                'url': url,
                                'scraped_at': datetime.now()
                            }
                    except:
                        continue
            
            # Try to extract from HTML elements
            return self._extract_from_html(soup, url)
            
        except Exception as e:
            logger.error(f"Requests scraping failed: {e}")
            return None
    
    def _scrape_with_selenium(self, url: str) -> Optional[Dict]:
        """Try scraping with Selenium"""
        driver = None
        try:
            logger.info("Trying Selenium method...")
            
            driver = self.get_selenium_driver()
            if not driver:
                return None
            
            # Add random delay
            time.sleep(random.uniform(2, 5))
            
            driver.get(url)
            time.sleep(5)  # Wait for page to load
            
            # Try to find product information
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            
            return self._extract_from_html(soup, url)
            
        except Exception as e:
            logger.error(f"Selenium scraping failed: {e}")
            return None
        finally:
            if driver:
                driver.quit()
    
    def _extract_from_json_ld(self, data: Dict) -> Optional[Dict]:
        """Extract product data from JSON-LD"""
        try:
            name = data.get('name', '')
            price = data.get('offers', {}).get('price')
            
            if name and price:
                return {
                    'name': name,
                    'price': Decimal(str(price)),
                    'brand': data.get('brand', {}).get('name', 'Unknown'),
                    'weight_grams': self._extract_weight(name),
                    'scraped_at': datetime.now()
                }
        except Exception as e:
            logger.error(f"Error extracting from JSON-LD: {e}")
        
        return None
    
    def _extract_from_html(self, soup: BeautifulSoup, url: str) -> Optional[Dict]:
        """Extract product data from HTML elements"""
        try:
            # Try multiple selectors for product name
            name_selectors = [
                'h1[data-testid="product-name"]',
                '.product-name',
                '.product-title',
                'h1',
                '[class*="product-name"]',
                '[class*="product-title"]',
                '.product-details h1',
                '.product-info h1',
                '.product-header h1',
                '.product h1',
                'h1.product-name',
                'h1.product-title'
            ]
            
            name = None
            for selector in name_selectors:
                try:
                    element = soup.select_one(selector)
                    if element and element.get_text().strip():
                        name = element.get_text().strip()
                        logger.info(f"Found name with selector '{selector}': {name}")
                        break
                except:
                    continue
            
            # Try multiple selectors for price
            price_selectors = [
                '[data-testid="price"]',
                '.price',
                '.product-price',
                '.price-value',
                '.cost',
                '.amount',
                '[class*="price"]',
                '[class*="cost"]',
                '.product-price .price',
                '.price-display',
                '.product-price',
                '.price-current',
                '.price-now'
            ]
            
            price = None
            for selector in price_selectors:
                try:
                    element = soup.select_one(selector)
                    if element:
                        price_text = element.get_text().strip()
                        price = self._extract_price(price_text)
                        if price:
                            logger.info(f"Found price with selector '{selector}': {price}")
                            break
                except:
                    continue
            
            if name and price:
                weight = self._extract_weight(name)
                brand = self._extract_brand(name)
                
                return {
                    'name': name,
                    'price': price,
                    'brand': brand,
                    'weight_grams': weight,
                    'url': url,
                    'scraped_at': datetime.now()
                }
            
        except Exception as e:
            logger.error(f"Error extracting from HTML: {e}")
        
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
    
    def scrape_butter_products(self) -> List[Dict]:
        """Scrape butter products from Pak'nSave"""
        try:
            logger.info("Starting Pak'nSave butter scraping")
            
            # List of butter product URLs to scrape
            butter_urls = [
                "https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter",
                "https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter",
                "https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter",
                # Add more butter product URLs here
            ]
            
            products = []
            
            for url in butter_urls:
                try:
                    product = self.scrape_specific_product(url)
                    if product and 'butter' in product['name'].lower():
                        product['store'] = 'Pak\'nSave'
                        products.append(product)
                        logger.info(f"Found product: {product['name']} - ${product['price']}")
                except Exception as e:
                    logger.error(f"Error scraping {url}: {e}")
                    continue
            
            logger.info(f"Pak'nSave scraping completed. Found {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Pak'nSave scraping failed: {e}")
            return []


def test_paknsave_scraper():
    """Test the Pak'nSave scraper"""
    scraper = PaknSaveSpecificScraper()
    
    # Test with the specific URL you provided
    url = "https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter"
    
    print("🧈 Testing Pak'nSave Scraper...")
    print(f"URL: {url}")
    
    product = scraper.scrape_specific_product(url)
    
    if product:
        print("✅ Successfully scraped product:")
        print(f"   Name: {product['name']}")
        print(f"   Price: ${product['price']}")
        print(f"   Brand: {product.get('brand', 'Unknown')}")
        print(f"   Weight: {product.get('weight_grams', 'Unknown')}g")
    else:
        print("❌ Failed to scrape product")
    
    return product


if __name__ == "__main__":
    test_paknsave_scraper()
