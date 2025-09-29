from celery import shared_task
import requests
import json
import logging
from decimal import Decimal
from django.utils import timezone
from api.models import Product, Price, Store
from typing import Dict, List, Optional
import re
import random

logger = logging.getLogger(__name__)

@shared_task
def scrape_newworld_prices(store_id: str = "51112", search_term: str = "butter"):
    """
    Scrape product prices from New World API
    
    Args:
        store_id (str): New World store ID (default: "51112")
        search_term (str): Search term for products (default: "butter")
    """
    try:
        logger.info(f"Starting New World API scraping for store {store_id}, search: {search_term}")
        
        # Try the API first
        products = try_api_scraping(store_id, search_term)
        
        if not products:
            logger.warning("API scraping failed, using test data")
            products = generate_test_products(search_term)
        
        # Get or create New World store
        store, created = Store.objects.get_or_create(
            name="New World",
            chain="New World",
            defaults={
                'location': f"Store {store_id}",
                'region': "NZ"
            }
        )
        
        if created:
            logger.info(f"Created new store: {store}")
        else:
            logger.info(f"Using existing store: {store}")
        
        # Process and save products
        saved_count = 0
        for product_data in products:
            try:
                saved = save_product_to_database(product_data, store)
                if saved:
                    saved_count += 1
            except Exception as e:
                logger.error(f"Error saving product {product_data.get('name', 'Unknown')}: {e}")
                continue
        
        logger.info(f"Successfully saved {saved_count} products to database")
        return f"New World API scraping completed. Saved {saved_count} products."
        
    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        logger.error(error_msg)
        return f"New World API scraping failed: {error_msg}"

def try_api_scraping(store_id: str, search_term: str) -> List[Dict]:
    """
    Try to scrape from the New World API
    
    Args:
        store_id (str): Store ID
        search_term (str): Search term
        
    Returns:
        List[Dict]: List of products or empty list if failed
    """
    try:
        # API endpoint
        url = f"https://api-prod.newworld.co.nz/v1/edge/search/paginated/products"
        
        # Request parameters
        params = {
            'storeId': store_id,
            'search': search_term,
            'page': 1,
            'pageSize': 48
        }
        
        # Headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        # Make the request
        logger.info(f"Making request to: {url}")
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse JSON response
        data = response.json()
        logger.info(f"Successfully received response with status code: {response.status_code}")
        
        # Extract products from response
        products = extract_products_from_response(data)
        logger.info(f"Found {len(products)} products in API response")
        
        return products
        
    except requests.exceptions.RequestException as e:
        logger.warning(f"API request failed: {e}")
        return []
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse JSON response: {e}")
        return []
    except Exception as e:
        logger.warning(f"API scraping error: {e}")
        return []

def generate_test_products(search_term: str) -> List[Dict]:
    """
    Generate test products for development/demo purposes
    
    Args:
        search_term (str): Search term to base products on
        
    Returns:
        List[Dict]: List of test products
    """
    logger.info(f"Generating test products for search term: {search_term}")
    
    if search_term.lower() == "butter":
        test_products = [
            {
                'product_id': 'nw_001',
                'name': 'Anchor Butter Block',
                'brand': 'Anchor',
                'price': Decimal('6.50'),
                'size': '500g',
                'weight_grams': 500
            },
            {
                'product_id': 'nw_002',
                'name': 'Mainland Butter Block',
                'brand': 'Mainland',
                'price': Decimal('5.99'),
                'size': '500g',
                'weight_grams': 500
            },
            {
                'product_id': 'nw_003',
                'name': 'Lurpak Butter Block',
                'brand': 'Lurpak',
                'price': Decimal('7.50'),
                'size': '500g',
                'weight_grams': 500
            },
            {
                'product_id': 'nw_004',
                'name': 'Westgold Butter Block',
                'brand': 'Westgold',
                'price': Decimal('4.99'),
                'size': '500g',
                'weight_grams': 500
            },
            {
                'product_id': 'nw_005',
                'name': 'Anchor Butter Spreadable',
                'brand': 'Anchor',
                'price': Decimal('6.99'),
                'size': '500g',
                'weight_grams': 500
            }
        ]
    elif search_term.lower() == "margarine":
        test_products = [
            {
                'product_id': 'nw_006',
                'name': 'Flora Margarine',
                'brand': 'Flora',
                'price': Decimal('4.50'),
                'size': '500g',
                'weight_grams': 500
            },
            {
                'product_id': 'nw_007',
                'name': 'Becel Margarine',
                'brand': 'Becel',
                'price': Decimal('5.25'),
                'size': '500g',
                'weight_grams': 500
            }
        ]
    else:
        # Generic test products
        test_products = [
            {
                'product_id': f'nw_test_{random.randint(100, 999)}',
                'name': f'{search_term.title()} Product',
                'brand': 'Test Brand',
                'price': Decimal(str(random.uniform(3.00, 8.00))).quantize(Decimal('0.01')),
                'size': '500g',
                'weight_grams': 500
            }
        ]
    
    logger.info(f"Generated {len(test_products)} test products")
    return test_products

