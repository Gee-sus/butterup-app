from __future__ import annotations

from io import BytesIO
from typing import Dict, List

import pytesseract
from PIL import Image
from rapidfuzz import fuzz, process

from photo_compare.models import Product

MAX_LONG_SIDE = 1280


def resize_image_bytes(image_bytes: bytes) -> bytes:
    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert('RGB')
        width, height = image.size
        if max(width, height) > MAX_LONG_SIDE:
            if width >= height:
                new_width = MAX_LONG_SIDE
                new_height = int(MAX_LONG_SIDE / width * height)
            else:
                new_height = MAX_LONG_SIDE
                new_width = int(MAX_LONG_SIDE / height * width)
            image = image.resize((new_width, new_height))
        buffer = BytesIO()
        image.save(buffer, format='JPEG', optimize=True, quality=85)
        return buffer.getvalue()


def extract_lines(image_bytes: bytes) -> List[str]:
    resized = resize_image_bytes(image_bytes)
    with Image.open(BytesIO(resized)) as image:
        try:
            text = pytesseract.image_to_string(image)
        except Exception:
            text = ''
    seen = set()
    lines: List[str] = []
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned:
            key = cleaned.lower()
            if key not in seen:
                seen.add(key)
                lines.append(cleaned)
    return lines


def _choices() -> tuple[List[tuple[str, int]], Dict[int, str]]:
    choices: List[tuple[str, int]] = []
    lookup: Dict[int, str] = {}
    for product in Product.objects.all():
        lookup[product.id] = str(product)
        for alias in product.aliases():
            alias_clean = alias.strip()
            if alias_clean:
                choices.append((alias_clean.lower(), product.id))
    return choices, lookup


def guess_product(image_bytes: bytes) -> Dict[str, object]:
    try:
        lines = extract_lines(image_bytes)
    except Exception:
        lines = []

    haystack = ' '.join(lines).lower()
    choices, lookup = _choices()

    result: Dict[str, object] = {
        'score': 0.0,
        'product_id': None,
        'product_name': None,
        'lines': lines,
    }

    if not haystack or not choices:
        suggestions = [
            {'product_id': pid, 'name': name}
            for pid, name in list(lookup.items())[:3]
        ]
        if suggestions:
            result['suggestions'] = suggestions
        return result

    try:
        best = process.extractOne(
            haystack,
            choices,
            scorer=fuzz.partial_ratio,
        )
    except Exception:
        best = None

    matches: List[tuple[str, float, int]] = []
    try:
        matches = process.extract(
            haystack,
            choices,
            scorer=fuzz.partial_ratio,
            limit=10,
        )
    except Exception:
        pass

    suggestions: List[Dict[str, object]] = []
    seen_products: set[int] = set()
    for alias, score, product_id in matches:
        if product_id in seen_products:
            continue
        seen_products.add(product_id)
        suggestions.append({
            'product_id': product_id,
            'name': lookup.get(product_id, alias),
            'score': float(score),
        })
        if len(suggestions) >= 3:
            break
    if suggestions:
        result['suggestions'] = [
            {'product_id': item['product_id'], 'name': item['name']}
            for item in suggestions
        ]

    if best:
        _, score, product_id = best
        result['score'] = float(score)
        if product_id in lookup:
            result['product_id'] = product_id if score >= 0 else None
            result['product_name'] = lookup[product_id]

    return result
