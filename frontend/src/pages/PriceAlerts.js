import React, { useState, useEffect } from 'react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';

const PriceAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch price alerts data
    fetch('/api/price-alerts/')
      .then(response => response.json())
      .then(data => {
        setAlerts(data.results || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching price alerts:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading price alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Price Alerts</h1>
          <p className="mt-2 text-gray-600">Manage your butter price notifications</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          {alerts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {alert.is_active ? (
                        <BellIcon className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <BellSlashIcon className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.product?.name || 'Butter'} - {alert.store?.name || 'Store'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Alert when price {alert.condition} ${alert.target_price}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No price alerts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new price alert.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceAlerts; 