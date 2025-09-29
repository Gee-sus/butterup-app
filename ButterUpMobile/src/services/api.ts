import { API_URLS } from '../config';

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
    store: 'Countdown',
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
    store: 'Countdown',
    name_with_brand: 'Petit Normand 200g',
    image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=300&h=300&fit=crop',
  },
];

const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];

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

    const storeLabel =
      MAIN_STORES.find(
        (store) => store.toLowerCase() === (item.store || '').toLowerCase(),
      ) || item.store;

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
      const response = await fetch(API_URLS.PROFILE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[api] Loaded user profile: ${data.name}`);
        return { data };
      }

      console.warn(`[api] Profile API returned ${response.status}, using mock data`);
      return { data: { name: 'User', email: 'user@example.com', avatar_url: '', provider: 'local' } };
    } catch (error) {
      console.warn('[api] Profile API failed, using mock data:', error);
      return { data: { name: 'User', email: 'user@example.com', avatar_url: '', provider: 'local' } };
    }
  },
};

export const productApi = {
  list: async (opts?: { category?: string }) => {
    try {
      console.log(`[api] Loading products from: ${API_URLS.PRODUCTS}`);
      const response = await fetch(API_URLS.PRODUCTS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[api] Loaded ${data.results?.length || data.length || 0} products from backend`);
        return { data: data.results || data };
      }

      console.warn(`[api] Products API returned ${response.status}, using mock data`);
      return { data: mockProducts };
    } catch (error) {
      console.warn('[api] Products API failed, using mock data:', error);
      return { data: mockProducts };
    }
  },

  compare: async (ids?: (string | number)[]) => {
    try {
      const response = await fetch(API_URLS.CHEAPEST, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { data: data.results || data };
      }

      console.warn('[api] Cheapest API returned non-200, using mock data');
      return { data: mockProducts };
    } catch (error) {
      console.warn('[api] Cheapest API failed, using mock data:', error);
      return { data: mockProducts };
    }
  },

  quickCompare: async () => {
    try {
      console.log(`[api] Loading quick compare rows from: ${API_URLS.QUICK_COMPARE}`);
      const response = await fetch(API_URLS.QUICK_COMPARE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rows = data?.results ?? data;
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        console.log(`[api] Loaded ${rowCount} quick compare rows`);

        if (Array.isArray(rows) && rowCount > 0) {
          return { data: rows };
        }

        console.warn('[api] Quick compare API returned an empty payload, using mock data');
        return { data: buildMockQuickCompare() };
      }

      console.warn(`[api] Quick compare API returned ${response.status}, using mock data`);
      return { data: buildMockQuickCompare() };
    } catch (error) {
      console.warn('[api] Quick compare API failed, using mock data:', error);
      return { data: buildMockQuickCompare() };
    }
  },
};
