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
  Filler
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PriceHistoryChart = ({ productId, storeId, days = 90 }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(days);
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchHistoryData();
  }, [productId, storeId, timeRange, groupBy]);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      
      const params = {
        days: timeRange,
        group_by: groupBy
      };
      
      if (productId) params.product = productId;
      if (storeId) params.store = storeId;

      const response = await axios.get('/api/prices/history/', { params });
      
      if (response.data.data && response.data.data.length > 0) {
        const data = response.data.data;
        
        const chartConfig = {
          labels: data.map(item => new Date(item.date).toLocaleDateString()),
          datasets: [
            {
              label: 'Average Price',
              data: data.map(item => item.avg_price),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1,
              fill: true
            },
            {
              label: 'Minimum Price',
              data: data.map(item => item.min_price),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.1,
              fill: false
            },
            {
              label: 'Maximum Price',
              data: data.map(item => item.max_price),
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.1,
              fill: false
            }
          ]
        };
        
        setChartData(chartConfig);
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
      toast.error('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Butter Price History',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price ($)'
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nz-green"></div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No historical data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Price History Chart
        </h3>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nz-green"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Showing {chartData.labels.length} data points</p>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default PriceHistoryChart; 