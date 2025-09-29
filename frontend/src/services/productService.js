import api, { API_ORIGIN } from '../api/client';

// Request deduplication cache
const inflightRequests = new Map();

// Helper functions
const first = (...xs) => xs.find(v => v !== undefined && v !== null);

const toNumber = (v) => {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const centsToDollars = (c) => (c === undefined || c === null ? null : toNumber(c) / 100);

const slugify = (text) => {
  if (!text) return 'unknown';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

// Absolutize relative paths ("/media/...") to "http://127.0.0.1:8000/media/..."
function absolutize(url) {
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url) || /^data:|^blob:/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Fast candidate list from common keys
function quickImageCandidates(p) {
  return [
    p.image_url,
    p.image,
    p.imageUrl,
    p.photo_url,
    p.thumbnail_url,
    p.primary_image?.url,
    p.primary_image?.file_url,
    p.images?.[0]?.url,
    p.media?.images?.[0]?.url,
    p.picture,
    p.photo,
  ];
}

// Deep scan: collect strings that look like image URLs or image-y fields
function deepImageSearch(obj, limit = 200) {
  const out = [];
  const stack = [obj];
  const seen = new Set();
  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    for (const [k, v] of Object.entries(cur)) {
      if (typeof v === "string") {
        const s = v;
        const looksLikeFile = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(s);
        const looksLikeMedia = /^\/?media\//i.test(s) || /images?\//i.test(s);
        const keyLooksImage = /(image|img|photo|thumbnail|thumb|picture)/i.test(k);
        if (looksLikeFile || looksLikeMedia || keyLooksImage) out.push(s);
      } else if (Array.isArray(v)) {
        for (const it of v) stack.push(it);
      } else if (typeof v === "object" && v) {
        stack.push(v);
      }
    }
  }
  // De-dupe while preserving order
  return [...new Set(out)];
}

function pickImageUrl(p) {
  // 1) Try known keys first
  for (const c of quickImageCandidates(p)) {
    if (!c) continue;
    const abs = absolutize(c);
    if (abs && !/placeholder/i.test(abs)) return abs;
  }
  // 2) Deep scan
  const candidates = deepImageSearch(p);
  for (const c of candidates) {
    const abs = absolutize(c);
    if (abs && !/placeholder/i.test(abs)) return abs;
  }
  return null;
}

// Find price for a specific store, trying multiple data structures
function findPriceForStore(p, storeId) {
  // Try flat price fields first
  const flatPrice = first(
    toNumber(p.price),
    toNumber(p.current_price),
    toNumber(p.store_price?.price),
    toNumber(p.store?.price),
    toNumber(p.min_price),
    centsToDollars(p.price_cents),
    centsToDollars(p.min_price_cents)
  );
  
  if (flatPrice !== null) return flatPrice;
  
  // Try array-based price structures
  const priceArrays = [
    p.prices,
    p.store_prices,
    p.offers,
    p.price_history,
    p.variants
  ].filter(Array.isArray);
  
  for (const priceArray of priceArrays) {
    for (const priceItem of priceArray) {
      // Check if this price item matches our store
      if (priceItem.store_id === storeId || 
          priceItem.store === storeId ||
          priceItem.storeId === storeId) {
        const price = first(
          toNumber(priceItem.price),
          toNumber(priceItem.current_price),
          toNumber(priceItem.amount),
          centsToDollars(priceItem.price_cents)
        );
        if (price !== null) return price;
      }
    }
  }
  
  // Try object-based price maps
  const priceMaps = [
    p.price_by_store,
    p.store_prices_map,
    p.pricing
  ].filter(obj => obj && typeof obj === 'object');
  
  for (const priceMap of priceMaps) {
    const price = first(
      toNumber(priceMap[storeId]),
      toNumber(priceMap[`store_${storeId}`]),
      toNumber(priceMap[`${storeId}`])
    );
    if (price !== null) return price;
  }
  
  return null;
}

// Find grams from various fields and text parsing
function findGrams(p) {
  // Try direct gram fields first
  const directGrams = first(
    toNumber(p.grams),
    toNumber(p.size_g),
    toNumber(p.size_grams),
    toNumber(p.net_weight_g),
    toNumber(p.pack_size_g),
    toNumber(p.weight_g),
    toNumber(p.weight),
    toNumber(p.size)
  );
  
  if (directGrams !== null) return directGrams;
  
  // Try parsing from text fields
  const textFields = [
    p.size_text,
    p.name,
    p.title,
    p.description,
    p.variant,
    p.package_size
  ].filter(Boolean);
  
  const combinedText = textFields.join(' ');
  
  // Try various gram patterns
  const gramPatterns = [
    /\b(\d{2,4})\s*g\b/i,           // "500g", "250 g"
    /\b(\d{2,4})\s*grams?\b/i,      // "500 grams", "250 gram"
    /\b(\d{2,4})\s*gr\b/i,          // "500gr"
    /(\d{2,4})\s*gram/i,            // "500gram"
    /\b(\d+\.?\d*)\s*kg\b/i,        // "0.5kg", "1kg" (convert to grams)
    /\b(\d+\.?\d*)\s*kilo\b/i       // "0.5kilo", "1kilo" (convert to grams)
  ];
  
  for (const pattern of gramPatterns) {
    const match = pattern.exec(combinedText);
    if (match) {
      let grams = toNumber(match[1]);
      if (grams !== null) {
        // Convert kg to grams if needed
        if (pattern.source.includes('kg') || pattern.source.includes('kilo')) {
          grams = grams * 1000;
        }
        return grams;
      }
    }
  }
  
  return null;
}

export function normalizeProduct(p, storeId = null) {
  // Find price for specific store or fallback to general price
  const price = storeId ? findPriceForStore(p, storeId) : first(
    toNumber(p.price),
    toNumber(p.current_price),
    toNumber(p.store_price?.price),
    toNumber(p.store?.price),
    toNumber(p.min_price),
    centsToDollars(p.price_cents),
    centsToDollars(p.min_price_cents)
  );

  // Find grams using comprehensive search
  const grams = findGrams(p);

  // Build name from available fields
  const name = p.name || p.title || [p.brand, p.variant, 'Butter'].filter(Boolean).join(' ');

  // Build brand
  const brand = p.brand || p.brand_name || null;

  // Build image URL using deep search and absolutization
  const chosen = pickImageUrl(p);
  const imageUrl =
    chosen ||
    (p.brand ? `/assets/brands/${slugify(p.brand)}.png` : null) ||
    "/placeholder.png";

  // Generate slug from name, brand, and grams for unique identification
  const slugParts = [brand, name, grams ? `${grams}g` : null].filter(Boolean);
  const slug = slugify(slugParts.join(' '));

  // Calculate unit price per 100g
  const unitPricePer100g = price && grams ? +(price / grams * 100).toFixed(2) : null;

  return {
    id: p.id,
    slug,
    name,
    brand,
    price,
    grams,
    imageUrl,
    unitPricePer100g,
    storeId: p.store_id || p.store || storeId,
    raw: p, // keep original for debugging
  };
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function getProducts(params = {}) {
  // Create cache key from URL and params
  const cacheKey = `/products/${JSON.stringify(params)}`;
  
  // Return existing promise if request is already inflight
  if (inflightRequests.has(cacheKey)) {
    console.log('getProducts: returning cached promise for', cacheKey);
    return inflightRequests.get(cacheKey);
  }
  
  // Create new request promise
  const requestPromise = (async () => {
    try {
      const r = await api.get('/products/', { params });
      const list = extractList(r.data).map(p => normalizeProduct(p, params.store));
      console.log('getProducts ->', list.length, 'first:', list[0]);
      console.log('img sample:', list.slice(0,5).map(p => p.imageUrl));
      return list;
    } finally {
      // Clean up inflight request
      inflightRequests.delete(cacheKey);
    }
  })();
  
  // Cache the promise
  inflightRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}

/**
 * Product service for fetching data from the backend API
 */
export const productService = {
  /**
   * Fetch products with optional parameters
   * @param {Object} params - Query parameters (e.g., { store: storeId, package_type: 'Block' })
   * @returns {Promise<Array>} Array of normalized product objects
   */
  async getProducts(params = {}) {
    return getProducts(params);
  },
  /**
   * Fetch all products from the API
   * @returns {Promise<Array>} Array of product objects
   */
  async getAllProducts(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching all products (attempt ${i + 1})`);
        return await this.getProducts();
      } catch (error) {
        console.error(`Error fetching products (attempt ${i + 1}):`, error);
        console.error('Error details:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.message);
        
        if (i === retries - 1) {
          // Last attempt failed
          throw new Error(`Failed to fetch products after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  },

  /**
   * Fetch products filtered by package type (e.g., 'Block', 'Spreadable', 'Dairy-free')
   * @param {string} packageType - The package type to filter by
   * @returns {Promise<Array>} Array of filtered product objects
   */
  async getProductsByType(packageType) {
    try {
      return await this.getProducts({ package_type: packageType });
    } catch (error) {
      console.error(`Error fetching products by type ${packageType}:`, error);
      throw error;
    }
  },

  /**
   * Fetch products filtered by brand
   * @param {string} brand - The brand to filter by
   * @returns {Promise<Array>} Array of filtered product objects
   */
  async getProductsByBrand(brand) {
    try {
      return await this.getProducts({ brand__icontains: brand });
    } catch (error) {
      console.error(`Error fetching products by brand ${brand}:`, error);
      throw error;
    }
  },

  /**
   * Fetch spreadable butter products
   * @returns {Promise<Array>} Array of spreadable butter products
   */
  async getSpreadableButters() {
    try {
      return await this.getProducts({ package_type: 'Spreadable' });
    } catch (error) {
      console.error('Error fetching spreadable butters:', error);
      throw error;
    }
  },

  /**
   * Fetch block butter products
   * @returns {Promise<Array>} Array of block butter products
   */
  async getBlockButters() {
    try {
      return await this.getProducts({ package_type: 'Block' });
    } catch (error) {
      console.error('Error fetching block butters:', error);
      throw error;
    }
  },

  /**
   * Fetch dairy-free butter products
   * @returns {Promise<Array>} Array of dairy-free butter products
   */
  async getDairyFreeButters() {
    try {
      return await this.getProducts({ package_type: 'Dairy-free' });
    } catch (error) {
      console.error('Error fetching dairy-free butters:', error);
      throw error;
    }
  },

  /**
   * Fetch products available at a specific store
   * @param {number|string} storeId - The store ID
   * @returns {Promise<Object>} Object containing store info and products
   */
  async getProductsByStore(storeId) {
    try {
      console.log(`Fetching products for store ${storeId}`);
      const response = await api.get(`/products/by-store/${storeId}/`);
      console.log('Store products response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching products for store ${storeId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch products by store and package type
   * @param {number|string} storeId - The store ID
   * @param {string} packageType - The package type to filter by
   * @returns {Promise<Array>} Array of filtered products
   */
  async getProductsByStoreAndType(storeId, packageType) {
    try {
      const storeData = await this.getProductsByStore(storeId);
      const products = storeData.products || [];
      
      if (packageType === 'all') {
        return products;
      }
      
      return products.filter(product => product.package_type === packageType);
    } catch (error) {
      console.error(`Error fetching products for store ${storeId} and type ${packageType}:`, error);
      throw error;
    }
  }
};

export default productService;
