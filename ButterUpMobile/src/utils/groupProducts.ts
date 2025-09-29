import {Product} from '../types';

export interface GroupedProduct {
  brand: string;
  size: number;
  unit: string;
  products: Product[];
}

/**
 * Groups products by brand, size, and package type
 * Products with the same brand, weight, and package type are grouped together
 */
export const groupProducts = (products: Product[]): GroupedProduct[] => {
  const grouped: {[key: string]: GroupedProduct} = {};
  
  products.forEach(product => {
    const key = `${product.brand}-${product.weight_grams}-${product.package_type}`;
    if (!grouped[key]) {
      grouped[key] = {
        brand: product.brand,
        size: product.weight_grams,
        unit: product.package_type,
        products: [],
      };
    }
    grouped[key].products.push(product);
  });
  
  // Sort by brand name, then by size
  return Object.values(grouped).sort((a, b) => {
    if (a.brand !== b.brand) {
      return a.brand.localeCompare(b.brand);
    }
    return a.size - b.size;
  });
};

/**
 * Gets the representative product from a group (first product)
 * This is used for display purposes in the price table
 */
export const getRepresentativeProduct = (group: GroupedProduct): Product => {
  return group.products[0];
};

