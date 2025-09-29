import os, re
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from api.models import Product, ImageAsset

# ---------- helpers ----------
brand_map = {
    'anchor':'Anchor',
    'lewis_road':'Lewis Road Creamery',
    'lurpak':'Lurpak',
    'mainland':'Mainland',
    'market_kitchen':'Market Kitchen',
    'nuttelex':'Nuttelex',
    'olivani':'Olivani',
    'pams':'Pams',
    'petit_normand':'Petit Normand',
    'rolling_meadow':'Rolling Meadow',
    'vutter':'Vutter',
    'westgold':'Westgold',
    'woolworths':'Woolworths',
}
KEYS = ['salted','unsalted','spreadable','cultured','organic','grass_fed','grass','pure','original','buttery','tub']

def norm(s): 
    return s.lower().replace('-', '_').replace('’','').replace("'", '').replace(' ', '_')

def pick_brand(base):
    for k,v in brand_map.items():
        if base.startswith(k):
            return v
    return None

def grams_from_name(base):
    m = re.search(r'(\d+)\s*g', base)
    return int(m.group(1)) if m else None

def tokens_from_name(base):
    name = base.rsplit('.',1)[0]
    toks = set(name.split('_'))
    if 'grass' in toks and 'fed' in toks:
        toks.add('grass_fed')
    return toks

def build_name(grams, toks, brand):
    descriptors = []
    for k,label in [('grass_fed','Grass Fed'),('organic','Organic'),('cultured','Cultured'),
                    ('spreadable','Spreadable'),('unsalted','Unsalted'),('salted','Salted'),
                    ('original','Original'),('buttery','Buttery'),('pure','Pure'),('tub','Tub')]:
        if k in toks: descriptors.append(label)
    base = 'Vutter' if brand == 'Vutter' else 'Butter'
    name = ' '.join([*descriptors, base, f'{grams}g']).strip()
    return name or f'Butter {grams}g'

def get_or_create_product(brand, grams, toks):
    name = build_name(grams, toks, brand)
    package = 'Spreadable' if ('spreadable' in toks or 'tub' in toks or brand=='Vutter') else 'Block'
    obj, created = Product.objects.get_or_create(
        brand=brand, weight_grams=grams, name=name,
        defaults={'package_type': package, 'is_active': True}
    )
    return obj, created

def name_score(prod, toks):
    n = norm(prod.name)
    s = 0
    for k in ['grass_fed','organic','cultured','spreadable','unsalted','salted','original','buttery','pure']:
        if k in toks and k.replace('_',' ') in n:
            s += 2
    return s

# ---------- command ----------
class Command(BaseCommand):
    help = "Attach images from MEDIA_ROOT/<dir> to Products. Creates missing Product rows if needed."

    def add_arguments(self, parser):
        parser.add_argument('--dir', default='products',
                            help='Subfolder under MEDIA_ROOT to scan (default: products)')
        parser.add_argument('--link', action='store_true',
                            help='Link existing files without copying bytes (set file.name directly)')
        parser.add_argument('--dry-run', action='store_true',
                            help='Show what would happen without writing to DB')

    def handle(self, *args, **opts):
        subdir = opts['dir']
        link_only = opts['link']
        dry = opts['dry_run']

        prod_dir = os.path.join(settings.MEDIA_ROOT, subdir)
        if not os.path.isdir(prod_dir):
            self.stderr.write(f'Folder not found: {prod_dir}')
            return

        files = [f for f in os.listdir(prod_dir)
                 if f.lower().endswith(('.png','.jpg','.jpeg','.webp'))]

        attached = created_products = skipped = 0

        for fname in files:
            base = norm(fname)
            brand = pick_brand(base)
            grams = grams_from_name(base)
            toks  = tokens_from_name(base)
            if not brand or not grams:
                continue

            qs = Product.objects.filter(brand__iexact=brand, weight_grams=grams, is_active=True)
            if qs.exists():
                prod = sorted(qs, key=lambda p: name_score(p, toks), reverse=True)[0]
                created = False
            else:
                prod, created = get_or_create_product(brand, grams, toks)
                if created:
                    created_products += 1
                    self.stdout.write(f'created product: {prod.id} {prod.brand} {prod.name}')

            rel = f'{subdir}/{fname}'
            if ImageAsset.objects.filter(product=prod, file=rel).exists():
                skipped += 1
                continue

            if dry:
                self.stdout.write(f'[dry] would attach -> {prod.id} {prod.brand} {prod.name} | {fname}')
                continue

            asset = ImageAsset(product=prod, source='UPLOAD', is_active=True)
            if link_only:
                # no byte copy; just reference existing file under MEDIA_ROOT
                asset.file.name = rel
                asset.save()
            else:
                # copy bytes into ImageField (safe if you might move/rename files externally)
                path = os.path.join(prod_dir, fname)
                with open(path, 'rb') as f:
                    asset.file.save(fname, File(f), save=True)

            attached += 1
            self.stdout.write(f'attached -> {prod.id} {prod.brand} {prod.name} | {fname}')

        self.stdout.write(self.style.SUCCESS(
            f'Done. attached={attached} created_products={created_products} skipped={skipped}'
        ))
