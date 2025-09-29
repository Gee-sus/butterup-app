// Types based on your Django backend models

export interface Store {
  id: number;
  name: string;
  chain: 'paknsave' | 'countdown' | 'new_world';
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
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  primary_image?: ImageAsset;
}

export interface ImageAsset {
  id: number;
  sku?: string;
  alt_text: string;
  product?: number;
  store?: number;
  source: 'OFF' | 'GS1' | 'STORE' | 'UPLOAD';
  file?: string;
  url?: string;
  original_url?: string;
  last_fetched_at: string;
  attribution_text?: string;
  attribution_url?: string;
  is_active: boolean;
  checksum?: string;
  width?: number;
  height?: number;
  file_size?: number;
}

export interface Price {
  id: number;
  store: number;
  product: number;
  price: number;
  price_per_kg?: number;
  is_on_special: boolean;
  special_price?: number;
  special_end_date?: string;
  recorded_at: string;
  scraped_at: string;
  store_details?: Store;
  product_details?: Product;
}

export interface PriceAlert {
  id: number;
  user: number;
  product: number;
  store?: number;
  target_price: number;
  threshold_percent: number;
  alert_type: 'below' | 'above' | 'change';
  change_percentage?: number;
  is_active: boolean;
  created_at: string;
  last_triggered?: string;
}

export interface NutritionProfile {
  id: number;
  slug: string;
  origin: string;
  allergens: string[];
  claims: string[];
  storage: string;
  warnings: string[];
  serving_g: number;
  energy_kj: number;
  fat_g: number;
  sat_fat_g: number;
  carbs_g: number;
  sugars_g: number;
  protein_g: number;
  sodium_mg: number;
  last_verified_at: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

export interface ApiResponse<T> {
  results?: T[];
  count?: number;
  next?: string;
  previous?: string;
}

export interface StoreWithDistance extends Store {
  distance: number;
}

export interface ProductWithPrice extends Product {
  latest_price?: Price;
  price_history?: Price[];
}

export interface CheapestItem {
  brand: string;
  size: string;
  store: string;
  price: number;
  unit?: number;
  product_id: number;
  store_id: number;
  product_name: string;
  store_chain: string;
}

export interface ListItem {
  id: string;
  brand: string;
  size: string;
  store: string;
  price: number;
  unit?: number;
  product_id: number;
  store_id: number;
  product_name: string;
  store_chain: string;
  added_at: string;
}