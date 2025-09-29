"""
Enhanced Django management command to import product images.

This command scans MEDIA_ROOT/products for image files, intelligently matches them
to existing Product records, and creates ImageAsset entries with proper metadata.

Features:
- Smart matching using brand + weight tokens with scoring
- Weight match gets extra points for accuracy
- Dry-run mode to preview changes
- Skips already linked assets
- Reports ambiguous matches for manual review
- Generates meaningful alt text
- Supports multiple image formats
- Transaction safety
- Detailed reporting and logging
"""

import re
import hashlib
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Set, Optional

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify
from PIL import Image

from api.models import Product, ImageAsset

# Supported image file extensions
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'}

# Minimum score required for automatic matching
MIN_MATCH_SCORE = 5

# Minimum score difference between best and runner-up for confident matching
MIN_SCORE_SEPARATION = 2


def normalize_tokens(text: str) -> Set[str]:
    """
    Extract and normalize tokens from text for matching.
    
    Args:
        text: Input text to tokenize
        
    Returns:
        Set of lowercase tokens
    """
    if not text:
        return set()
    
    # Convert to lowercase and replace non-alphanumeric with dashes
    normalized = re.sub(r'[^a-z0-9]+', '-', text.lower())
    
    # Split on dashes and filter empty tokens
    tokens = {token for token in normalized.split('-') if token}
    
    # Add common brand variations
    brand_variations = {
        'paknsave': {'pak', 'save', 'paknsave'},
        'countdown': {'countdown'},
        'newworld': {'new', 'world', 'newworld'},
        'mainland': {'mainland'},
        'anchor': {'anchor'},
        'lurpak': {'lurpak'},
        'westgold': {'west', 'gold', 'westgold'},
        'lewis': {'lewis', 'road'},
        'nuttelex': {'nuttelex'},
        'olivani': {'olivani'},
        'vutter': {'vutter'},
    }
    
    # Add brand variations if found
    for brand, variations in brand_variations.items():
        if brand in tokens:
            tokens.update(variations)
    
    return tokens


