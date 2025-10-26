import axios from 'axios';
import { API_URLS, API_BASE_URL } from '../config';
import { normalizeStoreName } from '../utils/stores';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`[axios] ✓ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.warn(`[axios] ✗ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    return Promise.reject(error);
  }
);

// Mock data - fallback when backend is not available
const mockProducts = [
  {
    id: 1,
    name: 'Anchor Butter 500g',
    brand: 'Anchor',
    price: 6.99,
    weight: '500g',
    store: "Pak'nSave",
    name_with_brand: 'Anchor Butter 500g',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop',
  },
  {
    id: 2,
    name: 'Mainland Butter 500g',
    brand: 'Mainland',
    price: 7.29,
    weight: '500g',
    store: 'Woolworths',
    name_with_brand: 'Mainland Butter 500g',
    image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop',
  },
  {
    id: 3,
    name: 'Lewis Road Creamery 250g',
    brand: 'Lewis Road',
    price: 5.49,
    weight: '250g',
    store: 'New World',
    name_with_brand: 'Lewis Road Creamery 250g',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop',
  },
  {
    id: 4,
    name: 'Pams Butter 500g',
    brand: 'Pams',
    price: 4.99,
    weight: '500g',
    store: "Pak'nSave",
    name_with_brand: 'Pams Butter 500g',
    image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop',
  },
  {
    id: 5,
    name: 'Organic Times 250g',
    brand: 'Organic Times',
    price: 8.99,
    weight: '250g',
    store: 'New World',
    name_with_brand: 'Organic Times 250g',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop',
  },
  {
    id: 6,
    name: 'Petit Normand 200g',
    brand: 'Petit Normand',
    price: 7.99,
    weight: '200g',
    store: 'Woolworths',
    name_with_brand: 'Petit Normand 200g',
    image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop',
  },
];

const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];

const OFF_FIELD_WHITELIST = ['code', 'name', 'brand', 'quantity', 'nutriScore', 'nutriments', 'image'] as const;
type OFFField = typeof OFF_FIELD_WHITELIST[number];

export interface OFFProduct {
  code: string;
  name?: string | null;
  brand?: string | null;
  quantity?: string | null;
  nutriScore?: string | null;
  nutriments?: Record<string, number>;
  image?: string | null;
}

export interface OFFSearchHit {
  code: string;
  name?: string | null;
  brand?: string | null;
  image?: string | null;
  [key: string]: unknown;
}

export interface OFFSearchResponse {
  count: number;
  page: number;
  page_size: number;
  items: OFFSearchHit[];
}

export interface OFFBatchResponse {
  items: OFFProduct[];
  not_found: string[];
  invalid?: string[];
}

interface ApiResult<T> {
  data: T | null;
  error?: Error;
  status?: number;
}

const normaliseOffFields = (fields?: string[]): OFFField[] => {
  if (!fields) return [];
  const allowed = new Set<OFFField>(OFF_FIELD_WHITELIST);
  const result: OFFField[] = [];
  fields.forEach((field) => {
    const trimmed = (field ?? '').toString().trim() as OFFField;
    if (allowed.has(trimmed) && !result.includes(trimmed)) {
      result.push(trimmed);
    }
  });
  return result;
};

