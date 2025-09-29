from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from urllib.parse import urlparse
from django.utils.text import slugify
import os, requests, hashlib

from api.models import Product, ImageAsset

def _ext_from_url(u, default=".jpg"):
    try:
        p = urlparse(u)
        ext = os.path.splitext(p.path)[1]
        if ext and len(ext) <= 5:
            return ext
        return default
    except Exception:
        return default

def _checksum(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()

def _canonical_name(product: Product, src_url: str) -> str:
    brand = slugify(product.brand or "brand")
    name  = slugify(product.name or "product")
    grams = f"{product.weight_grams or ''}g".strip()
    ext   = _ext_from_url(src_url)
    base  = "_".join([x for x in [brand, name, grams] if x])
    return f"products/{base}{ext}"

def _download(url: str, timeout=20) -> bytes:
    headers = {"User-Agent": "ButterUp/1.0 (+local materialize)"}
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    return r.content

class Command(BaseCommand):
    help = "Download remote product images to /media/products and link them to Product.image and ImageAsset.file."

    def add_arguments(self, parser):
        parser.add_argument("--only-missing", action="store_true", help="Skip products that already have a local Product.image.")
        parser.add_argument("--limit", type=int, default=None)

    @transaction.atomic
    def handle(self, *args, **options):
        qs = Product.objects.filter(is_active=True).order_by("id")
        if options.get("only_missing"):
            qs = qs.filter(image__isnull=True)
        if options.get("limit"):
            qs = qs[:options["limit"]]

        done = 0
        for p in qs:
            # If already has local file, skip
            if p.image and hasattr(p.image, "url"):
                continue

            # First, check if we have existing ImageAssets with files to link
            existing_asset = p.image_assets.filter(is_active=True, file__isnull=False).first()
            if existing_asset:
                # Link existing file to Product.image
                try:
                    p.image.save(
                        os.path.basename(existing_asset.file.name),
                        existing_asset.file.file,
                        save=True
                    )
                    done += 1
                    self.stdout.write(f"[link] {p.id} {p} -> {p.image.url}")
                    continue
                except Exception as e:
                    self.stderr.write(f"[skip] {p.id} {p} – link failed: {e}")

            # If no existing file, try to download from remote source
            src_url = None
            pi = p.primary_image  # your property that ranks STORE > GS1 > OFF > UPLOAD
            if pi and not pi.file and pi.url:
                src_url = pi.url
            if not src_url:
                ia = p.image_assets.filter(is_active=True).order_by("-last_fetched_at").first()
                if ia and not ia.file and ia.url:
                    src_url = ia.url

            if not src_url:
                # No remote source available
                continue

            try:
                blob = _download(src_url)
            except Exception as e:
                self.stderr.write(f"[skip] {p.id} {p} – download failed: {e}")
                continue

            ch = _checksum(blob)

            # Check if an ImageAsset with this checksum already exists for this product
            asset = p.image_assets.filter(checksum=ch).first()

            if not asset:
                # Reuse primary image asset if exists, else create one
                asset = (pi if pi and pi.product_id == p.id else None) or p.image_assets.filter(is_active=True).first() or ImageAsset(product=p)
                fname = _canonical_name(p, src_url)
                # Save file to asset
                asset.file.save(fname, ContentFile(blob), save=False)
                asset.checksum = ch
                asset.is_active = True
                if not asset.source:
                    asset.source = "STORE"
                if not asset.url:
                    asset.url = src_url
                asset.save()

            # Set the product.image to the file so serializers prefer local
            if not p.image:
                # Use the saved file from asset
                p.image.save(os.path.basename(asset.file.name), asset.file.file, save=True)

            done += 1
            self.stdout.write(f"[ok]  {p.id} {p} -> {p.image.url}")

        self.stdout.write(self.style.SUCCESS(f"Materialized images for {done} products."))
