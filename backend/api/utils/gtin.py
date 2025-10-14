"""
GTIN normalization and validation helpers.
"""

import re


def _check_digit_mod10(body: str) -> str:
    """Compute the GS1 Mod-10 checksum for a GTIN body."""
    s, w = 0, 3
    for d in reversed(body):
        s += int(d) * w
        w = 1 if w == 3 else 3
    return str((10 - (s % 10)) % 10)


def normalize_gtin(raw: str) -> str:
    """
    Normalize raw input into a canonical 14-digit GTIN.

    Raises:
        ValueError: If the length is unsupported or checksum invalid.
    """
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) == 12:  # UPC-A -> pad to EAN-13
        digits = "0" + digits
    if len(digits) not in (8, 13, 14):
        raise ValueError("Unsupported GTIN length")
    if _check_digit_mod10(digits[:-1]) != digits[-1]:
        raise ValueError("Invalid GTIN check digit")
    return digits.zfill(14)
