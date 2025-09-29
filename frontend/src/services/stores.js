import api from '../api/client';

export function chainToSlug(id) {
  return id === 'new_world' ? 'newworld' : id;
}

export async function getStoresByChain(chainId) {
  const slug = chainToSlug(chainId);
  const r = await api.get(`/stores/by-chain/${slug}/`);
  const list =
    Array.isArray(r.data?.stores) ? r.data.stores :
    Array.isArray(r.data?.results) ? r.data.results :
    Array.isArray(r.data) ? r.data : [];
  // Sort for nicer UX
  return list.slice().sort((a,b)=> a.name.localeCompare(b.name));
}
