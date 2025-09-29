import React, { useState, useEffect } from 'react';
import { getStoresByChain, chainToSlug } from '../services/stores';
import api from '../api/client';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useStoreSelection } from '../contexts/StoreContext';
import { useNavigate } from 'react-router-dom';

const CHAINS = [
  { id: 'paknsave', label: "Pak'nSave" },
  { id: 'countdown', label: 'Woolworths' },
  { id: 'new_world', label: 'New World' },
];

const LocationSelector = ({ onLocationSelect, initialLocation = null, asPage = false }) => {
  console.log('LocationSelector rendering with props:', { onLocationSelect, initialLocation });

  const { selectedStore, setSelectedStore } = useStoreSelection();
  const navigate = useNavigate();
  const [chain, setChain] = useState(CHAINS[0].id);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(asPage || !localStorage.getItem('location_selected'));

  async function loadStores(c = chain) {
    setLoading(true);
    setError(null);
    try {
      const list = await getStoresByChain(c);
      console.log("stores received:", list.length);
      setStores(list);
    } catch (error) {
      console.error('Error loading stores:', error);
      setError('Failed to load stores: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStores(chain); }, [chain]);


  function nearest() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const r = await api.get("/stores/nearest/", { params: { lat: latitude, lng: longitude } });
        const store = r.data;
        localStorage.setItem("butterup:storeId", String(store.id));
        localStorage.setItem('location_selected', '1');
        setSelectedStore && setSelectedStore(store);
        if (onLocationSelect) {
          onLocationSelect(store);
        }
        if (asPage) {
          navigate('/');
        }
      },
      (err) => alert("Location error: " + err.message)
    );
  }

  function selectStoreById(idStr) {
    const id = Number(idStr);
    const store = stores.find(s => s.id === id) || null;
    if (store) {
      localStorage.setItem("butterup:storeId", String(store.id));
      localStorage.setItem('location_selected', '1');
      setSelectedStore && setSelectedStore(store);
      if (onLocationSelect) {
        onLocationSelect(store);
      }
      if (asPage) {
        navigate('/');
      }
    }
  }

  if (asPage || showWelcome) {
    return (
      <div className={asPage ? "" : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"}>
        <div className={asPage ? "bg-white rounded-lg p-8 w-full max-w-2xl mx-auto" : "bg-white rounded-lg p-8 max-w-md w-full mx-4"}>
          <div className="text-center">
            <MapPinIcon className="h-12 w-12 text-nz-green mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to ButterUp! 🧈
            </h2>
            <p className="text-gray-600 mb-6">
              Let's find the best butter prices near you. Choose your preferred store to get started.
            </p>

            <div className="space-y-4">
              <button
                onClick={nearest}
                className="w-full bg-nz-green text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <MapPinIcon className="h-5 w-5 mr-2" />
                Use My Location
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Select Store Chain:
                </label>
                <select
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nz-green focus:border-transparent"
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Select Store:
                </label>
                {loading ? (
                  <div className="w-full p-3 border border-gray-300 rounded-lg text-gray-500">
                    Loading stores…
                  </div>
                ) : error ? (
                  <div className="w-full p-3 border border-red-300 rounded-lg text-red-600 bg-red-50">
                    {error}
                  </div>
                ) : (
                  <select
                    defaultValue=""
                    onChange={(e) => selectStoreById(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nz-green focus:border-transparent"
                  >
                    <option value="">Choose a store...</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                )}
                
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LocationSelector; 