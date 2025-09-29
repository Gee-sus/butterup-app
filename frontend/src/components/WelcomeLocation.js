import React, { useState } from 'react';
import { useStoreSelection } from '../contexts/StoreContext';
import LocationSelector from './LocationSelector';
import { MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline';

const WelcomeLocation = () => {
  const { selectedStore, setSelectedStore } = useStoreSelection();
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  const handleLocationSelect = (store) => {
    console.log('WelcomeLocation: handleLocationSelect called with:', store);
    setSelectedStore(store);
    setShowLocationSelector(false);
  };

  console.log('WelcomeLocation rendering with selectedStore:', selectedStore);

  // Don't show welcome if store is selected
  if (selectedStore) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <SparklesIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to ButterUp! 🧈
          </h2>
          <p className="text-gray-600 mb-4">
            Track butter prices at your favorite stores and never miss the best deals.
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
            <MapPinIcon className="h-4 w-4 mr-1" />
            Choose your preferred store to get started
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowLocationSelector(true)}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <MapPinIcon className="h-4 w-4 mr-2" />
            Select Your Store
          </button>
        </div>

        {/* Features Preview */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">What you'll get:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span>Real-time butter prices from your selected store</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span>Price history and trend analysis</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span>Price alerts when prices drop</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span>Compare prices across different stores</span>
            </div>
          </div>
        </div>

        {/* Location Selector Modal */}
        {showLocationSelector && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Select Your Store</h2>
                  <button
                    onClick={() => setShowLocationSelector(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <LocationSelector onLocationSelect={handleLocationSelect} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeLocation; 