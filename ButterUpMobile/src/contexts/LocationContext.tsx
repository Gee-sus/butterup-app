import React, {createContext, useContext, useMemo, useState, ReactNode} from 'react';

interface NearbyStore {
  id: string;
  name: string;
  chain?: string;
}

interface LocationContextType {
  province: string;
  suburb: string;
  locationLabel: string;
  locationDescription: string;
  nearbyStores: NearbyStore[];
  nearbyStoreChains: string[];
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  paknsave: "Pak'nSave",
  countdown: 'Woolworths',
  woolworths: 'Woolworths',
  newworld: 'New World',
};

const normalizeChain = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return value.toLowerCase().replace(/[^a-z]/g, '');
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({children}) => {
  const [province] = useState('Auckland');
  const [suburb] = useState('Ponsonby');
  const [nearbyStores] = useState<NearbyStore[]>([
    {id: '1', name: "Pak'nSave Albany", chain: 'paknsave'},
    {id: '2', name: 'Countdown Newmarket', chain: 'countdown'},
    {id: '3', name: 'New World Ponsonby', chain: 'new_world'},
    {id: '4', name: 'Woolworths Queen St', chain: 'woolworths'},
  ]);

  const locationLabel = suburb || province;
  const locationDescription = suburb
    ? `Showing supermarket prices around ${suburb}, ${province}.`
    : `Showing supermarket prices across ${province}.`;

  const nearbyStoreChains = useMemo(() => {
    const seen = new Set<string>();
    const chains: string[] = [];

    nearbyStores.forEach((store) => {
      const normalized = normalizeChain(store.chain);
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      const label = CHAIN_DISPLAY_NAMES[normalized];
      chains.push(label || store.name);
    });

    return chains;
  }, [nearbyStores]);

  const value: LocationContextType = {
    province,
    suburb,
    locationLabel,
    locationDescription,
    nearbyStores,
    nearbyStoreChains,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};


