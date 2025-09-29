"""
Management command to fetch product images by GTIN.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from api.models import Product
from api.services.image_cache import ImageCacheService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fetch product image by GTIN from Open Food Facts or GS1'

    def add_arguments(self, parser):
        parser.add_argument(
            '--gtin',
            type=str,
            required=True,
            help='Global Trade Item Number (8, 12, 13, or 14 digits)'
        )
        parser.add_argument(
            '--refresh',
            action='store_true',
            help='Force refresh even if image exists within TTL'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )

    def handle(self, *args, **options):
        gtin = options['gtin']
        refresh = options['refresh']
        verbose = options['verbose']

        if verbose:
            logging.getLogger().setLevel(logging.DEBUG)

        # Validate GTIN
        if not self._validate_gtin(gtin):
            raise CommandError(f"Invalid GTIN format: {gtin}")

        self.stdout.write(f"Fetching image for GTIN: {gtin}")
        if refresh:
            self.stdout.write("Force refresh enabled")

        try:
            # Initialize service
            service = ImageCacheService()

            # Fetch image
            asset = service.fetch_product_image(gtin, prefer_refresh=refresh)

            if asset:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully fetched image for GTIN {gtin}"
                    )
                )
                
                # Display asset details
                self.stdout.write(f"Source: {asset.source}")
                self.stdout.write(f"URL: {asset.url}")
                if asset.file:
                    self.stdout.write(f"File: {asset.file.name}")
                if asset.attribution_text:
                    self.stdout.write(f"Attribution: {asset.attribution_text}")
                self.stdout.write(f"Dimensions: {asset.width}x{asset.height}")
                self.stdout.write(f"Checksum: {asset.checksum}")
                self.stdout.write(f"Fetched: {asset.last_fetched_at}")
                
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"No image found for GTIN {gtin}"
                    )
                )

        except Exception as e:
            logger.error(f"Error fetching image for GTIN {gtin}: {e}")
            raise CommandError(f"Failed to fetch image: {e}")

    def _validate_gtin(self, gtin: str) -> bool:
        """Validate GTIN format"""
        if not gtin or not gtin.isdigit():
            return False
        
        length = len(gtin)
        return length in [8, 12, 13, 14]
