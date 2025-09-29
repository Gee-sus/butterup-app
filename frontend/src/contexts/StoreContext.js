import React, { createContext, useContext, useEffect, useState } from "react";

const StoreContext = createContext(null);
export const useStoreSelection = () => useContext(StoreContext);

const LOCAL_KEY = "butterup:selectedStore";

export function StoreProvider({ children }) {
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      try { 
        setSelectedStore(JSON.parse(raw)); 
      } catch (error) {
        console.error('Error parsing saved store:', error);
        localStorage.removeItem(LOCAL_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedStore) localStorage.setItem(LOCAL_KEY, JSON.stringify(selectedStore));
    else localStorage.removeItem(LOCAL_KEY);
  }, [selectedStore]);

  const value = { selectedStore, setSelectedStore, loading };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}


