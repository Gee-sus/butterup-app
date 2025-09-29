from django.core.management.base import BaseCommand
from api.models import Brand


class Command(BaseCommand):
    help = 'Seed the database with initial butter brands'

    def handle(self, *args, **options):
        self.stdout.write('Seeding butter brands...')
        
        # Common butter brands found in NZ supermarkets
        brands_data = [
            # Format: (name, display_name)
            # name: how it appears in product names (for matching)
            # display_name: how to show it to users
            ("Anchor", "Anchor"),
            ("Mainland", "Mainland"),
            ("Lewis Road Creamery", "Lewis Road"),
            ("Lewis Road", "Lewis Road"),
            ("Organic Times", "Organic Times"),
            ("Pam's", "Pam's"),
            ("Pams", "Pam's"),
            ("Westgold", "Westgold"),
            ("Lurpak", "Lurpak"),
            ("Dairyworks", "Dairyworks"),
            ("Woolworths", "Woolworths"),
            ("Countdown", "Woolworths"),
            ("Petit Normand", "Petit Normand"),
            ("Organic", "Organic"),
            ("Unknown", "Unknown"),
        ]
        
        created_count = 0
        updated_count = 0
        
        for name, display_name in brands_data:
            brand, created = Brand.objects.get_or_create(
                name=name,
                defaults={'display_name': display_name}
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'✅ Created brand: {display_name} ({name})')
            else:
                # Update display_name if it changed
                if brand.display_name != display_name:
                    brand.display_name = display_name
                    brand.save()
                    updated_count += 1
                    self.stdout.write(f'🔄 Updated brand: {display_name} ({name})')
                else:
                    self.stdout.write(f'⏭️  Brand already exists: {display_name} ({name})')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Brand seeding completed! Created: {created_count}, Updated: {updated_count}'
            )
        )
