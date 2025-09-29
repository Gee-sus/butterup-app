"""
Celery tasks for the ButterUp API.
"""

import logging
from typing import Dict, Any
from celery import shared_task
from django.conf import settings
from .models import Product, ImageAsset
from .services.off_client import OFFClient
from .services.gs1_client import GS1Client
from .services.image_cache import ImageCacheService

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue='images')
def fetch_product_image(self, gtin: str, prefer_refresh: bool = False):
    """
    Fetch product image by GTIN, trying GS1 first, then OFF.
    
    Args:
        gtin: Global Trade Item Number
        prefer_refresh: Whether to ignore TTL and refresh
        
    Returns:
        Serialized ImageAsset dict if successful, None otherwise
    """
    try:
        logger.info(f"Starting image fetch for GTIN {gtin} (refresh={prefer_refresh})")
        
        # Validate GTIN
        if not _validate_gtin(gtin):
            logger.error(f"Invalid GTIN format: {gtin}")
            return None
        
        # Get or create product
        product = _get_or_create_product(gtin)
        if not product:
            logger.error(f"Could not get or create product for GTIN {gtin}")
            return None
        
        # Check if we have a fresh image and don't want to refresh
        if not prefer_refresh:
            fresh_asset = _get_fresh_asset(product)
            if fresh_asset:
                logger.info(f"Returning fresh image for GTIN {gtin}")
                return _serialize_image_asset(fresh_asset)
        
        # Initialize services
        gs1_client = GS1Client()
        off_client = OFFClient()
        cache_service = ImageCacheService()
        
        # Try GS1 first (higher precedence)
        gs1_url = gs1_client.get_image_url_by_gtin(gtin)
        if gs1_url:
            logger.info(f"Found GS1 image URL for GTIN {gtin}")
            asset = cache_service.download_and_store(gtin, gs1_url, 'GS1')
            if asset:
                return _serialize_image_asset(asset)
        
        # Try OFF as fallback
        off_url = off_client.get_image_url_by_gtin(gtin)
        if off_url:
            logger.info(f"Found OFF image URL for GTIN {gtin}")
            asset = cache_service.download_and_store(gtin, off_url, 'OFF')
            if asset:
                return _serialize_image_asset(asset)
        
        logger.warning(f"No image found for GTIN {gtin}")
        return None
        
    except Exception as e:
        logger.error(f"Error fetching product image for GTIN {gtin}: {e}")
        return None


@shared_task(bind=True, queue='images')
def backfill_images(self, gtin_list: list):
    """
    Backfill images for a list of GTINs.
    
    Args:
        gtin_list: List of GTINs to fetch images for
        
    Returns:
        Dict with results summary
    """
    try:
        logger.info(f"Starting image backfill for {len(gtin_list)} GTINs")
        
        results = {
            'total': len(gtin_list),
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for gtin in gtin_list:
            try:
                result = fetch_product_image.delay(gtin, prefer_refresh=False)
                if result.get():
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"GTIN {gtin}: No image found")
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"GTIN {gtin}: {str(e)}")
        
        logger.info(f"Image backfill completed: {results['successful']} successful, {results['failed']} failed")
        return results
        
    except Exception as e:
        logger.error(f"Error in image backfill: {e}")
        return None


@shared_task(bind=True, queue='images')
def cleanup_old_images(self, days_old: int = 30) -> Dict[str, Any]:
    """
    Clean up old inactive image assets.
    
    Args:
        days_old: Remove assets older than this many days
        
    Returns:
        Summary of cleanup results
    """
    try:
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        logger.info(f"Starting cleanup of images older than {days_old} days")
        
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        # Find old inactive assets
        old_assets = ImageAsset.objects.filter(
            is_active=False,
            last_fetched_at__lt=cutoff_date
        )
        
        count = old_assets.count()
        logger.info(f"Found {count} old inactive assets to clean up")
        
        # Delete old assets
        deleted_count = 0
        for asset in old_assets:
            try:
                # Delete file if it exists
                if asset.file:
                    try:
                        asset.file.delete(save=False)
                    except Exception as e:
                        logger.warning(f"Could not delete file for asset {asset.id}: {e}")
                
                # Delete asset record
                asset.delete()
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"Error deleting asset {asset.id}: {e}")
        
        result = {
            'total_found': count,
            'deleted': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }
        
        logger.info(f"Cleanup completed: {deleted_count}/{count} assets deleted")
        return result
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_images task: {e}")
        raise


def _validate_gtin(gtin: str) -> bool:
    """Validate GTIN format"""
    if not gtin or not gtin.isdigit():
        return False
    
    length = len(gtin)
    return length in [8, 12, 13, 14]


def _get_or_create_product(gtin: str) -> Product:
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


def _get_fresh_asset(product: Product) -> ImageAsset:
    """Get the freshest asset for a product"""
    try:
        from django.db.models import Case, When, IntegerField
        return product.image_assets.filter(
            is_active=True
        ).annotate(priority=Case(
            When(source='STORE', then=0),
            When(source='GS1', then=1),
            When(source='OFF', then=2),
            When(source='UPLOAD', then=3),
            default=9, output_field=IntegerField(),
        )).order_by('priority', '-last_fetched_at').first()
    except Exception as e:
        logger.error(f"Error getting fresh asset for product {product.id}: {e}")
        return None


def _serialize_image_asset(asset: ImageAsset) -> dict:
    """Serialize ImageAsset to dict for Celery result"""
    return {
        'id': asset.id,
        'product_id': asset.product.id,
        'product_gtin': asset.product.gtin,
        'source': asset.source,
        'url': asset.url,
        'file_url': asset.file.url if asset.file else None,
        'attribution_text': asset.attribution_text,
        'attribution_url': asset.attribution_url,
        'width': asset.width,
        'height': asset.height,
        'checksum': asset.checksum,
        'last_fetched_at': asset.last_fetched_at.isoformat() if asset.last_fetched_at else None,
        'is_active': asset.is_active,
    }
