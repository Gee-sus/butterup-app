import {Store} from '../types';

export interface VisibleStoresResult {
  visibleStores: Store[];
  overflowCount: number;
  isExpanded: boolean;
}

/**
 * Calculates which stores should be visible based on expansion state
 * @param selectedStores - All selected stores
 * @param maxCols - Maximum number of columns to show when collapsed
 * @param expanded - Whether the table is expanded
 * @returns Object with visible stores, overflow count, and expansion state
 */
export const getVisibleStores = (
  selectedStores: Store[],
  maxCols: number,
  expanded: boolean
): VisibleStoresResult => {
  const visibleStores = expanded ? selectedStores : selectedStores.slice(0, maxCols);
  const overflowCount = Math.max(0, selectedStores.length - visibleStores.length);
  
  return {
    visibleStores,
    overflowCount,
    isExpanded: expanded,
  };
};

/**
 * Toggles the expansion state
 * @param currentExpanded - Current expansion state
 * @returns New expansion state
 */
export const toggleExpansion = (currentExpanded: boolean): boolean => {
  return !currentExpanded;
};

