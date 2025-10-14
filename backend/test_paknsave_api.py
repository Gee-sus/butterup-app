import requests
import json
import logging
from typing import Dict, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaknSaveAPITester:
    """Test Pak'nSave API endpoints discovered in the GitHub Gist"""
    
    def __init__(self):
        self.base_url = "https://www.paknsave.co.nz"
        self.session = requests.Session()
        
        # Set realistic headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-NZ,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.paknsave.co.nz/',
            'Origin': 'https://www.paknsave.co.nz',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        })
    
    def test_store_list_api(self) -> Optional[List[Dict]]:
        """Test the store list API endpoint"""
        try:
            logger.info("Testing Store List API...")
            
            url = f"{self.base_url}/CommonApi/Store/GetStoreList"
            response = self.session.get(url, timeout=10)
            
            logger.info(f"Store List API Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"✅ Store List API Success! Found {len(data)} stores")
                    
                    # Show first few stores
                    for i, store in enumerate(data[:3]):
                        logger.info(f"  Store {i+1}: {store.get('name', 'Unknown')} - {store.get('address', 'Unknown')}")
                    
                    return data
                except json.JSONDecodeError:
                    logger.error("❌ Store List API returned non-JSON data")
                    logger.error(f"Response content: {response.text[:200]}...")
            else:
                logger.error(f"❌ Store List API failed with status {response.status_code}")
                logger.error(f"Response: {response.text[:200]}...")
                
        except Exception as e:
            logger.error(f"❌ Store List API error: {e}")
        
        return None
    
    def test_change_store_api(self, store_id: str = "1") -> Optional[Dict]:
        """Test the change store API endpoint"""
        try:
            logger.info(f"Testing Change Store API for store ID: {store_id}")
            
            url = f"{self.base_url}/CommonApi/Store/ChangeStore"
            data = {"storeId": store_id}
            
            response = self.session.post(url, json=data, timeout=10)
            
            logger.info(f"Change Store API Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    logger.info("✅ Change Store API Success!")
                    logger.info(f"Response: {json.dumps(result, indent=2)}")
                    return result
                except json.JSONDecodeError:
                    logger.error("❌ Change Store API returned non-JSON data")
                    logger.error(f"Response content: {response.text[:200]}...")
            else:
                logger.error(f"❌ Change Store API failed with status {response.status_code}")
                logger.error(f"Response: {response.text[:200]}...")
                
        except Exception as e:
            logger.error(f"❌ Change Store API error: {e}")
        
        return None
    
    def test_mega_menu_api(self) -> Optional[Dict]:
        """Test the mega menu API endpoint"""
        try:
            logger.info("Testing Mega Menu API...")
            
            url = f"{self.base_url}/CommonApi/Menu/GetMegaMenu"
            response = self.session.get(url, timeout=10)
            
            logger.info(f"Mega Menu API Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info("✅ Mega Menu API Success!")
                    
                    # Show menu structure
                    if isinstance(data, list):
                        logger.info(f"Found {len(data)} menu categories")
                        for i, category in enumerate(data[:3]):
                            logger.info(f"  Category {i+1}: {category.get('name', 'Unknown')}")
                    elif isinstance(data, dict):
                        logger.info(f"Menu data keys: {list(data.keys())}")
                    
                    return data
                except json.JSONDecodeError:
                    logger.error("❌ Mega Menu API returned non-JSON data")
                    logger.error(f"Response content: {response.text[:200]}...")
            else:
                logger.error(f"❌ Mega Menu API failed with status {response.status_code}")
                logger.error(f"Response: {response.text[:200]}...")
                
        except Exception as e:
            logger.error(f"❌ Mega Menu API error: {e}")
        
        return None
    
    def test_search_api(self, query: str = "butter") -> Optional[Dict]:
        """Test search API endpoint"""
        try:
            logger.info(f"Testing Search API for query: '{query}'")
            
            # Try different search endpoint patterns
            search_urls = [
                f"{self.base_url}/CommonApi/Product/Search?q={query}",
                f"{self.base_url}/CommonApi/Search?q={query}",
                f"{self.base_url}/api/search?q={query}",
                f"{self.base_url}/CommonApi/Product/GetProducts?search={query}",
            ]
            
            for url in search_urls:
                try:
                    logger.info(f"Trying: {url}")
                    response = self.session.get(url, timeout=10)
                    
                    logger.info(f"Search API Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            logger.info(f"✅ Search API Success! Found data")
                            logger.info(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'List with ' + str(len(data)) + ' items'}")
                            return data
                        except json.JSONDecodeError:
                            logger.debug(f"Non-JSON response from {url}")
                            continue
                    else:
                        logger.debug(f"Failed with status {response.status_code}")
                        continue
                        
                except Exception as e:
                    logger.debug(f"Error with {url}: {e}")
                    continue
            
            logger.error("❌ All search API endpoints failed")
                
        except Exception as e:
            logger.error(f"❌ Search API error: {e}")
        
        return None
    
    def test_category_api(self) -> Optional[Dict]:
        """Test category API endpoint"""
        try:
            logger.info("Testing Category API...")
            
            # Try different category endpoint patterns
            category_urls = [
                f"{self.base_url}/CommonApi/Category/GetCategories",
                f"{self.base_url}/CommonApi/Product/GetCategories",
                f"{self.base_url}/api/categories",
            ]
            
            for url in category_urls:
                try:
                    logger.info(f"Trying: {url}")
                    response = self.session.get(url, timeout=10)
                    
                    logger.info(f"Category API Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            logger.info(f"✅ Category API Success!")
                            logger.info(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'List with ' + str(len(data)) + ' items'}")
                            return data
                        except json.JSONDecodeError:
                            logger.debug(f"Non-JSON response from {url}")
                            continue
                    else:
                        logger.debug(f"Failed with status {response.status_code}")
                        continue
                        
                except Exception as e:
                    logger.debug(f"Error with {url}: {e}")
                    continue
            
            logger.error("❌ All category API endpoints failed")
                
        except Exception as e:
            logger.error(f"❌ Category API error: {e}")
        
        return None
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results"""
        logger.info("🧈 Testing Pak'nSave API Endpoints")
        logger.info("=" * 50)
        
        results = {}
        
        # Test 1: Store List
        store_list = self.test_store_list_api()
        results['store_list'] = store_list is not None
        
        # Test 2: Change Store (if we have stores)
        if store_list and len(store_list) > 0:
            first_store_id = store_list[0].get('id', '1')
            change_store = self.test_change_store_api(first_store_id)
            results['change_store'] = change_store is not None
        else:
            results['change_store'] = False
        
        # Test 3: Mega Menu
        mega_menu = self.test_mega_menu_api()
        results['mega_menu'] = mega_menu is not None
        
        # Test 4: Search
        search_results = self.test_search_api()
        results['search'] = search_results is not None
        
        # Test 5: Categories
        categories = self.test_category_api()
        results['categories'] = categories is not None
        
        # Summary
        logger.info("\n" + "=" * 50)
        logger.info("📊 API Test Results Summary:")
        logger.info("=" * 50)
        
        for test_name, success in results.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            logger.info(f"  {test_name.replace('_', ' ').title()}: {status}")
        
        successful_tests = sum(results.values())
        total_tests = len(results)
        logger.info(f"\nOverall: {successful_tests}/{total_tests} tests passed")
        
        if successful_tests > 0:
            logger.info("🎉 Some API endpoints are working! This could be a viable solution.")
        else:
            logger.info("😞 No API endpoints are working. We'll need to try other approaches.")
        
        return results


def main():
    """Main test function"""
    tester = PaknSaveAPITester()
    results = tester.run_all_tests()
    return results


if __name__ == "__main__":
    main()































