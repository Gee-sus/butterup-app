// Mock data for development when backend is not available

export const mockStores = [
  {
    id: 1,
    name: 'Woolworths Albany',
    chain: 'Woolworths',
    location: 'Albany, Auckland',
    latitude: -36.7285,
    longitude: 174.7000,
    is_active: true
  },
  {
    id: 2,
    name: 'Pak\'nSave Albany',
    chain: 'Pak\'nSave',
    location: 'Albany, Auckland',
    latitude: -36.7285,
    longitude: 174.7000,
    is_active: true
  },
  {
    id: 3,
    name: 'New World Albany',
    chain: 'New World',
    location: 'Albany, Auckland',
    latitude: -36.7285,
    longitude: 174.7000,
    is_active: true
  },
  {
    id: 4,
    name: 'Woolworths Takapuna',
    chain: 'Woolworths',
    location: 'Takapuna, Auckland',
    latitude: -36.7883,
    longitude: 174.7750,
    is_active: true
  },
  {
    id: 5,
    name: 'Pak\'nSave Glenfield',
    chain: 'Pak\'nSave',
    location: 'Glenfield, Auckland',
    latitude: -36.7833,
    longitude: 174.7167,
    is_active: true
  }
];

export const mockPrices = [
  {
    id: 1,
    product: {
      name: 'Anchor Butter 500g',
      brand: 'Anchor',
      weight_grams: 500
    },
    store: {
      name: 'Woolworths Albany',
      chain: 'Woolworths'
    },
    price: '4.50',
    recorded_at: '2024-01-15T10:30:00Z',
    scraped_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    product: {
      name: 'Mainland Butter 500g',
      brand: 'Mainland',
      weight_grams: 500
    },
    store: {
      name: 'Pak\'nSave Albany',
      chain: 'Pak\'nSave'
    },
    price: '4.20',
    recorded_at: '2024-01-15T10:30:00Z',
    scraped_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 3,
    product: {
      name: 'Westgold Butter 500g',
      brand: 'Westgold',
      weight_grams: 500
    },
    store: {
      name: 'New World Albany',
      chain: 'New World'
    },
    price: '3.90',
    recorded_at: '2024-01-15T10:30:00Z',
    scraped_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 4,
    product: {
      name: 'Lewis Road Creamery Butter 250g',
      brand: 'Lewis Road',
      weight_grams: 250
    },
    store: {
      name: 'Woolworths Takapuna',
      chain: 'Woolworths'
    },
    price: '6.50',
    recorded_at: '2024-01-15T10:30:00Z',
    scraped_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 5,
    product: {
      name: 'Organic Times Butter 250g',
      brand: 'Organic Times',
      weight_grams: 250
    },
    store: {
      name: 'Pak\'nSave Glenfield',
      chain: 'Pak\'nSave'
    },
    price: '5.80',
    recorded_at: '2024-01-15T10:30:00Z',
    scraped_at: '2024-01-15T10:30:00Z'
  }
];

export const mockAnalytics = {
  total_products: 5,
  avg_price: 4.98,
  price_change: '+2.5%',
  stores_tracked: 3,
  price_trends: {
    last_week: '+1.2%',
    last_month: '+3.8%',
    last_quarter: '+5.2%'
  },
  store_comparison: {
    countdown_avg: 4.50,
    paknsave_avg: 4.20,
    newworld_avg: 3.90
  }
};
