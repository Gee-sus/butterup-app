import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StoreComparison = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch store comparison data
    fetch('/api/stores/')
      .then(response => response.json())
      .then(data => {
        setStores(data.results || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching store data:', error);
        setLoading(false);
      });
  }, []);

  const chartData = {
    labels: stores.map(store => store.name),
    datasets: [
      {
        label: 'Average Price (NZD)',
        data: stores.map(store => store.average_price || 0),
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Store Price Comparison',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Price (NZD)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Store Comparison</h1>
          <p className="mt-2 text-gray-600">Compare butter prices across different stores</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {stores.length > 0 ? (
            <Bar data={chartData} options={options} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No store data available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreComparison; 