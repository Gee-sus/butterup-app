import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function StorePrices({ store }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!store) return;
    setLoading(true);
    const r = await api.get(`/prices/by-store/${store.id}/latest/`);
    setItems(r.data.results ?? r.data);
    setLoading(false);
  }

  async function refresh() {
    if (!store) return;
    setLoading(true);
    await api.post(`/scrape/by-store/${store.id}/`);
    await load();
  }

  useEffect(() => { load(); }, [store?.id]);

  if (!store) return null;
  return (
    <div>
      <h3>{store.name} — {store.chain}</h3>
      <button onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh from store now"}</button>
      <div style={{marginTop:12}}>
        {items.map(p => (
          <div key={p.id || `${p.product_name}-${p.timestamp}`} style={{padding:8, border:"1px solid #eee", borderRadius:12, marginBottom:8}}>
            <strong>{p.product_name || p.product?.name}</strong> — ${p.price}{p.unit_price ? ` (${p.unit_price})` : ""} · {p.timestamp ? new Date(p.timestamp).toLocaleString() : (p.recorded_at ? new Date(p.recorded_at).toLocaleString() : "")}
          </div>
        ))}
        {!items.length && !loading && <div>No prices yet.</div>}
      </div>
    </div>
  );
}


