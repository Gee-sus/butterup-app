import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import ExploreScreen from "../screens/ExploreScreen";
import MyListScreen from "../screens/MyListScreen";
import ScannerSubmitScreen from "../screens/ScanSubmitScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AlertsScreen from "../screens/AlertsScreen";
import StoreSelectionScreen from "../screens/StoreSelectionScreen";
import StoreDetectionScreen from "../screens/StoreDetectionScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import PriceHistoryScreen from "../screens/PriceHistoryScreen";
import ProductListScreen from "../screens/ProductListScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AuthOptionsScreen from "../screens/AuthOptionsScreen";

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  AuthOptions: undefined;
  Tabs: undefined;
  ProductDetail: { product: any };
  PriceHistory: { productId: number };
  StoreSelection: undefined;
  StoreDetection: undefined;
  ProductList: undefined;
};

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  MyList: undefined;
  ScanSubmit: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  Alerts: undefined;
  StoreSelection: undefined;
  StoreDetection: undefined;
};

// Create navigators
const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const Drawer = createDrawerNavigator();

// Profile Stack Navigator (contains Drawer)
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <ProfileStack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: "Price Alerts" }}
      />
      <ProfileStack.Screen
        name="StoreSelection"
        component={StoreSelectionScreen}
        options={{ title: "Select Store" }}
      />
      <ProfileStack.Screen
        name="StoreDetection"
        component={StoreDetectionScreen}
        options={{ title: "Store Detection" }}
      />
    </ProfileStack.Navigator>
  );
};

// Drawer Navigator for Profile
const ProfileDrawerNavigator = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="ProfileMain"
        component={ProfileStackNavigator}
        options={{ title: "Profile" }}
      />
    </Drawer.Navigator>
  );
};

// Bottom Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Explore") {
            iconName = focused ? "compass" : "compass-outline";
          } else if (route.name === "MyList") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "ScanSubmit") {
            iconName = focused ? "camera" : "camera-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#6b7280",
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: "Explore" }}
      />
      <Tab.Screen
        name="MyList"
        component={MyListScreen}
        options={{ title: "My List" }}
      />
      <Tab.Screen
        name="ScanSubmit"
        component={ScannerSubmitScreen}
        options={{ title: "Scan & Submit" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileDrawerNavigator}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Onboarding">
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AuthOptions"
        component={AuthOptionsScreen}
        options={{ title: "Sign in" }}
      />
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product Details" }}
      />
      <Stack.Screen
        name="PriceHistory"
        component={PriceHistoryScreen}
        options={{ title: "Price History" }}
      />
      <Stack.Screen
        name="StoreSelection"
        component={StoreSelectionScreen}
        options={{ title: "Select Store" }}
      />
      <Stack.Screen
        name="StoreDetection"
        component={StoreDetectionScreen}
        options={{ title: "Store Detection" }}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: "All Products" }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

