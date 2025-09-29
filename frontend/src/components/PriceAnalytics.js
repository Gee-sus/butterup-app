import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const PriceAnalytics = ({ productId, days = 30 }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(days);

  useEffect(() => {
    fetchAnalytics();
  }, [productId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const params = {
        days: timeRange
      };
      
      if (productId) params.product = productId;

      const response = await axios.get('/api/prices/analytics/', { params });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nz-green"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const { statistics, price_change } = analytics;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Price Analytics
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nz-green"
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Average Price */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Average Price</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(statistics.average_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Price Change */}
        <div className={`p-4 rounded-lg ${
          price_change.percentage >= 0 
            ? 'bg-gradient-to-r from-red-50 to-red-100' 
            : 'bg-gradient-to-r from-green-50 to-green-100'
        }`}>
          <div className="flex items-center">
            {price_change.percentage >= 0 ? (
              <ArrowTrendingUpIcon className="h-8 w-8 text-red-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-8 w-8 text-green-600" />
            )}
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                price_change.percentage >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                Price Change
              </p>
              <p className={`text-2xl font-bold ${
                price_change.percentage >= 0 ? 'text-red-900' : 'text-green-900'
              }`}>
                {formatPercentage(price_change.percentage)}
              </p>
            </div>
          </div>
        </div>

        {/* Highest Price */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Highest Price</p>
              <p className="text-2xl font-bold text-yellow-900">
                {formatCurrency(statistics.highest_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Lowest Price */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Lowest Price</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(statistics.lowest_price)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600 font-medium">
            {formatCurrency(statistics.lowest_price)}
          </span>
          <div className="flex-1 mx-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full"
                style={{ 
                  width: `${((statistics.average_price - statistics.lowest_price) / (statistics.highest_price - statistics.lowest_price)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          <span className="text-yellow-600 font-medium">
            {formatCurrency(statistics.highest_price)}
          </span>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Coverage</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Stores Tracked:</span>
              <span className="font-medium">{statistics.unique_stores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Products Tracked:</span>
              <span className="font-medium">{statistics.unique_products}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Period:</span>
              <span className="font-medium">{analytics.period_days} days</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Price Statistics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Lowest Price:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(statistics.min_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Highest Price:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(statistics.max_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Price Spread:</span>
              <span className="font-medium">
                {formatCurrency(statistics.max_price - statistics.min_price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-nz-green bg-opacity-10 rounded-lg">
        <h4 className="text-sm font-medium text-nz-green mb-2">Summary</h4>
        <p className="text-sm text-gray-700">
          Over the last {analytics.period_days} days, we've tracked {statistics.total_records} price points 
          across {statistics.unique_stores} stores and {statistics.unique_products} products. 
          The average price is {formatCurrency(statistics.avg_price)} with a 
          {price_change.percentage >= 0 ? 'n increase' : ' decrease'} of {formatPercentage(Math.abs(price_change.percentage))} 
          during this period.
        </p>
      </div>
    </div>
  );
};

export default PriceAnalytics; 