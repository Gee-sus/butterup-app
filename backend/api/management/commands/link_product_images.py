from pathlib import Path
import re, glob
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils.text import slugify
from api.models import Product


def grams_from_text(s):
    m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g)\b", s or "", re.I)
    if not m: return None
    v = float(m.group(1)); u = m.group(2).lower()
    return int(round(v*1000)) if u=="kg" else int(round(v))


class Command(BaseCommand):
    help = "Link files in media/products to Product.image based on brand/name/grams"

    def handle(self, *args, **opts):
        media_dir = Path(settings.MEDIA_ROOT) / "products"
        if not media_dir.exists():
            self.stderr.write(f"Missing: {media_dir}")
            return

        linked = 0
        for p in Product.objects.all():
            if p.image:
                continue
            grams = getattr(p, "weight_grams", None) or grams_from_text(p.name)
            base = " ".join([x for x in [p.brand, p.name, f"{grams}g" if grams else None] if x])
            key  = slugify(base)
            patterns = [f"{key}.*", f"*{key}*.*"]
            candidates = []
            for pat in patterns:
                candidates += glob.glob(str(media_dir / pat))
            if not candidates:
                continue
            candidates.sort()
            file_path = Path(candidates[0])
            rel = f"products/{file_path.name}"
            p.image.name = rel
            p.save(update_fields=["image"])
            linked += 1
            self.stdout.write(f"Linked: {p} -> {rel}")

        self.stdout.write(self.style.SUCCESS(f"Linked {linked} product images"))
