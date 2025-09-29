import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { groupByCanonicalProduct } from '../utils/groupProducts';
import { parseSlug } from '../utils/slug';
import { imageUrlFromProduct } from '../utils/productImages';

// Sample product data (in real app, this would come from API)
const butterData = [
  // Anchor Butter 500g - All stores
  {
    id: 'countdown_anchor_500g',
    name: 'Anchor Pure Butter 500g',
    brand: 'Anchor',
    type: 'Salted',
    store: 'Woolworths',
    price_per_100g: '$2.20',
    total_price: '$11.00',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: true,
    gtin: '3017620422003'
  },
  {
    id: 'paknsave_anchor_500g',
    name: 'Anchor Pure Butter 500g',
    brand: 'Anchor',
    type: 'Salted',
    store: 'Pak\'nSave',
    price_per_100g: '$2.10',
    total_price: '$10.50',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: true,
    gtin: '3017620422003'
  },
  {
    id: 'newworld_anchor_500g',
    name: 'Anchor Pure Butter 500g',
    brand: 'Anchor',
    type: 'Salted',
    store: 'New World',
    price_per_100g: '$2.25',
    total_price: '$11.25',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 11.25,
    is_500g: true,
    gtin: '3017620422003'
  },
  
  // Mainland Butter 500g Salted - All stores
  {
    id: 'countdown_mainland_500g_salted',
    name: 'Mainland Butter Salted 500g',
    brand: 'Mainland',
    type: 'Salted',
    store: 'Woolworths',
    price_per_100g: '$2.18',
    total_price: '$10.90',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 10.90,
    is_500g: true,
    gtin: '3017620425035'
  },
  {
    id: 'paknsave_mainland_500g_salted',
    name: 'Mainland Butter Salted 500g',
    brand: 'Mainland',
    type: 'Salted',
    store: 'Pak\'nSave',
    price_per_100g: '$2.08',
    total_price: '$10.40',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 10.40,
    is_500g: true,
    gtin: '3017620425035'
  },
  {
    id: 'newworld_mainland_500g_salted',
    name: 'Mainland Butter Salted 500g',
    brand: 'Mainland',
    type: 'Salted',
    store: 'New World',
    price_per_100g: '$2.22',
    total_price: '$11.10',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 11.10,
    is_500g: true,
    gtin: '3017620425035'
  },
  
  // Mainland Butter 500g Unsalted - All stores
  {
    id: 'countdown_mainland_500g_unsalted',
    name: 'Mainland Butter Unsalted 500g',
    brand: 'Mainland',
    type: 'Unsalted',
    store: 'Woolworths',
    price_per_100g: '$2.20',
    total_price: '$11.00',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: true,
    gtin: '3017620425036'
  },
  {
    id: 'paknsave_mainland_500g_unsalted',
    name: 'Mainland Butter Unsalted 500g',
    brand: 'Mainland',
    type: 'Unsalted',
    store: 'Pak\'nSave',
    price_per_100g: '$2.10',
    total_price: '$10.50',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: true,
    gtin: '3017620425036'
  },
  {
    id: 'newworld_mainland_500g_unsalted',
    name: 'Mainland Butter Unsalted 500g',
    brand: 'Mainland',
    type: 'Unsalted',
    store: 'New World',
    price_per_100g: '$2.25',
    total_price: '$11.25',
    size_g: 500,
    last_updated: '2025-08-14',
    price_value: 11.25,
    is_500g: true,
    gtin: '3017620425036'
  },
  
  // Lewis Road Creamery 250g - All stores
  {
    id: 'countdown_lewis_road_250g_unsalted',
    name: 'Lewis Road Creamery Premium Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Unsalted',
    store: 'Woolworths',
    price_per_100g: '$4.40',
    total_price: '$11.00',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: false,
    gtin: '9415007001234'
  },
  {
    id: 'paknsave_lewis_road_250g_unsalted',
    name: 'Lewis Road Creamery Premium Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Unsalted',
    store: 'Pak\'nSave',
    price_per_100g: '$4.20',
    total_price: '$10.50',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: false,
    gtin: '9415007001234'
  },
  {
    id: 'newworld_lewis_road_250g_unsalted',
    name: 'Lewis Road Creamery Premium Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Unsalted',
    store: 'New World',
    price_per_100g: '$4.50',
    total_price: '$11.25',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 11.25,
    is_500g: false,
    gtin: '9415007001234'
  },
  
  // Lewis Road Creamery 250g Salted - All stores
  {
    id: 'countdown_lewis_road_250g_salted',
    name: 'Lewis Road Creamery Premium Lightly Salted Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Lightly Salted',
    store: 'Woolworths',
    price_per_100g: '$4.40',
    total_price: '$11.00',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: false,
    gtin: '9415007001241'
  },
  {
    id: 'paknsave_lewis_road_250g_salted',
    name: 'Lewis Road Creamery Premium Lightly Salted Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Lightly Salted',
    store: 'Pak\'nSave',
    price_per_100g: '$4.20',
    total_price: '$10.50',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: false,
    gtin: '9415007001241'
  },
  {
    id: 'newworld_lewis_road_250g_salted',
    name: 'Lewis Road Creamery Premium Lightly Salted Butter 250g',
    brand: 'Lewis Road Creamery',
    type: 'Lightly Salted',
    store: 'New World',
    price_per_100g: '$4.50',
    total_price: '$11.25',
    size_g: 250,
    last_updated: '2025-08-14',
    price_value: 11.25,
    is_500g: false,
    gtin: '9415007001241'
  },
  
  // Petit Normand 200g - All stores
  {
    id: 'countdown_petit_normand_200g_unsalted',
    name: 'Petit Normand Unsalted Butter 200g',
    brand: 'Petit Normand',
    type: 'Unsalted',
    store: 'Woolworths',
    price_per_100g: '$5.50',
    total_price: '$11.00',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: false,
    gtin: '9415007001272'
  },
  {
    id: 'paknsave_petit_normand_200g_unsalted',
    name: 'Petit Normand Unsalted Butter 200g',
    brand: 'Petit Normand',
    type: 'Unsalted',
    store: 'Pak\'nSave',
    price_per_100g: '$5.25',
    total_price: '$10.50',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: false,
    gtin: '9415007001272'
  },
  {
    id: 'newworld_petit_normand_200g_unsalted',
    name: 'Petit Normand Unsalted Butter 200g',
    brand: 'Petit Normand',
    type: 'Unsalted',
    store: 'New World',
    price_per_100g: '$5.75',
    total_price: '$11.50',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 11.50,
    is_500g: false,
    gtin: '9415007001272'
  },
  
  // Petit Normand 200g Salted - All stores
  {
    id: 'countdown_petit_normand_200g_salted',
    name: 'Petit Normand Salted Butter 200g',
    brand: 'Petit Normand',
    type: 'Salted',
    store: 'Woolworths',
    price_per_100g: '$5.50',
    total_price: '$11.00',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 11.00,
    is_500g: false,
    gtin: '9415007001289'
  },
  {
    id: 'paknsave_petit_normand_200g_salted',
    name: 'Petit Normand Salted Butter 200g',
    brand: 'Petit Normand',
    type: 'Salted',
    store: 'Pak\'nSave',
    price_per_100g: '$5.25',
    total_price: '$10.50',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 10.50,
    is_500g: false,
    gtin: '9415007001289'
  },
  {
    id: 'newworld_petit_normand_200g_salted',
    name: 'Petit Normand Salted Butter 200g',
    brand: 'Petit Normand',
    type: 'Salted',
    store: 'New World',
    price_per_100g: '$5.75',
    total_price: '$11.50',
    size_g: 200,
    last_updated: '2025-08-14',
    price_value: 11.50,
    is_500g: false,
    gtin: '9415007001289'
  }
];

