/**
 * Image utility functions for URL normalization and product deduplication
 */

/**
 * Normalize image URL by removing query parameters and forcing HTTPS
 * @param {string} url - Image URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizeImageUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    u.search = ""; // remove ?v=...
    return u.toString().replace(/^http:/, "https:");
  } catch {
    return String(url).split("?")[0].replace(/^http:/, "https:");
  }
}

/**
 * Deduplicate products by normalized image URL and grams
 * Groups products by `${normalizedImage}|${grams}` and keeps the cheapest item
 * Only deduplicates actual product images, not brand fallback images
 * @param {Array} items - Array of product objects with imageUrl, grams, and price properties
 * @returns {Array} Deduplicated array with cheapest item per unique image+grams combination
 */
export function dedupeByImageAndSize(items) {
  const best = new Map(); // key = normalizedImage|grams
  for (const p of items) {
    const img = normalizeImageUrl(p.imageUrl) || "noimg";
    
    // Don't deduplicate brand fallback images or static assets
    const isBrandFallback = img.includes('/static/brands/') || img.includes('/assets/brands/');
    const isPlaceholder = img.includes('placeholder') || img.includes('noimg');
    
    // For brand fallbacks and placeholders, use product ID to ensure uniqueness
    const key = (isBrandFallback || isPlaceholder) 
      ? `${p.id}|${img}|${p.grams ?? ""}` 
      : `${img}|${p.grams ?? ""}`;
    
    const current = best.get(key);
    const a = p.price ?? Infinity;
    const b = current?.price ?? Infinity;
    if (!current || a < b) best.set(key, p);
  }
  return [...best.values()];
}