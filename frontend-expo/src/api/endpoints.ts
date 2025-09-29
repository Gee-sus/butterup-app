import { apiClient } from './client';

// Types based on the backend models
export interface Store {
  id: number;
  name: string;
  chain: string;
  location: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  address: string;
  store_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  gtin?: string;
  weight_grams: number;
  package_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: number;
  store: number;
  product: number;
  price: string;
  price_per_kg?: string;
  is_on_special: boolean;
  special_price?: string;
  special_end_date?: string;
  recorded_at: string;
  scraped_at: string;
}

export interface GroupedProduct {
  product: Product;
  prices: {
    [storeName: string]: {
      price: string;
      price_per_kg?: string;
      is_on_special: boolean;
      special_price?: string;
      recorded_at: string;
    };
  };
}

// API Endpoints
export const getStores = async (): Promise<Store[]> => {
  try {
    const response = await apiClient.get('/api/stores/');
    return response.data;
  } catch (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
};

export const getGroupedPrices = async (storeIds: string[]): Promise<GroupedProduct[]> => {
  try {
    // For now, we'll fetch all products and their prices, then group them
    // This is a simplified implementation - in a real app you'd want a dedicated endpoint
    const [productsResponse, pricesResponse] = await Promise.all([
      apiClient.get('/api/products/'),
      apiClient.get('/api/prices/latest/')
    ]);

    const products: Product[] = productsResponse.data;
    const prices: Price[] = pricesResponse.data;

    // Filter prices for the requested stores
    const filteredPrices = prices.filter(price => 
      storeIds.includes(price.store.toString())
    );

    // Group products by their prices
    const groupedProducts: GroupedProduct[] = [];
    
    for (const product of products) {
      const productPrices = filteredPrices.filter(price => price.product === product.id);
      
      if (productPrices.length > 0) {
        const pricesByStore: { [storeName: string]: any } = {};
        
        for (const price of productPrices) {
          // Get store name from the price data
          const storeName = `Store ${price.store}`; // Simplified - in real app you'd fetch store details
          pricesByStore[storeName] = {
            price: price.price,
            price_per_kg: price.price_per_kg,
            is_on_special: price.is_on_special,
            special_price: price.special_price,
            recorded_at: price.recorded_at,
          };
        }
        
        groupedProducts.push({
          product,
          prices: pricesByStore,
        });
      }
    }

    return groupedProducts;
  } catch (error) {
    console.error('Error fetching grouped prices:', error);
    throw error;
  }
};
