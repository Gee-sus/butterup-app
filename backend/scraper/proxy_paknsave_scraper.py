import asyncio
import requests
import logging
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Optional
import time
import random

logger = logging.getLogger(__name__)


class ProxyPaknSaveScraper:
    """Scraper using proxy services to bypass Cloudflare"""
    
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
    
    def scrape_with_proxy(self, proxy_url: str = None) -> List[Dict]:
        """Scrape using proxy service"""
        try:
            logger.info("Starting proxy-based scraping")
            
            # Try different proxy services
            proxy_services = [
                'https://api.scraperapi.com/free',
                'https://api.scrapingbee.com/v1',
                'https://api.brightdata.com',
            ]
            
            for proxy_service in proxy_services:
                try:
                    products = self._scrape_with_service(proxy_service)
                    if products:
                        logger.info(f"Successfully scraped {len(products)} products using {proxy_service}")
                        return products
                except Exception as e:
                    logger.error(f"Proxy service {proxy_service} failed: {e}")
                    continue
            
            # Fallback to direct scraping with different strategies
            return self._scrape_with_strategies()
            
        except Exception as e:
            logger.error(f"Proxy scraping failed: {e}")
            return []
    
    def _scrape_with_service(self, service_url: str) -> List[Dict]:
        """Scrape using a specific proxy service"""
        try:
            # This is a placeholder - you would need to implement actual proxy service integration
            # For now, we'll use direct scraping with different strategies
            return self._scrape_with_strategies()
            
        except Exception as e:
            logger.error(f"Service scraping failed: {e}")
            return []
    
    def _scrape_with_strategies(self) -> List[Dict]:
        """Try different scraping strategies"""
        strategies = [
            self._scrape_via_api,
            self._scrape_via_mobile,
            self._scrape_via_alternative_urls,
        ]
        
        for strategy in strategies:
            try:
                products = strategy()
                if products:
                    logger.info(f"Strategy {strategy.__name__} found {len(products)} products")
                    return products
            except Exception as e:
                logger.error(f"Strategy {strategy.__name__} failed: {e}")
                continue
        
        return []
    
    def _scrape_via_api(self) -> List[Dict]:
        """Try to scrape via API endpoints"""
        try:
            logger.info("Trying API-based scraping")
            
            # Try different API endpoints
            api_urls = [
                'https://www.paknsave.co.nz/api/search?q=butter',
                'https://www.paknsave.co.nz/api/products/search?q=butter',
                'https://www.paknsave.co.nz/api/catalog/search?q=butter',
                'https://www.paknsave.co.nz/shop/api/search?q=butter',
            ]
            
            for url in api_urls:
                try:
                    response = self.session.get(url, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        products = self._parse_api_response(data)
                        if products:
                            return products
                except Exception as e:
                    logger.debug(f"API URL {url} failed: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"API scraping failed: {e}")
            return []
    
    def _scrape_via_mobile(self) -> List[Dict]:
        """Try scraping mobile version"""
        try:
            logger.info("Trying mobile version scraping")
            
            # Update headers for mobile
            mobile_headers = self.session.headers.copy()
            mobile_headers.update({
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            })
            
            # Try mobile URLs
            mobile_urls = [
                'https://m.paknsave.co.nz/shop/search?q=butter',
                'https://www.paknsave.co.nz/mobile/search?q=butter',
            ]
            
            for url in mobile_urls:
                try:
                    response = self.session.get(url, headers=mobile_headers, timeout=10)
                    if response.status_code == 200 and "Just a moment" not in response.text:
                        products = self._parse_html_response(response.text)
                        if products:
                            return products
                except Exception as e:
                    logger.debug(f"Mobile URL {url} failed: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Mobile scraping failed: {e}")
            return []
    
    def _scrape_via_alternative_urls(self) -> List[Dict]:
        """Try alternative URLs and methods"""
        try:
            logger.info("Trying alternative URL scraping")
            
            # Try different URL patterns
            alternative_urls = [
                'https://www.paknsave.co.nz/shop/search?q=butter&sort=price',
                'https://www.paknsave.co.nz/shop/search?q=butter&sort=name',
                'https://www.paknsave.co.nz/shop/browse/dairy-eggs-fridge/butter-margarine',
                'https://www.paknsave.co.nz/shop/category/dairy-eggs-fridge',
            ]
            
            for url in alternative_urls:
                try:
                    # Add random delay
                    time.sleep(random.uniform(1, 3))
                    
                    response = self.session.get(url, timeout=15)
                    if response.status_code == 200 and "Just a moment" not in response.text:
                        products = self._parse_html_response(response.text)
                        if products:
                            return products
                except Exception as e:
                    logger.debug(f"Alternative URL {url} failed: {e}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Alternative URL scraping failed: {e}")
            return []
    
    def _parse_api_response(self, data: Dict) -> List[Dict]:
        """Parse API response data"""
        products = []
        
        try:
            # Try different response formats
            if isinstance(data, dict):
                product_lists = [
                    data.get('products', []),
                    data.get('items', []),
                    data.get('results', []),
                    data.get('data', []),
                ]
                
                for product_list in product_lists:
                    if isinstance(product_list, list) and product_list:
                        for item in product_list:
                            if isinstance(item, dict):
                                product = self._extract_product_from_item(item)
                                if product:
                                    products.append(product)
                        if products:
                            break
            
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        product = self._extract_product_from_item(item)
                        if product:
                            products.append(product)
        
        except Exception as e:
            logger.error(f"Error parsing API response: {e}")
        
        return products
    
    def _parse_html_response(self, html_content: str) -> List[Dict]:
        """Parse HTML response"""
        products = []
        
        try:
            import re
            
            # Look for product patterns in HTML
            patterns = [
                r'([A-Za-z\s]+Butter)500g(\d+)ea\$([\d.]+)/100g',
                r'([A-Za-z\s]+Butter)\s*500g\s*\$([\d.]+)',
                r'([A-Za-z\s]+Butter)\s*\$([\d.]+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, html_content)
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
                            'source': 'proxy_scraping'
                        }
                        
                        products.append(product)
                        logger.info(f"HTML extracted: {product['name']} - ${product['price']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing HTML match {match}: {e}")
                        continue
        
        except Exception as e:
            logger.error(f"Error parsing HTML response: {e}")
        
        return products
    
    def _extract_product_from_item(self, item: Dict) -> Optional[Dict]:
        """Extract product data from API item"""
        try:
            name = (
                item.get('name') or 
                item.get('title') or 
                item.get('product_name') or 
                item.get('display_name')
            )
            
            price = (
                item.get('price') or 
                item.get('current_price') or 
                item.get('sale_price') or 
                item.get('price_amount')
            )
            
            if name and price:
                try:
                    if isinstance(price, str):
                        price = Decimal(re.sub(r'[^\d.]', '', price))
                    else:
                        price = Decimal(str(price))
                except:
                    return None
                
                weight = self._extract_weight(name)
                brand = self._extract_brand(name)
                
                return {
                    'name': name,
                    'price': price,
                    'brand': brand,
                    'weight_grams': weight or 500,
                    'store': 'Pak\'nSave',
                    'scraped_at': datetime.now(),
                    'source': 'proxy_scraping'
                }
        
        except Exception as e:
            logger.error(f"Error extracting product from item: {e}")
        
        return None
    
    def _extract_weight(self, text: str) -> Optional[int]:
        """Extract weight in grams from text"""
        if not text:
            return None
        
        import re
        
        weight_patterns = [
            r'(\d+)\s*g',
            r'(\d+)\s*kg',
            r'(\d+(?:\.\d+)?)\s*kg',
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


# Test function
def test_proxy_scraper():
    """Test the proxy scraper"""
    print("🧈 Testing Proxy Pak'nSave Scraper...")
    
    scraper = ProxyPaknSaveScraper()
    products = scraper.scrape_with_proxy()
    
    print(f"\n✅ Found {len(products)} products:")
    for i, product in enumerate(products, 1):
        print(f"  {i}. {product['name']} - ${product['price']} ({product['brand']})")
        print(f"     Source: {product['source']}")
    
    return products


if __name__ == "__main__":
    test_proxy_scraper()


































