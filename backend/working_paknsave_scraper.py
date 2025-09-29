import requests
import json
import logging
from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkingPaknSaveScraper:
    """Working Pak'nSave scraper using the exact request that works"""
    
    def __init__(self):
        self.api_url = "https://api-prod.newworld.co.nz/v1/edge/search/paginated/products"
        self.session = requests.Session()
        self._setup_session()
    
    def _setup_session(self):
        """Set up session with exact headers from the working request"""
        self.session.headers.update({
            'accept': '*/*',
            'accept-language': 'en-GB,en;q=0.9',
            'authorization': 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJmMjRkNzE2MC0wYzc5LTRjOGQtYWRmYi1lOWE4ZmFhN2MyOGMiLCJpc3MiOiJvbmxpbmUtY3VzdG9tZXIiLCJzZXNzaW9uSWQiOiI4ZDMzMjgzNi00ZTc5LTQzNzYtOGM4MC03NjM3NGY1MDk3YzAiLCJiYW5uZXIiOiJQTlMiLCJmaXJzdE5hbWUiOiJhbm9ueW1vdXMiLCJlbWFpbCI6ImFub255bW91cyIsInJvbGVzIjpbIkFOT05ZTU9VUyJdLCJleHAiOjE3NTc4NDY2MTB9.uNFvmrO74JAWMX3Hxp_hOUXyZk05bMV177TBRbhKzSnLMSQ5GXD_aKETvTQEX7cTXYbw5D2JOW7oHAKJKW_rN5Hp3grKdtN2Y4GoCkE5rs6J2WBSN9Dpk-XS_QTKSjxFu9BRll1IKU1jGQA-n_iLjUTMX2Amu-xZdypKVwEMmSyUM-xhbwH873sKH8wrbp0BNnTCY_IlhIFjtpEwa2F89uB09dYgTQQcVBI3SJx6yesMBHgWU5leO8764E4MlpU0n9xIwO9lhv7yrbNY00PslSBnb2l2BEVaz1P4FA0EELFgdEfswLQLptCjCLxMgJQWrgpa3HD2UxpOUNS4MEcgcg',
            'content-type': 'application/json',
            'origin': 'https://www.paknsave.co.nz',
            'priority': 'u=1, i',
            'referer': 'https://www.paknsave.co.nz/',
            'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Brave";v="140"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'sec-gpc': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
        })
    
    def search_butter_products(self) -> List[Dict]:
        """Search for butter products using the exact working request"""
        try:
            logger.info("🧈 Searching for butter products using working API...")
            
            # Exact payload from the working request
            payload = {
                "algoliaQuery": {
                    "attributesToHighlight": [],
                    "attributesToRetrieve": ["productID", "Type", "sponsored", "category0NI", "category1NI", "category2NI"],
                    "facets": ["brand", "category1NI", "onPromotion", "productFacets", "tobacco"],
                    "filters": "stores:c0f80e87-16be-4488-9553-da437e8c6c2a",
                    "highlightPostTag": "__/ais-highlight__",
                    "highlightPreTag": "__ais-highlight__",
                    "hitsPerPage": 50,
                    "maxValuesPerFacet": 100,
                    "page": 0,
                    "query": "butter",
                    "analyticsTags": ["fs#WEB:mobile"]
                },
                "algoliaFacetQueries": [],
                "storeId": "c0f80e87-16be-4488-9553-da437e8c6c2a",
                "hitsPerPage": 50,
                "page": 0,
                "sortOrder": "NI_POPULARITY_ASC",
                "tobaccoQuery": True,
                "precisionMedia": {
                    "adDomain": "SEARCH_PAGE",
                    "adPositions": [4, 8, 12, 16],
                    "publishImpressionEvent": False,
                    "disableAds": False
                }
            }
            
            logger.info(f"Making POST request to: {self.api_url}")
            
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
            
            # Get promotion price if available
            promotion_price = None
            if is_on_promotion:
                promotions = product_data.get('promotions', [])
                if promotions:
                    promo = promotions[0]
                    promotion_price = Decimal(str(promo.get('rewardValue', 0) / 100))
            
            return {
                'name': full_name,
                'price': promotion_price if promotion_price else price_dollars,
                'original_price': price_dollars,
                'brand': brand,
                'weight_grams': weight_grams,
                'store': 'Pak\'nSave',
                'scraped_at': datetime.now(),
                'source': 'working_api',
                'product_id': product_id,
                'is_on_promotion': is_on_promotion,
                'promotion_price': promotion_price,
                'availability': product_data.get('availability', []),
                'category': self._extract_category(product_data),
                'price_per_100g': self._calculate_price_per_100g(price_dollars, weight_grams)
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
    
    def _calculate_price_per_100g(self, price: Decimal, weight_grams: int) -> float:
        """Calculate price per 100g"""
        try:
            if weight_grams > 0:
                return float(price / (weight_grams / 100))
            return 0.0
        except:
            return 0.0
    
    def test_api_connection(self) -> bool:
        """Test if the API is accessible"""
        try:
            logger.info("Testing API connection...")
            
            # Use the exact working payload
            payload = {
                "algoliaQuery": {
                    "attributesToHighlight": [],
                    "attributesToRetrieve": ["productID", "Type", "sponsored", "category0NI", "category1NI", "category2NI"],
                    "facets": ["brand", "category1NI", "onPromotion", "productFacets", "tobacco"],
                    "filters": "stores:c0f80e87-16be-4488-9553-da437e8c6c2a",
                    "highlightPostTag": "__/ais-highlight__",
                    "highlightPreTag": "__ais-highlight__",
                    "hitsPerPage": 1,
                    "maxValuesPerFacet": 100,
                    "page": 0,
                    "query": "test",
                    "analyticsTags": ["fs#WEB:mobile"]
                },
                "algoliaFacetQueries": [],
                "storeId": "c0f80e87-16be-4488-9553-da437e8c6c2a",
                "hitsPerPage": 1,
                "page": 0,
                "sortOrder": "NI_POPULARITY_ASC",
                "tobaccoQuery": True,
                "precisionMedia": {
                    "adDomain": "SEARCH_PAGE",
                    "adPositions": [4, 8, 12, 16],
                    "publishImpressionEvent": False,
                    "disableAds": False
                }
            }
            
            response = self.session.post(
                self.api_url,
                json=payload,
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
        logger.info("🧈 Testing Working Pak'nSave API with Exact Request")
        logger.info("=" * 60)
        
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
            logger.info("\n" + "=" * 60)
            logger.info("📊 API Test Results:")
            logger.info("=" * 60)
            logger.info(f"Connection: {'✅ SUCCESS' if results['connection_test'] else '❌ FAILED'}")
            logger.info(f"Products Found: {results['products_found']}")
            
            if products:
                logger.info("\nButter Products Found:")
                for i, product in enumerate(products[:15], 1):  # Show first 15
                    promo_text = " (ON SALE)" if product.get('is_on_promotion') else ""
                    price_text = f"${product['price']}"
                    if product.get('promotion_price'):
                        price_text += f" (was ${product['original_price']})"
                    
                    logger.info(f"  {i}. {product['name']} - {price_text}{promo_text}")
                    logger.info(f"     Brand: {product['brand']}, Weight: {product['weight_grams']}g, Price/100g: ${product['price_per_100g']:.2f}")
                
                if len(products) > 15:
                    logger.info(f"  ... and {len(products) - 15} more products")
        else:
            logger.error("❌ Cannot proceed with product search - API connection failed")
        
        return results


def main():
    """Main test function"""
    scraper = WorkingPaknSaveScraper()
    results = scraper.run_full_test()
    return results


if __name__ == "__main__":
    main()
