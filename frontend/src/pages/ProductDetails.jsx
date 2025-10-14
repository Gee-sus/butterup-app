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
  const [servingG, setServingG] = useState(25);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  
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

  // Optionally fetch ratings summary and sample reviews (graceful fallback if endpoints are missing)
  useEffect(() => {
    let isMounted = true;
    const fetchRatings = async () => {
      if (!sample) {
        return;
      }
      try {
        const summaryRes = await fetch(`/api/products/${key}/ratings/summary`);
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          if (isMounted) {
            setRatingSummary(summary);
          }
        }
      } catch (_) {
        // ignore
      }
      try {
        const reviewsRes = await fetch(`/api/products/${key}/reviews`);
        if (reviewsRes.ok) {
          const list = await reviewsRes.json();
          if (Array.isArray(list) && isMounted) {
            setReviews(list.slice(0, 3));
          }
        }
      } catch (_) {
        // ignore
      }
    };
    fetchRatings();
    return () => {
      isMounted = false;
    };
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
  
  // Derived helpers for calories, exercise, weight and ratings blocks
  const CaloriesText = ({ caloriesPer100, servingG }) => {
    let text = '-';
    if (typeof caloriesPer100 === 'number') {
      const kcal = caloriesPer100 * (servingG / 100);
      text = String(Math.round(kcal)) + ' kcal';
    }
    return <div className="text-lg font-semibold">{text}</div>;
  };

  const ExerciseList = ({ caloriesPer100, servingG }) => {
    const weightKg = 70;
    const METS = { briskWalk: 4.3, running: 9.8, rowing: 7.0, swimming: 6.0 };
    let kcal = null;
    if (typeof caloriesPer100 === 'number') {
      kcal = caloriesPer100 * (servingG / 100);
    }
    const minutesFor = (k, met) => {
      if (!k || !met) return 0;
      const mins = Math.round((k * 200) / (met * weightKg));
      return mins < 1 ? 1 : mins;
    };
    return (
      <ul className="grid grid-cols-2 gap-3 text-sm">
        <li>Brisk walk: {minutesFor(kcal, METS.briskWalk)} min</li>
        <li>Running: {minutesFor(kcal, METS.running)} min</li>
        <li>Rowing: {minutesFor(kcal, METS.rowing)} min</li>
        <li>Swimming: {minutesFor(kcal, METS.swimming)} min</li>
      </ul>
    );
  };

  const WeightGain = ({ caloriesPer100, servingG }) => {
    let text = '-';
    if (typeof caloriesPer100 === 'number') {
      const kcal = caloriesPer100 * (servingG / 100);
      const grams = Math.round((kcal / 7700) * 1000);
      const clamped = grams < 0 ? 0 : grams;
      text = `~${clamped} g (rough estimate)`;
    }
    return <p className="text-sm text-gray-700">{text}</p>;
  };

  const RatingsBlock = ({ ratingSummary, reviews }) => {
    const toStars = (score10) => {
      const num = Number(score10);
      if (Number.isNaN(num)) return 0;
      return Math.round(num / 2);
    };
    const Star = ({ filled }) => {
      let cls = 'text-gray-300';
      if (filled) cls = 'text-yellow-500';
      return (
        <svg className={cls} width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.175 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      );
    };
    const stars = [];
    const starCount = toStars(ratingSummary && ratingSummary.average_overall);
    for (let i = 0; i < 5; i += 1) {
      const filled = i < starCount;
      stars.push(<Star key={i} filled={filled} />);
    }
    const countText = ratingSummary && ratingSummary.count ? ratingSummary.count : 0;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          {stars}
          <span className="text-sm text-gray-600">({countText})</span>
        </div>
        {reviews && reviews.length > 0 && (
          <ul className="text-sm text-gray-700 list-disc pl-5">
            {reviews.map((r, idx) => {
              const txt = r && (r.text || r.comment || '');
              return <li key={idx}>{txt}</li>;
            })}
          </ul>
        )}
      </div>
    );
  };
  
  // Minimal three-store pricing and cheapest highlight
  const desiredStores = ['Woolworths', "Pak'nSave", 'New World'];
  const threeStores = [];
  for (let i = 0; i < desiredStores.length; i += 1) {
    const label = desiredStores[i];
    let found = null;
    for (let j = 0; j < items.length; j += 1) {
      const it = items[j];
      if (it && it.store === label) {
        found = it;
        break;
      }
    }
    if (found && typeof found.price_value === 'number') {
      threeStores.push({ label, value: found.price_value });
    }
  }
  let cheapest = null;
  for (let i = 0; i < threeStores.length; i += 1) {
    const s = threeStores[i];
    if (cheapest === null) {
      cheapest = s;
    } else if (s.value < cheapest.value) {
      cheapest = s;
    }
  }

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
          {threeStores.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="space-y-2">
                {threeStores.map((s) => {
                  let rowClass = 'flex justify-between text-sm';
                  if (cheapest && s.label === cheapest.label) {
                    rowClass = rowClass + ' bg-green-50 font-semibold rounded px-2 py-1';
                  }
                  const priceText = '$' + s.value.toFixed(2);
                  return (
                    <div key={s.label} className={rowClass}>
                      <span className="text-gray-700">{s.label}</span>
                      <span>{priceText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {threeStores.length === 0 && (
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
              {/* Serving size & Calories */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Serving size & Calories</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={5}
                      value={servingG}
                      onChange={(e) => setServingG(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={servingG}
                      onChange={(e) => setServingG(Number(e.target.value))}
                      className="w-20 border rounded px-2 py-1"
                    />
                    <span className="text-sm text-gray-600">g</span>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-sm text-gray-600">Calories for serving</div>
                    <CaloriesText caloriesPer100={nutritionData.nutrition_per_100g && nutritionData.nutrition_per_100g.calories_kcal} servingG={servingG} />
                  </div>
                </div>
              </div>

              {/* Exercise equivalents */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Exercise equivalents</h2>
                <ExerciseList caloriesPer100={nutritionData.nutrition_per_100g && nutritionData.nutrition_per_100g.calories_kcal} servingG={servingG} />
              </div>

              {/* Potential weight gain */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Potential weight gain</h2>
                <WeightGain caloriesPer100={nutritionData.nutrition_per_100g && nutritionData.nutrition_per_100g.calories_kcal} servingG={servingG} />
                <p className="text-xs text-gray-500 mt-1">Assumes 7,700 kcal ≈ 1 kg body fat</p>
              </div>

              {/* Community Ratings */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Community Ratings</h2>
                <RatingsBlock ratingSummary={ratingSummary} reviews={reviews} />
              </div>
              {/* Nutrition */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Nutrition Information</h2>
                  {nutritionData.is_stale && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Needs update</span>}
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

              {/* What people say (factoids) */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">What people say</h2>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  <li>“Great lamination for croissants.”</li>
                  <li>“Browns evenly for pan-seared steaks.”</li>
                  <li>“Reliable for buttercream frosting.”</li>
                </ul>
              </div>

              {/* Page layout ASCII wireframe */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Page layout (ASCII)</h2>
                <pre className="text-xs leading-4 overflow-auto">{`
----------------------------------------------------------------------------------
| ← Back to Dashboard                                                              |
----------------------------------------------------------------------------------
|                              [ Product Image (square) ]                          |
|                                                                                  |
| Product Title: {brand} {name} ({size_g}g)                                        |
| Tags: [Brand] [Size_g] [Type]                                                    |
----------------------------------------------------------------------------------
| Pricing (three stores, cheapest highlighted)                                     |
|  Woolworths          $10.90                                                      |
|  Pak'nSave           $10.40   [LOWEST]                                           |
|  New World           $11.10                                                      |
----------------------------------------------------------------------------------
| Community Ratings    ★★★★☆  (4.2/5)  (123 ratings)                               |
|  "Smooth and creamy" • "Great for baking"                                        |
----------------------------------------------------------------------------------
| Serving size & Calories                                                           |
|  Serving size: [ slider ] [ 25 ] g   |   Calories for serving: {kcal} kcal       |
----------------------------------------------------------------------------------
| Exercise equivalents                                                              |
|  Brisk walk:  {min} min   Running: {min} min   Rowing: {min} min   Swimming: {min}|
----------------------------------------------------------------------------------
| Potential weight gain                                                             |
|  ~{grams} g (rough estimate) • 7,700 kcal ≈ 1 kg body fat                         |
----------------------------------------------------------------------------------
| Nutrition Information   | Allergens | Origin | Claims | Storage | Warnings        |
----------------------------------------------------------------------------------
| What people say (factoids):                                                      |
|  - “Great lamination for croissants.”                                            |
|  - “Browns evenly for pan-seared steaks.”                                        |
|  - “Reliable for buttercream frosting.”                                          |
----------------------------------------------------------------------------------
| Footer: Last updated • Source                                                    |
----------------------------------------------------------------------------------
                `}</pre>
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