const buildQueryString = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.append(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const parseJsonQuietly = async <T>(response: Response): Promise<T | null> => {
  try {
    return await response.json();
  } catch (_err) {
    return null;
  }
};

const buildErrorFromResponse = async (response: Response): Promise<Error> => {
  const payload = await parseJsonQuietly<Record<string, unknown>>(response);
  const detail = typeof payload === 'object' && payload
    ? (payload.detail || payload.error || payload.message)
    : undefined;
  const message = typeof detail === 'string' && detail.trim().length > 0
    ? detail.trim()
    : `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
  return new Error(message);
};

export const healthApi = {
  ping: async (): Promise<ApiResult<{ status: string }>> => {
    try {
      const response = await fetch(API_URLS.HEALTH);
      if (response.ok) {
        const data = await parseJsonQuietly<{ status: string }>(response);
        return { data: data ?? null, status: response.status };
      }
      const error = await buildErrorFromResponse(response);
      return { data: null, error, status: response.status };
    } catch (error) {
      console.warn('[healthApi] ping failed:', error);
      return { data: null, error: error as Error };
    }
  },
};

export const offApi = {
  getProduct: async (
    code: string,
    opts?: { fields?: string[]; signal?: AbortSignal },
  ): Promise<ApiResult<OFFProduct>> => {
    const normalizedCode = (code || '').trim();
    if (!normalizedCode) {
      return { data: null, error: new Error('Product code is required.') };
    }

    const fields = normaliseOffFields(opts?.fields);
    const url = `${API_URLS.OFF_PRODUCT}${encodeURIComponent(normalizedCode)}/`;
    try {
      const response = await fetch(`${url}${buildQueryString({ fields: fields.length ? fields.join(',') : undefined })}`, {
        signal: opts?.signal,
      });

      if (response.status === 404) {
        return { data: null, status: 404 };
      }

      if (!response.ok) {
        const error = await buildErrorFromResponse(response);
        return { data: null, error, status: response.status };
      }

      const payload = await parseJsonQuietly<OFFProduct>(response);
      return { data: payload, status: response.status };
    } catch (error) {
      console.warn('[offApi] getProduct failed:', error);
      return { data: null, error: error as Error };
    }
  },

  search: async (params: {
    query: string;
    page?: number;
    pageSize?: number;
    brands?: string;
    categories?: string;
    fields?: string[];
    signal?: AbortSignal;
  }): Promise<ApiResult<OFFSearchResponse>> => {
    const q = (params.query || '').trim();
    if (!q) {
      return { data: null, error: new Error('Search query is required.') };
    }

    const fields = normaliseOffFields(params.fields);
    const url = `${API_URLS.OFF_SEARCH}${buildQueryString({
      q,
      page: params.page ? Math.max(1, params.page).toString() : undefined,
      page_size: params.pageSize ? Math.max(1, params.pageSize).toString() : undefined,
      brands: params.brands?.trim() || undefined,
      categories: params.categories?.trim() || undefined,
      fields: fields.length ? fields.join(',') : undefined,
    })}`;

    try {
      const response = await fetch(url, { signal: params.signal });
      if (!response.ok) {
        const error = await buildErrorFromResponse(response);
        return { data: null, error, status: response.status };
      }

      const payload = await parseJsonQuietly<OFFSearchResponse>(response);
      return { data: payload, status: response.status };
    } catch (error) {
      console.warn('[offApi] search failed:', error);
      return { data: null, error: error as Error };
    }
  },

  batch: async (
    codes: string[],
    opts?: { fields?: string[]; signal?: AbortSignal },
  ): Promise<ApiResult<OFFBatchResponse>> => {
    const normalizedCodes = Array.isArray(codes)
      ? codes.map((code) => code.trim()).filter(Boolean)
      : [];

    if (!normalizedCodes.length) {
      return { data: null, error: new Error('At least one product code is required.') };
    }

    const fields = normaliseOffFields(opts?.fields);

    try {
      const response = await fetch(API_URLS.OFF_BATCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codes: normalizedCodes,
          ...(fields.length ? { fields } : {}),
        }),
        signal: opts?.signal,
      });

      if (!response.ok) {
        const error = await buildErrorFromResponse(response);
        return { data: null, error, status: response.status };
      }

      const payload = await parseJsonQuietly<OFFBatchResponse>(response);
      return { data: payload, status: response.status };
    } catch (error) {
      console.warn('[offApi] batch failed:', error);
      return { data: null, error: error as Error };
    }
  },
};

const buildHeaders = (guestUser?: string) => ({
  'Content-Type': 'application/json',
  ...(guestUser ? { 'X-ButterUp-User': guestUser } : {}),
});

const absolutizeImageUrl = (value?: string | null) => {
  if (!value) {
    return value;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const prefix = value.startsWith('/') ? '' : '/';
  // For now, return the value as-is since API_BASE_URL is not defined
  return `${prefix}${value}`;
};

const normaliseQuickCompareRows = (rows: any[]): any[] =>
  Array.isArray(rows)
    ? rows.map((row) => ({
        ...row,
        image_url: absolutizeImageUrl(row?.image_url),
        stores: Array.isArray(row?.stores)
          ? row.stores.map((store: any) => ({
              ...store,
              recorded_at: store?.recorded_at || null,
            }))
          : [],
      }))
    : []
;

const buildMockQuickCompare = () => {
  const byBrand = new Map<string, {
    brand_name: string;
    brand_display_name: string;
    image_url: string | null;
    stores: Map<string, { store: string; price: number | null; recorded_at: string | null }>;
  }>();

  const nowIso = new Date().toISOString();

  mockProducts.forEach((item) => {
    const brandDisplay = item.brand || item.name_with_brand || item.name;
    if (!brandDisplay) {
      return;
    }

    if (!byBrand.has(brandDisplay)) {
      const storeMap = new Map<string, { store: string; price: number | null; recorded_at: string | null }>();
      MAIN_STORES.forEach((storeLabel) => {
        storeMap.set(storeLabel, { store: storeLabel, price: null, recorded_at: null });
      });

      byBrand.set(brandDisplay, {
        brand_name: item.brand || brandDisplay,
        brand_display_name: brandDisplay,
        image_url: item.image_url || null,
        stores: storeMap,
      });
    }

    const entry = byBrand.get(brandDisplay)!;
    if (!entry.image_url) {
      entry.image_url = item.image_url || null;
    }

    // Normalize the store name from the mock data
    const storeLabel = normalizeStoreName(item.store || '');

    if (!storeLabel) {
      return;
    }

    const current = entry.stores.get(storeLabel);
    if (
      !current ||
      current.price === null ||
      ((item.price ?? Number.POSITIVE_INFINITY) <
        (current.price ?? Number.POSITIVE_INFINITY))
    ) {
      entry.stores.set(storeLabel, {
        store: storeLabel,
        price: item.price ?? null,
        recorded_at: nowIso,
      });
    }
  });

  return Array.from(byBrand.values()).map((entry) => {
    const stores = Array.from(entry.stores.values());
    const numericPrices = stores
      .map((s) => s.price)
      .filter((price): price is number => typeof price === 'number');

    return {
      brand_name: entry.brand_name,
      brand_display_name: entry.brand_display_name,
      image_url: entry.image_url,
      stores,
      cheapest_price: numericPrices.length > 0 ? Math.min(...numericPrices) : null,
    };
  });
};

export const testBackendConnection = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    console.log(`[api] Testing connection to: ${API_URLS.PRODUCTS}`);
    const response = await fetch(`${API_URLS.PRODUCTS}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('[api] Backend connection successful');
      return { connected: true };
    }

    console.log(`[api] Backend returned status: ${response.status}`);
    return { connected: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (error) {
    console.log('[api] Backend connection failed:', error);
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const userApi = {
  getProfile: async () => {
    try {
      console.log(`[api] Loading user profile from: ${API_URLS.PROFILE}`);
      const response = await api.get(API_URLS.PROFILE);
      
      console.log(`[api] Loaded user profile: ${response.data.name}`);
      return { data: response.data };
    } catch (error) {
      console.warn('[api] Profile API failed, using mock data:', error);
      return { data: { name: 'User', email: 'user@example.com', avatar_url: '', provider: 'local' } };
    }
  },
};

export type ProductRatingPayload = {
  overall_score: number;
  cost_score: number;
  texture_score: number;
  recipe_score: number;
  comment?: string;
};

// New API methods for scan & submit functionality
export async function getPricesByGTIN({ gtin, lat, lng, radius_m = 5000, token }: {
  gtin: string;
  lat: number;
  lng: number;
  radius_m?: number;
  token?: string;
}) {
  const normalizedGtin = gtin.trim();
  const params = new URLSearchParams({
    gtin: normalizedGtin,
    lat: lat.toString(),
    lng: lng.toString(),
    radius_m: radius_m.toString(),
  });

  const url = `${API_BASE_URL}/api/products/prices-by-gtin/?${params.toString()}`;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, { headers });
  const json = await response.json();
  if (!response.ok) {
    const message =
      (json && typeof json === 'object' ? (json as any).detail || (json as any).error : null) ||
      'Failed to fetch prices';
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = json;
    throw error;
  }

  return json as {
    product: { id: number; name?: string; brand?: string; gtin: string; size_grams?: number | null };
    cheapest_overall?: { store: { id: number; chain: string; name: string }; price: string };
    nearby_options: Array<{
      store: { id: number; chain: string; name: string };
      price: string | number;
      distance_m?: number;
    }>;
  };
}

export const scanApi = {
  // Uploads image, (lat,lng) optional; server identifies product
  identifyByPhoto: async (fileUri: string, opts?: { lat?: number; lng?: number }) => {
    try {
      console.log(`[scanApi] Identifying product from photo: ${fileUri}`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'product_photo.jpg',
      } as any);
      
      if (opts?.lat && opts?.lng) {
        formData.append('lat', opts.lat.toString());
        formData.append('lng', opts.lng.toString());
      }

      const response = await fetch(`${API_URLS.SCAN || 'http://localhost:8000/api/scan/'}identify/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[scanApi] Product identified: ${data.name_with_brand}`);
        return data;
      }

      console.warn(`[scanApi] Identify failed with status: ${response.status}`);
      throw new Error(`Failed to identify product: ${response.status}`);
    } catch (error) {
      console.warn('[scanApi] Identify by photo failed:', error);
      throw error;
    }
  },

  // Fetches nearby store prices for a product id and location
  nearbyPrices: async (productId: number, opts?: { lat?: number; lng?: number }) => {
    try {
      console.log(`[scanApi] Fetching nearby prices for product: ${productId}`);
      
      const params = new URLSearchParams();
      params.append('product_id', productId.toString());
      if (opts?.lat && opts?.lng) {
        params.append('lat', opts.lat.toString());
        params.append('lng', opts.lng.toString());
      }

      const response = await fetch(`${API_URLS.SCAN || 'http://localhost:8000/api/scan/'}nearby-prices/?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[scanApi] Found ${data.results?.length || data.length || 0} nearby prices`);
        return data.results || data || [];
      }

      console.warn(`[scanApi] Nearby prices failed with status: ${response.status}`);
      return []; // Return empty array for failed requests
    } catch (error) {
      console.warn('[scanApi] Nearby prices failed:', error);
      return []; // Return empty array for failed requests
    }
  },

  // Submits a user correction (photo+price+store), optional location
  submitPriceCorrection: async (payload: {
    product_id?: number;
    store: string;
    price: number;
    imageUri: string;
    lat?: number;
    lng?: number;
    note?: string;
  }) => {
    try {
      console.log(`[scanApi] Submitting price correction for store: ${payload.store}`);
      
      const formData = new FormData();
      formData.append('store', payload.store);
      formData.append('price', payload.price.toString());
      formData.append('image', {
        uri: payload.imageUri,
        type: 'image/jpeg',
        name: 'price_photo.jpg',
      } as any);
      
      if (payload.product_id) {
        formData.append('product_id', payload.product_id.toString());
      }
      if (payload.lat && payload.lng) {
        formData.append('lat', payload.lat.toString());
        formData.append('lng', payload.lng.toString());
      }
      if (payload.note) {
        formData.append('note', payload.note);
      }

      const response = await fetch(`${API_URLS.SCAN || 'http://localhost:8000/api/scan/'}submit/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[scanApi] Price correction submitted successfully`);
        return { ok: true, data };
      }

      console.warn(`[scanApi] Submit failed with status: ${response.status}`);
      throw new Error(`Failed to submit correction: ${response.status}`);
    } catch (error) {
      console.warn('[scanApi] Submit price correction failed:', error);
      throw error;
    }
  },

  submitScan: async (payload: { gtin: string; priceText: string; lat: number; lng: number; photoUri?: string }) => {
    const baseUrl = API_URLS.SCAN || 'http://localhost:8000/api/scan/';
    try {
      console.log(`[scanApi] Submitting barcode scan for GTIN: ${payload.gtin}`);
      const formData = new FormData();
      formData.append('gtin', payload.gtin);
      formData.append('price_text', payload.priceText);
      formData.append('lat', payload.lat.toString());
      formData.append('lng', payload.lng.toString());
      if (payload.photoUri) {
        formData.append('photo', {
          uri: payload.photoUri,
          type: 'image/jpeg',
          name: 'shelf.jpg',
        } as any);
      }

      const response = await fetch(`${baseUrl}submit/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      const message = await response.text();
      console.warn(`[scanApi] submitScan failed with status ${response.status}: ${message}`);
      throw new Error(message || `Failed to submit scan: ${response.status}`);
    } catch (error) {
      console.warn('[scanApi] submitScan error:', error);
      throw error;
    }
  },
};

export const productApi = {
  detail: async (slugOrId: string | number, guestUser?: string) => {
    const identifier = String(slugOrId);
    const url = `${API_URLS.PRODUCTS}${identifier}/detail/`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(guestUser),
      });
      if (response.ok) {
        const data = await response.json();
        return { data };
      }
      const message = await response.text();
      return { data: null, error: new Error(message || `HTTP ${response.status}: ${response.statusText}`) };
    } catch (error) {
      console.warn('[api] Product detail failed:', error);
      return { data: null, error: error as Error };
    }
  },

  getRating: async (slugOrId: string | number, guestUser?: string) => {
    const identifier = String(slugOrId);
    const url = `${API_URLS.PRODUCTS}${identifier}/ratings/`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(guestUser),
      });
      if (response.ok) {
        const data = await response.json();
        return { data };
      }
      const message = await response.text();
      return { data: null, error: new Error(message || `HTTP ${response.status}: ${response.statusText}`) };
    } catch (error) {
      console.warn('[api] Product ratings fetch failed:', error);
      return { data: null, error: error as Error };
    }
  },

  submitRating: async (slugOrId: string | number, payload: ProductRatingPayload, guestUser?: string) => {
    const identifier = String(slugOrId);
    const url = `${API_URLS.PRODUCTS}${identifier}/ratings/`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(guestUser),
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        return { data };
      }
      const message = await response.text();
      return { data: null, error: new Error(message || `HTTP ${response.status}: ${response.statusText}`) };
    } catch (error) {
      console.warn('[api] Product rating submission failed:', error);
      return { data: null, error: error as Error };
    }
  },

  list: async (opts?: { category?: string }) => {
    try {
      console.log(`[api] Loading products from: ${API_URLS.PRODUCTS}`);
      const response = await api.get(API_URLS.PRODUCTS);

      console.log(`[api] Loaded ${response.data.results?.length || response.data.length || 0} products from backend`);
      return { data: response.data.results || response.data };
    } catch (error) {
      console.warn('[api] Products API failed, using mock data:', error);
      return { data: mockProducts };
    }
  },

  compare: async (ids?: (string | number)[]) => {
    try {
      const response = await api.get(API_URLS.CHEAPEST);
      return { data: response.data.results || response.data };
    } catch (error) {
      console.warn('[api] Cheapest API failed, using mock data:', error);
      return { data: mockProducts };
    }
  },

  quickCompare: async () => {
    try {
      console.log(`[api] Loading quick compare rows from: ${API_URLS.QUICK_COMPARE}`);
      const response = await api.get(API_URLS.QUICK_COMPARE);

      const rows = response.data?.results ?? response.data;
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      console.log(`[api] Loaded ${rowCount} quick compare rows`);

      if (Array.isArray(rows) && rowCount > 0) {
        return { data: normaliseQuickCompareRows(rows) };
      }

      console.warn('[api] Quick compare API returned an empty payload, using mock data');
      return { data: normaliseQuickCompareRows(buildMockQuickCompare()) };
    } catch (error) {
      console.warn('[api] Quick compare API failed, using mock data:', error);
      return { data: normaliseQuickCompareRows(buildMockQuickCompare()) };
    }
  },
};
