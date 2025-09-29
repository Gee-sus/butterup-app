from api.models import Brand
import logging

logger = logging.getLogger(__name__)


class BrandExtractor:
    """Utility class for extracting brand names from product names using database lookup"""
    
    @staticmethod
    def extract_brand_from_name(product_name: str) -> str:
        """
        Extract brand name from product name using database lookup.
        Falls back to creating 'Unknown' brand if no match found.
        
        Args:
            product_name: The full product name (e.g., "Lewis Road Creamery Butter 250g")
            
        Returns:
            Brand display name as string
        """
        if not product_name or not product_name.strip():
            return BrandExtractor._get_unknown_brand()
        
        product_name = product_name.strip()
        
        # Get all active brands, ordered by name length (longest first)
        # This ensures "Lewis Road Creamery" matches before "Lewis Road"
        brands = Brand.objects.filter(is_active=True).extra(
            select={'name_length': 'LENGTH(name)'}
        ).order_by('-name_length', 'name')
        
        # Try exact matches first (case insensitive)
        for brand in brands:
            if brand.name.lower() in product_name.lower():
                logger.debug(f"Matched brand '{brand.name}' for product '{product_name}'")
                return brand.display_name
        
        # If no match found, create or get 'Unknown' brand
        logger.warning(f"No brand match found for product: '{product_name}'")
        return BrandExtractor._get_unknown_brand()
    
    @staticmethod
    def _get_unknown_brand() -> str:
        """Get or create the 'Unknown' brand and return display name"""
        brand, created = Brand.objects.get_or_create(
            name="Unknown",
            defaults={'display_name': 'Unknown'}
        )
        return brand.display_name
    
    @staticmethod
    def add_new_brand(name: str, display_name: str = None) -> Brand:
        """
        Add a new brand to the database.
        
        Args:
            name: Brand name as it appears in product names
            display_name: How to display the brand (defaults to name)
            
        Returns:
            Brand instance
        """
        if not display_name:
            display_name = name
            
        brand, created = Brand.objects.get_or_create(
            name=name,
            defaults={'display_name': display_name}
        )
        
        if created:
            logger.info(f"Added new brand: {display_name} ({name})")
        else:
            logger.info(f"Brand already exists: {display_name} ({name})")
            
        return brand
    
    @staticmethod
    def get_all_active_brands():
        """Get all active brands for reference"""
        return Brand.objects.filter(is_active=True).order_by('display_name')
