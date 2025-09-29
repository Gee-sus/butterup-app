"""
Management command to backfill product images from a CSV file.
"""

import csv
import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from api.models import Product
from api.services.image_cache import ImageCacheService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill product images from a CSV file containing GTINs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Path to CSV file containing GTINs'
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
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually fetching'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        refresh = options['refresh']
        verbose = options['verbose']
        dry_run = options['dry_run']

        if verbose:
            logging.getLogger().setLevel(logging.DEBUG)

        # Check if file exists
        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        self.stdout.write(f"Processing GTINs from file: {file_path}")
        if refresh:
            self.stdout.write("Force refresh enabled")
        if dry_run:
            self.stdout.write("DRY RUN MODE - No images will be fetched")

        try:
            # Read GTINs from CSV
            gtins = self._read_gtins_from_csv(file_path)
            
            if not gtins:
                self.stdout.write(self.style.WARNING("No valid GTINs found in file"))
                return

            self.stdout.write(f"Found {len(gtins)} GTINs to process")

            if dry_run:
                self._dry_run_gtins(gtins)
                return

            # Process GTINs
            results = self._process_gtins(gtins, refresh, verbose)

            # Display results
            self._display_results(results)

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            raise CommandError(f"Failed to process file: {e}")

    def _read_gtins_from_csv(self, file_path: str) -> list:
        """Read GTINs from CSV file"""
        gtins = []
        
        try:
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                # Try to find GTIN column
                gtin_column = None
                for col in reader.fieldnames:
                    if 'gtin' in col.lower() or 'barcode' in col.lower():
                        gtin_column = col
                        break
                
                if not gtin_column:
                    # Assume first column is GTIN
                    gtin_column = reader.fieldnames[0]
                
                self.stdout.write(f"Using column: {gtin_column}")
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 for header
                    gtin = row.get(gtin_column, '').strip()
                    
                    if gtin and self._validate_gtin(gtin):
                        gtins.append(gtin)
                    elif gtin:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Invalid GTIN at row {row_num}: {gtin}"
                            )
                        )
                        
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            raise CommandError(f"Failed to read CSV file: {e}")
        
        return gtins

    def _validate_gtin(self, gtin: str) -> bool:
        """Validate GTIN format"""
        if not gtin or not gtin.isdigit():
            return False
        
        length = len(gtin)
        return length in [8, 12, 13, 14]

    def _dry_run_gtins(self, gtins: list):
        """Show what would be processed in dry run mode"""
        self.stdout.write("DRY RUN - GTINs that would be processed:")
        for i, gtin in enumerate(gtins[:10], 1):  # Show first 10
            self.stdout.write(f"  {i}. {gtin}")
        
        if len(gtins) > 10:
            self.stdout.write(f"  ... and {len(gtins) - 10} more")

    def _process_gtins(self, gtins: list, refresh: bool, verbose: bool) -> dict:
        """Process list of GTINs"""
        results = {
            'total': len(gtins),
            'successful': 0,
            'failed': 0,
            'errors': []
        }

        # Initialize service
        service = ImageCacheService()

        for i, gtin in enumerate(gtins, 1):
            try:
                if verbose:
                    self.stdout.write(f"Processing {i}/{len(gtins)}: {gtin}")
                
                # Fetch image
                asset = service.fetch_product_image(gtin, prefer_refresh=refresh)
                
                if asset:
                    results['successful'] += 1
                    if verbose:
                        self.stdout.write(
                            self.style.SUCCESS(f"  ✓ Success: {asset.source}")
                        )
                else:
                    results['failed'] += 1
                    results['errors'].append(f"GTIN {gtin}: No image found")
                    if verbose:
                        self.stdout.write(
                            self.style.WARNING(f"  ✗ No image found")
                        )
                        
            except Exception as e:
                results['failed'] += 1
                error_msg = f"GTIN {gtin}: {str(e)}"
                results['errors'].append(error_msg)
                if verbose:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ Error: {str(e)}")
                    )

        return results

    def _display_results(self, results: dict):
        """Display processing results"""
        self.stdout.write("\n" + "="*50)
        self.stdout.write("PROCESSING RESULTS")
        self.stdout.write("="*50)
        self.stdout.write(f"Total GTINs: {results['total']}")
        self.stdout.write(
            self.style.SUCCESS(f"Successful: {results['successful']}")
        )
        self.stdout.write(
            self.style.ERROR(f"Failed: {results['failed']}")
        )
        
        if results['errors']:
            self.stdout.write("\nErrors:")
            for error in results['errors'][:10]:  # Show first 10 errors
                self.stdout.write(f"  - {error}")
            
            if len(results['errors']) > 10:
                self.stdout.write(f"  ... and {len(results['errors']) - 10} more errors")
