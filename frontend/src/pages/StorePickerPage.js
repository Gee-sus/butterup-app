import React, { useState } from "react";
import LocationSelector from "../components/LocationSelector";
import StorePrices from "../components/StorePrices";

export default function StorePickerPage() {
  const [store, setStore] = useState(null);
  return (
    <div style={{padding:16}}>
      <h2>Find a store in Auckland</h2>
      <LocationSelector onLocationSelect={setStore} asPage={true} />
      <div style={{height:16}} />
      <StorePrices store={store} />
    </div>
  );
}


