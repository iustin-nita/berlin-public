import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeatureProps } from '../types/api';

type FavoritesMap = Record<string, FeatureProps>;

type FavoritesContextValue = {
  favorites: FeatureProps[];
  isFavorite: (id: string) => boolean;
  addFavorite: (item: FeatureProps) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: FeatureProps) => void;
};

const FavoritesContext = React.createContext<FavoritesContextValue | undefined>(undefined);

const STORAGE_KEY = 'favorites:v1';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = React.useState<FavoritesMap>({});

  // Load persisted favorites on mount
  React.useEffect(() => {
    (async () => {
      try {
        // Check if AsyncStorage is available before using it
        if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
          if (__DEV__) console.warn('[Favorites] AsyncStorage not available, using in-memory storage');
          return;
        }
        
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FavoritesMap | FeatureProps[];
          const nextMap: FavoritesMap = Array.isArray(parsed)
            ? Object.fromEntries(parsed.map((it) => [it.id, it]))
            : parsed;
          setMap(nextMap);
        }
      } catch (e) {
        if (__DEV__) console.warn('[Favorites] Failed to load from AsyncStorage, using in-memory storage', e);
      }
    })();
  }, []);

  const persist = React.useCallback(async (next: FavoritesMap) => {
    try {
      // Check if AsyncStorage is available before using it
      if (!AsyncStorage || typeof AsyncStorage.setItem !== 'function') {
        if (__DEV__) console.warn('[Favorites] AsyncStorage not available, favorites will not persist');
        return;
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      if (__DEV__) console.warn('[Favorites] Failed to persist to AsyncStorage', e);
    }
  }, []);

  const isFavorite = React.useCallback((id: string) => !!map[id], [map]);

  const addFavorite = React.useCallback(
    (item: FeatureProps) => {
      setMap((prev) => {
        const next = { ...prev, [item.id]: item };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeFavorite = React.useCallback(
    (id: string) => {
      setMap((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const toggleFavorite = React.useCallback(
    (item: FeatureProps) => {
      setMap((prev) => {
        const next = { ...prev };
        if (next[item.id]) delete next[item.id];
        else next[item.id] = item;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = React.useMemo(
    () => ({
      favorites: Object.values(map),
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [map, isFavorite, addFavorite, removeFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = React.useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
