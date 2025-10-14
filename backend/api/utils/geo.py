"""
Geospatial helper functions for store proximity checks.
"""

import math
from typing import Iterable, Optional, Tuple

EARTH_R = 6_371_000.0  # meters


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    """Return distance in meters between two lat/lon coordinates (accepts Decimal/str/float)."""
    lat1 = float(lat1)
    lon1 = float(lon1)
    lat2 = float(lat2)
    lon2 = float(lon2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def nearest_store(stores: Iterable, lat: float, lon: float, radius_m: float = 300.0) -> Tuple[Optional[object], Optional[float]]:
    """Return the closest store within the provided radius, otherwise (None, None)."""
    best = (None, None)
    for store in stores:
        if getattr(store, "latitude", None) is None or getattr(store, "longitude", None) is None:
            continue
        dist = haversine_m(lat, lon, store.latitude, store.longitude)
        if best[0] is None or dist < best[1]:
            best = (store, dist)
    if best[0] and best[1] <= radius_m:
        return best
    return (None, None)
