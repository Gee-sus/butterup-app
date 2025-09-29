import React, { useState, useEffect } from 'react';
import ProductCardMinimal from './ProductCardMinimal';
import productService from '../services/productService';
import { useStoreSelection } from '../contexts/StoreContext';

const FEATURED_PRODUCTS = [
  {
    id: 'anchor-pure-butter-500g',
    includes: ['anchor', 'butter', '500'],
    image: '/images/butter/anchor_butter_500g.png',
    categories: ['block'],
  },
  {
    id: 'lewis-road-creamery-unsalted-250g',
    includes: ['lewis road', 'unsalted'],
    image: '/images/butter/lewis_road_butter_250g_unsalted.png',
    categories: ['block'],
  },
  {
    id: 'lewis-road-creamery-lightly-salted-250g',
    includes: ['lewis road', 'lightly', 'salted'],
    excludes: ['unsalted'],
    image: '/images/butter/lewis_road_butter_250g_salted.png',
    categories: ['block'],
  },
  {
    id: 'mainland-unsalted-500g',
    includes: ['mainland', 'unsalted'],
    image: '/images/butter/mainland_butter_500g_unsalted.png',
    categories: ['block'],
  },
  {
    id: 'mainland-salted-500g',
    includes: ['mainland', 'salted'],
    excludes: ['unsalted'],
    image: '/images/butter/mainland_butter_500g_salted.png',
    categories: ['block'],
  },
  {
    id: 'westgold-salted-400g',
    includes: ['westgold', 'salted'],
    excludes: ['unsalted'],
    image: '/images/butter/westgold_butter_500g_salted.png',
    categories: ['block'],
  },
  {
    id: 'westgold-unsalted-400g',
    includes: ['westgold', 'unsalted'],
    image: '/images/butter/westgold_butter_500g_unsalted.png',
    categories: ['block'],
  },
  {
    id: 'olivani-olive-oil-500g',
    includes: ['olivani'],
    image: '/images/butter/olivani_original_500g.png',
    categories: ['spreadable'],
  },
  {
    id: 'petit-normand-salted-200g',
    includes: ['petit', 'salted'],
    excludes: ['unsalted'],
    image: '/images/butter/petit-normand-salted-butter-200g.png',
    categories: ['block'],
  },
  {
    id: 'petit-normand-unsalted-200g',
    includes: ['petit', 'unsalted'],
    image: '/images/butter/petit-normand-unsalted-butter-200g.png',
    categories: ['block'],
  },
  {
    id: 'nuttelex-buttery-dairy-free-375g',
    includes: ['nuttelex', 'buttery'],
    image: '/images/butter/nuttelex_original_500g.png',
    categories: ['dairy-free'],
  },
  {
    id: 'rolling-meadow-salted-500g',
    includes: ['rolling meadow'],
    image: '/images/butter/rolling_meadow_salted_500g.png',
    categories: ['block'],
  },
  {
    id: 'pams-salted-500g',
    includes: ['pams'],
    image: '/images/butter/pams_butter_500g.png',
    categories: ['block'],
  },
  {
    id: 'woolworths-salted-500g',
    includes: ['woolworths|countdown'],
    image: '/images/butter/woolworths_salted_500g.png',
    categories: ['block'],
  },
  {
    id: 'market-kitchen-salted-500g',
    includes: ['market kitchen'],
    image: '/images/butter/market_kitchen_salted_500g.png',
    categories: ['block'],
  },
  {
    id: 'lurpak-salted-200g',
    includes: ['lurpak'],
    image: '/images/butter/lurpak_salted_200g.png',
    categories: ['block'],
  },
  {
    id: 'organic-times-salted-250g',
    includes: ['organic times'],
    image: null,
    categories: ['block'],
  },
  {
    id: 'vutter-original-265g',
    includes: ['vutter'],
    image: '/images/butter/vutter_original_265g.png',
    categories: ['dairy-free'],
  },
];

const normalizeIdentifier = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const tokenMatches = (haystack, token) => {
  if (!token) return true;
  const options = String(token)
    .split('|')
    .map((option) => option.trim())
    .filter(Boolean);

  if (options.length === 0) {
    return true;
  }

  return options.some((option) => haystack.includes(option));
};

