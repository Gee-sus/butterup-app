import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import LocationSelector from '../components/LocationSelector';
import { MapPinIcon, CogIcon } from '@heroicons/react/24/outline';

const LocationSettings = () => {
  const { selectedStore, updateSelectedStore, clearSelectedStore } = useLocation();
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  const handleLocationSelect = (store) => {
    console.log('LocationSettings: handleLocationSelect called with:', store);
    updateSelectedStore(store);
    setShowLocationSelector(false);
  };

  const handleClearLocation = () => {
    console.log('LocationSettings: handleClearLocation called');
    clearSelectedStore();
  };

  console.log('LocationSettings rendering with selectedStore:', selectedStore);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <CogIcon className="h-6 w-6 text-gray-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Location Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your preferred store for price tracking and alerts.
        </p>
      </div>

      {/* Current Location Display */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPinIcon className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Store</h2>
              {selectedStore ? (
                <div className="mt-1">
                  <p className="text-gray-900 font-medium">{selectedStore.name}</p>
                  <p className="text-sm text-gray-600">{selectedStore.location}</p>
                  {selectedStore.address && (
                    <p className="text-xs text-gray-500 mt-1">{selectedStore.address}</p>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    {selectedStore.chain}
                  </span>
                </div>
              ) : (
                <p className="text-gray-500 mt-1">No store selected</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowLocationSelector(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedStore ? 'Change Store' : 'Select Store'}
            </button>
            {selectedStore && (
              <button
                onClick={handleClearLocation}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Selector Modal */}
      {showLocationSelector && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Select Your Store</h2>
                <button
                  onClick={() => setShowLocationSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
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

      {/* Information Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How Location Works</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3"></div>
            <p>Your selected store determines which prices and products are shown</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3"></div>
            <p>Price alerts will be based on your selected store</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3"></div>
            <p>You can change your store anytime from this settings page</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSettings; 