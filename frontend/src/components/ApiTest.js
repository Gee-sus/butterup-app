import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ApiTest = () => {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [paknsaveStores, setPaknsaveStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    testApis();
  }, []);

  const testApis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test 1: Get all stores
      console.log('Testing /api/stores/...');
      const storesResponse = await axios.get('/api/stores/?page_size=100');
      console.log('Stores response:', storesResponse.data);
      setStores(storesResponse.data.results || storesResponse.data || []);

      // Test 2: Get Pak'nSave stores specifically
      console.log('Testing /api/stores/by-chain/paknsave/...');
      const paknsaveResponse = await axios.get('/api/stores/by-chain/paknsave/');
      console.log('PaknSave response:', paknsaveResponse.data);
      setPaknsaveStores(paknsaveResponse.data.stores || []);

      // Test 3: Get products
      console.log('Testing /api/products/...');
      const productsResponse = await axios.get('/api/products/?page_size=100');
      console.log('Products response:', productsResponse.data);
      setProducts(productsResponse.data.results || productsResponse.data || []);

    } catch (err) {
      console.error('API test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Testing APIs...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">API Test Failed</h3>
        <p>Error: {error}</p>
        <button 
          onClick={testApis}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      <h3 className="font-bold mb-2">API Test Results</h3>
      <div className="space-y-2">
        <p><strong>Total Stores:</strong> {stores.length}</p>
        <p><strong>Pak'nSave Stores:</strong> {paknsaveStores.length}</p>
        <p><strong>Total Products:</strong> {products.length}</p>
        
        <div>
          <strong>Pak'nSave Stores:</strong>
          <ul className="ml-4 list-disc">
            {paknsaveStores.map(store => (
              <li key={store.id}>{store.name} - {store.city}</li>
            ))}
          </ul>
        </div>

        <button 
          onClick={testApis}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Again
        </button>
      </div>
    </div>
  );
};

export default ApiTest;