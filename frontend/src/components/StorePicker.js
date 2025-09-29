import React, { useEffect, useState } from "react";
import api from "../api/client";
import { chainToSlug } from "../services/stores";

const CHAINS = [
  { id: "paknsave", label: "Pak'nSave" },
  { id: "countdown", label: "Woolworths" },
  { id: "new_world", label: "New World" },
];

export default function StorePicker({ onSelect }) {
  const [chain, setChain] = useState(CHAINS[0].id);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadStores(c = chain) {
    setLoading(true);
    // Use centralized chain slugging helper
    const chainSlug = chainToSlug(c);
    const r = await api.get(`/stores/by-chain/${chainSlug}/`);
    const sortedStores = r.data.stores.sort((a, b) => a.name.localeCompare(b.name));
    setStores(sortedStores);
    console.log('stores received:', r.data.stores.length);
    setLoading(false);
  }

  useEffect(() => { loadStores(chain); }, [chain]);

  function nearest() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const r = await api.get("/stores/nearest/", { params: { lat: latitude, lng: longitude }});
      onSelect(r.data);
    }, (err) => alert("Location error: " + err.message));
  }

  return (
    <div style={{display:"grid", gap: 12}}>
      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
        {CHAINS.map(c => (
          <button key={c.id} onClick={() => setChain(c.id)} style={{fontWeight: chain===c.id ? 700 : 400}}>
            {c.label}
          </button>
        ))}
        <button onClick={nearest}>Use my location (Auckland)</button>
      </div>

      {loading ? <div>Loading stores…</div> : (
        <select onChange={(e)=> onSelect(stores.find(s => s.id === Number(e.target.value)))}>
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.address}</option>)}
        </select>
      )}
    </div>
  );
}