def extract_weight_from_text(text: str) -> Optional[int]:
    """
    Extract weight in grams from text using multiple patterns.
    
    Args:
        text: Text to search for weight
        
    Returns:
        Weight in grams or None if not found
    """
    if not text:
        return None
    
    # Try different weight patterns
    patterns = [
        r'(\d+(?:\.\d+)?)\s*(kg|g)\b',  # 500g, 1.5kg, etc.
        r'(\d+(?:\.\d+)?)\s*gram',       # 500gram
        r'(\d+(?:\.\d+)?)\s*kilo',       # 1.5kilo
        r'(\d{3,4})(?![a-z])',          # 500 (3-4 digits not followed by letter)
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            value = float(match.group(1))
            unit = match.group(2) if len(match.groups()) > 1 else 'g'
            
            # Convert to grams
            if unit.startswith('k'):  # kg, kilo
                grams = int(round(value * 1000))
            else:
                grams = int(round(value))
            
            # Sanity check: butter products typically 100-1000g
            if 50 <= grams <= 2000:
                return grams
    
    return None


def parse_image_file(path: Path) -> Dict:
    """
    Extract metadata and tokens from an image filename.
    
    Args:
        path: Path to image file
        
    Returns:
        Dictionary with parsed information
    """
    stem = path.stem
    tokens = normalize_tokens(stem)
    weight = extract_weight_from_text(stem)
    
    # Add weight as tokens if found
    if weight:
        tokens.add(str(weight))
        tokens.add(f"{weight}g")
    
    # Create base slug for exact matching
    base_slug = re.sub(r'[^a-z0-9]+', '-', stem.lower()).strip('-')
    
    return {
        'path': path,
        'tokens': tokens,
        'weight': weight,
        'base_slug': base_slug,
        'stem': stem,
    }


def build_product_index() -> Dict[int, Dict]:
    """
    Build searchable index of all active products.
    
    Returns:
        Dictionary mapping product ID to metadata
    """
    index = {}
    
    for product in Product.objects.filter(is_active=True).select_related():
        # Combine brand and name for token extraction
        full_name = f"{product.brand or ''} {product.name or ''}".strip()
        tokens = normalize_tokens(full_name)
        
        # Add brand slug
        brand_slug = slugify(product.brand or '')
        if brand_slug:
            tokens.add(brand_slug)
        
        # Add weight information
        weight = product.weight_grams
        if weight:
            tokens.add(str(weight))
            tokens.add(f"{weight}g")
        
        # Create comprehensive slug
        slug_parts = [product.brand or '', product.name or '']
        if weight:
            slug_parts.append(str(weight))
        full_slug = slugify(' '.join(slug_parts))
        
        index[product.id] = {
            'product': product,
            'tokens': tokens,
            'weight': weight,
            'brand_slug': brand_slug,
            'full_slug': full_slug,
            'brand': product.brand or '',
            'name': product.name or '',
        }
    
    return index


def calculate_match_score(product_info: Dict, file_info: Dict) -> int:
    """
    Calculate matching score between product and image file.
    
    Args:
        product_info: Product metadata from index
        file_info: Image file metadata
        
    Returns:
        Matching score (higher is better)
    """
    score = 0
    
    # Base score: common tokens
    common_tokens = product_info['tokens'] & file_info['tokens']
    score += len(common_tokens)
    
    # Weight match bonus (important for butter products)
    if file_info['weight'] and product_info['weight']:
        if file_info['weight'] == product_info['weight']:
            score += 10  # High bonus for exact weight match
        elif abs(file_info['weight'] - product_info['weight']) <= 50:
            score += 5   # Moderate bonus for close weight match
    
    # Brand slug match bonus
    if product_info['brand_slug'] and product_info['brand_slug'] in file_info['tokens']:
        score += 5
    
    # Exact slug match bonus
    if file_info['base_slug'] == product_info['full_slug']:
        score += 8
    
    # Brand name in filename bonus
    brand_lower = product_info['brand'].lower()
    if brand_lower and brand_lower in file_info['stem'].lower():
        score += 3
    
    return score


def calculate_file_checksum(file_path: Path) -> str:
    """
    Calculate MD5 checksum of file content.
    
    Args:
        file_path: Path to file
        
    Returns:
        MD5 hex digest
    """
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def get_image_dimensions(file_path: Path) -> Tuple[Optional[int], Optional[int]]:
    """
    Get image dimensions safely.
    
    Args:
        file_path: Path to image file
        
    Returns:
        Tuple of (width, height) or (None, None) if error
    """
    try:
        with Image.open(file_path) as img:
            return img.size
    except Exception:
        return None, None


class Command(BaseCommand):
    """
    Enhanced command to import product images with intelligent matching.
    """
    
    help = (
        "Scan MEDIA_ROOT/products for image files, intelligently match them to "
        "Product records using brand and weight tokens, and create ImageAsset "
        "entries. Includes dry-run mode and detailed reporting."
    )
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without making changes'
        )
        parser.add_argument(
            '--min-score',
            type=int,
            default=MIN_MATCH_SCORE,
            help=f'Minimum score required for automatic matching (default: {MIN_MATCH_SCORE})'
        )
        parser.add_argument(
            '--min-separation',
            type=int,
            default=MIN_SCORE_SEPARATION,
            help=f'Minimum score separation from runner-up (default: {MIN_SCORE_SEPARATION})'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if ImageAsset already exists'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed matching information'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        min_score = options['min_score']
        min_separation = options['min_separation']
        force = options['force']
        verbose = options['verbose']
        
        # Setup paths
        media_root = Path(getattr(settings, 'MEDIA_ROOT', 'media'))
        images_dir = media_root / 'products'
        
        if not images_dir.exists():
            raise CommandError(f"Directory not found: {images_dir}")
        
        # Build product index
        self.stdout.write("Building product index...")
        product_index = build_product_index()
        
        if not product_index:
            raise CommandError('No active products found to match against')
        
        self.stdout.write(f"Found {len(product_index)} active products")
        
        # Find image files
        image_files = [
            p for p in images_dir.iterdir() 
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        ]
        
        if not image_files:
            self.stdout.write(self.style.WARNING(f'No image files found in {images_dir}'))
            return
        
        image_files.sort()
        self.stdout.write(f"Found {len(image_files)} image files\n")
        
        # Process files
        stats = {
            'created': 0,
            'skipped_existing': 0,
            'skipped_no_match': 0,
            'ambiguous': 0,
        }
        
        ambiguous_matches = []
        
        for file_path in image_files:
            result = self._process_image_file(
                file_path, media_root, product_index, 
                min_score, min_separation, force, dry_run, verbose
            )
            
            stats[result['status']] += 1
            
            if result['status'] == 'ambiguous':
                ambiguous_matches.append((file_path, result['candidates']))
        
        # Print summary
        self._print_summary(stats, ambiguous_matches, dry_run)
    
    def _process_image_file(self, file_path: Path, media_root: Path, 
                          product_index: Dict, min_score: int, min_separation: int,
                          force: bool, dry_run: bool, verbose: bool) -> Dict:
        """Process a single image file."""
        
        file_info = parse_image_file(file_path)
        candidates = []
        
        # Score all products
        for product_id, product_info in product_index.items():
            score = calculate_match_score(product_info, file_info)
            if score > 0:
                candidates.append((score, product_id))
        
        if verbose:
            self.stdout.write(f"\nProcessing: {file_path.name}")
            self.stdout.write(f"  Tokens: {', '.join(sorted(file_info['tokens']))}")
            if file_info['weight']:
                self.stdout.write(f"  Weight: {file_info['weight']}g")
        
        # Check if any matches found
        if not candidates:
            if verbose:
                self.stdout.write(f"  No matches found")
            self.stdout.write(
                self.style.WARNING(f'No match found for {file_path.name}')
            )
            return {'status': 'skipped_no_match'}
        
        # Sort by score (descending)
        candidates.sort(reverse=True)
        best_score, best_product_id = candidates[0]
        runner_up_score = candidates[1][0] if len(candidates) > 1 else 0
        
        if verbose:
            self.stdout.write(f"  Top candidates:")
            for i, (score, pid) in enumerate(candidates[:3]):
                product = product_index[pid]['product']
                self.stdout.write(f"    {i+1}. Score {score}: {product}")
        
        # Check if match is confident enough
        if best_score < min_score or (best_score - runner_up_score) < min_separation:
            candidate_list = [
                (score, product_index[pid]['product']) 
                for score, pid in candidates[:5]
            ]
            
            self.stdout.write(
                self.style.WARNING(
                    f'Ambiguous match for {file_path.name} '
                    f'(best: {best_score}, runner-up: {runner_up_score})'
                )
            )
            
            return {
                'status': 'ambiguous',
                'candidates': candidate_list
            }
        
        # Get best matching product
        product = product_index[best_product_id]['product']
        relative_path = file_path.relative_to(media_root).as_posix()
        
        # Check if already exists
        existing = ImageAsset.objects.filter(
            product=product, 
            file=relative_path
        ).first()
        
        if existing and not force:
            if verbose:
                self.stdout.write(f"  Already linked to {product}")
            self.stdout.write(f'Skipping {file_path.name}: already linked to {product}')
            return {'status': 'skipped_existing'}
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"[DRY RUN] Would link {file_path.name} -> {product}")
            )
            return {'status': 'created'}
        
        # Create ImageAsset
        try:
            with transaction.atomic():
                # Calculate file metadata
                checksum = calculate_file_checksum(file_path)
                width, height = get_image_dimensions(file_path)
                file_size = file_path.stat().st_size
                
                # Generate alt text
                alt_text = f"{product.brand} {product.name}".strip()
                if product.weight_grams:
                    alt_text += f" {product.weight_grams}g"
                
                # Create or update asset
                if existing and force:
                    asset = existing
                    asset.checksum = checksum
                    asset.width = width
                    asset.height = height
                    asset.file_size = file_size
                    asset.alt_text = alt_text
                    asset.is_active = True
                    action = "Updated"
                else:
                    asset = ImageAsset(
                        product=product,
                        source='UPLOAD',
                        file=relative_path,
                        checksum=checksum,
                        width=width,
                        height=height,
                        file_size=file_size,
                        alt_text=alt_text,
                        is_active=True,
                    )
                    action = "Created"
                
                asset.save()
                
            self.stdout.write(
                self.style.SUCCESS(f'{action} asset: {file_path.name} -> {product}')
            )
            
            return {'status': 'created'}
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating asset for {file_path.name}: {e}')
            )
            return {'status': 'skipped_no_match'}
    
    def _print_summary(self, stats: Dict, ambiguous_matches: List, dry_run: bool):
        """Print final summary."""
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('SUMMARY')
        self.stdout.write('='*50)
        self.stdout.write(f'Assets created: {stats["created"]}')
        self.stdout.write(f'Skipped (existing): {stats["skipped_existing"]}')
        self.stdout.write(f'Skipped (no match): {stats["skipped_no_match"]}')
        self.stdout.write(f'Ambiguous matches: {stats["ambiguous"]}')
        
        if ambiguous_matches:
            self.stdout.write('\nAMBIGUOUS MATCHES:')
            self.stdout.write('-' * 30)
            
            for file_path, candidates in ambiguous_matches:
                self.stdout.write(f'\n{file_path.name}:')
                for score, product in candidates:
                    self.stdout.write(f'  Score {score:2d}: {product}')
        
        if dry_run and stats['created'] > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\nDRY RUN: No changes made. '
                    f'Run without --dry-run to create {stats["created"]} assets.'
                )
            )
        
        self.stdout.write('\nDone!')
