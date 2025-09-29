from django.core.management.base import BaseCommand
from api.models import Store


SEED_STORES = [
    # Pak'nSave
    {
        'chain': 'paknsave',
        'name': 'Pak\'nSave Albany',
        'address': '219 Don McKinnon Dr, Albany, Auckland',
        'city': 'Auckland',
        'latitude': -36.7306,
        'longitude': 174.7076,
        'store_code': 'pns-albany',
    },
    {
        'chain': 'paknsave',
        'name': 'Pak\'nSave Mt Albert',
        'address': 'New North Rd, Mt Albert, Auckland',
        'city': 'Auckland',
        'latitude': -36.8861,
        'longitude': 174.7154,
        'store_code': 'pns-mtalbert',
    },
    # Woolworths
    {
        'chain': 'countdown',
        'name': 'Woolworths Albany',
        'address': '219 Don McKinnon Dr, Albany, Auckland',
        'city': 'Auckland',
        'latitude': -36.7312,
        'longitude': 174.7091,
        'store_code': 'cd-albany',
    },
    {
        'chain': 'countdown',
        'name': 'Woolworths Ponsonby',
        'address': '4 Williamson Ave, Grey Lynn, Auckland',
        'city': 'Auckland',
        'latitude': -36.8599,
        'longitude': 174.7443,
        'store_code': 'cd-ponsonby',
    },
    # New World
    {
        'chain': 'new_world',
        'name': 'New World Victoria Park',
        'address': '2 College Hill, Auckland CBD',
        'city': 'Auckland',
        'latitude': -36.8476,
        'longitude': 174.7516,
        'store_code': 'nw-victoriapark',
    },
    {
        'chain': 'new_world',
        'name': 'New World Metro Queen St',
        'address': '125 Queen St, Auckland CBD',
        'city': 'Auckland',
        'latitude': -36.8470,
        'longitude': 174.7650,
        'store_code': 'nw-queenst',
    },
]


class Command(BaseCommand):
    help = 'Seed a curated list of Auckland stores with lat/lng and store_code'

    def handle(self, *args, **options):
        created_count = 0
        for s in SEED_STORES:
            obj, created = Store.objects.get_or_create(
                chain=s['chain'], name=s['name'], city=s['city'],
                defaults={
                    'address': s['address'],
                    'latitude': s['latitude'],
                    'longitude': s['longitude'],
                    'store_code': s['store_code'],
                    'region': 'Auckland',
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {created_count} stores (or already present).'))


