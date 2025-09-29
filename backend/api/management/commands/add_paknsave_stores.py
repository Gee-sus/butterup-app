from django.core.management.base import BaseCommand
from api.models import Store

class Command(BaseCommand):
    help = 'Add Pak\'nSave stores to the database'

    def handle(self, *args, **options):
        paknsave_stores = [
            {
                'name': 'Pak\'nSave Albany',
                'chain': 'paknsave',
                'location': 'Albany',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.7281,
                'longitude': 174.6997,
                'address': '3/47 Kell Drive, Albany, Auckland 0632',
                'store_code': 'ALB001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Mt Albert',
                'chain': 'paknsave',
                'location': 'Mt Albert',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.8785,
                'longitude': 174.7286,
                'address': '931 New North Road, Mt Albert, Auckland 1025',
                'store_code': 'MTA001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Wairau Park',
                'chain': 'paknsave',
                'location': 'Wairau Park',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.7597,
                'longitude': 174.7331,
                'address': '106 Wairau Road, Wairau Park, Auckland 0627',
                'store_code': 'WRP001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Manukau',
                'chain': 'paknsave',
                'location': 'Manukau',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.9848,
                'longitude': 174.8790,
                'address': 'Corner Great South Road & Cavendish Drive, Manukau, Auckland 2104',
                'store_code': 'MNK001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Lincoln Road',
                'chain': 'paknsave',
                'location': 'Henderson',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.8705,
                'longitude': 174.6284,
                'address': '163 Lincoln Road, Henderson, Auckland 0610',
                'store_code': 'LNR001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Glenfield',
                'chain': 'paknsave',
                'location': 'Glenfield',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.7797,
                'longitude': 174.7205,
                'address': 'Corner Glenfield Road & Downing Street, Glenfield, Auckland 0629',
                'store_code': 'GLF001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Royal Oak',
                'chain': 'paknsave',
                'location': 'Royal Oak',
                'region': 'Auckland',
                'city': 'Auckland',
                'latitude': -36.9075,
                'longitude': 174.7823,
                'address': '1 Rockfield Road, Royal Oak, Auckland 1023',
                'store_code': 'ROY001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Hamilton',
                'chain': 'paknsave',
                'location': 'Hamilton',
                'region': 'Waikato',
                'city': 'Hamilton',
                'latitude': -37.7870,
                'longitude': 175.2793,
                'address': 'Corner Te Rapa Road & Greenwood Street, Hamilton 3200',
                'store_code': 'HAM001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Tauranga',
                'chain': 'paknsave',
                'location': 'Tauranga',
                'region': 'Bay of Plenty',
                'city': 'Tauranga',
                'latitude': -37.6878,
                'longitude': 176.1651,
                'address': 'Corner Cameron Road & Elizabeth Street, Tauranga 3110',
                'store_code': 'TGA001',
                'is_active': True
            },
            {
                'name': 'Pak\'nSave Christchurch',
                'chain': 'paknsave',
                'location': 'Christchurch',
                'region': 'Canterbury',
                'city': 'Christchurch',
                'latitude': -43.5321,
                'longitude': 172.6362,
                'address': 'Corner Blenheim Road & Riccarton Avenue, Christchurch 8041',
                'store_code': 'CHC001',
                'is_active': True
            }
        ]

        created_count = 0
        updated_count = 0

        for store_data in paknsave_stores:
            store, created = Store.objects.get_or_create(
                name=store_data['name'],
                chain=store_data['chain'],
                defaults=store_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created store: {store.name}')
                )
            else:
                # Update existing store with new data
                for key, value in store_data.items():
                    setattr(store, key, value)
                store.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated store: {store.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {len(paknsave_stores)} stores. '
                f'Created: {created_count}, Updated: {updated_count}'
            )
        )
