import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const EconomicCorrelation = () => {
  const [data, setData] = useState({ prices: [], indicators: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch economic correlation data
    Promise.all([
      fetch('/api/prices/'),
      fetch('/api/economic-indicators/')
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([pricesData, indicatorsData]) => {
      setData({
        prices: pricesData.results || [],
        indicators: indicatorsData.results || []
      });
      setLoading(false);
    })
    .catch(error => {
      console.error('Error fetching economic data:', error);
      setLoading(false);
    });
  }, []);

  const chartData = {
    labels: data.prices.map(price => new Date(price.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Butter Price (NZD)',
        data: data.prices.map(price => price.price),
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'CPI Index',
        data: data.indicators.map(indicator => indicator.cpi_value),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Butter Prices vs Economic Indicators',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Price (NZD)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'CPI Index',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading economic correlation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Economic Correlation</h1>
          <p className="mt-2 text-gray-600">Compare butter prices with economic indicators</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {data.prices.length > 0 || data.indicators.length > 0 ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No economic data available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EconomicCorrelation; 