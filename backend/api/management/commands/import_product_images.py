import re
from pathlib import Path
from collections import defaultdict

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from api.models import Product, ImageAsset

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}


def normalise_tokens(text: str) -> set[str]:
    """Return a set of lowercase tokens extracted from text."""
    normalised = re.sub(r'[^a-z0-9]+', '-', text.lower())
    return {token for token in normalised.split('-') if token}


def parse_file(path: Path) -> dict:
    """Extract heuristics from an image filename."""
    tokens = normalise_tokens(path.stem)
    grams = None

    match = re.search(r'(\d+(?:\.\d+)?)\s*(kg|g)', path.stem.lower())
    if match:
        value = float(match.group(1))
        unit = match.group(2)
        grams = int(round(value * 1000)) if unit == 'kg' else int(round(value))
        tokens.add(str(grams))
        tokens.add(f"{grams}g")

    return {
        'path': path,
        'tokens': tokens,
        'grams': grams,
        'base_slug': re.sub(r'[^a-z0-9]+', '-', path.stem.lower()).strip('-'),
    }


def build_product_index() -> dict[int, dict]:
    """Prepare token data for all active products."""
    index: dict[int, dict] = {}
    for product in Product.objects.filter(is_active=True):
        tokens = normalise_tokens(f"{product.brand or ''} {product.name or ''}")
        brand_slug = slugify(product.brand or '')
        if brand_slug:
            tokens.add(brand_slug)
        grams = None
        if product.weight_grams:
            grams = int(product.weight_grams)
            tokens.add(str(grams))
            tokens.add(f"{grams}g")
        index[product.id] = {
            'product': product,
            'tokens': tokens,
            'grams': grams,
            'brand_slug': brand_slug,
            'slug': slugify(f"{product.brand or ''} {product.name or ''} {grams or ''}")
        }
    return index


def score_match(product_info: dict, file_info: dict) -> int:
    """Compute how well a product matches an image filename."""
    score = len(product_info['tokens'] & file_info['tokens'])

    if file_info['grams'] and product_info['grams']:
        if file_info['grams'] == product_info['grams']:
            score += 5

    brand_slug = product_info['brand_slug']
    if brand_slug and brand_slug in file_info['tokens']:
        score += 2

    if file_info['base_slug'] == product_info['slug']:
        score += 3

    return score


class Command(BaseCommand):
    """Link images on disk to Product records by creating ImageAsset rows."""

    help = (
        "Scan MEDIA_ROOT/products for image files, match them to Product records, "
        "and create ImageAsset entries when a confident match is found."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without writing changes.'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        media_root = Path(getattr(settings, 'MEDIA_ROOT', 'media'))
        images_dir = media_root / 'products'

        if not images_dir.exists():
            self.stderr.write(self.style.ERROR(f"Directory not found: {images_dir}"))
            return

        product_index = build_product_index()
        if not product_index:
            self.stderr.write(self.style.ERROR('No products available to match.'))
            return

        created = 0
        skipped = 0
        ambiguous: list[tuple[Path, list[tuple[int, Product]]]] = []

        files = sorted([p for p in images_dir.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS])
        if not files:
            self.stdout.write(self.style.WARNING(f'No image files found in {images_dir}'))
            return

        self.stdout.write(f'Processing {len(files)} image file(s) from {images_dir}\n')

        for file_path in files:
            file_info = parse_file(file_path)
            candidates: list[tuple[int, int]] = []  # (score, product_id)

            for product_id, info in product_index.items():
                score = score_match(info, file_info)
                if score > 0:
                    candidates.append((score, product_id))

            if not candidates:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'No plausible match for {file_path.name}'))
                continue

            candidates.sort(reverse=True)  # sort by score desc, product_id asc
            best_score, best_product_id = candidates[0]
            runner_up_score = candidates[1][0] if len(candidates) > 1 else None

            # Require a minimum score and reasonable separation from the runner up
            if best_score < 5 or (runner_up_score is not None and best_score - runner_up_score < 2):
                product_list = [(score, product_index[pid]['product']) for score, pid in candidates[:5]]
                ambiguous.append((file_path, product_list))
                self.stdout.write(
                    self.style.WARNING(
                        f'Ambiguous match for {file_path.name} (best score {best_score}, runner-up {runner_up_score})'
                    )
                )
                continue

            product = product_index[best_product_id]['product']
            relative_name = file_path.relative_to(media_root).as_posix()

            existing = ImageAsset.objects.filter(product=product, file=relative_name).first()
            if existing:
                skipped += 1
                self.stdout.write(f'Skipping {file_path.name}: already linked to {product}')
                continue

            if dry_run:
                self.stdout.write(f"[dry-run] Would link {file_path.name} -> {product}")
                continue

            with transaction.atomic():
                asset = ImageAsset(
                    product=product,
                    source='UPLOAD',
                    file=relative_name,
                    is_active=True,
                    alt_text=f"{product.brand} {product.name}".strip()
                )
                asset.save()

            created += 1
            self.stdout.write(self.style.SUCCESS(f'Linked {file_path.name} -> {product}'))

        self.stdout.write('\nSummary:')
        self.stdout.write(f'  Created assets: {created}')
        self.stdout.write(f'  Skipped files: {skipped}')
        if ambiguous:
            self.stdout.write(self.style.WARNING('  Ambiguous/unmatched files:'))
            for file_path, product_list in ambiguous:
                self.stdout.write(self.style.WARNING(f'    {file_path.name}:'))
                for score, product in product_list:
                    self.stdout.write(self.style.WARNING(f'      score {score}: {product}'))
        else:
            self.stdout.write('  No ambiguous files!')

        if dry_run and created:
            self.stdout.write(self.style.WARNING('\nNothing was written due to --dry-run. Re-run without it to apply changes.'))
