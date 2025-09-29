// Re-export types from API endpoints for convenience
export type { Store, Product, Price, GroupedProduct } from '../api/endpoints';

// Additional app-specific types
export interface AppState {
  stores: Store[];
  selectedStores: string[];
  loading: boolean;
  error: string | null;
}

export interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}