const buildSearchHaystack = (product) => {
  return [
    product?.name,
    product?.brand,
    product?.originalProduct?.name,
    product?.originalProduct?.brand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const matchesIdentifier = (product, configId) => {
  if (!configId) return false;
  const target = normalizeIdentifier(configId);
  if (!target) return false;

  const candidates = [
    product?.slug,
    product?.id,
    product?.name,
    product?.brand,
    product?.originalProduct?.slug,
    product?.originalProduct?.id,
    product?.originalProduct?.name,
    product?.originalProduct?.brand,
  ];

  return candidates.some((candidate) => normalizeIdentifier(candidate) === target);
};

const matchesFeatured = (product, includes = [], excludes = []) => {
  const haystack = buildSearchHaystack(product);
  if (!haystack) return false;

  const includeTokens = Array.isArray(includes) ? includes : [includes];
  const excludeTokens = Array.isArray(excludes) ? excludes : [excludes];

  const includesMatch = includeTokens.every((token) => tokenMatches(haystack, token));
  if (!includesMatch) return false;

  const excludesMatch = excludeTokens.some((token) => tokenMatches(haystack, token));
  return !excludesMatch;
};

const inferCategories = (product) => {
  const categories = new Set();
  const packageType = (
    product?.package_type ||
    product?.originalProduct?.package_type ||
    product?.originalProduct?.packageType ||
    ''
  ).toLowerCase();

  if (packageType.includes('spread')) {
    categories.add('spreadable');
  }
  if (packageType.includes('dairy-free') || packageType.includes('dairy free') || packageType.includes('vegan')) {
    categories.add('dairy-free');
  }
  if (packageType.includes('block')) {
    categories.add('block');
  }

  const name = (product?.name || '').toLowerCase();
  const brand = (product?.brand || '').toLowerCase();

  if (name.includes('spread') || brand.includes('spread')) {
    categories.add('spreadable');
  }
  if (name.includes('dairy-free') || name.includes('dairy free') || name.includes('vegan')) {
    categories.add('dairy-free');
  }

  if (!categories.size) {
    categories.add('block');
  }

  return Array.from(categories);
};

const applyFeaturedImage = (product, image) => {
  if (!image) {
    return product;
  }
  console.log('Applying featured image:', image, 'to product:', product.name);
  return {
    ...product,
    image_url: image,
    imageUrl: image,
  };
};
const ButterCards = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [storeInfo, setStoreInfo] = useState(null);
  const { selectedStore } = useStoreSelection();

  // Hoisted function to load products
  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching products for category:', selectedCategory, 'store:', selectedStore);
      
      // TEMPORARY: Force use store 5 for testing (Pak'nSave Royal Oak)
      const originalStoreId = Number(localStorage.getItem('butterup:storeId')) || (selectedStore && selectedStore.id) || 5;
      const storeId = 5; // Force store 5 temporarily
      console.log('TEMP: Forced storeId to 5, original would be:', originalStoreId);
      
      console.log('Debug store selection:', {
        localStorage_butterup_storeId: localStorage.getItem('butterup:storeId'),
        localStorage_selectedStore: localStorage.getItem('selectedStore'),
        localStorage_butterup_selectedStore: localStorage.getItem('butterup:selectedStore'),
        selectedStore,
        storeId
      });
      
      const params = { page_size: 500 };
      if (storeId) {
        params.store = storeId;
        console.log('Adding store filter:', storeId, storeId === 73 ? '(default store with data)' : '(user selected)');
      }
      
      console.log('Making API call with params:', params);
      let raw = await productService.getProducts(params);
      console.log('Loaded products:', raw.length);
      console.log('Raw products sample:', raw.slice(0, 3));
      
      // If selected store has no products, try fallback store 5
      console.log('Checking fallback condition: raw.length =', raw.length, ', storeId =', storeId, ', storeId !== 5 =', storeId !== 5);
      if (raw.length === 0 && storeId !== 5) {
        console.log('No products for store', storeId, ', trying fallback store 5');
        const fallbackParams = { ...params, store: 5, page_size: 500 };
        try {
          raw = await productService.getProducts(fallbackParams);
          console.log('Fallback store 5 products:', raw.length);
          if (raw.length > 0) {
            console.log('Successfully loaded products from fallback store 5');
          }
        } catch (error) {
          console.error('Error loading from fallback store:', error);
        }
      }
      
      // Keep all products and sort by unit price per 100g (cheapest first)
      const sortedProducts = [...raw];
      sortedProducts.sort((a, b) => (a.unitPricePer100g ?? Infinity) - (b.unitPricePer100g ?? Infinity));
      console.log('After sorting (no dedupe):', sortedProducts.length);
      
      if (storeId && selectedStore) {
        setStoreInfo({ name: selectedStore.name, city: selectedStore.city, chain: selectedStore.chain });
      } else {
        setStoreInfo(null);
      }
      
      setProducts(sortedProducts);
    } catch (err) {
      console.error('Error in loadProducts:', err);
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // Only refetch when the selected store changes; category filtering happens locally.
  }, [selectedStore]);

  // Transform normalized API data to match the expected format
  const transformApiData = (apiProducts) => {
    return apiProducts.map(product => {
      console.log('Transforming product:', product.name, 'price:', product.price);
      
      return {
        id: product.id.toString(),
        name: product.name,
        brand: product.brand,
        price: product.price, // This should come from the API
        grams: product.grams,
        image_url: product.imageUrl, // Use imageUrl from normalized product
        unitPricePer100g: product.price && product.grams ? +(product.price / product.grams * 100).toFixed(2) : null,
        type: 'Block', // Default type since we don't have package_type in normalized response
        store: 'API Store',
        price_per_100g: product.price != null ? `$${product.price.toFixed(2)}` : '�',
        total_price: product.price != null ? `$${product.price.toFixed(2)}` : '�',
        size_g: product.grams,
        last_updated: '2025-01-01',
        price_value: product.price,
        is_500g: product.grams === 500,
        gtin: '',
        package_type: 'Block',
        slug: product.slug,
        // Keep reference to original normalized product
        originalProduct: product
      };
    });
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-red-600">Error loading products: {error}</div>
      </div>
    );
  }

  const transformedData = transformApiData(products);
  console.log('Transformed data sample:', transformedData.slice(0, 2));
  console.log(`Total products loaded: ${transformedData.length}`);

  const usedProductIds = new Set();
  const featuredCards = FEATURED_PRODUCTS.map((config) => {
    const match = transformedData.find((product) => {
      if (!product) return false;
      if (usedProductIds.has(product.id)) return false;
      if (matchesIdentifier(product, config.id)) return true;
      return matchesFeatured(product, config.includes || [], config.excludes || []);
    });

    if (!match) {
      console.warn('Featured product not found:', config.id);
      console.warn('Looking for includes:', config.includes, 'excludes:', config.excludes);
      
      // Show products that contain any of the include terms
      const partialMatches = transformedData.filter(product => {
        if (!product || usedProductIds.has(product.id)) return false;
        const haystack = buildSearchHaystack(product);
        return config.includes?.some(token => tokenMatches(haystack, token));
      });
      
      if (partialMatches.length > 0) {
        console.warn('Partial matches found:', partialMatches.map(p => ({
          name: p.name,
          brand: p.brand,
          haystack: buildSearchHaystack(p)
        })));
      } else {
        console.warn('No partial matches found. First 10 available products:'); 
        transformedData.slice(0, 10).forEach((p, i) => {
          console.warn(`${i + 1}.`, {
            name: p.name,
            brand: p.brand,
            haystack: buildSearchHaystack(p)
          });
        });
      }
      
      return null;
    }

    usedProductIds.add(match.id);
    const productWithImage = applyFeaturedImage(match, config.image);
    const augmentedConfig = {
      ...config,
      categories: config.categories || inferCategories(productWithImage),
    };

    return {
      config: augmentedConfig,
      group: {
        key: augmentedConfig.id,
        sample: productWithImage,
        items: [productWithImage],
        imageCandidates: [productWithImage],
      },
    };
  }).filter(Boolean);

  const remainingProducts = transformedData.filter(
    (product) => product && !usedProductIds.has(product.id)
  );

  const dynamicCards = remainingProducts.map((product) => {
    const key = product.slug || `product-${product.id}`;
    return {
      config: {
        id: key,
        categories: inferCategories(product),
      },
      group: {
        key,
        sample: product,
        items: [product],
        imageCandidates: [product],
      },
    };
  });

  const allCards = [...featuredCards, ...dynamicCards];

  const visibleGroups = allCards
    .filter(({ config }) =>
      selectedCategory === 'all' || (config.categories || ['block']).includes(selectedCategory)
    )
    .map(({ group }) => group);

  return (
    <div className="space-y-6">
      {/* Store Indicator */}
      {storeInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Showing products from: <span className="font-semibold">{storeInfo.name}</span>
              </p>
              <p className="text-xs text-green-600">{storeInfo.city} � {storeInfo.chain}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Store Selected Message */}
      {!selectedStore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">
                No store selected. <a href="/select-store" className="text-yellow-600 underline hover:text-yellow-700">Choose a store</a> to see location-specific prices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Products
        </button>
        <button
          onClick={() => setSelectedCategory('block')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'block'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Block Butter
        </button>
        <button
          onClick={() => setSelectedCategory('spreadable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'spreadable'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Spreadable Butter
        </button>
        <button
          onClick={() => setSelectedCategory('dairy-free')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'dairy-free'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Dairy-free Butter
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleGroups.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-500">No products to display</div>
            <div className="text-sm text-gray-400 mt-2">
              Featured cards: {visibleGroups.length}
            </div>
          </div>
        ) : (
          visibleGroups.map((group) => (
            <ProductCardMinimal key={group.key} group={group} />
          ))
        )}
      </div>
    </div>
  );
};

export default ButterCards;




























