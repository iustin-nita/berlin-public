import * as React from 'react';
import { FeatureProps } from '../../../types/api';

type DatasetKey = 'fountainsDrinking' | 'fountainsDecorative' | 'toiletsPublic';

export type ActiveDataset = 'fountains' | 'toilets';

export type UseFountainsDataResult = {
  loading: boolean;
  features: FeatureProps[];
  useDecorWms: boolean;
};

/**
 * Fetch Berlin WFS datasets (drinking fountains, decorative fountains, toilets) and
 * map them into a unified FeatureProps list. Enables a WMS fallback for decorative
 * fountains when the WFS dataset returns zero features.
 */
export function useFountainsData(datasets: Record<DatasetKey, boolean>): UseFountainsDataResult {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [features, setFeatures] = React.useState<FeatureProps[]>([]);
  const [useDecorWms, setUseDecorWms] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const DRINKING_URL =
          'https://gdi.berlin.de/services/wfs/trinkwasserbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=trinkwasserbrunnen:trinkwasserbrunnen&outputFormat=application/json&srsName=EPSG:4326';
        const DECORATIVE_URL =
          'https://gdi.berlin.de/services/wfs/zierbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=zierbrunnen:bez_zierbrunnen&outputFormat=application/json&srsName=EPSG:4326';
        const TOILETS_URL =
          'https://gdi.berlin.de/services/wfs/toiletten?service=WFS&version=2.0.0&request=GetFeature&typeNames=toiletten:toiletten&outputFormat=application/json&srsName=EPSG:4326';

        const [drinkRes, decorRes, toiletsRes] = await Promise.all([
          fetch(DRINKING_URL),
          datasets.fountainsDecorative
            ? fetch(DECORATIVE_URL).catch((e) => {
                if (__DEV__) console.warn('[MapData] Decorative fountains fetch failed', e);
                return null as any;
              })
            : Promise.resolve(null as any),
          datasets.toiletsPublic
            ? fetch(TOILETS_URL).catch((e) => {
                if (__DEV__) console.warn('[MapData] Toilets fetch failed', e);
                return null as any;
              })
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
                } as FeatureProps['drinking'];
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
                } as FeatureProps['toilet'];
              }
              return common as FeatureProps;
            })
            .filter(Boolean) as FeatureProps[];
        };

        const drinkFeatures = mapCollection(drinkGeo, 'drinking').map((f) => ({
          ...f,
          id: `drink_${f.id}`,
        }));
        const decorFeatures = datasets.fountainsDecorative
          ? mapCollection(decorGeo, 'decorative').map((f) => ({ ...f, id: `decor_${f.id}` }))
          : [];
        const toiletFeatures = datasets.toiletsPublic
          ? mapCollection(toiletsGeo, 'toilet').map((f) => ({ ...f, id: `toilet_${f.id}` }))
          : [];

        if (
          datasets.fountainsDecorative &&
          __DEV__ &&
          (!decorGeo || !Array.isArray(decorGeo?.features) || decorFeatures.length === 0)
        ) {
          try {
            const capsRes = await fetch(
              'https://gdi.berlin.de/services/wfs/zierbrunnen?service=WFS&version=2.0.0&request=GetCapabilities'
            );
            const capsText = await capsRes.text();
            const names = Array.from(capsText.matchAll(/<Name>(.*?)<\/Name>/g)).map((m) => m[1]);
            console.warn('[MapData] Zierbrunnen WFS returned 0 features. Available FeatureType names from GetCapabilities:', names);
          } catch (capErr) {
            console.warn('[MapData] Failed to read Zierbrunnen GetCapabilities', capErr);
          }
        }

        const mapped: FeatureProps[] = [
          ...drinkFeatures,
          ...(datasets.fountainsDecorative ? decorFeatures : []),
          ...(datasets.toiletsPublic ? toiletFeatures : []),
        ];

        // Ensure unique feature ids
        const uniqueById = Array.from(
          mapped.reduce((acc, item) => {
            if (!acc.has(item.id)) acc.set(item.id, item);
            return acc;
          }, new Map<string, FeatureProps>()).values()
        );

        setUseDecorWms(decorFeatures.length === 0);
        if (isMounted) setFeatures(uniqueById);
      } catch (e) {
        if (__DEV__) console.warn('[MapData] Failed to load datasets', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [datasets.fountainsDecorative, datasets.toiletsPublic]);

  return { loading, features, useDecorWms };
}


