import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PriceHistoryChart from '../components/PriceHistoryChart';
import PriceAnalytics from '../components/PriceAnalytics';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const PriceHistory = () => {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [activeTab, setActiveTab] = useState('chart');
  const fetchedOnce = useRef(false);

  // Hoisted function to load products
  async function loadProducts() {
    try {
      const response = await axios.get('/api/products/');
      console.log("Products API response:", response.data);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  // Hoisted function to load stores
  async function loadStores() {
    try {
      const response = await axios.get('/api/stores/');
      console.log("Stores API response:", response.data);
      setStores(response.data.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  }

  useEffect(() => {
    // Guard to prevent React 18 StrictMode double-fetch
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    
    loadProducts();
    loadStores();
  }, []);


  const tabs = [
    { id: 'chart', name: 'Price Chart', icon: ChartBarIcon },
    { id: 'analytics', name: 'Analytics', icon: ArrowTrendingUpIcon },
    { id: 'export', name: 'Export Data', icon: DocumentTextIcon },
  ];

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProduct) params.append('product', selectedProduct);
      if (selectedStore) params.append('store', selectedStore);
      
      const response = await axios.get('/api/prices/history/', { 
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'butter_prices.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Price History & Analytics</h1>
        <p className="text-gray-600">Track butter price trends and analyze historical data</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nz-green"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.brand} {product.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nz-green"
            >
              <option value="">All Stores</option>
              {Array.isArray(stores) && stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-nz-green text-nz-green'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'chart' && (
          <PriceHistoryChart 
            productId={selectedProduct || null}
            storeId={selectedStore || null}
          />
        )}
        
        {activeTab === 'analytics' && (
          <PriceAnalytics 
            productId={selectedProduct || null}
          />
        )}
        
        {activeTab === 'export' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Export Data
            </h3>
            <p className="text-gray-600 mb-4">
              Export historical price data in CSV or JSON format. You can filter by product and store above.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleExport}
                className="bg-nz-green text-white px-4 py-2 rounded-md hover:bg-nz-green-dark transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistory; 