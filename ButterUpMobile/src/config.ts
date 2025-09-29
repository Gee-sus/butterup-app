import { Platform } from "react-native";

// API Base URL configuration
// Android emulator uses 10.0.2.2 to access host machine's localhost
// iOS simulator uses 127.0.0.1 (localhost)
// For debugging, let's try localhost first
const defaultHost = "http://192.168.1.3:8000";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || defaultHost;

// API endpoints
export const API_ENDPOINTS = {
  PRODUCTS: "/api/products/",
  STORES: "/api/stores/",
  PRICES: "/api/prices/",
  CHEAPEST: "/api/cheapest/",
  QUICK_COMPARE: "/api/quick-compare/",
  PROFILE: "/api/me/",
} as const;

// Full API URLs
export const API_URLS = {
  PRODUCTS: `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS}`,
  STORES: `${API_BASE_URL}${API_ENDPOINTS.STORES}`,
  PRICES: `${API_BASE_URL}${API_ENDPOINTS.PRICES}`,
  CHEAPEST: `${API_BASE_URL}${API_ENDPOINTS.CHEAPEST}`,
  QUICK_COMPARE: `${API_BASE_URL}${API_ENDPOINTS.QUICK_COMPARE}`,
  PROFILE: `${API_BASE_URL}${API_ENDPOINTS.PROFILE}`,
} as const;
