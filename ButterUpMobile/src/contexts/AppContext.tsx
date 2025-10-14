import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {CheapestItem} from '../types';
import {userApi} from '../services/api';

interface SnackbarState {
  visible: boolean;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface UserProfile {
  name: string;
  email: string;
  avatar_url: string;
  provider: string;
}

// Enhanced list item type with rich product data
export interface ListItem {
  id: string | number;
  name: string;
  brand?: string;
  price: number;
  image_url?: string;
  store: string;
  weight?: string;
  savings?: number;
  worst_price?: number;
  added_at: string;
}

interface AppContextType {
  // Shopping list state
  list: ListItem[];
  addToList: (item: Omit<ListItem, 'added_at'>) => void;
  removeFromList: (id: string|number) => void;
  total: () => number;
  totalSavings: () => number;
  
  // User profile state
  userProfile: UserProfile | null;
  loadUserProfile: () => Promise<void>;
  
  // Snackbar state
  snackbar: SnackbarState;
  showSnackbar: (message: string, action?: {label: string; onPress: () => void}) => void;
  hideSnackbar: () => void;
  
  // Loading state
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children}) => {
  const [list, setList] = useState<ListItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const addToList = (item: Omit<ListItem, 'added_at'>) => {
    // Prevent duplicates by id; if same id exists, no-op
    setList(prev => {
      const exists = prev.some(existing => String(existing.id) === String(item.id));
      if (exists) {
        return prev;
      }
      const newItem: ListItem = {
        ...item,
        added_at: new Date().toISOString(),
      };
      return [...prev, newItem];
    });
  };

  const removeFromList = (id: string|number) => {
    console.log('[AppContext] Removing item with id:', id);
    console.log('[AppContext] Current list before removal:', list.map(item => ({ id: item.id, name: item.name })));
    
    setList(prev => {
      const newList = prev.filter(item => item.id !== id);
      console.log('[AppContext] New list after removal:', newList.map(item => ({ id: item.id, name: item.name })));
      return newList;
    });
  };

  const total = () => {
    return list.reduce((sum, item) => sum + item.price, 0);
  };

  const totalSavings = () => {
    return list.reduce((sum, item) => sum + (item.savings || 0), 0);
  };

  const loadUserProfile = async () => {
    try {
      const response = await userApi.getProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const showSnackbar = (message: string, action?: {label: string; onPress: () => void}) => {
    setSnackbar({
      visible: true,
      message,
      action,
    });
  };

  const hideSnackbar = () => {
    setSnackbar({
      visible: false,
      message: '',
    });
  };

  const value: AppContextType = {
    list,
    addToList,
    removeFromList,
    total,
    totalSavings,
    userProfile,
    loadUserProfile,
    snackbar,
    showSnackbar,
    hideSnackbar,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
