import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import logging
import time
import random
import os
from urllib.parse import urljoin, urlparse
from PIL import Image
import io
from django.core.files import File
from django.core.files.temp import NamedTemporaryFile
import hashlib
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class StoreImageScraper:
    """Scraper for extracting product images from store websites"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
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
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return driver
        except Exception as e:
            logger.error(f"Failed to create Chrome driver: {e}")
            return None

    def scrape_product_images(self, product_url: str, store_name: str) -> List[Dict]:
        """Scrape product images from a store website"""
        logger.info(f"Scraping images from: {product_url}")
        
        # Try with Selenium first (better for JavaScript-heavy sites)
        images = self._scrape_with_selenium(product_url, store_name)
        
        if not images:
            logger.info("Selenium failed, trying requests...")
            images = self._scrape_with_requests(product_url, store_name)
        
        return images

    def _scrape_with_selenium(self, url: str, store_name: str) -> List[Dict]:
        """Scrape images using Selenium"""
        driver = self.get_selenium_driver()
        if not driver:
            return []
        
        try:
            # Add random delay
            time.sleep(random.uniform(2, 4))
            
            driver.get(url)
            
            # Wait for page to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "img"))
            )
            
            # Get all images
            images = driver.find_elements(By.TAG_NAME, "img")
            
            product_images = []
            for img in images:
                try:
                    src = img.get_attribute('src')
                    alt = img.get_attribute('alt') or ''
                    
                    if self._is_product_image(src, alt, store_name):
                        image_data = {
                            'url': src,
                            'alt_text': alt,
                            'width': img.get_attribute('width'),
                            'height': img.get_attribute('height'),
                            'title': img.get_attribute('title') or alt
                        }
                        product_images.append(image_data)
                        logger.info(f"Found product image: {src}")
                
                except Exception as e:
                    logger.warning(f"Error processing image: {e}")
                    continue
            
            return product_images
            
        except Exception as e:
            logger.error(f"Error scraping with Selenium: {e}")
            return []
        finally:
            driver.quit()

    def _scrape_with_requests(self, url: str, store_name: str) -> List[Dict]:
        """Scrape images using requests"""
        try:
            # Add random delay
            time.sleep(random.uniform(1, 3))
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            images = soup.find_all('img')
            
            product_images = []
            for img in images:
                try:
                    src = img.get('src')
                    alt = img.get('alt') or ''
                    
                    if src and self._is_product_image(src, alt, store_name):
                        # Make relative URLs absolute
                        if not src.startswith('http'):
                            src = urljoin(url, src)
                        
                        image_data = {
                            'url': src,
                            'alt_text': alt,
                            'width': img.get('width'),
                            'height': img.get('height'),
                            'title': img.get('title') or alt
                        }
                        product_images.append(image_data)
                        logger.info(f"Found product image: {src}")
                
                except Exception as e:
                    logger.warning(f"Error processing image: {e}")
                    continue
            
            return product_images
            
        except Exception as e:
            logger.error(f"Error scraping with requests: {e}")
            return []

    def _is_product_image(self, src: str, alt: str, store_name: str) -> bool:
        """Check if an image is likely a product image"""
        if not src:
            return False
        
        # Skip small images, icons, logos
        if any(skip in src.lower() for skip in [
            'icon', 'logo', 'banner', 'advertisement', 'spinner', 'loading',
            'placeholder', 'empty', 'default', 'avatar', 'profile'
        ]):
            return False
        
        # Skip common non-product image patterns
        if any(skip in alt.lower() for skip in [
            'logo', 'banner', 'ad', 'icon', 'button', 'arrow', 'close'
        ]):
            return False
        
        # Look for product-related keywords in alt text
        product_keywords = ['butter', 'product', 'image', 'photo', 'picture']
        if any(keyword in alt.lower() for keyword in product_keywords):
            return True
        
        # Check if URL contains product-related patterns
        if any(pattern in src.lower() for pattern in [
            'product', 'image', 'photo', 'picture', 'asset'
        ]):
            return True
        
        # For specific stores, use store-specific logic
        if store_name.lower() == 'paknsave':
            return self._is_paknsave_product_image(src, alt)
        elif store_name.lower() == 'countdown':
            return self._is_countdown_product_image(src, alt)
        elif store_name.lower() == 'new_world':
            return self._is_newworld_product_image(src, alt)
        
        return False

    def _is_paknsave_product_image(self, src: str, alt: str) -> bool:
        """Pak'nSave specific product image detection"""
        # Pak'nSave often uses specific URL patterns
        if 'product' in src.lower() or 'images' in src.lower():
            return True
        
        # Look for product image patterns in alt text
        if any(keyword in alt.lower() for keyword in ['product', 'item', 'goods']):
            return True
        
        return False

    def _is_countdown_product_image(self, src: str, alt: str) -> bool:
        """Countdown specific product image detection"""
        # Countdown often uses specific URL patterns
        if 'product' in src.lower() or 'assets' in src.lower():
            return True
        
        return False

    def _is_newworld_product_image(self, src: str, alt: str) -> bool:
        """New World specific product image detection"""
        # New World often uses specific URL patterns
        if 'product' in src.lower() or 'images' in src.lower():
            return True
        
        return False

    def download_image(self, image_url: str, product_name: str, store_name: str) -> Optional[Tuple[File, str]]:
        """Download an image and return the file object and checksum"""
        try:
            logger.info(f"Downloading image: {image_url}")
            
            # Add random delay
            time.sleep(random.uniform(0.5, 1.5))
            
            response = self.session.get(image_url, timeout=15, stream=True)
            response.raise_for_status()
            
            # Check if it's actually an image
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                logger.warning(f"URL does not return an image: {content_type}")
                return None
            
            # Read image data
            image_data = response.content
            
            # Verify it's a valid image
            try:
                img = Image.open(io.BytesIO(image_data))
                img.verify()
            except Exception as e:
                logger.warning(f"Invalid image data: {e}")
                return None
            
            # Create a temporary file
            img_temp = NamedTemporaryFile(delete=False)
            img_temp.write(image_data)
            img_temp.flush()
            
            # Generate filename
            filename = f"{store_name}_{product_name}_{hashlib.md5(image_data).hexdigest()[:8]}.jpg"
            
            # Create Django File object
            django_file = File(img_temp, name=filename)
            
            # Calculate checksum
            checksum = hashlib.md5(image_data).hexdigest()
            
            return django_file, checksum
            
        except Exception as e:
            logger.error(f"Error downloading image {image_url}: {e}")
            return None

    def get_store_image_selectors(self, store_name: str) -> List[str]:
        """Get CSS selectors for product images based on store"""
        selectors = {
            'paknsave': [
                '.product-image img',
                '.product-gallery img',
                '.product-photo img',
                '[data-testid="product-image"] img',
                '.product-details img',
                '.product-media img'
            ],
            'countdown': [
                '.product-image img',
                '.product-gallery img',
                '.product-photo img',
                '[data-testid="product-image"] img',
                '.product-details img',
                '.product-media img'
            ],
            'new_world': [
                '.product-image img',
                '.product-gallery img',
                '.product-photo img',
                '[data-testid="product-image"] img',
                '.product-details img',
                '.product-media img'
            ]
        }
        
        return selectors.get(store_name.lower(), ['.product-image img', '.product-gallery img'])
