import requests
import json
import logging
from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkingPaknSaveAPI:
    """Working Pak'nSave API scraper using the discovered endpoint"""
    
    def __init__(self):
        self.api_url = "https://api-prod.newworld.co.nz/v1/edge/search/paginated/products"
        self.session = requests.Session()
        self._setup_session()
    
    def _setup_session(self):
        """Set up session with headers from the working request"""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-NZ,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            'Origin': 'https://www.paknsave.co.nz',
            'Referer': 'https://www.paknsave.co.nz/shop/search?pg=1&q=butter',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
        })
    
    def search_butter_products(self) -> List[Dict]:
        """Search for butter products using the working API"""
        try:
            logger.info("🧈 Searching for butter products using working API...")
            
            # Payload based on what would be sent for a butter search
            payload = {
                "query": "butter",
                "page": 0,
                "hitsPerPage": 50,
                "filters": {
                    "category1NI": ["Butter & Margarine"]
                },
                "facets": ["brand", "category1NI", "onPromotion", "productFacets"],
                "sort": "relevance"
            }
            
            logger.info(f"Making POST request to: {self.api_url}")
            logger.info(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = self.session.post(
                self.api_url,
                json=payload,
                timeout=15
            )
            
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info("✅ API request successful!")
                
                # Extract products
                products = self._extract_products_from_response(data)
                logger.info(f"Found {len(products)} butter products")
                
                return products
            else:
                logger.error(f"❌ API request failed with status {response.status_code}")
                logger.error(f"Response: {response.text[:500]}...")
                return []
                
        except Exception as e:
            logger.error(f"❌ API request error: {e}")
            return []
    
    def _extract_products_from_response(self, data: Dict) -> List[Dict]:
        """Extract products from API response"""
        products = []
        
        try:
            if 'products' in data:
                for product_data in data['products']:
                    product = self._parse_product_data(product_data)
                    if product:
                        products.append(product)
                        logger.info(f"Extracted: {product['name']} - ${product['price']}")
            
        except Exception as e:
            logger.error(f"Error extracting products: {e}")
        
        return products
    
    def _parse_product_data(self, product_data: Dict) -> Optional[Dict]:
        """Parse individual product data"""
        try:
            # Extract basic info
            name = product_data.get('name', '')
            brand = product_data.get('brand', '')
            display_name = product_data.get('displayName', '')
            product_id = product_data.get('productId', '')
            
            # Create full product name
            full_name = f"{brand} {name} {display_name}".strip()
            
            # Extract price (price is in cents)
            price_data = product_data.get('singlePrice', {})
            price_cents = price_data.get('price', 0)
            price_dollars = Decimal(str(price_cents / 100))
            
            # Extract weight from display name
            weight_grams = self._extract_weight_from_display_name(display_name)
            
            # Check if on promotion
            is_on_promotion = 'promotions' in product_data and len(product_data.get('promotions', [])) > 0
            
            return {
                'name': full_name,
                'price': price_dollars,
                'brand': brand,
                'weight_grams': weight_grams,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'working_api',
                'product_id': product_id,
                'is_on_promotion': is_on_promotion,
                'availability': product_data.get('availability', []),
                'category': self._extract_category(product_data)
            }
            
        except Exception as e:
            logger.error(f"Error parsing product data: {e}")
            return None
    
    def _extract_weight_from_display_name(self, display_name: str) -> int:
        """Extract weight in grams from display name"""
        try:
            import re
            
            # Look for weight patterns like "500g", "250g", etc.
            weight_match = re.search(r'(\d+)g', display_name)
            if weight_match:
                return int(weight_match.group(1))
            
            # Default to 500g for butter if no weight found
            return 500
            
        except Exception as e:
            logger.error(f"Error extracting weight: {e}")
            return 500
    
    def _extract_category(self, product_data: Dict) -> str:
        """Extract category information"""
        try:
            category_trees = product_data.get('categoryTrees', [])
            if category_trees and len(category_trees) > 0:
                tree = category_trees[0]
                return f"{tree.get('level0', '')} > {tree.get('level1', '')} > {tree.get('level2', '')}"
            return "Unknown"
        except:
            return "Unknown"
    
    def test_api_connection(self) -> bool:
        """Test if the API is accessible"""
        try:
            logger.info("Testing API connection...")
            
            # Simple test payload
            test_payload = {
                "query": "test",
                "page": 0,
                "hitsPerPage": 1
            }
            
            response = self.session.post(
                self.api_url,
                json=test_payload,
                timeout=10
            )
            
            logger.info(f"Test response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("✅ API connection successful!")
                return True
            else:
                logger.error(f"❌ API connection failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ API connection error: {e}")
            return False
    
    def run_full_test(self) -> Dict:
        """Run complete test of the working API"""
        logger.info("🧈 Testing Working Pak'nSave API")
        logger.info("=" * 50)
        
        results = {
            'connection_test': False,
            'products_found': 0,
            'products': []
        }
        
        # Test 1: Connection
        results['connection_test'] = self.test_api_connection()
        
        if results['connection_test']:
            # Test 2: Search for butter
            products = self.search_butter_products()
            results['products'] = products
            results['products_found'] = len(products)
            
            # Show results
            logger.info("\n" + "=" * 50)
            logger.info("📊 API Test Results:")
            logger.info("=" * 50)
            logger.info(f"Connection: {'✅ SUCCESS' if results['connection_test'] else '❌ FAILED'}")
            logger.info(f"Products Found: {results['products_found']}")
            
            if products:
                logger.info("\nButter Products Found:")
                for i, product in enumerate(products[:10], 1):  # Show first 10
                    promo_text = " (ON SALE)" if product.get('is_on_promotion') else ""
                    logger.info(f"  {i}. {product['name']} - ${product['price']}{promo_text}")
                    logger.info(f"     Brand: {product['brand']}, Weight: {product['weight_grams']}g")
                
                if len(products) > 10:
                    logger.info(f"  ... and {len(products) - 10} more products")
        else:
            logger.error("❌ Cannot proceed with product search - API connection failed")
        
        return results


def main():
    """Main test function"""
    api = WorkingPaknSaveAPI()
    results = api.run_full_test()
    return results


if __name__ == "__main__":
    main()































