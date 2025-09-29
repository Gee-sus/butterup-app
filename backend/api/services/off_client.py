"""
Open Food Facts (OFF) API client for fetching product images by GTIN.
"""

import requests
import logging
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class OFFClient:
    """Client for Open Food Facts API"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'OFF_BASE', 'https://world.openfoodfacts.org')
        self.user_agent = getattr(settings, 'OFF_USER_AGENT', 'ButterUp/0.1 (contact: support@butterup.nz)')
        self.timeout = (3, 10)  # (connect_timeout, read_timeout)
        self.max_retries = 2
        
    def get_image_url_by_gtin(self, gtin: str) -> Optional[str]:
        """
        Fetch product image URL from Open Food Facts by GTIN.
        
        Args:
            gtin: Global Trade Item Number (8, 12, 13, or 14 digits)
            
        Returns:
            Image URL if found, None otherwise
        """
        if not self._validate_gtin(gtin):
            logger.warning(f"Invalid GTIN format: {gtin}")
            return None
            
        url = f"{self.base_url}/api/v0/product/{gtin}.json"
        headers = {"User-Agent": self.user_agent}
        
        for attempt in range(self.max_retries + 1):
            try:
                logger.info(f"Fetching OFF data for GTIN {gtin} (attempt {attempt + 1})")
                response = requests.get(url, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                
                data = response.json()
                
                # Check if product exists and has status=1
                if data.get('status') != 1:
                    logger.info(f"Product not found in OFF for GTIN {gtin}")
                    return None
                
                # Extract image URL with preference order
                image_url = self._extract_image_url(data)
                
                if image_url:
                    logger.info(f"Found image URL for GTIN {gtin}: {image_url}")
                    return image_url
                else:
                    logger.info(f"No image found for GTIN {gtin}")
                    return None
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout fetching OFF data for GTIN {gtin} (attempt {attempt + 1})")
                if attempt == self.max_retries:
                    logger.error(f"Max retries exceeded for GTIN {gtin}")
                    return None
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error fetching OFF data for GTIN {gtin}: {e}")
                return None
                
            except (ValueError, KeyError) as e:
                logger.error(f"JSON parsing error for GTIN {gtin}: {e}")
                return None
                
        return None
    
    def _validate_gtin(self, gtin: str) -> bool:
        """Validate GTIN format"""
        if not gtin or not gtin.isdigit():
            return False
        
        length = len(gtin)
        return length in [8, 12, 13, 14]
    
    def _extract_image_url(self, data: dict) -> Optional[str]:
        """
        Extract image URL from OFF product data with preference order.
        
        Preference order:
        1. image_front_url (front of package)
        2. image_url (main image)
        3. image_small_url (small image)
        """
        product = data.get('product', {})
        
        # Try image_front_url first (preferred)
        image_url = product.get('image_front_url')
        if image_url:
            return image_url
            
        # Fallback to main image_url
        image_url = product.get('image_url')
        if image_url:
            return image_url
            
        # Last resort: small image
        image_url = product.get('image_small_url')
        if image_url:
            return image_url
            
        return None
