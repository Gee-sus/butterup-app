import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { slugFromProduct } from '../utils/slug';
import { imageUrlFromProduct, isFallbackImageUrl } from '../utils/productImages';
import { useStoreSelection } from '../contexts/StoreContext';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { AddShoppingCart as AddShoppingCartIcon } from '@mui/icons-material';

const ProductCardMinimal = ({ group, onProductClick = null }) => {
  console.log('ProductCardMinimal received group:', group);
  const { sample, items, imageCandidates = [] } = group;
  const { selectedStore } = useStoreSelection();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [adding, setAdding] = useState(false);

  // Choose the item with the lowest numeric price; fallback to sample
  const lowestPriceItem = items && items.length > 0 ? items.reduce((lowest, item) => {
    const curPrice = item?.price ?? item?.price_value;
    const lowPrice = lowest?.price ?? lowest?.price_value;

    const cur = typeof curPrice === 'number' ? curPrice : parseFloat(String(curPrice ?? '').replace(/[^0-9.]/g, ''));
    const low = typeof lowPrice === 'number' ? lowPrice : parseFloat(String(lowPrice ?? '').replace(/[^0-9.]/g, ''));

    if (isNaN(low) && !isNaN(cur)) return item;
    if (!isNaN(cur) && !isNaN(low) && cur < low) return item;
    return lowest;
  }, items[0]) : null;

  // Use the hero (priced) item, or fallback to sample
  const hero = lowestPriceItem || sample;

  console.log('Hero product data:', hero);

  const fallbackOrigin = 'http://127.0.0.1:8000';
  const envOrigin = import.meta.env?.VITE_API_ORIGIN?.trim();
  const envApiBase = import.meta.env?.VITE_API_BASE?.trim();
  const API_BASE = (
    (envOrigin && envOrigin.length)
      ? envOrigin
      : (envApiBase && envApiBase.length)
        ? envApiBase.replace(/\/api$/, '')
        : fallbackOrigin
  ).replace(/\/+$/, '');

  const collectProductCandidates = () => {
    const collected = [];
    const seen = new Set();

    const addCandidate = (candidate) => {
      if (!candidate || typeof candidate !== 'object') return;
      if (seen.has(candidate)) return;
      seen.add(candidate);
      collected.push(candidate);

      if (candidate.originalProduct && typeof candidate.originalProduct === 'object') {
        addCandidate(candidate.originalProduct);
      }
      if (candidate.raw && typeof candidate.raw === 'object') {
        addCandidate(candidate.raw);
      }
      if (candidate.primary_product && typeof candidate.primary_product === 'object') {
        addCandidate(candidate.primary_product);
      }
      if (Array.isArray(candidate.imageCandidates)) {
        candidate.imageCandidates.forEach(addCandidate);
      }
    };

    addCandidate(hero);
    addCandidate(sample);
    (items || []).forEach(addCandidate);
    (imageCandidates || []).forEach(addCandidate);

    return collected;
  };

  const candidateProducts = collectProductCandidates();

  let resolvedSrc = null;
  let fallbackSrc = null;

  for (const candidate of candidateProducts) {
    const url = imageUrlFromProduct(candidate);
    if (!url) continue;

    if (!isFallbackImageUrl(url)) {
      resolvedSrc = url;
      break;
    }

    if (!fallbackSrc) {
      fallbackSrc = url;
    }
  }

  const src = resolvedSrc || fallbackSrc || `${API_BASE}/media/products/placeholder.png`;

  console.log('Resolved image src for', hero?.name, ':', src);

  const title = `${hero?.brand || ''} ${hero?.name || ''}`.trim();
  const href = `/product/${slugFromProduct(hero)}`;

  // Add to list functionality
  const addToList = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedStore) {
      setSnackbar({
        open: true,
        message: 'Please select a store first',
        severity: 'warning'
      });
      return;
    }

    if (!hero?.originalProduct?.id) {
      setSnackbar({
        open: true,
        message: 'Product not available',
        severity: 'error'
      });
      return;
    }

    setAdding(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/list/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: hero.originalProduct.id,
          store: selectedStore.id
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Added to your list!',
          severity: 'success'
        });
      } else if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('already in your list')) {
          setSnackbar({
            open: true,
            message: 'Already in your list',
            severity: 'info'
          });
        } else {
          throw new Error(errorData.error || 'Failed to add to list');
        }
      } else {
        throw new Error('Failed to add to list');
      }
    } catch (error) {
      console.error('Error adding to list:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add to list',
        severity: 'error'
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative">
      <Link
        to={href}
        onClick={onProductClick ? () => onProductClick(hero) : undefined}
        className="rounded-xl border border-neutral-200 bg-white p-4 gap-3 cursor-pointer hover:border-neutral-300 transition-colors block"
      >
      {/* Product Image */}
      <div className="h-[180px] bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={src}
          alt={title}
          className="w-full h-full object-cover"
          onLoad={() => console.log('Image loaded successfully:', src)}
          onError={(e) => {
            console.log('Image failed to load:', e.currentTarget.src);
            // Avoid infinite loops by checking if we're already showing a fallback
            if (e.currentTarget.src.includes('placeholder')) {
              console.log('Already showing placeholder, stopping fallback chain');
              return; // Already showing fallback, don't change again
            }

            // Try different fallbacks in order
            if (!e.currentTarget.src.includes('/static/brands/') && hero?.brand) {
              console.log('Trying brand fallback for:', hero.brand);
              e.currentTarget.src = `${API_BASE}/static/brands/${(hero.brand || '').toLowerCase().replace(/\s+/g, '-')}.png`;
            } else if (!e.currentTarget.src.includes('placeholder.png')) {
              console.log('Trying placeholder fallback');
              e.currentTarget.src = `${API_BASE}/media/products/placeholder.png`;
            }
          }}
        />
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {title}
        </h3>

        {/* Brand/Size/Type Chips */}
        <div className="flex flex-wrap gap-1">
          {hero?.brand && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {hero.brand}
            </span>
          )}
          {Number.isFinite(hero?.grams) && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {hero.grams}g
            </span>
          )}
        </div>

        {/* Price */}
        <div className="pt-2">
          <div className="text-lg font-bold text-green-600">
            {(() => {
              const price = hero?.price ?? hero?.price_value;
              console.log('Price for', hero?.name, ':', price, typeof price);

              if (price != null) {
                const numPrice = typeof price === 'number' ? price : parseFloat(price);
                if (!isNaN(numPrice)) {
                  return `$${numPrice.toFixed(2)}`;
                }
              }
              return '-';
            })()}
          </div>
        </div>
      </div>
      </Link>

      {/* Add to List Button */}
      <div className="absolute top-2 right-2">
        <IconButton
          onClick={addToList}
          disabled={adding}
          size="small"
          className="bg-white/90 hover:bg-white shadow-md"
          title="Add to shopping list"
        >
          <AddShoppingCartIcon className="h-4 w-4 text-blue-600" />
        </IconButton>
      </div>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ProductCardMinimal;
