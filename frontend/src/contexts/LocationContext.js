import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved store on mount
  useEffect(() => {
    const savedStore = localStorage.getItem('selectedStore');
    if (savedStore) {
      try {
        const store = JSON.parse(savedStore);
        setSelectedStore(store);
      } catch (error) {
        console.error('Error parsing saved store:', error);
        localStorage.removeItem('selectedStore');
      }
    }
    setLoading(false);
  }, []);

  const updateSelectedStore = (store) => {
    setSelectedStore(store);
    if (store) {
      localStorage.setItem('selectedStore', JSON.stringify(store));
    } else {
      localStorage.removeItem('selectedStore');
    }
  };

  const clearSelectedStore = () => {
    setSelectedStore(null);
    localStorage.removeItem('selectedStore');
  };

  const value = {
    selectedStore,
    updateSelectedStore,
    clearSelectedStore,
    loading
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}; 