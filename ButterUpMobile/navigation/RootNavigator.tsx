import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons} from '@expo/vector-icons';
import {RootStackParamList, TabParamList} from '../src/types/navigation';

// Import screens
import HomeScreen from '../src/screens/HomeScreen';
import ProductListScreen from '../src/screens/ProductListScreen';
import StoreDetectionScreen from '../src/screens/StoreDetectionScreen';
import StoreSelectionScreen from '../src/screens/StoreSelectionScreen';
import ProductDetailScreen from '../src/screens/ProductDetailScreen';
import PriceHistoryScreen from '../src/screens/PriceHistoryScreen';
import AlertsScreen from '../src/screens/AlertsScreen';
import ExploreScreen from '../src/screens/ExploreScreen';
import ScanSubmitScreen from '../src/screens/ScanSubmitScreen';
import ProfileMainScreen from '../src/screens/ProfileMainScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import CategoryScreen from '../src/screens/CategoryScreen';

// Import ProfileDrawer
import ProfileDrawer from './ProfileDrawer';
import OnboardingScreen from '../src/screens/OnboardingScreen';
import AuthOptionsScreen from '../src/screens/AuthOptionsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'MyList') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ScanSubmit') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{title: 'Home'}}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{title: 'Explore', tabBarLabel: 'Explore'}}
      />
      <Tab.Screen 
        name="MyList" 
        component={ProductListScreen}
        options={{title: 'My List'}}
      />
      <Tab.Screen 
        name="ScanSubmit" 
        component={ScanSubmitScreen}
        options={{title: 'Scan & Submit'}}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileDrawer}
        options={{title: 'Profile', headerShown: false}}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f59e0b',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="Onboarding">
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen 
        name="AuthOptions" 
        component={AuthOptionsScreen}
        options={{title: 'Sign in'}}
      />
      <Stack.Screen 
        name="Tabs" 
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen 
        name="StoreDetection" 
        component={StoreDetectionScreen}
        options={{title: 'Store Detection'}}
      />
      <Stack.Screen 
        name="StoreSelection" 
        component={StoreSelectionScreen}
        options={{title: 'Select Store'}}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{title: 'Product Details'}}
      />
      <Stack.Screen 
        name="History" 
        component={PriceHistoryScreen}
        options={{title: 'Price History'}}
      />
      <Stack.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{title: 'Alerts'}}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen}
        options={{title: 'Category', headerShown: false}}
      />
    </Stack.Navigator>
  );
}



