import React, { useState } from 'react';
import { EnvelopeIcon, CheckIcon } from '@heroicons/react/24/outline';

const EmailSignup = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/email-subscriptions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        console.error('Failed to subscribe');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Stay Updated</h1>
            <p className="mt-2 text-gray-600">
              Get notified about butter price changes and economic trends
            </p>
          </div>

          {subscribed ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CheckIcon className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Successfully Subscribed!
              </h2>
              <p className="mt-2 text-gray-600">
                You'll receive updates about butter prices and market trends.
              </p>
              <button
                onClick={() => setSubscribed(false)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Subscribe Another Email
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <p>By subscribing, you'll receive:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Weekly butter price updates</li>
                    <li>• Price drop alerts</li>
                    <li>• Economic trend analysis</li>
                    <li>• Store comparison insights</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  {loading ? 'Subscribing...' : 'Subscribe to Updates'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSignup; 