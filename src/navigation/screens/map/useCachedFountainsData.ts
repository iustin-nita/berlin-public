import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeatureProps } from '../../../types/api';

const CACHE_KEY = 'fountains:cache:v1';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in ms

type CacheData = {
  data: FeatureProps[];
  timestamp: number;
  version: string;
};

type UseCachedFountainsDataReturn = {
  features: FeatureProps[];
  loading: boolean;
  error: string | null;
  cacheAge: number | null; // Age in milliseconds
  isStale: boolean;
  refresh: () => Promise<void>;
};

const DATASETS = {
  fountainsDrinking: true,
  fountainsDecorative: false,
  toiletsPublic: true,
} as const;

/**
 * Hook for managing fountains data with caching and background refresh
 */
export function useCachedFountainsData(): UseCachedFountainsDataReturn {
  const [features, setFeatures] = useState<FeatureProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // Calculate cache age
  const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : null;
  const isStale = cacheAge !== null && cacheAge > CACHE_MAX_AGE;

  // Load cached data from AsyncStorage
  const loadFromCache = useCallback(async (): Promise<FeatureProps[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CacheData = JSON.parse(cached);
        setCacheTimestamp(parsed.timestamp);
        return parsed.data;
      }
    } catch (e) {
      if (__DEV__) console.warn('[Cache] Failed to load from cache', e);
    }
    return null;
  }, []);

  // Save data to cache
  const saveToCache = useCallback(async (data: FeatureProps[]) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        version: '1',
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCacheTimestamp(cacheData.timestamp);
    } catch (e) {
      if (__DEV__) console.warn('[Cache] Failed to save to cache', e);
    }
  }, []);

  // Fetch fresh data from WFS endpoints
  const fetchFreshData = useCallback(async (): Promise<FeatureProps[]> => {
    const DRINKING_URL =
      'https://gdi.berlin.de/services/wfs/trinkwasserbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=trinkwasserbrunnen:trinkwasserbrunnen&outputFormat=application/json&srsName=EPSG:4326';
    const DECORATIVE_URL =
      'https://gdi.berlin.de/services/wfs/zierbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=zierbrunnen:bez_zierbrunnen&outputFormat=application/json&srsName=EPSG:4326';
    const TOILETS_URL =
      'https://gdi.berlin.de/services/wfs/toiletten?service=WFS&version=2.0.0&request=GetFeature&typeNames=toiletten:toiletten&outputFormat=application/json&srsName=EPSG:4326';

    const [drinkRes, decorRes, toiletsRes] = await Promise.all([
      fetch(DRINKING_URL),
      DATASETS.fountainsDecorative
        ? fetch(DECORATIVE_URL).catch(() => null as any)
        : Promise.resolve(null as any),
      DATASETS.toiletsPublic
        ? fetch(TOILETS_URL).catch(() => null as any)
        : Promise.resolve(null as any),
    ]);

    const [drinkGeo, decorGeo, toiletsGeo] = await Promise.all([
      drinkRes.json(),
      decorRes ? decorRes.json().catch(() => null) : Promise.resolve(null),
      toiletsRes ? toiletsRes.json().catch(() => null) : Promise.resolve(null),
    ]);

    const mapCollection = (
      geo: any,
      type: NonNullable<FeatureProps['type']>
    ): FeatureProps[] => {
      if (!geo || !geo.features) return [];
      return geo.features
        .map((f: any, idx: number) => {
          let coords: any = f?.geometry?.coordinates;
          if (Array.isArray(coords) && Array.isArray(coords[0])) {
            coords = coords[0];
          }
          if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
            return null;
          }
          const props: any = f?.properties ?? {};
          const name: string =
            props?.standort ||
            props?.name ||
            props?.bezeichnung ||
            props?.anlage ||
            props?.titel ||
            props?.objekt ||
            'Fountain';
          const common: FeatureProps = {
            id: String(f.id ?? idx),
            title: name,
            description: props?.bezirk || props?.ortsteil || undefined,
            coordinates: coords,
            type,
          };
          if (type === 'drinking') {
            const parseUrl = (text: any): string | null => {
              if (typeof text !== 'string') return null;
              const m = text.match(/https?:\/\/\S+/);
              return m ? m[0].trim() : null;
            };
            const toNum = (v: any): number | null => {
              if (typeof v === 'number') return v;
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };
            (common as any).drinking = {
              district: props?.bezirk || undefined,
              yearBuilt: toNum(props?.baujahr),
              fountainType: props?.trinkbrunnenart || undefined,
              restrictions: props?.einschraenkungen || undefined,
              info: props?.informationen || undefined,
              infoUrl: parseUrl(props?.informationen),
              number: toNum(props?.nummer),
              postalCode: toNum(props?.postleitzahl),
            };
          }
          if (type === 'toilet') {
            const toBool = (v: any): boolean | null => {
              const s = typeof v === 'string' ? v.toLowerCase() : v;
              if (s === 'ja' || s === true) return true;
              if (s === 'nein' || s === false) return false;
              return null;
            };
            const feeRaw = props?.nutzungsentgelt;
            const feeNum = typeof feeRaw === 'number' ? feeRaw : feeRaw != null ? Number(feeRaw) : null;
            (common as any).toilet = {
              operator: props?.betreiber || undefined,
              district: props?.bezirk || undefined,
              hours: props?.oeffnungszeiten || undefined,
              fee: Number.isFinite(feeNum) ? feeNum : null,
              payment: props?.zahlungsart || undefined,
              hasChangingTable: toBool(props?.wickeltisch),
              barrierFree: toBool(props?.barrierefrei),
              barrierReduced: toBool(props?.barrierearm),
            };
          }
          return common;
        })
        .filter(Boolean) as FeatureProps[];
    };

    const drinkFeatures = mapCollection(drinkGeo, 'drinking').map((f) => ({
      ...f,
      id: `drink_${f.id}`,
    }));
    const decorFeatures = DATASETS.fountainsDecorative
      ? mapCollection(decorGeo, 'decorative').map((f) => ({ ...f, id: `decor_${f.id}` }))
      : [];
    const toiletFeatures = DATASETS.toiletsPublic
      ? mapCollection(toiletsGeo, 'toilet').map((f) => ({ ...f, id: `toilet_${f.id}` }))
      : [];

    const mapped: FeatureProps[] = [
      ...drinkFeatures,
      ...(DATASETS.fountainsDecorative ? decorFeatures : []),
      ...(DATASETS.toiletsPublic ? toiletFeatures : []),
    ];

    // Deduplicate by id
    const uniqueById = Array.from(
      mapped.reduce((acc, item) => {
        if (!acc.has(item.id)) acc.set(item.id, item);
        return acc;
      }, new Map<string, FeatureProps>()).values()
    );

    return uniqueById;
  }, []);

  // Main refresh function
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const freshData = await fetchFreshData();
      setFeatures(freshData);
      await saveToCache(freshData);
      if (__DEV__) console.log('[Cache] Fetched and cached fresh data:', freshData.length, 'items');
    } catch (e) {
      setError('Failed to fetch data');
      if (__DEV__) console.warn('[Cache] Failed to fetch fresh data', e);
      throw e;
    }
  }, [fetchFreshData, saveToCache]);

  // Initial load: optimistic cache, then background refresh
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Load from cache immediately (optimistic)
        const cachedData = await loadFromCache();
        if (cachedData && isMounted) {
          setFeatures(cachedData);
          setLoading(false);
          if (__DEV__) console.log('[Cache] Loaded from cache:', cachedData.length, 'items');
        }

        // Fetch fresh data in background
        try {
          const freshData = await fetchFreshData();
          if (isMounted) {
            setFeatures(freshData);
            await saveToCache(freshData);
            if (__DEV__) console.log('[Cache] Updated with fresh data:', freshData.length, 'items');
          }
        } catch (fetchError) {
          // If fetch fails and we have cached data, keep using it
          if (!cachedData) {
            throw fetchError;
          }
          if (__DEV__) console.warn('[Cache] Using stale cache due to fetch error');
        }
      } catch (e) {
        if (isMounted) {
          setError('Failed to load data');
          if (__DEV__) console.warn('[Cache] Failed to load data', e);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadFromCache, fetchFreshData, saveToCache]);

  return {
    features,
    loading,
    error,
    cacheAge,
    isStale,
    refresh,
  };
}
