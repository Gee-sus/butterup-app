import requests
import json
import logging
import time
import random
from typing import Dict, List, Optional
from bs4 import BeautifulSoup
import re
from decimal import Decimal
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NZGroceriesScraper:
    """Test implementation based on New Zealand Groceries Scraper approach"""
    
    def __init__(self):
        self.session = requests.Session()
        self._setup_session()
    
    def _setup_session(self):
        """Set up session with realistic headers"""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-NZ,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        })
    
    def test_paknsave_scraping(self) -> List[Dict]:
        """Test Pak'nSave scraping using NZ Groceries Scraper approach"""
        logger.info("🧈 Testing Pak'nSave scraping (NZ Groceries Scraper method)")
        
        products = []
        
        try:
            # Method 1: Try search page
            search_products = self._scrape_paknsave_search()
            products.extend(search_products)
            
            # Method 2: Try category page
            category_products = self._scrape_paknsave_category()
            products.extend(category_products)
            
            # Method 3: Try direct product URLs
            direct_products = self._scrape_paknsave_direct()
            products.extend(direct_products)
            
        except Exception as e:
            logger.error(f"Pak'nSave scraping error: {e}")
        
        # Remove duplicates
        unique_products = self._deduplicate_products(products)
        
        logger.info(f"Pak'nSave scraping completed: {len(unique_products)} unique products found")
        return unique_products
    
    def _scrape_paknsave_search(self) -> List[Dict]:
        """Scrape Pak'nSave search page"""
        products = []
        
        try:
            logger.info("Trying Pak'nSave search page...")
            
            # Try different search URLs
            search_urls = [
                'https://www.paknsave.co.nz/shop/search?q=butter',
                'https://www.paknsave.co.nz/shop/search?q=butter&sort=price',
                'https://www.paknsave.co.nz/shop/search?q=butter&sort=name',
            ]
            
            for url in search_urls:
                try:
                    logger.info(f"Testing: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(2, 4))
                    
                    response = self.session.get(url, timeout=15)
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        # Check if we got blocked
                        if "Just a moment" in response.text or "Cloudflare" in response.text:
                            logger.warning("Cloudflare protection detected")
                            continue
                        
                        # Parse the page
                        soup = BeautifulSoup(response.text, 'html.parser')
                        page_products = self._extract_products_from_soup(soup, 'Pak\'nSave')
                        
                        if page_products:
                            logger.info(f"Found {len(page_products)} products from search")
                            products.extend(page_products)
                            break  # Success, no need to try other URLs
                        else:
                            logger.info("No products found in search page")
                    else:
                        logger.warning(f"Search failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Search URL {url} failed: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Search scraping error: {e}")
        
        return products
    
    def _scrape_paknsave_category(self) -> List[Dict]:
        """Scrape Pak'nSave category page"""
        products = []
        
        try:
            logger.info("Trying Pak'nSave category page...")
            
            # Try dairy/butter category
            category_urls = [
                'https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge/butter-margarine',
                'https://www.paknsave.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine',
                'https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge',
            ]
            
            for url in category_urls:
                try:
                    logger.info(f"Testing: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(2, 4))
                    
                    response = self.session.get(url, timeout=15)
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        # Check if we got blocked
                        if "Just a moment" in response.text or "Cloudflare" in response.text:
                            logger.warning("Cloudflare protection detected")
                            continue
                        
                        # Parse the page
                        soup = BeautifulSoup(response.text, 'html.parser')
                        page_products = self._extract_products_from_soup(soup, 'Pak\'nSave')
                        
                        if page_products:
                            logger.info(f"Found {len(page_products)} products from category")
                            products.extend(page_products)
                            break  # Success, no need to try other URLs
                        else:
                            logger.info("No products found in category page")
                    else:
                        logger.warning(f"Category failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Category URL {url} failed: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Category scraping error: {e}")
        
        return products
    
    def _scrape_paknsave_direct(self) -> List[Dict]:
        """Scrape specific Pak'nSave product pages"""
        products = []
        
        try:
            logger.info("Trying direct Pak'nSave product pages...")
            
            # Known product URLs (these might work even if search doesn't)
            product_urls = [
                'https://www.paknsave.co.nz/shop/product/5002650_ea_000pns?name=anchor-butter',
                'https://www.paknsave.co.nz/shop/product/5002651_ea_000pns?name=mainland-butter',
                'https://www.paknsave.co.nz/shop/product/5002652_ea_000pns?name=westgold-butter',
            ]
            
            for url in product_urls:
                try:
                    logger.info(f"Testing: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(3, 5))
                    
                    response = self.session.get(url, timeout=15)
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        # Check if we got blocked
                        if "Just a moment" in response.text or "Cloudflare" in response.text:
                            logger.warning("Cloudflare protection detected")
                            continue
                        
                        # Parse the page
                        soup = BeautifulSoup(response.text, 'html.parser')
                        product = self._extract_single_product_from_soup(soup, url, 'Pak\'nSave')
                        
                        if product:
                            logger.info(f"Found product: {product['name']} - ${product['price']}")
                            products.append(product)
                        else:
                            logger.info("No product data found on page")
                    else:
                        logger.warning(f"Product page failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Product URL {url} failed: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Direct product scraping error: {e}")
        
        return products
    
    def test_countdown_scraping(self) -> List[Dict]:
        """Test Countdown scraping using NZ Groceries Scraper approach"""
        logger.info("🛒 Testing Countdown scraping (NZ Groceries Scraper method)")
        
        products = []
        
        try:
            # Method 1: Try search page
            search_products = self._scrape_countdown_search()
            products.extend(search_products)
            
            # Method 2: Try category page
            category_products = self._scrape_countdown_category()
            products.extend(category_products)
            
        except Exception as e:
            logger.error(f"Countdown scraping error: {e}")
        
        # Remove duplicates
        unique_products = self._deduplicate_products(products)
        
        logger.info(f"Countdown scraping completed: {len(unique_products)} unique products found")
        return unique_products
    
    def _scrape_countdown_search(self) -> List[Dict]:
        """Scrape Countdown search page"""
        products = []
        
        try:
            logger.info("Trying Countdown search page...")
            
            # Try different search URLs
            search_urls = [
                'https://www.countdown.co.nz/shop/search?q=butter',
                'https://www.countdown.co.nz/shop/search?q=butter&sort=price',
            ]
            
            for url in search_urls:
                try:
                    logger.info(f"Testing: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(2, 4))
                    
                    response = self.session.get(url, timeout=15)
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        # Check if we got blocked
                        if "Just a moment" in response.text or "Cloudflare" in response.text:
                            logger.warning("Cloudflare protection detected")
                            continue
                        
                        # Parse the page
                        soup = BeautifulSoup(response.text, 'html.parser')
                        page_products = self._extract_products_from_soup(soup, 'Countdown')
                        
                        if page_products:
                            logger.info(f"Found {len(page_products)} products from search")
                            products.extend(page_products)
                            break  # Success, no need to try other URLs
                        else:
                            logger.info("No products found in search page")
                    else:
                        logger.warning(f"Search failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Search URL {url} failed: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Countdown search scraping error: {e}")
        
        return products
    
    def _scrape_countdown_category(self) -> List[Dict]:
        """Scrape Countdown category page"""
        products = []
        
        try:
            logger.info("Trying Countdown category page...")
            
            # Try dairy/butter category
            category_urls = [
                'https://www.countdown.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine',
                'https://www.countdown.co.nz/shop/category/dairy-eggs-fridge',
            ]
            
            for url in category_urls:
                try:
                    logger.info(f"Testing: {url}")
                    
                    # Add random delay
                    time.sleep(random.uniform(2, 4))
                    
                    response = self.session.get(url, timeout=15)
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        # Check if we got blocked
                        if "Just a moment" in response.text or "Cloudflare" in response.text:
                            logger.warning("Cloudflare protection detected")
                            continue
                        
                        # Parse the page
                        soup = BeautifulSoup(response.text, 'html.parser')
                        page_products = self._extract_products_from_soup(soup, 'Countdown')
                        
                        if page_products:
                            logger.info(f"Found {len(page_products)} products from category")
                            products.extend(page_products)
                            break  # Success, no need to try other URLs
                        else:
                            logger.info("No products found in category page")
                    else:
                        logger.warning(f"Category failed with status {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Category URL {url} failed: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Countdown category scraping error: {e}")
        
        return products
    
    def _extract_products_from_soup(self, soup: BeautifulSoup, store: str) -> List[Dict]:
        """Extract products from BeautifulSoup object"""
        products = []
        
        try:
            # Look for various product container patterns
            product_selectors = [
                '[data-testid*="product"]',
                '.product-tile',
                '.product-item',
                '.product-card',
                '[class*="product"]',
                '.tile',
                '.item',
            ]
            
            for selector in product_selectors:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements:
                        product = self._extract_product_from_element(element, store)
                        if product:
                            products.append(product)
                    
                    if products:
                        break  # Found products, no need to try other selectors
            
            # Also try regex extraction from page content
            if not products:
                products = self._extract_products_with_regex(soup.get_text(), store)
            
        except Exception as e:
            logger.error(f"Error extracting products from soup: {e}")
        
        return products
    
    def _extract_product_from_element(self, element, store: str) -> Optional[Dict]:
        """Extract product data from a single element"""
        try:
            text = element.get_text().strip()
            
            # Look for butter products with prices
            if 'butter' in text.lower() and '$' in text:
                # Try to extract name and price
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                
                name = ''
                price = ''
                
                # Find product name (look for line with 'butter')
                for line in lines:
                    if 'butter' in line.lower() and len(line) > 5 and len(line) < 100:
                        name = line
                        break
                
                # Find price (look for line with '$')
                for line in lines:
                    if '$' in line and len(line) < 20:
                        price = line
                        break
                
                if name and price:
                    # Extract numeric price
                    price_match = re.search(r'\$([\d.]+)', price)
                    if price_match:
                        price_value = Decimal(price_match.group(1))
                        
                        # Extract brand
                        brand = name.split()[0] if name else 'Unknown'
                        
                        return {
                            'name': name,
                            'price': price_value,
                            'brand': brand,
                            'weight_grams': 500,  # Assume 500g for butter
                            'store': store,
                            'scraped_at': datetime.now(),
                            'source': 'nz_groceries_scraper'
                        }
        
        except Exception as e:
            logger.error(f"Error extracting product from element: {e}")
        
        return None
    
    def _extract_single_product_from_soup(self, soup: BeautifulSoup, url: str, store: str) -> Optional[Dict]:
        """Extract single product from product page"""
        try:
            # Get product name
            name_selectors = [
                'h1[data-testid="product-name"]',
                '.product-name',
                '.product-title',
                'h1',
                '[class*="product-name"]'
            ]
            
            name = ''
            for selector in name_selectors:
                element = soup.select_one(selector)
                if element and element.get_text().strip():
                    name = element.get_text().strip()
                    break
            
            # Get price
            price_selectors = [
                '[data-testid="price"]',
                '.price',
                '.product-price',
                '.price-value',
                '[class*="price"]'
            ]
            
            price = ''
            for selector in price_selectors:
                element = soup.select_one(selector)
                if element and element.get_text().strip():
                    price = element.get_text().strip()
                    break
            
            if name and price:
                # Extract numeric price
                price_match = re.search(r'\$([\d.]+)', price)
                if price_match:
                    price_value = Decimal(price_match.group(1))
                    
                    # Extract brand
                    brand = name.split()[0] if name else 'Unknown'
                    
                    return {
                        'name': name,
                        'price': price_value,
                        'brand': brand,
                        'weight_grams': 500,  # Assume 500g for butter
                        'store': store,
                        'scraped_at': datetime.now(),
                        'source': 'nz_groceries_scraper',
                        'url': url
                    }
        
        except Exception as e:
            logger.error(f"Error extracting single product: {e}")
        
        return None
    
    def _extract_products_with_regex(self, text: str, store: str) -> List[Dict]:
        """Extract products using regex patterns"""
        products = []
        
        try:
            # Various regex patterns for different price formats
            patterns = [
                r'([A-Za-z\s]+Butter)500g(\d+)ea\$([\d.]+)/100g',
                r'([A-Za-z\s]+Butter)\s*500g\s*\$([\d.]+)',
                r'([A-Za-z\s]+Butter)\s*\$([\d.]+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, text)
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
                            'store': store,
                            'scraped_at': datetime.now(),
                            'source': 'nz_groceries_scraper'
                        }
                        
                        products.append(product)
                        logger.info(f"Regex extracted: {product['name']} - ${product['price']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing regex match {match}: {e}")
                        continue
        
        except Exception as e:
            logger.error(f"Error with regex extraction: {e}")
        
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
    
    def run_all_tests(self) -> Dict[str, List[Dict]]:
        """Run all scraping tests"""
        logger.info("🧈 Testing New Zealand Groceries Scraper Approach")
        logger.info("=" * 60)
        
        results = {}
        
        # Test Pak'nSave
        paknsave_products = self.test_paknsave_scraping()
        results['paknsave'] = paknsave_products
        
        # Test Countdown
        countdown_products = self.test_countdown_scraping()
        results['countdown'] = countdown_products
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("📊 NZ Groceries Scraper Test Results:")
        logger.info("=" * 60)
        
        total_products = 0
        for store, products in results.items():
            logger.info(f"  {store.title()}: {len(products)} products")
            total_products += len(products)
            
            # Show first few products
            for i, product in enumerate(products[:3]):
                logger.info(f"    {i+1}. {product['name']} - ${product['price']}")
        
        logger.info(f"\nTotal products found: {total_products}")
        
        if total_products > 0:
            logger.info("🎉 NZ Groceries Scraper approach found some products!")
        else:
            logger.info("😞 NZ Groceries Scraper approach found no products")
        
        return results


def main():
    """Main test function"""
    scraper = NZGroceriesScraper()
    results = scraper.run_all_tests()
    return results


if __name__ == "__main__":
    main()


































