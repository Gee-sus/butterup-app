import {getVisibleStores, toggleExpansion} from '../visibleStores';
import {Store} from '../../types';

// Mock seed data - 4 stores
const mockStores: Store[] = [
  {
    id: 1,
    name: 'Pak\'nSave Albany',
    chain: 'paknsave',
    location: 'Albany',
    region: 'Auckland',
    city: 'Auckland',
    latitude: -36.7285,
    longitude: 174.7006,
    address: '123 Albany Highway',
    store_code: 'PS001',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Countdown Newmarket',
    chain: 'countdown',
    location: 'Newmarket',
    region: 'Auckland',
    city: 'Auckland',
    latitude: -36.8705,
    longitude: 174.7786,
    address: '456 Broadway',
    store_code: 'CD001',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'New World Ponsonby',
    chain: 'new_world',
    location: 'Ponsonby',
    region: 'Auckland',
    city: 'Auckland',
    latitude: -36.8509,
    longitude: 174.7444,
    address: '789 Ponsonby Road',
    store_code: 'NW001',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Pak\'nSave Manukau',
    chain: 'paknsave',
    location: 'Manukau',
    region: 'Auckland',
    city: 'Auckland',
    latitude: -36.9928,
    longitude: 174.8798,
    address: '321 Great South Road',
    store_code: 'PS002',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('getVisibleStores', () => {
  it('should show 3 stores when collapsed with 4 stores selected', () => {
    const result = getVisibleStores(mockStores, 3, false);
    
    expect(result.visibleStores).toHaveLength(3);
    expect(result.overflowCount).toBe(1);
    expect(result.isExpanded).toBe(false);
    
    // Should show first 3 stores
    expect(result.visibleStores[0].id).toBe(1);
    expect(result.visibleStores[1].id).toBe(2);
    expect(result.visibleStores[2].id).toBe(3);
  });

  it('should show all 4 stores when expanded', () => {
    const result = getVisibleStores(mockStores, 3, true);
    
    expect(result.visibleStores).toHaveLength(4);
    expect(result.overflowCount).toBe(0);
    expect(result.isExpanded).toBe(true);
    
    // Should show all stores
    expect(result.visibleStores.map(s => s.id)).toEqual([1, 2, 3, 4]);
  });

  it('should handle fewer stores than maxCols', () => {
    const twoStores = mockStores.slice(0, 2);
    const result = getVisibleStores(twoStores, 3, false);
    
    expect(result.visibleStores).toHaveLength(2);
    expect(result.overflowCount).toBe(0);
    expect(result.isExpanded).toBe(false);
  });

  it('should handle empty stores array', () => {
    const result = getVisibleStores([], 3, false);
    
    expect(result.visibleStores).toHaveLength(0);
    expect(result.overflowCount).toBe(0);
    expect(result.isExpanded).toBe(false);
  });

  it('should handle maxCols of 0', () => {
    const result = getVisibleStores(mockStores, 0, false);
    
    expect(result.visibleStores).toHaveLength(0);
    expect(result.overflowCount).toBe(4);
    expect(result.isExpanded).toBe(false);
  });

  it('should handle maxCols equal to store count', () => {
    const result = getVisibleStores(mockStores, 4, false);
    
    expect(result.visibleStores).toHaveLength(4);
    expect(result.overflowCount).toBe(0);
    expect(result.isExpanded).toBe(false);
  });
});

describe('toggleExpansion', () => {
  it('should toggle from false to true', () => {
    const result = toggleExpansion(false);
    expect(result).toBe(true);
  });

  it('should toggle from true to false', () => {
    const result = toggleExpansion(true);
    expect(result).toBe(false);
  });
});

