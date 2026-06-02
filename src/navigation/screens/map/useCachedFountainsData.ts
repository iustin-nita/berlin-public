import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeatureProps } from '../../../types/api';
import { CategoryKey, CATEGORIES, CategoryDef, DEFAULT_ACTIVE_CATEGORIES } from '../../../constants/categories';
import { fetchWithTimeout } from '../../../constants/datasets';

const CACHE_KEY_PREFIX = 'category:cache:';
const SELECTION_KEY = 'category:selection:v1';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

type CacheData = {
  data: FeatureProps[];
  timestamp: number;
};

type UseCachedDataReturn = {
  features: FeatureProps[];
  loading: boolean;
  error: string | null;
  cacheAge: number | null;
  isStale: boolean;
  hasCachedData: boolean;
  activeCategories: Set<CategoryKey>;
  toggleCategory: (key: CategoryKey) => void;
  setCategories: (keys: CategoryKey[]) => void;
  refresh: () => Promise<void>;
};

/**
 * Extract a [lng, lat] point from any GeoJSON geometry type.
 * For Polygon/MultiPolygon, computes a simple centroid from the first ring.
 */
function extractPoint(geometry: any): [number, number] | null {
  if (!geometry) return null;
  const type: string = geometry.type;
  let coords = geometry.coordinates;

  if (type === 'Point') {
    if (typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number') {
      return [coords[0], coords[1]];
    }
    return null;
  }

  if (type === 'MultiPoint') {
    coords = coords?.[0];
    if (typeof coords?.[0] === 'number' && typeof coords?.[1] === 'number') {
      return [coords[0], coords[1]];
    }
    return null;
  }

  // Polygon / MultiPolygon → centroid of first ring
  let ring: number[][] | null = null;
  if (type === 'Polygon' && Array.isArray(coords?.[0])) {
    ring = coords[0];
  } else if (type === 'MultiPolygon' && Array.isArray(coords?.[0]?.[0])) {
    ring = coords[0][0];
  }
  if (ring && ring.length > 0) {
    let sumLng = 0, sumLat = 0;
    for (const pt of ring) {
      sumLng += pt[0];
      sumLat += pt[1];
    }
    return [sumLng / ring.length, sumLat / ring.length];
  }

  return null;
}

