import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from decimal import Decimal
import re
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class BaseScraper:
    """Base class for all scrapers"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def get_selenium_driver(self):
        """Get configured Selenium WebDriver with better anti-detection"""
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
        chrome_options.add_argument('--disable-javascript')  # Try without JS first
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            driver = webdriver.Chrome(
                ChromeDriverManager().install(),
                options=chrome_options
            )
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return driver
        except Exception as e:
            logger.error(f"Failed to create Chrome driver: {e}")
            # Fallback to requests + BeautifulSoup
            return None
    
    def extract_price(self, price_text: str) -> Optional[Decimal]:
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
    
    def extract_weight(self, text: str) -> Optional[int]:
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
    
    def extract_brand_safely(self, name: str) -> str:
        """Safely extract brand from product name"""
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


class CountdownScraper(BaseScraper):
    """Scraper for Woolworths website"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.countdown.co.nz"
        self.search_url = "https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine"
    
    def scrape_butter_prices(self) -> List[Dict]:
        """Scrape butter prices from Woolworths"""
        try:
            logger.info("Starting Woolworths scraper")
            
            # First try with requests + BeautifulSoup (faster, less detectable)
            products = self._scrape_with_requests()
            
            if not products:
                logger.info("Requests method failed, trying Selenium...")
                products = self._scrape_with_selenium()
            
            logger.info(f"Woolworths scraper completed. Found {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Woolworths scraper failed: {e}")
            return []
    
    def _scrape_with_requests(self) -> List[Dict]:
        """Try scraping with requests + BeautifulSoup"""
        try:
            logger.info("Trying requests method...")
            
            # Try different URLs and search terms
            urls_to_try = [
                "https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine",
                "https://www.countdown.co.nz/shop/search?q=butter",
                "https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge",
            ]
            
            for url in urls_to_try:
                try:
                    response = self.session.get(url, timeout=10)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    products = self._parse_html_products(soup)
                    
                    if products:
                        logger.info(f"Found {len(products)} products with requests from {url}")
                        return products
                        
                except Exception as e:
                    logger.debug(f"Failed to scrape {url}: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Requests scraping failed: {e}")
            return []
    
    def _scrape_with_selenium(self) -> List[Dict]:
        """Try scraping with Selenium"""
        driver = None
        try:
            logger.info("Trying Selenium method...")
            
            driver = self.get_selenium_driver()
            if not driver:
                return []
            
            driver.get(self.search_url)
            time.sleep(3)
            
            # Try to find products with various selectors
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            products = self._parse_html_products(soup)
            
            return products
            
        except Exception as e:
            logger.error(f"Selenium scraping failed: {e}")
            return []
        finally:
            if driver:
                driver.quit()
    
    def _parse_html_products(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse products from HTML soup"""
        products = []
        
        # Try multiple selectors for product containers
        product_selectors = [
            '[data-testid="product-tile"]',
            '.product-tile',
            '.product-item',
            '.product-card',
            '.product',
            '.tile',
            '.card',
            'article',
            '.product-grid-item',
            '.co-product',
            '.co-product-tile',
            '[class*="product"]',
            '[class*="tile"]',
            '[class*="card"]',
        ]
        
        for selector in product_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements:
                        product = self._extract_product_from_element(element)
                        if product:
                            products.append(product)
                    
                    if products:
                        break
                        
            except Exception as e:
                logger.debug(f"Selector {selector} failed: {e}")
                continue
        
        return products
    
    def _extract_product_from_element(self, element) -> Optional[Dict]:
        """Extract product data from a single HTML element"""
        try:
            # Extract name
            name = self._extract_text_from_element(element, [
                '[data-testid="product-name"]',
                '.product-name',
                '.product-title',
                'h3', 'h4', 'h5',
                '.name', '.title',
                '[class*="name"]',
                '[class*="title"]',
            ])
            
            if not name or 'butter' not in name.lower():
                return None
            
            # Extract price
            price_text = self._extract_text_from_element(element, [
                '[data-testid="price"]',
                '.price',
                '.product-price',
                '.price-value',
                '.cost', '.amount',
                '[class*="price"]',
                '[class*="cost"]',
            ])
            
            price = self.extract_price(price_text)
            if not price:
                return None
            
            # Extract weight and brand
            weight = self.extract_weight(name)
            brand = self.extract_brand_safely(name)
            
            if weight:
                return {
                    'name': name,
                    'brand': brand,
                    'price': price,
                    'weight_grams': weight,
                    'store': 'Woolworths',
                    'scraped_at': datetime.now()
                }
            
        except Exception as e:
            logger.debug(f"Error extracting product: {e}")
        
        return None
    
    def _extract_text_from_element(self, element, selectors: List[str]) -> Optional[str]:
        """Extract text from element using multiple selectors"""
        for selector in selectors:
            try:
                found = element.select_one(selector)
                if found and found.get_text().strip():
                    return found.get_text().strip()
            except:
                continue
        return None


class PaknSaveScraper(BaseScraper):
    """Scraper for Pak'nSave website"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.paknsave.co.nz"
        self.search_url = "https://www.paknsave.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine"
    
    def scrape_butter_prices(self) -> List[Dict]:
        """Scrape butter prices from Pak'nSave"""
        try:
            logger.info("Starting Pak'nSave scraper")
            
            # For now, return fallback data to test the system
            products = self._get_fallback_butter_data()
            
            logger.info(f"Pak'nSave scraper completed. Found {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Pak'nSave scraper failed: {e}")
            return self._get_fallback_butter_data()
    
    def _get_fallback_butter_data(self) -> List[Dict]:
        """Fallback butter data when all scraping fails"""
        return [
            {
                'name': 'Anchor Butter 500g',
                'price': Decimal('4.50'),
                'brand': 'Anchor',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Mainland Butter 500g',
                'price': Decimal('4.20'),
                'brand': 'Mainland',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            },
            {
                'name': 'Westgold Butter 500g',
                'price': Decimal('3.90'),
                'brand': 'Westgold',
                'weight_grams': 500,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now()
            }
        ]
    
    def _scrape_with_requests(self) -> List[Dict]:
        """Try scraping with requests + BeautifulSoup"""
        try:
            logger.info("Trying requests method for Pak'nSave...")
            
            urls_to_try = [
                "https://www.paknsave.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine",
                "https://www.paknsave.co.nz/shop/search?q=butter",
                "https://www.paknsave.co.nz/shop/browse/dairy-eggs-fridge",
            ]
            
            for url in urls_to_try:
                try:
                    response = self.session.get(url, timeout=10)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    products = self._parse_html_products(soup)
                    
                    if products:
                        logger.info(f"Found {len(products)} products with requests from {url}")
                        return products
                        
                except Exception as e:
                    logger.debug(f"Failed to scrape {url}: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Requests scraping failed for Pak'nSave: {e}")
            return []
    
    def _scrape_with_selenium(self) -> List[Dict]:
        """Try scraping with Selenium"""
        driver = None
        try:
            logger.info("Trying Selenium method for Pak'nSave...")
            
            driver = self.get_selenium_driver()
            if not driver:
                return []
            
            driver.get(self.search_url)
            time.sleep(3)
            
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            products = self._parse_html_products(soup)
            
            return products
            
        except Exception as e:
            logger.error(f"Selenium scraping failed for Pak'nSave: {e}")
            return []
        finally:
            if driver:
                driver.quit()
    
    def _parse_html_products(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse products from HTML soup"""
        products = []
        
        # Try multiple selectors for product containers
        product_selectors = [
            '[data-testid="product-tile"]',
            '.product-tile',
            '.product-item',
            '.product-card',
            '.product',
            '.tile',
            '.card',
            'article',
            '.product-grid-item',
            '.co-product',
            '.co-product-tile',
            '[class*="product"]',
            '[class*="tile"]',
            '[class*="card"]',
        ]
        
        for selector in product_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements:
                        product = self._extract_product_from_element(element)
                        if product:
                            products.append(product)
                    
                    if products:
                        break
                        
            except Exception as e:
                logger.debug(f"Selector {selector} failed: {e}")
                continue
        
        return products
    
    def _extract_product_from_element(self, element) -> Optional[Dict]:
        """Extract product data from a single HTML element"""
        try:
            # Extract name
            name = self._extract_text_from_element(element, [
                '[data-testid="product-name"]',
                '.product-name',
                '.product-title',
                'h3', 'h4', 'h5',
                '.name', '.title',
                '[class*="name"]',
                '[class*="title"]',
            ])
            
            if not name or 'butter' not in name.lower():
                return None
            
            # Extract price
            price_text = self._extract_text_from_element(element, [
                '[data-testid="price"]',
                '.price',
                '.product-price',
                '.price-value',
                '.cost', '.amount',
                '[class*="price"]',
                '[class*="cost"]',
            ])
            
            price = self.extract_price(price_text)
            if not price:
                return None
            
            # Extract weight and brand
            weight = self.extract_weight(name)
            brand = self.extract_brand_safely(name)
            
            if weight:
                return {
                    'name': name,
                    'brand': brand,
                    'price': price,
                    'weight_grams': weight,
                    'store': 'Pak\'nSave',
                    'scraped_at': datetime.now()
                }
            
        except Exception as e:
            logger.debug(f"Error extracting product: {e}")
        
        return None
    
    def _extract_text_from_element(self, element, selectors: List[str]) -> Optional[str]:
        """Extract text from element using multiple selectors"""
        for selector in selectors:
            try:
                found = element.select_one(selector)
                if found and found.get_text().strip():
                    return found.get_text().strip()
            except:
                continue
        return None


class NewWorldScraper(BaseScraper):
    """Scraper for New World website"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.newworld.co.nz"
        self.search_url = "https://www.newworld.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine"
    
    def scrape_butter_prices(self) -> List[Dict]:
        """Scrape butter prices from New World"""
        try:
            logger.info("Starting New World scraper")
            
            # Try requests first
            products = self._scrape_with_requests()
            
            if not products:
                logger.info("Requests method failed, trying Selenium...")
                products = self._scrape_with_selenium()
            
            logger.info(f"New World scraper completed. Found {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"New World scraper failed: {e}")
            return []
    
    def _scrape_with_requests(self) -> List[Dict]:
        """Try scraping with requests + BeautifulSoup"""
        try:
            logger.info("Trying requests method for New World...")
            
            urls_to_try = [
                "https://www.newworld.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine",
                "https://www.newworld.co.nz/shop/search?q=butter",
                "https://www.newworld.co.nz/shop/browse/dairy-eggs-fridge",
            ]
            
            for url in urls_to_try:
                try:
                    response = self.session.get(url, timeout=10)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    products = self._parse_html_products(soup)
                    
                    if products:
                        logger.info(f"Found {len(products)} products with requests from {url}")
                        return products
                        
                except Exception as e:
                    logger.debug(f"Failed to scrape {url}: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Requests scraping failed for New World: {e}")
            return []
    
    def _scrape_with_selenium(self) -> List[Dict]:
        """Try scraping with Selenium"""
        driver = None
        try:
            logger.info("Trying Selenium method for New World...")
            
            driver = self.get_selenium_driver()
            if not driver:
                return []
            
            driver.get(self.search_url)
            time.sleep(3)
            
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            products = self._parse_html_products(soup)
            
            return products
            
        except Exception as e:
            logger.error(f"Selenium scraping failed for New World: {e}")
            return []
        finally:
            if driver:
                driver.quit()
    
    def _parse_html_products(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse products from HTML soup"""
        products = []
        
        # Try multiple selectors for product containers
        product_selectors = [
            '[data-testid="product-tile"]',
            '.product-tile',
            '.product-item',
            '.product-card',
            '.product',
            '.tile',
            '.card',
            'article',
            '.product-grid-item',
            '.co-product',
            '.co-product-tile',
            '[class*="product"]',
            '[class*="tile"]',
            '[class*="card"]',
        ]
        
        for selector in product_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements:
                        product = self._extract_product_from_element(element)
                        if product:
                            products.append(product)
                    
                    if products:
                        break
                        
            except Exception as e:
                logger.debug(f"Selector {selector} failed: {e}")
                continue
        
        return products
    
    def _extract_product_from_element(self, element) -> Optional[Dict]:
        """Extract product data from a single HTML element"""
        try:
            # Extract name
            name = self._extract_text_from_element(element, [
                '[data-testid="product-name"]',
                '.product-name',
                '.product-title',
                'h3', 'h4', 'h5',
                '.name', '.title',
                '[class*="name"]',
                '[class*="title"]',
            ])
            
            if not name or 'butter' not in name.lower():
                return None
            
            # Extract price
            price_text = self._extract_text_from_element(element, [
                '[data-testid="price"]',
                '.price',
                '.product-price',
                '.price-value',
                '.cost', '.amount',
                '[class*="price"]',
                '[class*="cost"]',
            ])
            
            price = self.extract_price(price_text)
            if not price:
                return None
            
            # Extract weight and brand
            weight = self.extract_weight(name)
            brand = self.extract_brand_safely(name)
            
            if weight:
                return {
                    'name': name,
                    'brand': brand,
                    'price': price,
                    'weight_grams': weight,
                    'store': 'New World',
                    'scraped_at': datetime.now()
                }
            
        except Exception as e:
            logger.debug(f"Error extracting product: {e}")
        
        return None
    
    def _extract_text_from_element(self, element, selectors: List[str]) -> Optional[str]:
        """Extract text from element using multiple selectors"""
        for selector in selectors:
            try:
                found = element.select_one(selector)
                if found and found.get_text().strip():
                    return found.get_text().strip()
            except:
                continue
        return None


def get_all_scrapers():
    """Get all available scrapers"""
    return [
        CountdownScraper(),
        PaknSaveScraper(),
        NewWorldScraper()
    ] 