# backend/api/management/commands/import_images_to_assets.py

import os
from pathlib import Path
from django.core.files import File
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import ImageAsset


class Command(BaseCommand):
    """
    Import images from a folder into ImageAsset, setting the SKU from the filename.

    This does NOT link the images to Products. It simply creates ImageAsset rows
    with (sku, file). You can later attach them to Products however you like.

    Examples:
      python manage.py import_images_to_assets --dir backend/media/products
      python manage.py import_images_to_assets --dir C:\\path\\to\\images --exts jpg,png --sku-from name_before_underscore
    """
    help = "Import images from a folder into ImageAsset (sets SKU from filename)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dir",
            required=True,
            help="Folder to scan for images (can be absolute or relative to project root).",
        )
        parser.add_argument(
            "--exts",
            default="jpg,jpeg,png,webp",
            help="Comma-separated list of extensions to import (default: jpg,jpeg,png,webp).",
        )
        parser.add_argument(
            "--sku-from",
            default="stem",
            choices=["stem", "name_before_dash", "name_before_underscore"],
            help="How to derive SKU from filename (default: stem).",
        )
        parser.add_argument(
            "--skip-existing",
            action="store_true",
            help="Skip if an ImageAsset already exists with the same stored file path (products/<filename>).",
        )

    def handle(self, *args, **opts):
        folder = Path(opts["dir"]).resolve()
        if not folder.exists() or not folder.is_dir():
            self.stderr.write(self.style.ERROR(f"Folder not found: {folder}"))
            return

        exts = tuple("." + e.strip().lower() for e in opts["exts"].split(",") if e.strip())
        sku_mode = opts["sku_from"]
        skip_existing = opts["skip_existing"]

        # ImageField(upload_to='products/') → files will be stored under MEDIA_ROOT/products/
        storage_subdir = "products"

        count = 0
        scanned = 0

        for p in folder.rglob("*"):
            if not (p.is_file() and p.suffix.lower() in exts):
                continue

            scanned += 1
            stem = p.stem  # filename without extension

            if sku_mode == "name_before_dash":
                sku = stem.split("-", 1)[0]
            elif sku_mode == "name_before_underscore":
                sku = stem.split("_", 1)[0]
            else:
                sku = stem  # "stem" mode

            # If we want a simple check to avoid dupes by file path:
            target_rel_path = f"{storage_subdir}/{p.name}"

            if skip_existing and ImageAsset.objects.filter(file=target_rel_path).exists():
                self.stdout.write(f"Skip existing file: {target_rel_path}")
                continue

            # Save the file bytes into the ImageField storage
            with p.open("rb") as fh:
                asset = ImageAsset(sku=sku, is_active=True)
                # This will store it under MEDIA_ROOT/products/<filename>
                asset.file.save(p.name, File(fh), save=True)

            count += 1
            self.stdout.write(f"Imported {p.name} (sku={sku}) → {asset.file.name}")

        self.stdout.write(self.style.SUCCESS(f"Done. Scanned {scanned} files. Imported {count}."))
