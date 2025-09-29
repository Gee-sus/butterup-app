#!/usr/bin/env python3
"""
Real Product Image Scraper - Uses actual product URLs from existing scrapers
"""

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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
import re

logger = logging.getLogger(__name__)


class RealProductImageScraper:
    """Scraper for extracting real product images from actual store URLs"""
    
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
        
        # Real product URLs from your existing scrapers
        self.real_product_urls = {
            'paknsave': {
                'anchor_butter_500g': {
                    'url': 'https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter',
                    'name': 'Anchor Butter 500g',
                    'gtin': '3017620422003'
                },
                'mainland_butter_500g': {
                    'url': 'https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter',
                    'name': 'Mainland Butter 500g',
                    'gtin': '3017620425035'
                },
                'westgold_butter_500g': {
                    'url': 'https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter',
                    'name': 'Westgold Butter 500g',
                    'gtin': None
                }
            },
            'countdown': {
                'anchor_butter_500g': {
                    'url': 'https://shop.countdown.co.nz/shop/productdetails?stockcode=3017620422003',
                    'name': 'Anchor Butter 500g',
                    'gtin': '3017620422003'
                },
                'mainland_butter_500g': {
                    'url': 'https://shop.countdown.co.nz/shop/productdetails?stockcode=3017620425035',
                    'name': 'Mainland Butter 500g',
                    'gtin': '3017620425035'
                }
            },
            'new_world': {
                'anchor_butter_500g': {
                    'url': 'https://shop.newworld.co.nz/shop/productdetails?stockcode=3017620422003',
                    'name': 'Anchor Butter 500g',
                    'gtin': '3017620422003'
                },
                'mainland_butter_500g': {
                    'url': 'https://shop.newworld.co.nz/shop/productdetails?stockcode=3017620425035',
                    'name': 'Mainland Butter 500g',
                    'gtin': '3017620425035'
                }
            }
        }
    
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

    def get_real_product_url(self, store: str, product_name: str) -> Optional[str]:
        """Get the real product URL for a specific store and product"""
        store_urls = self.real_product_urls.get(store.lower())
        if not store_urls:
            return None
        
        # Try to match by product name
        for key, product_data in store_urls.items():
            if product_name.lower() in product_data['name'].lower():
                return product_data['url']
        
        return None

    def scrape_real_product_images(self, store: str, product_name: str) -> List[Dict]:
        """Scrape real product images using actual product URLs"""
        product_url = self.get_real_product_url(store, product_name)
        
        if not product_url:
            logger.warning(f"No real URL found for {product_name} at {store}")
            return []
        
        logger.info(f"Scraping real images from: {product_url}")
        
        # Try with Selenium first (better for JavaScript-heavy sites)
        images = self._scrape_with_selenium(product_url, store)
        
        if not images:
            logger.info("Selenium failed, trying requests...")
            images = self._scrape_with_requests(product_url, store)
        
        return images

    def _scrape_with_selenium(self, url: str, store: str) -> List[Dict]:
        """Scrape images using Selenium"""
        driver = self.get_selenium_driver()
        if not driver:
            return []
        
        try:
            # Add random delay
            time.sleep(random.uniform(2, 4))
            
            driver.get(url)
            
            # Wait for page to load
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "img"))
            )
            
            # Additional wait for dynamic content
            time.sleep(3)
            
            # Get all images
            images = driver.find_elements(By.TAG_NAME, "img")
            
            product_images = []
            for img in images:
                try:
                    src = img.get_attribute('src')
                    alt = img.get_attribute('alt') or ''
                    
                    if self._is_real_product_image(src, alt, store):
                        image_data = {
                            'url': src,
                            'alt_text': alt,
                            'width': img.get_attribute('width'),
                            'height': img.get_attribute('height'),
                            'title': img.get_attribute('title') or alt
                        }
                        product_images.append(image_data)
                        logger.info(f"Found real product image: {src}")
                
                except Exception as e:
                    logger.warning(f"Error processing image: {e}")
                    continue
            
            return product_images
            
        except Exception as e:
            logger.error(f"Error scraping with Selenium: {e}")
            return []
        finally:
            driver.quit()

    def _scrape_with_requests(self, url: str, store: str) -> List[Dict]:
        """Scrape images using requests"""
        try:
            # Add random delay
            time.sleep(random.uniform(1, 3))
            
            response = self.session.get(url, timeout=20)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            images = soup.find_all('img')
            
            product_images = []
            for img in images:
                try:
                    src = img.get('src')
                    alt = img.get('alt') or ''
                    
                    if src and self._is_real_product_image(src, alt, store):
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
                        logger.info(f"Found real product image: {src}")
                
                except Exception as e:
                    logger.warning(f"Error processing image: {e}")
                    continue
            
            return product_images
            
        except Exception as e:
            logger.error(f"Error scraping with requests: {e}")
            return []

    def _is_real_product_image(self, src: str, alt: str, store: str) -> bool:
        """Check if an image is likely a real product image"""
        if not src:
            return False
        
        # Skip small images, icons, logos
        if any(skip in src.lower() for skip in [
            'icon', 'logo', 'banner', 'advertisement', 'spinner', 'loading',
            'placeholder', 'empty', 'default', 'avatar', 'profile', 'favicon'
        ]):
            return False
        
        # Skip common non-product image patterns
        if any(skip in alt.lower() for skip in [
            'logo', 'banner', 'ad', 'icon', 'button', 'arrow', 'close', 'menu'
        ]):
            return False
        
        # Look for product-related keywords in alt text
        product_keywords = ['butter', 'product', 'image', 'photo', 'picture', 'anchor', 'mainland', 'westgold']
        if any(keyword in alt.lower() for keyword in product_keywords):
            return True
        
        # Check if URL contains product-related patterns
        if any(pattern in src.lower() for pattern in [
            'product', 'image', 'photo', 'picture', 'asset', 'media'
        ]):
            return True
        
        # Store-specific logic
        if store.lower() == 'paknsave':
            return self._is_paknsave_real_image(src, alt)
        elif store.lower() == 'countdown':
            return self._is_countdown_real_image(src, alt)
        elif store.lower() == 'new_world':
            return self._is_newworld_real_image(src, alt)
        
        return False

    def _is_paknsave_real_image(self, src: str, alt: str) -> bool:
        """Pak'nSave specific real product image detection"""
        # Pak'nSave often uses specific URL patterns
        if any(pattern in src.lower() for pattern in [
            'product', 'images', 'media', 'assets'
        ]):
            return True
        
        # Look for product image patterns in alt text
        if any(keyword in alt.lower() for keyword in ['product', 'item', 'goods', 'butter']):
            return True
        
        return False

    def _is_countdown_real_image(self, src: str, alt: str) -> bool:
        """Countdown specific real product image detection"""
        # Countdown often uses specific URL patterns
        if any(pattern in src.lower() for pattern in [
            'product', 'assets', 'images', 'media'
        ]):
            return True
        
        return False

    def _is_newworld_real_image(self, src: str, alt: str) -> bool:
        """New World specific real product image detection"""
        # New World often uses specific URL patterns
        if any(pattern in src.lower() for pattern in [
            'product', 'images', 'media', 'assets'
        ]):
            return True
        
        return False

    def download_real_image(self, image_url: str, product_name: str, store: str) -> Optional[Tuple[File, str]]:
        """Download a real product image and return the file object and checksum"""
        try:
            logger.info(f"Downloading real image: {image_url}")
            
            # Handle base64 data URLs
            if image_url.startswith('data:image/'):
                import base64
                # Extract base64 data from data URL
                header, data = image_url.split(',', 1)
                image_data = base64.b64decode(data)
                
                # Determine file extension from header
                if 'png' in header:
                    ext = 'png'
                elif 'jpeg' in header or 'jpg' in header:
                    ext = 'jpg'
                elif 'gif' in header:
                    ext = 'gif'
                else:
                    ext = 'jpg'  # default
            else:
                # Regular HTTP URL
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
                
                # Determine file extension from content type
                if 'png' in content_type:
                    ext = 'png'
                elif 'jpeg' in content_type or 'jpg' in content_type:
                    ext = 'jpg'
                elif 'gif' in content_type:
                    ext = 'gif'
                else:
                    ext = 'jpg'  # default
            
            # Verify it's a valid image
            try:
                img = Image.open(io.BytesIO(image_data))
                img.verify()
            except Exception as e:
                logger.warning(f"Invalid image data: {e}")
                return None
            
            # Generate filename
            filename = f"real_{store}_{product_name}_{hashlib.md5(image_data).hexdigest()[:8]}.{ext}"
            
            # Create Django File object from bytes
            django_file = File(io.BytesIO(image_data), name=filename)
            
            # Calculate checksum
            checksum = hashlib.md5(image_data).hexdigest()
            
            return django_file, checksum
            
        except Exception as e:
            logger.error(f"Error downloading real image {image_url}: {e}")
            return None

    def scrape_all_real_butter_images(self) -> Dict[str, List[Dict]]:
        """Scrape real images for all known butter products"""
        results = {}
        
        for store, products in self.real_product_urls.items():
            results[store] = []
            
            for product_key, product_data in products.items():
                logger.info(f"Scraping real images for {product_data['name']} at {store}")
                
                images = self.scrape_real_product_images(store, product_data['name'])
                
                if images:
                    results[store].extend(images)
                    logger.info(f"Found {len(images)} real images for {product_data['name']} at {store}")
                else:
                    logger.warning(f"No real images found for {product_data['name']} at {store}")
                
                # Add delay between products
                time.sleep(random.uniform(2, 4))
        
        return results


def test_real_image_scraper():
    """Test the real image scraper"""
    scraper = RealProductImageScraper()
    
    print("🧈 Testing Real Product Image Scraper...")
    print("=" * 60)
    
    # Test with a specific product
    store = 'paknsave'
    product_name = 'Anchor Butter 500g'
    
    print(f"Testing: {product_name} at {store}")
    
    images = scraper.scrape_real_product_images(store, product_name)
    
    if images:
        print(f"✅ Found {len(images)} real images:")
        for i, img in enumerate(images[:3], 1):
            print(f"  {i}. URL: {img['url']}")
            print(f"     Alt: {img['alt_text']}")
            print(f"     Size: {img['width']}x{img['height']}")
            
            # Try to download the image
            download_result = scraper.download_real_image(
                img['url'],
                product_name,
                store
            )
            
            if download_result:
                django_file, checksum = download_result
                print(f"     ✅ Downloaded successfully")
                print(f"     📁 Filename: {django_file.name}")
                print(f"     🔍 Checksum: {checksum[:8]}...")
            else:
                print(f"     ❌ Failed to download")
    else:
        print("❌ No real images found")
    
    return images


if __name__ == "__main__":
    test_real_image_scraper()
