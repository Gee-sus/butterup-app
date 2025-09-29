import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import ButterCards from "../components/ButterCards";
import { useStoreSelection } from "../contexts/StoreContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedStore, loading } = useStoreSelection();
  

  // Redirect to store selection if no store is selected
  // TEMPORARILY DISABLED for debugging
  // useEffect(() => {
  //   if (!loading && !selectedStore) {
  //     navigate('/select-store');
  //   }
  // }, [selectedStore, loading, navigate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Hero />
      <div className="py-8">
        <ButterCards />
      </div>
    </div>
  );
}



