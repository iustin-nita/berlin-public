import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
          rules: props?.regeln || undefined,
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
  const [records, setRecords] = useState<Partial<Record<CategoryKey, CacheData>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(DEFAULT_ACTIVE_CATEGORIES)
  );
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const requests = useRef(new Map<CategoryKey, Promise<CacheData>>());

  const activeRecords = useMemo(() => Array.from(activeCategories).map((key) => records[key]), [activeCategories, records]);
  const features = useMemo(() => activeRecords.flatMap((record) => record?.data ?? []), [activeRecords]);
  const timestamps = activeRecords.flatMap((record) => record ? [record.timestamp] : []);
  const cacheAge = timestamps.length ? Date.now() - Math.min(...timestamps) : null;
  const hasCachedData = features.length > 0;
  const isStale = cacheAge !== null && cacheAge > CACHE_MAX_AGE;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SELECTION_KEY);
        const saved: unknown = raw ? JSON.parse(raw) : null;
        if (Array.isArray(saved)) {
          const valid = saved.filter((key): key is CategoryKey =>
            typeof key === 'string' && Object.prototype.hasOwnProperty.call(CATEGORIES, key)
              && CATEGORIES[key as CategoryKey].enabled
          );
          if (mounted && valid.length) setActiveCategories(new Set(valid));
        }
      } catch {}
      finally { if (mounted) setSelectionLoaded(true); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectionLoaded) {
      AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(Array.from(activeCategories))).catch(() => {});
    }
  }, [activeCategories, selectionLoaded]);

  const toggleCategory = useCallback((key: CategoryKey) => {
    setActiveCategories((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        if (next.size === 1) return previous;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Share promises between refreshes and category changes so no result is lost.
  const fetchCategory = useCallback((key: CategoryKey): Promise<CacheData> => {
    const pending = requests.current.get(key);
    if (pending) return pending;
    const request = (async () => {
      const cat = CATEGORIES[key];
      const response = await fetchWithTimeout(cat.wfsUrl);
      const geo = await response.json();
      if (geo?.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
        throw new Error('Invalid amenity response');
      }
      const record = { data: mapCollection(geo, cat), timestamp: Date.now() };
      // Storage failure must not discard a successful network response.
      await AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(record)).catch(() => {});
      return record;
    })().finally(() => { requests.current.delete(key); });
    requests.current.set(key, request);
    return request;
  }, []);

  const fetchActive = useCallback(async () => {
    const keys = Array.from(activeCategories);
    const results = await Promise.allSettled(keys.map(fetchCategory));
    const updates: Partial<Record<CategoryKey, CacheData>> = {};
    const failed: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') updates[keys[index]] = result.value;
      else failed.push(CATEGORIES[keys[index]].label);
    });
    return { updates, error: failed.length ? 'Could not refresh: ' + failed.join(', ') + '. Cached results are kept.' : null };
  }, [activeCategories, fetchCategory]);

  const refresh = useCallback(async () => {
    setError(null);
    const result = await fetchActive();
    setRecords((previous) => ({ ...previous, ...result.updates }));
    setError(result.error);
  }, [fetchActive]);

  useEffect(() => {
    if (!selectionLoaded) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      const cached: Partial<Record<CategoryKey, CacheData>> = {};
      await Promise.all(Array.from(activeCategories).map(async (key) => {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key);
          const record = raw ? JSON.parse(raw) : null;
          if (Array.isArray(record?.data) && Number.isFinite(record?.timestamp)
            && record.data.every((item: FeatureProps) => typeof item?.id === 'string'
              && Array.isArray(item.coordinates) && item.coordinates.length === 2
              && item.coordinates.every(Number.isFinite))) {
            cached[key] = record;
          }
        } catch {}
      }));
      if (!mounted) return;
      setRecords((previous) => ({ ...cached, ...previous }));
      if (Object.values(cached).some((record) => record.data.length)) setLoading(false);
      const result = await fetchActive();
      if (mounted) {
        setRecords((previous) => ({ ...previous, ...result.updates }));
        setError(result.error);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeCategories, selectionLoaded, fetchActive]);

  return { features, loading, error, cacheAge, isStale, hasCachedData, activeCategories, toggleCategory, refresh };
}
