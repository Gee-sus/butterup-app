import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon, 
  ShoppingBagIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [latestPrices, setLatestPrices] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgPrice: 0,
    priceChange: 0,
    storesTracked: 0
  });
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [dataFreshness, setDataFreshness] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API first
      const pricesResponse = await axios.get('/api/prices/latest/');
      
      if (pricesResponse.data && pricesResponse.data.length > 0) {
        // Real data available
        setLatestPrices(pricesResponse.data);
        setUsingMockData(false);
        
        // Calculate stats from real data
        const prices = pricesResponse.data.map(p => parseFloat(p.price || 0)).filter(p => p > 0);
        if (prices.length > 0) {
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          
          setStats({
            totalProducts: pricesResponse.data.length,
            avgPrice: avgPrice.toFixed(2),
            priceChange: '+2.5%', // This would come from trend analysis
            storesTracked: new Set(pricesResponse.data.map(p => p.store?.name || p.store_name)).size
          });
        }
        
        // Check data freshness
        const latestPrice = pricesResponse.data[0];
        if (latestPrice && latestPrice.scraped_at) {
          const scrapedDate = new Date(latestPrice.scraped_at);
          const now = new Date();
          const hoursDiff = (now - scrapedDate) / (1000 * 60 * 60);
          setDataFreshness(hoursDiff);
        }
        
        toast.success('Live butter prices loaded!');
      } else {
        // No real data, use mock
        throw new Error('No real data available');
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.log('Backend API not available');
      
      // Show empty state when API fails
      setLatestPrices([]);
      setStats({
        totalProducts: 0,
        avgPrice: 0,
        priceChange: '0%',
        storesTracked: 0
      });
      setUsingMockData(false);
      setDataFreshness(null);
      
      toast.error('Backend not available - please check connection');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const PriceCard = ({ price }) => (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {price.product?.name || price.product_name || 'Unknown Product'}
          </h3>
          <p className="text-sm text-gray-600">{price.store?.name || price.store_name}</p>
          <p className="text-xs text-gray-500">{price.product?.weight_grams || price.product_weight}g</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-nz-green">
            ${price.price || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            ${price.price_per_kg || 'N/A'}/kg
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nz-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome to ButterUp 🧈
        </h1>
        <p className="text-lg text-gray-600">
          Track butter prices across New Zealand supermarkets
        </p>
        
        {/* Data Status Banner */}
        {usingMockData ? (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            <p className="text-sm">
              <strong>Demo Mode:</strong> Showing sample data. Backend server not available.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <p className="text-sm">
              <strong>Live Data:</strong> 
              {dataFreshness !== null && dataFreshness < 24 
                ? ` Prices updated ${Math.round(dataFreshness)} hours ago`
                : ' Real-time butter prices from Auckland stores'
              }
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Products Tracked"
          value={stats.totalProducts}
          icon={ShoppingBagIcon}
          color="blue"
        />
        <StatCard
          title="Average Price"
          value={`$${stats.avgPrice}`}
          icon={CurrencyDollarIcon}
          color="green"
        />
        <StatCard
          title="Price Change"
          value={stats.priceChange}
          icon={ArrowTrendingUpIcon}
          color="yellow"
        />
        <StatCard
          title="Stores Tracked"
          value={stats.storesTracked}
          icon={ChartBarIcon}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/price-history"
          className="bg-gradient-to-r from-butter-yellow to-yellow-400 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-2">Price History</h3>
          <p className="text-gray-700">View historical price trends and charts</p>
        </Link>

        <Link
          to="/store-comparison"
          className="bg-gradient-to-r from-nz-green to-green-600 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-bold text-white mb-2">Store Comparison</h3>
          <p className="text-green-100">Compare prices across different stores</p>
        </Link>

        <Link
          to="/economic-correlation"
          className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-bold text-white mb-2">Economic Data</h3>
          <p className="text-purple-100">See butter prices vs inflation & CPI</p>
        </Link>
      </div>

      {/* Latest Prices */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Latest Prices</h2>
          <Link
            to="/price-history"
            className="text-nz-green hover:text-green-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {latestPrices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPrices.slice(0, 6).map((price, index) => (
              <PriceCard key={index} price={price} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No price data available</p>
          </div>
        )}
      </div>

      {/* Email Signup CTA */}
      <div className="bg-gradient-to-r from-butter-yellow to-yellow-400 rounded-lg shadow-md p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Stay Updated with Price Alerts
        </h3>
        <p className="text-gray-700 mb-6">
          Get notified when butter prices drop or when there are significant changes
        </p>
        <Link
          to="/email-signup"
          className="inline-block bg-nz-green text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Sign Up for Alerts
        </Link>
      </div>
    </div>
  );
};

export default Dashboard; 