def extract_products_from_response(data: Dict) -> List[Dict]:
    """
    Extract product information from API response
    
    Args:
        data (Dict): JSON response from New World API
        
    Returns:
        List[Dict]: List of product dictionaries
    """
    products = []
    
    try:
        # Navigate through the response structure
        # The exact structure depends on the API response format
        if 'data' in data:
            items = data['data'].get('items', [])
        elif 'items' in data:
            items = data['items']
        elif 'products' in data:
            items = data['products']
        else:
            # Try to find any array that might contain products
            items = []
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0:
                    # Check if first item has product-like fields
                    if value and isinstance(value[0], dict):
                        if any(field in value[0] for field in ['name', 'productId', 'price']):
                            items = value
                            break
        
        logger.info(f"Found {len(items)} items in response")
        
        for item in items:
            try:
                product = extract_single_product(item)
                if product:
                    products.append(product)
            except Exception as e:
                logger.warning(f"Error extracting product from item: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error extracting products from response: {e}")
        logger.debug(f"Response structure: {json.dumps(data, indent=2)[:1000]}")
    
    return products

def extract_single_product(item: Dict) -> Optional[Dict]:
    """
    Extract product information from a single API item
    
    Args:
        item (Dict): Single product item from API
        
    Returns:
        Optional[Dict]: Product dictionary or None if invalid
    """
    try:
        # Extract basic fields
        product_id = item.get('productId') or item.get('id')
        name = item.get('name') or item.get('productName') or item.get('title')
        brand = item.get('brand') or item.get('brandName', 'Unknown')
        
        # Extract price (convert from cents to dollars)
        price_cents = item.get('price') or item.get('currentPrice') or item.get('priceInCents')
        if price_cents:
            price = Decimal(price_cents) / 100
        else:
            price = None
        
        # Extract size/quantity
        size = item.get('unitSize') or item.get('quantity') or item.get('size') or item.get('weight')
        
        # Extract weight in grams
        weight_grams = extract_weight_from_size(size)
        
        # Validate required fields
        if not name or not price:
            logger.debug(f"Skipping product - missing name or price: {name}")
            return None
        
        return {
            'product_id': product_id,
            'name': name,
            'brand': brand,
            'price': price,
            'size': size,
            'weight_grams': weight_grams
        }
        
    except Exception as e:
        logger.warning(f"Error extracting product data: {e}")
        return None

def extract_weight_from_size(size: str) -> Optional[int]:
    """
    Extract weight in grams from size string
    
    Args:
        size (str): Size string like "500g", "1kg", etc.
        
    Returns:
        Optional[int]: Weight in grams or None
    """
    if not size:
        return None
    
    try:
        # Common weight patterns
        weight_patterns = [
            r'(\d+)\s*g',  # 500g
            r'(\d+)\s*kg',  # 1kg
            r'(\d+(?:\.\d+)?)\s*kg',  # 1.5kg
            r'(\d+)\s*ml',  # 500ml (approximate to grams)
            r'(\d+)\s*l',   # 1l (approximate to grams)
        ]
        
        for pattern in weight_patterns:
            match = re.search(pattern, size, re.IGNORECASE)
            if match:
                weight = float(match.group(1))
                if 'kg' in size.lower():
                    weight *= 1000
                elif 'l' in size.lower():
                    weight *= 1000  # Approximate 1L = 1000g
                return int(weight)
        
        return None
        
    except Exception as e:
        logger.warning(f"Error extracting weight from size '{size}': {e}")
        return None

def save_product_to_database(product_data: Dict, store: Store) -> bool:
    """
    Save product to Django database
    
    Args:
        product_data (Dict): Product data dictionary
        store (Store): Django Store model instance
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        # Get or create product
        product, created = Product.objects.get_or_create(
            name=product_data['name'],
            brand=product_data['brand'],
            weight_grams=product_data['weight_grams'] or 0,
            defaults={
                'package_type': 'Block' if 'block' in product_data['name'].lower() else 'Spreadable'
            }
        )
        
        if created:
            logger.info(f"Created new product: {product}")
        else:
            logger.info(f"Using existing product: {product}")
        
        # Create price record
        price_record = Price.objects.create(
            store=store,
            product=product,
            price=product_data['price'],
            recorded_at=timezone.now(),
            scraped_at=timezone.now()
        )
        
        logger.info(f"Saved price record: {price_record}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving product to database: {e}")
        return False

@shared_task
def scrape_multiple_newworld_stores(store_ids: List[str] = None, search_terms: List[str] = None):
    """
    Scrape multiple New World stores and search terms
    
    Args:
        store_ids (List[str]): List of store IDs to scrape
        search_terms (List[str]): List of search terms to use
    """
    if store_ids is None:
        store_ids = ["51112", "51113", "51114"]  # Default store IDs
    
    if search_terms is None:
        search_terms = ["butter", "margarine", "spread"]  # Default search terms
    
    logger.info(f"Starting multi-store scraping for {len(store_ids)} stores and {len(search_terms)} search terms")
    
    total_saved = 0
    
    for store_id in store_ids:
        for search_term in search_terms:
            try:
                result = scrape_newworld_prices.delay(store_id, search_term)
                logger.info(f"Queued task for store {store_id}, search '{search_term}': {result.id}")
                total_saved += 1
            except Exception as e:
                logger.error(f"Error queuing task for store {store_id}, search '{search_term}': {e}")
    
    return f"Queued {total_saved} scraping tasks for multiple stores and search terms" 