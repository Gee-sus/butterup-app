import { Platform, NativeModules } from "react-native";

// API Base URL resolution order:
// 1) Env override (EXPO_PUBLIC_API_BASE_URL)
// 2) Metro host (dev on physical devices)
// 3) Emulator localhost fallback

const getMetroHost = (): string | null => {
  const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  // Example: http://192.168.1.6:8081/index.bundle?platform=android&dev=true
  const withoutProtocol = scriptURL.split('://')[1] || scriptURL;
  const hostPort = withoutProtocol.split('/')[0]; // 192.168.1.6:8081
  const host = hostPort.split(':')[0]; // 192.168.1.6
  return host || null;
};

const metroHost = __DEV__ ? getMetroHost() : null;
const emulatorFallback = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
const defaultHost = metroHost ? `http://${metroHost}:8000` : emulatorFallback;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || defaultHost;

// API endpoints

export const API_ENDPOINTS = {
  PRODUCTS: "/api/products/",
  STORES: "/api/stores/",
  PRICES: "/api/prices/",
  CHEAPEST: "/api/cheapest/",
  QUICK_COMPARE: "/api/quick-compare/",
  PROFILE: "/api/me/",
  SCAN: "/api/scan/",
} as const;

// Full API URLs
export const API_URLS = {
  PRODUCTS: `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS}`,
  STORES: `${API_BASE_URL}${API_ENDPOINTS.STORES}`,
  PRICES: `${API_BASE_URL}${API_ENDPOINTS.PRICES}`,
  CHEAPEST: `${API_BASE_URL}${API_ENDPOINTS.CHEAPEST}`,
  QUICK_COMPARE: `${API_BASE_URL}${API_ENDPOINTS.QUICK_COMPARE}`,
  PROFILE: `${API_BASE_URL}${API_ENDPOINTS.PROFILE}`,
  SCAN: `${API_BASE_URL}${API_ENDPOINTS.SCAN}`,
} as const;
