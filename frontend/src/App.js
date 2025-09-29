import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LocationProvider } from './contexts/LocationContext';
import Navbar from './components/Navbar';
import WelcomeLocation from './components/WelcomeLocation';

import PriceHistory from './pages/PriceHistory';
import StoreComparison from './pages/StoreComparison';
import EconomicCorrelation from './pages/EconomicCorrelation';
import PriceAlerts from './pages/PriceAlerts';
import EmailSignup from './pages/EmailSignup';
import LocationSettings from './components/LocationSelector';
import StorePickerPage from './pages/StorePickerPage';
import HomePage from './pages/HomePage';
import SelectStorePage from './pages/SelectStorePage';
import Upload from './pages/Upload';
import ProductDetails from './pages/ProductDetails';
import ListScreen from './pages/ListScreen';
import ProfileScreen from './pages/ProfileScreen';
import ScanScreen from './pages/ScanScreen';
import ButterUpWireframes from './pages/ButterUpWireframes';



function App() {
  return (
    <LocationProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/select-store" element={<SelectStorePage />} />
            <Route path="/price-history" element={<PriceHistory />} />
            <Route path="/store-comparison" element={<StoreComparison />} />
            <Route path="/economic-correlation" element={<EconomicCorrelation />} />
            <Route path="/price-alerts" element={<PriceAlerts />} />
            <Route path="/email-signup" element={<EmailSignup />} />
            <Route path="/location-settings" element={<LocationSettings asPage={true} />} />
            <Route path="/stores" element={<StorePickerPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/wireframes" element={<ButterUpWireframes />} />
            <Route path="/product/:key" element={<ProductDetails />} />
            <Route path="/list" element={<ListScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/scan" element={<ScanScreen />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <WelcomeLocation />
      </div>
    </LocationProvider>
  );
}

export default App; 
