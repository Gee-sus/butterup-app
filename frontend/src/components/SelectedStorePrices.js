import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useStoreSelection } from "../contexts/StoreContext";

export default function SelectedStorePrices() {
  const { selectedStore } = useStoreSelection();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!selectedStore) { setItems([]); return; }
    setLoading(true);
    setErr("");
    try {
      const r = await api.get(`/prices/by-store/${selectedStore.id}/latest/`);
      setItems(r.data.results ?? r.data ?? []);
    } catch (e) {
      setErr(e?.message || "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedStore?.id]);

  if (!selectedStore) return <div>Please choose a store to see prices.</div>;
  if (loading) return <div>Loading prices for {selectedStore.name}…</div>;
  if (err) return <div style={{ color: "crimson" }}>Error: {err}</div>;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {items.map(p => (
        <div key={p.id || `${p.product_name}-${p.timestamp}`} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>{p.product_name}</div>
          <div>${p.price}{p.unit_price ? ` (${p.unit_price})` : ""}</div>
          {p.timestamp && <div style={{ color: "#888" }}>{new Date(p.timestamp).toLocaleString()}</div>}
        </div>
      ))}
      {!items.length && <div>No prices yet for this store.</div>}
    </div>
  );
}


