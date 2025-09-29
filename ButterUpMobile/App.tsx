import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';

// Import navigation
import RootNavigator from './src/navigation/RootNavigator';

// Import contexts
import {LocationProvider} from './src/contexts/LocationContext';
import {AppProvider, useApp} from './src/contexts/AppContext';

// Import components
import {Snackbar} from './src/components/Snackbar';

function AppWithSnackbar() {
  const {snackbar, hideSnackbar} = useApp();
  
  return (
    <>
      <RootNavigator />
      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        action={snackbar.action}
        onDismiss={hideSnackbar}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <AppProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppWithSnackbar />
          </NavigationContainer>
        </AppProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}