// Helper function to find group by key
const findByKeyOrNull = (key) => {
  const groups = groupByCanonicalProduct(butterData);
  return groups.find(group => group.key === key) || null;
};

const ProductDetails = () => {
  const { key } = useParams();
  const [nutritionData, setNutritionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Find the product group or parse from slug
  const group = findByKeyOrNull(key);
  const sample = group?.sample ?? parseSlug(key);
  const items = group?.items ?? [];
  
  useEffect(() => {
    const fetchNutritionData = async () => {
      if (!sample) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/nutrition/${key}/`);
        if (!response.ok) {
          throw new Error('Nutrition data not found');
        }
        const data = await response.json();
        setNutritionData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNutritionData();
  }, [key, sample]);
  
  if (!sample) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Get image URL using the utility function
  const src = imageUrlFromProduct(sample);
  
  // Find the lowest price item (only if items exist)
  const lowestPriceItem = items.length > 0 ? items.reduce((lowest, item) => {
    const currentPrice = parseFloat(item.price?.replace(/[^0-9.]/g, '') || item.price);
    const lowestPrice = parseFloat(lowest.price?.replace(/[^0-9.]/g, '') || lowest.price);
    return currentPrice < lowestPrice ? item : lowest;
  }, items[0]) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={src}
              alt={`${sample?.brand ?? ''} ${sample?.name ?? ''}`}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = src.includes('placeholder.png') ? src : src.replace(/\/media\/products\/.*$/, '/media/products/placeholder.png'); }}
            />
          </div>
          
          {/* Product Info */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {sample.name || `${sample.brand} Butter ${sample.size_g}g`}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {sample.brand}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                {sample.size_g}g
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                {sample.type}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing and Details */}
        <div className="space-y-6">
          {/* Pricing - only show if items exist */}
          {items.length > 0 ? (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lowest price:</span>
                  <span className="text-xl font-bold text-green-600">
                    {lowestPriceItem.price} at {lowestPriceItem.store}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">All stores:</h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.store}</span>
                        <span className="font-medium">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
              <p className="text-gray-500 text-sm">Prices will appear once loaded</p>
            </div>
          )}

          {/* Product Details */}
          {loading && (
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-6">
              <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Nutrition Data</h2>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {nutritionData && (
            <div className="space-y-6">
              {/* Nutrition */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Nutrition Information</h2>
                  {nutritionData.is_stale && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Needs update
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium">Nutrient</th>
                        <th className="text-left py-2 font-medium">Per 100g</th>
                        <th className="text-left py-2 font-medium">Per {nutritionData.serving_g}g serve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(nutritionData.nutrition_per_100g).map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-100">
                          <td className="py-2 text-gray-600 font-medium">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td className="py-2 font-medium">{value}</td>
                          <td className="py-2 text-gray-600">{nutritionData.nutrition_per_serving[key]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allergens */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Allergens</h2>
                <p className="text-gray-700">{nutritionData.allergens.join(', ')}</p>
              </div>

              {/* Country of Origin */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Country of Origin</h2>
                <p className="text-gray-700">{nutritionData.origin}</p>
              </div>

              {/* Claims */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Claims</h2>
                <ul className="space-y-1">
                  {nutritionData.claims.map((claim, index) => (
                    <li key={index} className="text-gray-700">• {claim}</li>
                  ))}
                </ul>
              </div>

              {/* Storage */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Storage</h2>
                <p className="text-gray-700">{nutritionData.storage}</p>
              </div>

              {/* Warnings */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Warnings</h2>
                <ul className="space-y-1">
                  {nutritionData.warnings.map((warning, index) => (
                    <li key={index} className="text-gray-700">• {warning}</li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-100">
                Last updated: {new Date(nutritionData.last_verified_at).toLocaleDateString()} • Source: {nutritionData.source}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
