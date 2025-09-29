import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useStoreSelection } from '../contexts/StoreContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { selectedStore } = useStoreSelection();

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'My List', href: '/list' },
    { name: 'Scan', href: '/scan' },
    { name: 'Profile', href: '/profile' },
    { name: 'About', href: '/#about', isAnchor: true },
    { name: 'Price History', href: '/price-history' },
    { name: 'Store Comparison', href: '/store-comparison' },
    { name: 'Economic Correlation', href: '/economic-correlation' },
    { name: 'Price Alerts', href: '/price-alerts' },
    { name: 'Email Signup', href: '/email-signup' },
    { name: 'Wireframes', href: '/wireframes' },
    { name: 'Upload Images', href: '/upload' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b-4 border-butter-yellow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-butter-yellow rounded-full flex items-center justify-center mr-3">
                <span className="text-nz-green font-bold text-lg">🧈</span>
              </div>
              <span className="text-xl font-bold text-nz-green">ButterUp</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'text-nz-green bg-butter-cream'
                    : 'text-gray-700 hover:text-nz-green hover:bg-butter-cream'
                }`}
                onClick={item.isAnchor ? (e) => {
                  e.preventDefault();
                  const element = document.getElementById('about');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                } : undefined}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Location Settings Link */}
            <Link
              to="/location-settings"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-nz-green hover:bg-butter-cream transition-colors"
            >
              <MapPinIcon className="h-4 w-4 mr-1" />
              {selectedStore ? `${selectedStore.name} • ${(selectedStore.chain || '').replace('_',' ')}` : 'Select store'}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-nz-green hover:bg-butter-cream focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nz-green"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

                {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'text-nz-green bg-butter-cream'
                        : 'text-gray-700 hover:text-nz-green hover:bg-butter-cream'
                    }`}
                    onClick={(e) => {
                      setIsOpen(false);
                      if (item.isAnchor) {
                        e.preventDefault();
                        const element = document.getElementById('about');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Mobile Location Settings Link */}
                <Link
                  to="/location-settings"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-nz-green hover:bg-butter-cream transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  {selectedStore ? `${selectedStore.name} • ${(selectedStore.chain || '').replace('_',' ')}` : 'Select store'}
                </Link>
              </div>
            </div>
          )}
    </nav>
  );
};

export default Navbar; 
