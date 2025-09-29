import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Store} from '../types';

interface StoreContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({children}) => {
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved store on app start
  useEffect(() => {
    loadSavedStore();
  }, []);

  const loadSavedStore = async () => {
    try {
      setIsLoading(true);
      const savedStore = await AsyncStorage.getItem('selected_store');
      if (savedStore) {
        setSelectedStoreState(JSON.parse(savedStore));
      }
    } catch (err) {
      console.error('Error loading saved store:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStore = async (store: Store | null) => {
    try {
      if (store) {
        await AsyncStorage.setItem('selected_store', JSON.stringify(store));
      } else {
        await AsyncStorage.removeItem('selected_store');
      }
    } catch (err) {
      console.error('Error saving store:', err);
    }
  };

  const setSelectedStore = (store: Store | null) => {
    setSelectedStoreState(store);
    saveStore(store);
  };

  const value: StoreContextType = {
    selectedStore,
    setSelectedStore,
    isLoading,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
