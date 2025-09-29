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
        
        driver = webdriver.Chrome(
            ChromeDriverManager().install(),
            options=chrome_options
        )
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


class CountdownScraper(BaseScraper):
    """Scraper for Countdown website"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.countdown.co.nz"
        self.search_url = "https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine"
    
    def scrape_butter_prices(self) -> List[Dict]:
        """Scrape butter prices from Countdown"""
        try:
            logger.info("Starting Countdown scraper")
            
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
                ".product-card"
            ]
            
            products = []
            for selector in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        products = elements
                        break
                except:
                    continue
            
            butter_products = []
            
            for product in products:
                try:
                    # Extract product name
                    name_selectors = [
                        "[data-testid='product-name']",
                        ".product-name",
                        ".product-title",
                        "h3",
                        "h4"
                    ]
                    
                    name = None
                    for selector in name_selectors:
                        try:
                            name_elem = product.find_element(By.CSS_SELECTOR, selector)
                            name = name_elem.text.strip()
                            if name:
                                break
                        except:
                            continue
                    
                    if not name or 'butter' not in name.lower():
                        continue
                    
                    # Extract price
                    price_selectors = [
                        "[data-testid='price']",
                        ".price",
                        ".product-price",
                        ".price-value"
                    ]
                    
                    price = None
                    for selector in price_selectors:
                        try:
                            price_elem = product.find_element(By.CSS_SELECTOR, selector)
                            price_text = price_elem.text.strip()
                            price = self.extract_price(price_text)
                            if price:
                                break
                        except:
                            continue
                    
                    # Extract weight
                    weight = self.extract_weight(name)
                    
                    # Extract brand (usually first word in name)
                    if name and name.strip():
                        try:
                            brand = name.split()[0]
                        except:
                            brand = "Unknown"
                    else:
                        brand = "Unknown"
                    
                    if price and weight:
                        butter_products.append({
                            'name': name,
                            'brand': brand,
                            'price': price,
                            'weight_grams': weight,
                            'store': 'Countdown',
                            'scraped_at': datetime.now()
                        })
                
                except Exception as e:
                    logger.error(f"Error processing Countdown product: {e}")
                    continue
            
            driver.quit()
            logger.info(f"Countdown scraper completed. Found {len(butter_products)} products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Countdown scraper failed: {e}")
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
                ".product-card"
            ]
            
            products = []
            for selector in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        products = elements
                        break
                except:
                    continue
            
            butter_products = []
            
            for product in products:
                try:
                    # Extract product name
                    name_selectors = [
                        "[data-testid='product-name']",
                        ".product-name",
                        ".product-title",
                        "h3",
                        "h4"
                    ]
                    
                    name = None
                    for selector in name_selectors:
                        try:
                            name_elem = product.find_element(By.CSS_SELECTOR, selector)
                            name = name_elem.text.strip()
                            if name:
                                break
                        except:
                            continue
                    
                    if not name or 'butter' not in name.lower():
                        continue
                    
                    # Extract price
                    price_selectors = [
                        "[data-testid='price']",
                        ".price",
                        ".product-price",
                        ".price-value"
                    ]
                    
                    price = None
                    for selector in price_selectors:
                        try:
                            price_elem = product.find_element(By.CSS_SELECTOR, selector)
                            price_text = price_elem.text.strip()
                            price = self.extract_price(price_text)
                            if price:
                                break
                        except:
                            continue
                    
                    # Extract weight
                    weight = self.extract_weight(name)
                    
                    # Extract brand
                    brand = name.split()[0] if name and name.strip() else "Unknown"
                    
                    if price and weight:
                        butter_products.append({
                            'name': name,
                            'brand': brand,
                            'price': price,
                            'weight_grams': weight,
                            'store': 'Pak\'nSave',
                            'scraped_at': datetime.now()
                        })
                
                except Exception as e:
                    logger.error(f"Error processing Pak'nSave product: {e}")
                    continue
            
            driver.quit()
            logger.info(f"Pak'nSave scraper completed. Found {len(butter_products)} products")
            return butter_products
            
        except Exception as e:
            logger.error(f"Pak'nSave scraper failed: {e}")
            return []


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
                ".product-card"
            ]
            
            products = []
            for selector in selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        products = elements
                        break
                except:
                    continue
            
            butter_products = []
            
            for product in products:
                try:
                    # Extract product name
                    name_selectors = [
                        "[data-testid='product-name']",
                        ".product-name",
                        ".product-title",
                        "h3",
                        "h4"
                    ]
                    
                    name = None
                    for selector in name_selectors:
                        try:
                            name_elem = product.find_element(By.CSS_SELECTOR, selector)
                            name = name_elem.text.strip()
                            if name:
                                break
                        except:
                            continue
                    
                    if not name or 'butter' not in name.lower():
                        continue
                    
                    # Extract price
                    price_selectors = [
                        "[data-testid='price']",
                        ".price",
                        ".product-price",
                        ".price-value"
                    ]
                    
                    price = None
                    for selector in price_selectors:
                        try:
                            price_elem = product.find_element(By.CSS_SELECTOR, selector)
                            price_text = price_elem.text.strip()
                            price = self.extract_price(price_text)
                            if price:
                                break
                        except:
                            continue
                    
                    # Extract weight
                    weight = self.extract_weight(name)
                    
                    # Extract brand
                    brand = name.split()[0] if name and name.strip() else "Unknown"
                    
                    if price and weight:
                        butter_products.append({
                            'name': name,
                            'brand': brand,
                            'price': price,
                            'weight_grams': weight,
                            'store': 'New World',
                            'scraped_at': datetime.now()
                        })
                
                except Exception as e:
                    logger.error(f"Error processing New World product: {e}")
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