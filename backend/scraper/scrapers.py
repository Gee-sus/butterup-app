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

logger = logging.getLogger(__name__)


class BaseScraper:
    """Base class for all scrapers"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-plugins')
        chrome_options.add_argument('--disable-images')
        chrome_options.add_argument('--disable-javascript')
        
        try:
            # Try using Selenium's built-in driver management (newer versions)
            driver = webdriver.Chrome(options=chrome_options)
            logger.info("Using Selenium's built-in Chrome driver")
        except Exception as e:
            logger.warning(f"Selenium built-in driver failed: {e}")
            try:
                # Try with specific Chrome driver path if available
                import os
                chrome_driver_path = os.environ.get('CHROME_DRIVER_PATH')
                if chrome_driver_path and os.path.exists(chrome_driver_path):
                    driver = webdriver.Chrome(executable_path=chrome_driver_path, options=chrome_options)
                    logger.info("Using Chrome driver from environment variable")
                else:
                    # Final fallback - try without any driver specification
                    driver = webdriver.Chrome(options=chrome_options)
                    logger.info("Using Chrome driver without specification")
            except Exception as e2:
                logger.error(f"All Chrome driver attempts failed: {e2}")
                raise Exception(f"Could not initialize Chrome driver: {e2}")
        
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    
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
        """Extract brand from product name without DB lookups.

        Strategy:
        - Try matching against a small known list of common butter brands.
        - Fallback to first word of the name, otherwise 'Unknown'.
        """
        if not name or not name.strip():
            return "Unknown"

        known_brands = [
            # Common NZ butter brands and variants
            "Anchor", "Mainland", "Westgold", "Lurpak", "Dairyworks",
            "Pam's", "Pams", "Woolworths", "Countdown", "New World",
            "Lewis Road", "Lewis Road Creamery", "Organic Times",
            "Petit Normand", "Market Kitchen",
        ]

        lowered = name.lower()
        for brand in known_brands:
            if brand.lower() in lowered:
                return brand

        # Fallback: first word is often the brand for store brands
        words = name.strip().split()
        return words[0] if words else "Unknown"


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
            
            # Use Selenium for dynamic content
            driver = self.get_selenium_driver()
            driver.get(self.search_url)
            
            # Wait for page to load
            time.sleep(5)
            
            # Try different selectors for product elements
            selectors = [
                "[data-testid='product-tile']",
                ".product-tile",
                ".product-item",
                "[data-testid='product-card']",
                ".product-card",
                ".product",
                "[data-testid='product']",
                ".tile",
                ".card",
                "article",
                ".product-grid-item"
            ]
            
            products = []
            for selector in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        products = elements
                        logger.info(f"Found {len(elements)} products using selector: {selector}")
                        break
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
                    continue
            
            butter_products = []
            
            for i, product in enumerate(products):
                try:
                    logger.debug(f"Processing product {i+1}/{len(products)}")
                    
                    # Extract product name
                    name_selectors = [
                        "[data-testid='product-name']",
                        ".product-name",
                        ".product-title",
                        "h3",
                        "h4",
                        ".name",
                        ".title"
                    ]
                    
                    name = None
                    for selector in name_selectors:
                        try:
                            name_elem = product.find_element(By.CSS_SELECTOR, selector)
                            name = name_elem.text.strip()
                            if name:
                                logger.debug(f"Found name: {name}")
                                break
                        except:
                            continue
                    
                    if not name or 'butter' not in name.lower():
                        logger.debug(f"Skipping product - no butter in name: {name}")
                        continue
                    
                    # Extract price
                    price_selectors = [
                        "[data-testid='price']",
                        ".price",
                        ".product-price",
                        ".price-value",
                        ".cost",
                        ".amount"
                    ]
                    
                    price = None
                    for selector in price_selectors:
                        try:
                            price_elem = product.find_element(By.CSS_SELECTOR, selector)
                            price_text = price_elem.text.strip()
                            price = self.extract_price(price_text)
                            if price:
                                logger.debug(f"Found price: {price}")
                                break
                        except:
                            continue
                    
                    # Extract weight
                    weight = self.extract_weight(name)
                    logger.debug(f"Extracted weight: {weight}")
                    
                    # Extract brand safely
                    brand = self.extract_brand_safely(name)
                    logger.debug(f"Extracted brand: {brand}")
                    
                    if price and weight:
                        try:
                            butter_products.append({
                                'name': name,
                                'brand': brand,
                                'price': price,
                                'weight_grams': weight,
                                'store': 'Woolworths',
                                'scraped_at': datetime.now()
                            })
                            logger.info(f"Added product: {name} - ${price} - {weight}g")
                        except Exception as e:
                            logger.error(f"Error adding product to list: {e}")
                            continue
                
                except Exception as e:
                    logger.error(f"Error processing Woolworths product {i+1}: {e}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    continue
            
            driver.quit()
            logger.info(f"Woolworths scraper completed. Found {len(butter_products)} products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Woolworths scraper failed: {e}")
            return []


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
            
            # Use Selenium to scrape real prices
            driver = self.get_selenium_driver()
            butter_products = []
            
            try:
                # Navigate to the butter page
                logger.info(f"Navigating to: {self.search_url}")
                driver.get(self.search_url)
                time.sleep(3)  # Wait for page to load
                
                # Wait for products to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='product-tile']"))
                )
                
                # Find all product tiles
                product_tiles = driver.find_elements(By.CSS_SELECTOR, "[data-testid='product-tile']")
                logger.info(f"Found {len(product_tiles)} product tiles")
                
                for i, tile in enumerate(product_tiles[:10]):  # Limit to first 10 products
                    try:
                        # Extract product name
                        name_elem = tile.find_element(By.CSS_SELECTOR, "[data-testid='product-name']")
                        name = name_elem.text.strip()
                        
                        # Only process butter products
                        if 'butter' not in name.lower():
                            continue
                        
                        # Extract price
                        price_elem = tile.find_element(By.CSS_SELECTOR, "[data-testid='price']")
                        price_text = price_elem.text.strip()
                        price = self.extract_price(price_text)
                        
                        if not price:
                            logger.warning(f"No price found for {name}")
                            continue
                        
                        # Extract weight
                        weight = self.extract_weight(name)
                        
                        # Extract brand
                        brand = self.extract_brand_safely(name)
                        
                        if price and weight:
                            butter_products.append({
                                'name': name,
                                'brand': brand,
                                'price': price,
                                'weight_grams': weight,
                                'store': 'Pak\'nSave',
                                'scraped_at': datetime.now()
                            })
                            logger.info(f"Added product: {name} - ${price} - {weight}g")
                    
                    except Exception as e:
                        logger.error(f"Error processing product {i+1}: {e}")
                        continue
                
            finally:
                driver.quit()
            
            logger.info(f"Pak'nSave scraper completed. Found {len(butter_products)} products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Pak'nSave scraper failed: {e}")
            return []
    
    def extract_brand_safely(self, name: str) -> str:
        """Extract brand name from product name"""
        if not name:
            return "Unknown"
        
        # Common butter brands
        brands = ['Anchor', 'Mainland', 'Westgold', 'Lurpak', 'Dairyworks', 'Pam\'s', 'Woolworths']
        
        for brand in brands:
            if brand.lower() in name.lower():
                return brand
        
        return "Unknown"


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
            
            # Use Selenium for dynamic content
            driver = self.get_selenium_driver()
            driver.get(self.search_url)
            
            # Wait for page to load
            time.sleep(5)
            
            # Try different selectors for product elements
            selectors = [
                "[data-testid='product-tile']",
                ".product-tile",
                ".product-item",
                "[data-testid='product-card']",
                ".product-card",
                ".product",
                "[data-testid='product']",
                ".tile",
                ".card",
                "article",
                ".product-grid-item"
            ]
            
            products = []
            for selector in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        products = elements
                        logger.info(f"Found {len(elements)} products using selector: {selector}")
                        break
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
                    continue
            
            butter_products = []
            
            for i, product in enumerate(products):
                try:
                    logger.debug(f"Processing product {i+1}/{len(products)}")
                    
                    # Extract product name
                    name_selectors = [
                        "[data-testid='product-name']",
                        ".product-name",
                        ".product-title",
                        "h3",
                        "h4",
                        ".name",
                        ".title"
                    ]
                    
                    name = None
                    for selector in name_selectors:
                        try:
                            name_elem = product.find_element(By.CSS_SELECTOR, selector)
                            name = name_elem.text.strip()
                            if name:
                                logger.debug(f"Found name: {name}")
                                break
                        except:
                            continue
                    
                    if not name or 'butter' not in name.lower():
                        logger.debug(f"Skipping product - no butter in name: {name}")
                        continue
                    
                    # Extract price
                    price_selectors = [
                        "[data-testid='price']",
                        ".price",
                        ".product-price",
                        ".price-value",
                        ".cost",
                        ".amount"
                    ]
                    
                    price = None
                    for selector in price_selectors:
                        try:
                            price_elem = product.find_element(By.CSS_SELECTOR, selector)
                            price_text = price_elem.text.strip()
                            price = self.extract_price(price_text)
                            if price:
                                logger.debug(f"Found price: {price}")
                                break
                        except:
                            continue
                    
                    # Extract weight
                    weight = self.extract_weight(name)
                    logger.debug(f"Extracted weight: {weight}")
                    
                    # Extract brand safely
                    brand = self.extract_brand_safely(name)
                    logger.debug(f"Extracted brand: {brand}")
                    
                    if price and weight:
                        butter_products.append({
                            'name': name,
                            'brand': brand,
                            'price': price,
                            'weight_grams': weight,
                            'store': 'New World',
                            'scraped_at': datetime.now()
                        })
                        logger.info(f"Added product: {name} - ${price} - {weight}g")
                
                except Exception as e:
                    logger.error(f"Error processing New World product {i+1}: {e}")
                    continue
            
            driver.quit()
            logger.info(f"New World scraper completed. Found {len(butter_products)} products")
            return butter_products
            
        except Exception as e:
            logger.error(f"New World scraper failed: {e}")
            return []


def get_all_scrapers():
    """Get all available scrapers"""
    return [
        CountdownScraper(),
        PaknSaveScraper(),
        NewWorldScraper()
    ] 