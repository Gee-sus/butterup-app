import csv
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import NutritionProfile

class Command(BaseCommand):
    help = 'Load nutrition data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Path to the nutrition CSV file'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing records instead of creating new ones'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        update_existing = options['update']
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                created_count = 0
                updated_count = 0
                skipped_count = 0
                
                for row in reader:
                    try:
                        # Parse JSON fields
                        allergens = json.loads(row['allergens']) if row['allergens'] else []
                        claims = json.loads(row['claims']) if row['claims'] else []
                        warnings = json.loads(row['warnings']) if row['warnings'] else []
                        
                        # Parse datetime
                        last_verified_at = datetime.strptime(
                            row['last_verified_at'], 
                            '%Y-%m-%d %H:%M:%S'
                        ).replace(tzinfo=timezone.utc)
                        
                        # Prepare data
                        nutrition_data = {
                            'slug': row['slug'],
                            'origin': row['origin'],
                            'allergens': allergens,
                            'claims': claims,
                            'storage': row['storage'],
                            'warnings': warnings,
                            'serving_g': int(row['serving_g']),
                            'energy_kj': float(row['energy_kj']),
                            'fat_g': float(row['fat_g']),
                            'sat_fat_g': float(row['sat_fat_g']),
                            'carbs_g': float(row['carbs_g']),
                            'sugars_g': float(row['sugars_g']),
                            'protein_g': float(row['protein_g']),
                            'sodium_mg': float(row['sodium_mg']),
                            'last_verified_at': last_verified_at,
                            'source': row['source'],
                        }
                        
                        if update_existing:
                            # Update existing record
                            nutrition, created = NutritionProfile.objects.update_or_create(
                                slug=row['slug'],
                                defaults=nutrition_data
                            )
                            if created:
                                created_count += 1
                                self.stdout.write(f"Created: {row['slug']}")
                            else:
                                updated_count += 1
                                self.stdout.write(f"Updated: {row['slug']}")
                        else:
                            # Create new record only if it doesn't exist
                            if NutritionProfile.objects.filter(slug=row['slug']).exists():
                                skipped_count += 1
                                self.stdout.write(f"Skipped (exists): {row['slug']}")
                            else:
                                NutritionProfile.objects.create(**nutrition_data)
                                created_count += 1
                                self.stdout.write(f"Created: {row['slug']}")
                                
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f"Error processing {row.get('slug', 'unknown')}: {str(e)}")
                        )
                        continue
                
                # Summary
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\nSummary:\n"
                        f"Created: {created_count}\n"
                        f"Updated: {updated_count}\n"
                        f"Skipped: {skipped_count}\n"
                        f"Total processed: {created_count + updated_count + skipped_count}"
                    )
                )
                
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"File not found: {csv_file}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error reading CSV file: {str(e)}")
            )
