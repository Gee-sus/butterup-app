import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ListItem, CheapestItem} from '../types';
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

interface AppContextType {
  // Shopping list state
  list: {id: string|number; name: string; price?: number}[];
  addToList: (item: {id: string|number; name: string; price?: number}) => void;
  removeFromList: (id: string|number) => void;
  total: () => number;
  
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
  const [list, setList] = useState<{id: string|number; name: string; price?: number}[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const addToList = (item: {id: string|number; name: string; price?: number}) => {
    setList(prev => [...prev, item]);
  };

  const removeFromList = (id: string|number) => {
    setList(prev => prev.filter(item => item.id !== id));
  };

  const total = () => {
    return list.reduce((sum, item) => sum + (item.price || 0), 0);
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
