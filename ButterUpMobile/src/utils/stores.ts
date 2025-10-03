/**
 * Store name normalization utility
 * Ensures consistent store names across the app
 */

export const normalizeStoreName = (storeName: string): string => {
  if (!storeName) return '';
  
  const key = storeName.toLowerCase().trim();
  switch (key) {
    case "paknsave":
    case "pak'n save":
    case "pak n save":
    case "pak'nsave":
    case "pak n'save":
      return "Pak'nSave";
    case 'countdown':
    case 'woolworths':
      return 'Woolworths';
    case 'new world':
    case 'nw':
      return 'New World';
    default:
      return storeName;
  }
};

/**
 * Main store chains supported by the app
 */
export const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"] as const;

/**
 * Check if a store name matches any of the main store chains
 */
export const isMainStore = (storeName: string): boolean => {
  const normalized = normalizeStoreName(storeName);
  return MAIN_STORES.includes(normalized as any);
};

/**
 * Get store display name with proper formatting
 */
export const getStoreDisplayName = (storeName: string): string => {
  return normalizeStoreName(storeName);
};
