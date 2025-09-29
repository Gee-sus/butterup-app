import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocationSelector from "../components/LocationSelector";
import { useStoreSelection } from "../contexts/StoreContext";

export default function SelectStorePage() {
  const navigate = useNavigate();
  const { selectedStore, loading } = useStoreSelection();

  // Redirect to home if store is already selected
  useEffect(() => {
    if (!loading && selectedStore) {
      navigate('/');
    }
  }, [selectedStore, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <LocationSelector asPage={true} />
    </div>
  );
}



