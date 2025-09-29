import React, { useState } from 'react';
import { 
  CameraIcon, 
  PhotoIcon, 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ScanScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleRequestPermission = async () => {
    try {
      // Mock permission request
      setHasPermission(true);
      setIsScanning(true);
      
      // Simulate scanning process
      setTimeout(() => {
        setScanResult({
          product: {
            id: 1,
            name: 'Anchor Butter 500g',
            brand: 'Anchor',
            price: 6.39
          },
          store: {
            id: 1,
            name: "Pak'nSave Auckland",
            chain: 'paknsave'
          },
          confidence: 0.95
        });
        setIsScanning(false);
      }, 2000);
    } catch (error) {
      console.error('Permission denied:', error);
      setHasPermission(false);
    }
  };

  const handleSubmitContribution = async () => {
    if (!scanResult) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contributions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: scanResult.product.id,
          store_id: scanResult.store.id,
          price: scanResult.product.price,
          unit: 'each'
        }),
      });

      if (response.ok) {
        setShowSnackbar(true);
        // Hide snackbar after 3 seconds
        setTimeout(() => setShowSnackbar(false), 3000);
        // Reset scan result
        setScanResult(null);
      } else {
        throw new Error('Failed to submit contribution');
      }
    } catch (error) {
      console.error('Error submitting contribution:', error);
      alert('Failed to submit contribution. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryScan = () => {
    setScanResult(null);
    setIsScanning(true);
    
    // Simulate new scan
    setTimeout(() => {
      setScanResult({
        product: {
          id: 1,
          name: 'Anchor Butter 500g',
          brand: 'Anchor',
          price: 6.39
        },
        store: {
          id: 1,
          name: "Pak'nSave Auckland",
          chain: 'paknsave'
        },
        confidence: 0.95
      });
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Product</h1>
          <p className="text-gray-600">Scan a butter product to contribute price data</p>
        </div>

        {/* Permission Request */}
        {hasPermission === null && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Camera Permission Required</h2>
            <p className="text-gray-600 mb-6">
              We need access to your camera to scan product barcodes and contribute price data to help the community.
            </p>
            <button
              onClick={handleRequestPermission}
              className="bg-nz-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Open Camera
            </button>
          </div>
        )}

        {/* Permission Denied */}
        {hasPermission === false && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <XCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Camera Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Please enable camera access in your browser settings to scan products.
            </p>
            <button
              onClick={() => setHasPermission(null)}
              className="bg-nz-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Scanning State */}
        {isScanning && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-nz-green mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Scanning...</h2>
            <p className="text-gray-600">Point your camera at the product barcode</p>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && !isScanning && (
          <div className="space-y-6">
            {/* Mock Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Preview</h2>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Mock camera preview</p>
              </div>
            </div>

            {/* Product Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Product Detected</h3>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{scanResult.product.brand}</p>
                  <p className="text-gray-600">{scanResult.product.name}</p>
                  <p className="text-sm text-gray-500">Confidence: {Math.round(scanResult.confidence * 100)}%</p>
                </div>
              </div>

              {/* Store Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <InformationCircleIcon className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Store Location</h3>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{scanResult.store.name}</p>
                  <p className="text-gray-600 capitalize">{scanResult.store.chain.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Price Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">💰</span>
                  <h3 className="text-lg font-semibold text-gray-900">Current Price</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-nz-green">${scanResult.product.price}</p>
                  <p className="text-sm text-gray-500">per unit</p>
                </div>
              </div>

              {/* Action Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-semibold text-gray-900">Contribute Data</h3>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Help the community by contributing this price data
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSubmitContribution}
                      disabled={isSubmitting}
                      className="flex-1 bg-nz-green text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                    <button
                      onClick={handleRetryScan}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Snackbar */}
        {showSnackbar && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span>Thanks! You earned 5 points</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanScreen;
