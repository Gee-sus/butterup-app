"""
Open Food Facts (OFF) API client for fetching product data with caching.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import requests
from django.conf import settings
from django.core.cache import caches

logger = logging.getLogger(__name__)

_CACHE_SENTINEL = object()

COMMON_NUTRIMENT_KEYS = [
    "energy-kcal_100g",
    "energy-kj_100g",
    "fat_100g",
    "saturated-fat_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
]

DEFAULT_PRODUCT_FIELDS: Tuple[str, ...] = (
    "code",
    "name",
    "brand",
    "quantity",
    "nutriScore",
    "nutriments",
    "image",
)

SEARCH_DEFAULT_FIELDS: Tuple[str, ...] = (
    "code",
    "name",
    "brand",
    "image",
)


class OFFClient:
    """Client for the Open Food Facts API."""

    def __init__(self) -> None:
        self.base_url: str = getattr(settings, "OFF_BASE", "https://world.openfoodfacts.org")
        self.user_agent: str = getattr(
            settings, "OFF_USER_AGENT", "ButterUp/0.1 (contact: support@butterup.nz)"
        )
        connect_timeout = float(getattr(settings, "OFF_CONNECT_TIMEOUT", 3.0))
        read_timeout = float(getattr(settings, "OFF_READ_TIMEOUT", 10.0))
        self.timeout: Tuple[float, float] = (connect_timeout, read_timeout)
        self.max_retries: int = 2
        self.retry_backoff: float = 0.5
        self.cache_timeout: int = int(getattr(settings, "OFF_CACHE_TIMEOUT", 3600))
        self.cache_prefix: str = getattr(settings, "OFF_CACHE_PREFIX", "off-cache")
        self.cache = caches["default"]

    # ------------------------------------------------------------------ #
    # Public API methods
    # ------------------------------------------------------------------ #
    def get_product(
        self,
        code: str,
        *,
        fields: Optional[Sequence[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Fetch a single product and normalise the payload."""
        if not self._validate_gtin(code):
            logger.warning("Attempted to fetch OFF product with invalid code %s", code)
            return None

        requested_fields = self._normalize_requested_fields(fields)
        include_nutriments = requested_fields is None or "nutriments" in requested_fields
        off_fields = self._off_fields_for_product(include_nutriments=include_nutriments)

        raw_payload = self._fetch_product_raw(code, off_fields=off_fields)
        if not raw_payload or raw_payload.get("status") != 1:
            return None

        product = raw_payload.get("product") or {}
        normalized = self._normalize_product(
            product,
            include_nutriments=include_nutriments,
            fallback_code=code,
        )

        return self._filter_fields(normalized, requested_fields, DEFAULT_PRODUCT_FIELDS)

    def search_products(
        self,
        query: str,
        *,
        page: int = 1,
        page_size: int = 20,
        brands: Optional[str] = None,
        categories: Optional[str] = None,
        fields: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        """Search products in OFF returning a minimal, paginated response."""
        requested_fields = self._normalize_requested_fields(fields)
        include_nutriments = requested_fields is not None and "nutriments" in requested_fields
        off_fields = self._off_fields_for_search(include_nutriments=include_nutriments)

        params: Dict[str, Any] = {
            "search_terms": query,
            "page": page,
            "page_size": page_size,
            "json": 1,
        }
        if brands:
            params["brands"] = brands
        if categories:
            params["categories"] = categories
        if off_fields:
            params["fields"] = ",".join(off_fields)

        data = self._request("/cgi/search.pl", params=params) or {}
        products = data.get("products") or []
        normalized_items = []

        for product in products:
            normalized = self._normalize_product(
                product,
                include_nutriments=include_nutriments,
                fallback_code=None,
            )
            filtered = self._filter_fields(normalized, requested_fields, SEARCH_DEFAULT_FIELDS)
            normalized_items.append(filtered)

        return {
            "count": data.get("count", 0),
            "page": data.get("page", page),
            "page_size": data.get("page_size", page_size),
            "items": normalized_items,
        }

    def get_products_batch(
        self,
        codes: Sequence[str],
        *,
        fields: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        """Fetch multiple products while honouring caching."""
        requested_fields = self._normalize_requested_fields(fields)
        include_nutriments = requested_fields is None or "nutriments" in requested_fields

        items: List[Dict[str, Any]] = []
        not_found: List[str] = []
        invalid: List[str] = []
        seen: set[str] = set()

        for code in codes:
            code_str = (code or "").strip()
            if not code_str or code_str in seen:
                continue
            seen.add(code_str)

            if not self._validate_gtin(code_str):
                invalid.append(code_str)
                continue

            product = self.get_product(code_str, fields=fields)
            if product:
                items.append(product)
            else:
                not_found.append(code_str)

        response: Dict[str, Any] = {"items": items, "not_found": not_found}
        if invalid:
            response["invalid"] = invalid
        return response

    def get_image_url_by_gtin(self, gtin: str) -> Optional[str]:
        """Backwards-compatible helper used elsewhere in the project."""
        product = self.get_product(gtin, fields=["image"])
        if product:
            return product.get("image")
        return None

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _fetch_product_raw(
        self,
        code: str,
        *,
        off_fields: Optional[Iterable[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        params = {}
        if off_fields:
            params["fields"] = ",".join(sorted(set(off_fields)))
        return self._request(f"/api/v0/product/{code}.json", params=params)

    def _request(self, path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        params = params or {}
        cache_key = self._build_cache_key(path, params)
        cached = self.cache.get(cache_key, _CACHE_SENTINEL)
        if cached is not _CACHE_SENTINEL:
            return cached

        url = f"{self.base_url}{path}"
        headers = {"User-Agent": self.user_agent}
        last_exception: Optional[BaseException] = None

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.get(url, params=params, headers=headers, timeout=self.timeout)

                if response.status_code == 404:
                    logger.info("OFF returned 404 for %s with params=%s", path, params)
                    self.cache.set(cache_key, None, self.cache_timeout)
                    return None

                if 500 <= response.status_code < 600:
                    logger.warning(
                        "OFF server error (%s) for %s params=%s attempt=%s",
                        response.status_code,
                        path,
                        params,
                        attempt + 1,
                    )
                    if attempt < self.max_retries:
                        time.sleep(self.retry_backoff * (attempt + 1))
                        continue
                    self.cache.set(cache_key, None, self.cache_timeout)
                    return None

                if response.status_code >= 400:
                    logger.error(
                        "OFF request failed with status %s for %s params=%s",
                        response.status_code,
                        path,
                        params,
                    )
                    self.cache.set(cache_key, None, self.cache_timeout)
                    return None

                data = response.json()
                self.cache.set(cache_key, data, self.cache_timeout)
                return data

            except requests.exceptions.Timeout as exc:
                last_exception = exc
                logger.warning(
                    "Timeout contacting OFF (%s) for %s params=%s attempt=%s",
                    exc,
                    path,
                    params,
                    attempt + 1,
                )
                if attempt < self.max_retries:
                    time.sleep(self.retry_backoff * (attempt + 1))
                    continue
            except requests.exceptions.RequestException as exc:
                last_exception = exc
                logger.error(
                    "Request error contacting OFF for %s params=%s: %s",
                    path,
                    params,
                    exc,
                )
                break
            except ValueError as exc:
                last_exception = exc
                logger.error("Failed to decode OFF response for %s params=%s: %s", path, params, exc)
                break

        if last_exception:
            logger.debug("OFF request giving up after exception: %s", last_exception)
        self.cache.set(cache_key, None, self.cache_timeout)
        return None

    def _build_cache_key(self, path: str, params: Dict[str, Any]) -> str:
        canonical_params: Dict[str, Any] = {}
        for key, value in params.items():
            if isinstance(value, (list, tuple)):
                canonical_params[key] = list(value)
            else:
                canonical_params[key] = value
        payload = {"path": path, "params": canonical_params}
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        return f"{self.cache_prefix}:{digest}"

    def _normalize_requested_fields(
        self,
        fields: Optional[Sequence[str]],
    ) -> Optional[List[str]]:
        if not fields:
            return None

        lookup = {field.lower(): field for field in DEFAULT_PRODUCT_FIELDS}
        normalized: List[str] = []
        for value in fields:
            key = (value or "").strip().lower()
            if not key:
                continue
            canonical = lookup.get(key)
            if canonical and canonical not in normalized:
                normalized.append(canonical)
        return normalized or None

    def _filter_fields(
        self,
        payload: Dict[str, Any],
        requested_fields: Optional[Sequence[str]],
        default_fields: Sequence[str],
    ) -> Dict[str, Any]:
        if requested_fields is None:
            field_order: List[str] = list(default_fields)
        else:
            field_order = ["code"]
            for field in requested_fields:
                if field != "code":
                    field_order.append(field)

        filtered: Dict[str, Any] = {}
        for field in field_order:
            if field in filtered:
                continue
            if field == "code":
                filtered[field] = payload.get("code")
            elif field in payload:
                filtered[field] = payload[field]
        return filtered

    def _off_fields_for_product(self, *, include_nutriments: bool) -> List[str]:
        base_fields = [
            "code",
            "product_name",
            "product_name_en",
            "generic_name",
            "generic_name_en",
            "brands",
            "brands_tags",
            "quantity",
            "nutriscore_grade",
            "image_front_url",
            "image_url",
            "image_small_url",
        ]
        if include_nutriments:
            base_fields.append("nutriments")
        return base_fields

    def _off_fields_for_search(self, *, include_nutriments: bool) -> List[str]:
        base_fields = [
            "code",
            "product_name",
            "product_name_en",
            "brands",
            "brands_tags",
            "image_front_url",
            "image_url",
            "image_small_url",
        ]
        if include_nutriments:
            base_fields.append("nutriments")
        return base_fields

    def _normalize_product(
        self,
        product: Dict[str, Any],
        *,
        include_nutriments: bool,
        fallback_code: Optional[str],
    ) -> Dict[str, Any]:
        code = (product.get("code") or fallback_code or "").strip()
        name = (
            (product.get("product_name_en") or "").strip()
            or (product.get("product_name") or "").strip()
            or (product.get("generic_name_en") or "").strip()
            or (product.get("generic_name") or "").strip()
        ) or None

        brand = self._extract_brand(product)
        quantity = product.get("quantity") or None
        nutriscore = product.get("nutriscore_grade")
        if nutriscore:
            nutriscore = str(nutriscore).upper()

        payload: Dict[str, Any] = {
            "code": code,
            "name": name,
            "brand": brand,
            "quantity": quantity,
            "nutriScore": nutriscore,
            "image": self._extract_image_url(product),
        }

        if include_nutriments:
            payload["nutriments"] = self._extract_nutriments(product)

        return payload

    def _extract_brand(self, product: Dict[str, Any]) -> Optional[str]:
        brands = product.get("brands")
        if isinstance(brands, str):
            for piece in brands.split(","):
                cleaned = piece.strip()
                if cleaned:
                    return cleaned

        tags = product.get("brands_tags")
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
        if isinstance(tags, list):
            for tag in tags:
                if isinstance(tag, str) and tag.strip():
                    return tag.strip()
        return None

    def _extract_image_url(self, product: Dict[str, Any]) -> Optional[str]:
        for key in ("image_front_url", "image_url", "image_small_url"):
            value = product.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _extract_nutriments(self, product: Dict[str, Any]) -> Dict[str, Any]:
        raw = product.get("nutriments") or {}
        result: Dict[str, Any] = {}
        for key in COMMON_NUTRIMENT_KEYS:
            value = raw.get(key)
            converted = self._to_number(value)
            if converted is not None:
                normalized_key = key.replace("-", "_")
                result[normalized_key] = converted
        return result

    def _to_number(self, value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _validate_gtin(self, gtin: str) -> bool:
        if not gtin or not gtin.isdigit():
            return False
        return len(gtin) in {8, 12, 13, 14}
