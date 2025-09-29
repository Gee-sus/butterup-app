import {groupProducts, getRepresentativeProduct} from '../groupProducts';
import {Product} from '../../types';

// Mock seed data
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Anchor Butter 500g',
    brand: 'Anchor',
    weight_grams: 500,
    package_type: 'Block',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Anchor Butter 250g',
    brand: 'Anchor',
    weight_grams: 250,
    package_type: 'Block',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Mainland Butter 500g',
    brand: 'Mainland',
    weight_grams: 500,
    package_type: 'Block',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Anchor Butter 500g Salted',
    brand: 'Anchor',
    weight_grams: 500,
    package_type: 'Block',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('groupProducts', () => {
  it('should group products by brand, size, and package type', () => {
    const grouped = groupProducts(mockProducts);
    
    // Should have 3 groups: Anchor 500g, Anchor 250g, Mainland 500g
    expect(grouped).toHaveLength(3);
    
    // Check first group (Anchor 250g - should be first alphabetically by size)
    expect(grouped[0].brand).toBe('Anchor');
    expect(grouped[0].size).toBe(250);
    expect(grouped[0].unit).toBe('Block');
    expect(grouped[0].products).toHaveLength(1);
    expect(grouped[0].products[0].id).toBe(2);
    
    // Check second group (Anchor 500g)
    expect(grouped[1].brand).toBe('Anchor');
    expect(grouped[1].size).toBe(500);
    expect(grouped[1].unit).toBe('Block');
    expect(grouped[1].products).toHaveLength(2); // Two Anchor 500g products
    expect(grouped[1].products.map(p => p.id)).toEqual([1, 4]);
    
    // Check third group (Mainland 500g)
    expect(grouped[2].brand).toBe('Mainland');
    expect(grouped[2].size).toBe(500);
    expect(grouped[2].unit).toBe('Block');
    expect(grouped[2].products).toHaveLength(1);
    expect(grouped[2].products[0].id).toBe(3);
  });

  it('should sort groups by brand name, then by size', () => {
    const grouped = groupProducts(mockProducts);
    
    // Verify sorting order
    expect(grouped[0].brand).toBe('Anchor');
    expect(grouped[0].size).toBe(250);
    
    expect(grouped[1].brand).toBe('Anchor');
    expect(grouped[1].size).toBe(500);
    
    expect(grouped[2].brand).toBe('Mainland');
    expect(grouped[2].size).toBe(500);
  });

  it('should handle empty product array', () => {
    const grouped = groupProducts([]);
    expect(grouped).toHaveLength(0);
  });

  it('should handle single product', () => {
    const singleProduct = [mockProducts[0]];
    const grouped = groupProducts(singleProduct);
    
    expect(grouped).toHaveLength(1);
    expect(grouped[0].brand).toBe('Anchor');
    expect(grouped[0].products).toHaveLength(1);
  });
});

describe('getRepresentativeProduct', () => {
  it('should return the first product from a group', () => {
    const grouped = groupProducts(mockProducts);
    const representative = getRepresentativeProduct(grouped[1]); // Anchor 500g group
    
    expect(representative.id).toBe(1); // First product in the group
    expect(representative.brand).toBe('Anchor');
    expect(representative.weight_grams).toBe(500);
  });
});

