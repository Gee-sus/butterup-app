"""
Image cache service for downloading and storing product images.
"""

import os
import io
import hashlib
import logging
import requests
import tempfile
from typing import Optional, Tuple
from datetime import datetime, timedelta
from django.conf import settings
from django.core.files import File
from PIL import Image as PILImage
from ..models import Product, ImageAsset
from .off_client import OFFClient
from .gs1_client import GS1Client

logger = logging.getLogger(__name__)


class ImageCacheService:
    """Service for downloading and caching product images"""
    
    def __init__(self):
        self.timeout = (3, 10)  # (connect_timeout, read_timeout)
        self.max_retries = 2
        self.ttl_hours = getattr(settings, 'IMAGE_CACHE_TTL_HOURS', 168)  # 7 days default
        
    def download_and_store(self, gtin: str, url: str, source: str) -> Optional[ImageAsset]:
        """
        Download image from URL and store it for the given GTIN.
        
        Args:
            gtin: Global Trade Item Number
            url: Image URL to download
            source: Source of the image ('OFF' or 'GS1')
            
        Returns:
            ImageAsset instance if successful, None otherwise
        """
        try:
            # Get or create product
            product = self._get_or_create_product(gtin)
            if not product:
                logger.error(f"Could not get or create product for GTIN {gtin}")
                return None
            
            # Check if we already have a recent image
            existing_asset = self._get_recent_image_asset(product, source)
            if existing_asset and not self._is_expired(existing_asset):
                logger.info(f"Using cached image for GTIN {gtin} from {source}")
                return existing_asset
            
            # Download the image
            image_data, checksum = self._download_image(url)
            if not image_data:
                logger.error(f"Failed to download image from {url}")
                return None
            
            # Check if we already have this exact image
            existing_asset = self._get_image_by_checksum(product, checksum)
            if existing_asset:
                logger.info(f"Image already exists for GTIN {gtin} with checksum {checksum}")
                return existing_asset
            
            # Save the image
            image_asset = self._save_image_asset(product, url, source, image_data, checksum)
            if image_asset:
                # Update product's primary image if needed
                self._update_primary_image(product, image_asset)
                logger.info(f"Successfully saved image for GTIN {gtin} from {source}")
            
            return image_asset
            
        except Exception as e:
            logger.error(f"Error downloading and storing image for GTIN {gtin}: {e}")
            return None
    
    def _get_or_create_product(self, gtin: str) -> Optional[Product]:
        """Get or create a product for the given GTIN"""
        try:
            product, created = Product.objects.get_or_create(
                gtin=gtin,
                defaults={
                    'name': f'Product {gtin}',
                    'brand': 'Unknown',
                    'weight_grams': 0,
                }
            )
            if created:
                logger.info(f"Created new product for GTIN {gtin}")
            return product
        except Exception as e:
            logger.error(f"Error getting/creating product for GTIN {gtin}: {e}")
            return None
    
    def _get_recent_image_asset(self, product: Product, source: str) -> Optional[ImageAsset]:
        """Get the most recent image asset for a product from a specific source"""
        try:
            return product.image_assets.filter(
                source=source,
                is_active=True
            ).order_by('-last_fetched_at').first()
        except Exception as e:
            logger.error(f"Error getting recent image asset: {e}")
            return None
    
    def _is_expired(self, image_asset: ImageAsset) -> bool:
        """Check if an image asset has expired based on TTL"""
        if not image_asset.last_fetched_at:
            return True
        
        expiry_time = image_asset.last_fetched_at + timedelta(hours=self.ttl_hours)
        return datetime.now() > expiry_time
    
    def _download_image(self, url: str) -> Tuple[Optional[bytes], str]:
        """
        Download image from URL and return image data and checksum.
        
        Returns:
            Tuple of (image_data, checksum) or (None, "") if failed
        """
        for attempt in range(self.max_retries + 1):
            try:
                logger.info(f"Downloading image from {url} (attempt {attempt + 1})")
                response = requests.get(url, timeout=self.timeout)
                response.raise_for_status()
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    logger.warning(f"URL does not return an image: {content_type}")
                    return None, ""
                
                image_data = response.content
                checksum = hashlib.md5(image_data).hexdigest()
                
                logger.info(f"Successfully downloaded image, size: {len(image_data)} bytes")
                return image_data, checksum
                
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout downloading image (attempt {attempt + 1})")
                if attempt == self.max_retries:
                    return None, ""
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error downloading image: {e}")
                return None, ""
                
            except Exception as e:
                logger.error(f"Error downloading image: {e}")
                return None, ""
        
        return None, ""
    
    def _get_image_by_checksum(self, product: Product, checksum: str) -> Optional[ImageAsset]:
        """Get existing image asset by checksum"""
        try:
            return product.image_assets.filter(checksum=checksum, is_active=True).first()
        except Exception as e:
            logger.error(f"Error getting image by checksum: {e}")
            return None
    
    def _save_image_asset(self, product: Product, url: str, source: str, 
                         image_data: bytes, checksum: str) -> Optional[ImageAsset]:
        """Save image data as an ImageAsset"""
        try:
            # Get image dimensions
            width, height = self._get_image_dimensions(image_data)
            
            # Create ImageAsset
            image_asset = ImageAsset(
                product=product,
                source=source,
                url=url,
                checksum=checksum,
                width=width,
                height=height,
                is_active=True
            )
            
            # Set attribution for OFF images
            if source == 'OFF':
                image_asset.attribution_text = "Image © Open Food Facts contributors (CC-BY-SA)"
                image_asset.attribution_url = "https://openfoodfacts.org"
            
            # Save the file using BytesIO
            filename = f"{product.gtin}.jpg"
            from django.core.files.base import ContentFile
            image_asset.file.save(filename, ContentFile(image_data), save=False)
            
            # Save the asset
            image_asset.save()
            
            return image_asset
                
        except Exception as e:
            logger.error(f"Error saving image asset: {e}")
            return None
    
    def _get_image_dimensions(self, image_data: bytes) -> Tuple[int, int]:
        """Get image dimensions from image data"""
        try:
            with PILImage.open(io.BytesIO(image_data)) as img:
                return img.size
        except Exception as e:
            logger.warning(f"Could not get image dimensions: {e}")
            return None, None
    
    def _update_primary_image(self, product: Product, new_asset: ImageAsset):
        """Update product's primary image based on source precedence"""
        try:
            # Source precedence: GS1 > OFF
            source_precedence = {'GS1': 2, 'OFF': 1}
            
            current_primary = product.primary_image
            new_precedence = source_precedence.get(new_asset.source, 0)
            
            if current_primary:
                current_precedence = source_precedence.get(current_primary.source, 0)
                if new_precedence > current_precedence:
                    # New image has higher precedence
                    logger.info(f"Updating primary image for product {product.gtin} to {new_asset.source}")
                    # Note: We can't directly set primary_image as it's a property
                    # The primary image is determined by the query in the model
            else:
                # No primary image exists, this becomes the primary
                logger.info(f"Setting primary image for product {product.gtin} to {new_asset.source}")
                
        except Exception as e:
            logger.error(f"Error updating primary image: {e}")
    
    def fetch_product_image(self, gtin: str, prefer_refresh: bool = False) -> Optional[ImageAsset]:
        """
        Fetch product image by GTIN, trying GS1 first, then OFF.
        
        Args:
            gtin: Global Trade Item Number
            prefer_refresh: Whether to ignore TTL and refresh
            
        Returns:
            ImageAsset instance if successful, None otherwise
        """
        try:
            # Get or create product
            product = self._get_or_create_product(gtin)
            if not product:
                logger.error(f"Could not get or create product for GTIN {gtin}")
                return None
            
            # Check if we have a fresh image and don't want to refresh
            if not prefer_refresh:
                fresh_asset = self._get_fresh_asset(product)
                if fresh_asset:
                    logger.info(f"Returning fresh image for GTIN {gtin}")
                    return fresh_asset
            
            # Initialize clients
            gs1_client = GS1Client()
            off_client = OFFClient()
            
            # Try GS1 first (higher precedence)
            gs1_url = gs1_client.get_image_url_by_gtin(gtin)
            if gs1_url:
                logger.info(f"Found GS1 image URL for GTIN {gtin}")
                asset = self.download_and_store(gtin, gs1_url, 'GS1')
                if asset:
                    return asset
            
            # Try OFF as fallback
            off_url = off_client.get_image_url_by_gtin(gtin)
            if off_url:
                logger.info(f"Found OFF image URL for GTIN {gtin}")
                asset = self.download_and_store(gtin, off_url, 'OFF')
                if asset:
                    return asset
            
            logger.warning(f"No image found for GTIN {gtin}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching product image for GTIN {gtin}: {e}")
            return None
    
    def _get_fresh_asset(self, product: Product) -> Optional[ImageAsset]:
        """Get the freshest asset for a product"""
        try:
            return product.image_assets.filter(
                is_active=True
            ).order_by('-source', '-last_fetched_at').first()
        except Exception as e:
            logger.error(f"Error getting fresh asset for product {product.id}: {e}")
            return None