// Parse WFS properties into FeatureProps for a given category
function mapCollection(geo: any, cat: CategoryDef): FeatureProps[] {
  if (!geo?.features) return [];
  return geo.features
    .map((f: any, idx: number) => {
      const coords = extractPoint(f?.geometry);
      if (!coords) return null;

      const props: any = f?.properties ?? {};
      const name: string =
        props?.standort || props?.name || props?.bezeichnung || props?.bezeichn ||
        props?.badegewaes || props?.kuehle_raeume || props?.namenr ||
        props?.anlage || props?.titel || props?.objekt || props?.adresse || cat.label;

      const common: FeatureProps = {
        id: `${cat.idPrefix}${f.id ?? idx}`,
        title: name,
        description: props?.bezirk || props?.bezirkname || props?.ortsteil || undefined,
        coordinates: coords,
        type: cat.key,
      };

      // Type-specific metadata extraction
      if (cat.key === 'drinking') {
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
        common.drinking = {
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

      if (cat.key === 'toilet') {
        const toBool = (v: any): boolean | null => {
          const s = typeof v === 'string' ? v.toLowerCase() : v;
          if (s === 'ja' || s === true) return true;
          if (s === 'nein' || s === false) return false;
          return null;
        };
        const feeRaw = props?.nutzungsentgelt;
        const feeNum = typeof feeRaw === 'number' ? feeRaw : feeRaw != null ? Number(feeRaw) : null;
        common.toilet = {
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

      if (cat.key === 'bathing') {
        common.bathing = {
          waterQuality: props?.eu_einst || undefined,
          cyanobacteria: props?.cyano === 'ja' ? 'Warning' : props?.cyano === 'nein' ? 'None detected' : undefined,
          season: props?.badesaison || undefined,
          district: props?.bezirk || undefined,
        };
      }

      if (cat.key === 'coolSpace') {
        const accessStr = props?.rollstuhlgerechter_zugang || '';
        const isAccessible = /rollstuhlgerecht/i.test(accessStr) && !/nicht/i.test(accessStr);
        common.coolSpace = {
          hours: props?.oeffnungszeiten || undefined,
          wheelchairAccessible: accessStr ? isAccessible : null,
          spaceType: props?.art || props?.typ || undefined,
          district: props?.bezirk || undefined,
        };
      }

      if (cat.key === 'bbq') {
        common.bbq = {
          bookingUrl: props?.buchen || undefined,
          fee: props?.gebuehr || undefined,
          rules: props?.grillarea || undefined,
          district: props?.bezirk || undefined,
        };
      }

      if (cat.key === 'bikeRepair') {
        common.bikeRepair = {
          district: props?.bezirk || undefined,
          stationType: props?.art || props?.typ || undefined,
        };
      }

      if (cat.key === 'evCharging') {
        const toNum = (v: any): number | null => {
          if (typeof v === 'number') return v;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        // Combine connector types from up to 4 slots
        const connectors = [props?.anschluss_1, props?.anschluss_2, props?.anschluss_3, props?.anschluss_4]
          .filter(Boolean)
          .join(', ');
        // Max power across slots
        const powers = [props?.ladeleistung_1, props?.ladeleistung_2, props?.ladeleistung_3, props?.ladeleistung_4]
          .map(toNum)
          .filter((n): n is number => n !== null);
        const maxPower = powers.length > 0 ? Math.max(...powers) : null;
        const isPublic = props?.oeffentlicher_raum;
        common.evCharging = {
          connectorTypes: connectors || undefined,
          powerKw: maxPower,
          operator: props?.betreiber || undefined,
          isPublic: isPublic === 'ja' ? true : isPublic === 'nein' ? false : null,
          address: props?.adresse || undefined,
        };
      }

      if (cat.key === 'playground') {
        const toNum = (v: any): number | null => {
          if (typeof v === 'number') return v;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };
        common.playground = {
          area: toNum(props?.katasterfl),
          equipment: props?.namezusatz || undefined,
          district: props?.bezirkname || props?.bezirk || undefined,
        };
      }

      return common;
    })
    .filter(Boolean) as FeatureProps[];
}

export function useCachedFountainsData(): UseCachedDataReturn {
  const [featuresByCategory, setFeaturesByCategory] = useState<Record<string, FeatureProps[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(DEFAULT_ACTIVE_CATEGORIES)
  );
  const fetchingRef = useRef<Set<string>>(new Set());

  const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : null;
  const isStale = cacheAge !== null && cacheAge > CACHE_MAX_AGE;

  // Merged features from all active categories
  const features: FeatureProps[] = Array.from(activeCategories).flatMap(
    (key) => featuresByCategory[key] ?? []
  );

  // Load saved category selection
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTION_KEY);
        if (saved) {
          const parsed: CategoryKey[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActiveCategories(new Set(parsed));
          }
        }
      } catch {}
    })();
  }, []);

  // Persist category selection
  const persistSelection = useCallback(async (cats: Set<CategoryKey>) => {
    try {
      await AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(Array.from(cats)));
    } catch {}
  }, []);

  const toggleCategory = useCallback((key: CategoryKey) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      persistSelection(next);
      return next;
    });
  }, [persistSelection]);

  // Replace the whole selection at once (filter sheet select-all / reset).
  // Never allow an empty selection — falls back to the defaults.
  const setCategories = useCallback((keys: CategoryKey[]) => {
    const next = new Set<CategoryKey>(keys.length ? keys : DEFAULT_ACTIVE_CATEGORIES);
    setActiveCategories(next);
    persistSelection(next);
  }, [persistSelection]);

  // Load cache for a single category
  const loadCategoryCache = useCallback(async (key: CategoryKey): Promise<FeatureProps[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (raw) {
        const parsed: CacheData = JSON.parse(raw);
        setCacheTimestamp((prev) => prev ? Math.min(prev, parsed.timestamp) : parsed.timestamp);
        setHasCachedData(true);
        return parsed.data;
      }
    } catch {}
    return null;
  }, []);

  // Save cache for a single category
  const saveCategoryCache = useCallback(async (key: CategoryKey, data: FeatureProps[]) => {
    try {
      const cacheData: CacheData = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
      setCacheTimestamp(cacheData.timestamp);
      setHasCachedData(data.length > 0);
    } catch {}
  }, []);

  // Fetch a single category from WFS
  const fetchCategory = useCallback(async (key: CategoryKey): Promise<FeatureProps[]> => {
    const cat = CATEGORIES[key];
    if (!cat?.enabled) return [];
    const res = await fetchWithTimeout(cat.wfsUrl);
    const geo = await res.json();
    return mapCollection(geo, cat);
  }, []);

  // Fetch and cache all active categories
  const fetchActiveCategories = useCallback(async () => {
    const keys = Array.from(activeCategories);
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        // Skip keys already being fetched — don't overwrite with empty data
        if (fetchingRef.current.has(key)) return null;
        fetchingRef.current.add(key);
        try {
          const data = await fetchCategory(key);
          await saveCategoryCache(key, data);
          return { key, data };
        } finally {
          fetchingRef.current.delete(key);
        }
      })
    );

    const updated: Record<string, FeatureProps[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        updated[result.value.key] = result.value.data;
      }
    }
    return updated;
  }, [activeCategories, fetchCategory, saveCategoryCache]);

  // Refresh all active categories
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const updated = await fetchActiveCategories();
      setFeaturesByCategory((prev) => ({ ...prev, ...updated }));
    } catch {
      setError('Failed to fetch data');
      throw new Error('Failed to fetch data');
    }
  }, [fetchActiveCategories]);

  // When active categories change, load cached + fetch fresh
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Load from cache first for each active category
        const keys = Array.from(activeCategories);
        const cached: Record<string, FeatureProps[]> = {};
        let anyCached = false;

        await Promise.all(
          keys.map(async (key) => {
            // Skip if we already have data for this category
            if (featuresByCategory[key]?.length) {
              cached[key] = featuresByCategory[key];
              anyCached = true;
              return;
            }
            const data = await loadCategoryCache(key);
            if (data) {
              cached[key] = data;
              anyCached = true;
            }
          })
        );

        if (isMounted && Object.keys(cached).length > 0) {
          setFeaturesByCategory((prev) => ({ ...prev, ...cached }));
          setLoading(false);
        }

        // Fetch fresh data
        try {
          const fresh = await fetchActiveCategories();
          if (isMounted) {
            setFeaturesByCategory((prev) => ({ ...prev, ...fresh }));
          }
        } catch {
          if (!anyCached && isMounted) {
            setError('Failed to load data');
          }
        }
      } catch {
        if (isMounted) setError('Failed to load data');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
    // Only re-fetch when activeCategories changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategories]);

  return {
    features,
    loading,
    error,
    cacheAge,
    isStale,
    hasCachedData,
    activeCategories,
    toggleCategory,
    setCategories,
    refresh,
  };
}
