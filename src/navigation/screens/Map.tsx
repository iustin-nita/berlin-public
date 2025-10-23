import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, View, Linking } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { FeatureProps } from '../../types/api';
import { openDirections } from './map/navigationIntents';
import { ToggleBar } from './map/ToggleBar';
import { ChoiceBar } from './map/ChoiceBar';
import { RecenterButton } from './map/RecenterButton';
import { DetailsSheet } from './map/DetailsSheet';
import { styles } from './Map.styles';
import { useMapNavigation } from '../MapNavigationContext';

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
// Simple dataset flags so we can toggle sources independently.
// Future-friendly: add `toiletsPublic` when we wire the toilets feed.
const DATASETS = {
  fountainsDrinking: true,
  fountainsDecorative: false,
  toiletsPublic: true, 
} as const;

Mapbox.setAccessToken((Constants.expoConfig?.extra as any)?.mapboxPublicToken);

export function MapScreen() {
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = React.useState(false);
  const [features, setFeatures] = React.useState<FeatureProps[]>([]);
  const [selected, setSelected] = React.useState<FeatureProps | null>(null);
  const [candidates, setCandidates] = React.useState<FeatureProps[]>([]);
  const [activeDataset, setActiveDataset] = React.useState<'fountains' | 'toilets'>('fountains');
  const [loading, setLoading] = React.useState(true);
  const [useDecorWms, setUseDecorWms] = React.useState(false);
  // Render map layers only after the style is fully loaded to avoid Android dev-reload native view tag errors
  const [styleLoaded, setStyleLoaded] = React.useState(false);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const sourceRef = React.useRef<Mapbox.ShapeSource>(null);
  const [cameraZoom, setCameraZoom] = React.useState<number>(3);
  const hasInitiallyCentered = React.useRef(false);

  const { pendingFeature, clearPendingFeature } = useMapNavigation();
  // Temporary visual-only flag: hide the photo placeholder section
  const SHOW_IMAGE_PLACEHOLDER = false;

  // Compute distance and simple walking ETA from user location to selected feature
  const distanceLine = React.useMemo(() => {
    if (!userLocation || !selected) return '';
    const [userLng, userLat] = userLocation;
    const [destLng, destLat] = selected.coordinates;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(destLat - userLat);
    const dLng = toRad(destLng - userLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLat)) * Math.cos(toRad(destLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = R * c;
    const formatDistance = (m: number) => {
      if (m < 950) return `${Math.round(m)} m`;
      const km = m / 1000;
      const fixed = km >= 10 ? km.toFixed(0) : km.toFixed(1);
      return `${fixed} km`;
    };
    // Assume ~4.5 km/h walking speed → 75 m/min
    const minutes = Math.max(1, Math.round(meters / 75));
    return `📍 ${formatDistance(meters)} · ${minutes} min walk`;
  }, [userLocation, selected]);

  // Clean "Info" text by stripping any embedded URL and trailing "Link:" label
  const getSanitizedInfo = React.useCallback((info?: string, url?: string) => {
    if (!info) return '';
    let text = String(info).trim();
    // Strip leading generic labels like "Info:" or "Informationen:"
    text = text.replace(/^\s*(info(?:rmationen)?)[\s:]+/i, '').trim();
    if (url) {
      text = text.replace(url, '').trim();
    }
    // Remove a leftover trailing ", Link:" (with any spaces) if present
    text = text.replace(/[,\s]*Link\s*:\s*$/i, '').trim();
    // Collapse excess spaces
    text = text.replace(/\s{2,}/g, ' ');
    return text;
  }, []);

  // Build dynamic chips based on real data per type
  const metaChips = React.useMemo(() => {
    const chips: { icon: string; label: string }[] = [];
    if (!selected) return chips;

    // Helper: detect 24/7 from hours text
    const isTwentyFourSeven = (hours?: string | null): boolean => {
      if (!hours || typeof hours !== 'string') return false;
      const h = hours.toLowerCase();
      return (
        /24\s*\/\s*7/.test(h) ||
        /24h/.test(h) ||
        /00:00\s*[-–]\s*24:00/.test(h) ||
        /durchgehend/.test(h) ||
        /ganztags/.test(h)
      );
    };

    if (selected.type === 'toilet' && selected.toilet) {
      if (isTwentyFourSeven(selected.toilet.hours)) {
        chips.push({ icon: '⏱️', label: 'Always available' });
      }
      if (selected.toilet.barrierFree === true) {
        chips.push({ icon: '♿', label: 'Accessible' });
      } else if (selected.toilet.barrierReduced === true) {
        chips.push({ icon: '♿', label: 'Accessible (reduced)' });
      }
      // No winter chip for toilets
    }

    if (selected.type === 'drinking' && selected.drinking) {
      const infoClean = getSanitizedInfo(selected.drinking.info, selected.drinking.infoUrl || undefined);
      const seasonMatch = infoClean.match(/^\s*Betriebszeit\s*:\s*(.+)$/i);
      const seasonText = seasonMatch ? seasonMatch[1].trim() : '';
      if (seasonText) {
        const lower = seasonText.toLowerCase();
        const yearRound = /ganzj[aä]hrig|year\s*round|全年/.test(lower);
        if (!yearRound) {
          chips.push({ icon: '❄️', label: 'Winter: Off' });
        }
      }
    }

    return chips;
  }, [selected, getSanitizedInfo]);

  const handleOpenUrl = React.useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Map] Failed to open URL', e);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Request location once on first launch
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          const loc = await Location.getCurrentPositionAsync({});
          if (isMounted) {
            setUserLocation([loc.coords.longitude, loc.coords.latitude]);
          }
        }
      } catch {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fly to user location once it becomes available on initial load
  // Set flag BEFORE camera operation to prevent race condition if effect reruns
  React.useEffect(() => {
    if (!hasInitiallyCentered.current && userLocation && styleLoaded && cameraRef.current) {
      hasInitiallyCentered.current = true;
      const camera: any = cameraRef.current;
      if (camera?.setCamera) {
        camera.setCamera({
          centerCoordinate: userLocation,
          zoomLevel: 14,
          animationMode: 'flyTo',
          animationDuration: 800,
        });
      }
    }
  }, [userLocation, styleLoaded]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Fetch WFS GeoJSON sources in parallel: drinking water fountains, decorative (ornamental) fountains, and public toilets (configurable)
        // WFS endpoints (vector features):
        // - Drinking: gdi.berlin.de/services/wfs/trinkwasserbrunnen
        // - Decorative (Zierbrunnen): gdi.berlin.de/services/wfs/zierbrunnen
        // - Public toilets: gdi.berlin.de/services/wfs/toiletten

        const DRINKING_URL =
          'https://gdi.berlin.de/services/wfs/trinkwasserbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=trinkwasserbrunnen:trinkwasserbrunnen&outputFormat=application/json&srsName=EPSG:4326';
        // FeatureType from GetCapabilities: zierbrunnen:bez_zierbrunnen
        const DECORATIVE_URL =
          'https://gdi.berlin.de/services/wfs/zierbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=zierbrunnen:bez_zierbrunnen&outputFormat=application/json&srsName=EPSG:4326';
        const TOILETS_URL =
          'https://gdi.berlin.de/services/wfs/toiletten?service=WFS&version=2.0.0&request=GetFeature&typeNames=toiletten:toiletten&outputFormat=application/json&srsName=EPSG:4326';

        const [drinkRes, decorRes, toiletsRes] = await Promise.all([
          fetch(DRINKING_URL),
          DATASETS.fountainsDecorative
            ? fetch(DECORATIVE_URL).catch((e) => {
                if (__DEV__) console.warn('[Map] Decorative fountains fetch failed', e);
                return null as any;
              })
            : Promise.resolve(null as any),
          DATASETS.toiletsPublic
            ? fetch(TOILETS_URL).catch((e) => {
                if (__DEV__) console.warn('[Map] Toilets fetch failed', e);
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
              // Some datasets may be MultiPoint; take first pair if so
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

        const drinkFeatures = mapCollection(drinkGeo, 'drinking').map((f, idx) => ({
          ...f,
          // Prefix dataset to avoid collisions across datasets
          id: `drink_${f.id}`,
        }));
        const decorFeatures = DATASETS.fountainsDecorative
          ? mapCollection(decorGeo, 'decorative').map((f) => ({ ...f, id: `decor_${f.id}` }))
          : [];
        const toiletFeatures = DATASETS.toiletsPublic
          ? mapCollection(toiletsGeo, 'toilet').map((f) => ({ ...f, id: `toilet_${f.id}` }))
          : [];
        if (
          DATASETS.fountainsDecorative &&
          __DEV__ &&
          (!decorGeo || !Array.isArray(decorGeo?.features) || decorFeatures.length === 0)
        ) {
          try {
            const capsRes = await fetch(
              'https://gdi.berlin.de/services/wfs/zierbrunnen?service=WFS&version=2.0.0&request=GetCapabilities'
            );
            const capsText = await capsRes.text();
            const names = Array.from(capsText.matchAll(/<Name>(.*?)<\/Name>/g)).map((m) => m[1]);
            console.warn('[Map] Zierbrunnen WFS returned 0 features. Available FeatureType names from GetCapabilities:', names);
          } catch (capErr) {
            console.warn('[Map] Failed to read Zierbrunnen GetCapabilities', capErr);
          }
        }
        if (__DEV__) {
          console.log('[Map] Loaded counts', {
            drink: drinkFeatures.length,
            decor: decorFeatures.length,
            toilets: toiletFeatures.length,
          });
        }
        const mapped: FeatureProps[] = [
          ...drinkFeatures,
          ...(DATASETS.fountainsDecorative ? decorFeatures : []),
          ...(DATASETS.toiletsPublic ? toiletFeatures : []),
        ];

        // Ensure unique feature ids to prevent duplicate React keys in chooser lists, etc.
        const uniqueById = Array.from(
          mapped.reduce((acc, item) => {
            if (!acc.has(item.id)) acc.set(item.id, item);
            return acc;
          }, new Map<string, FeatureProps>()).values()
        );

        // Enable WMS fallback overlay if decorative WFS returns nothing
        setUseDecorWms(decorFeatures.length === 0);

        if (isMounted) setFeatures(uniqueById);
      } catch (e) {
        // Keep features empty on failure for MVP
        if (__DEV__) {
          console.warn('[Map] Failed to load fountains', e);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (selected) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selected]);

  // Handle navigation from Favorites to Map: fly to feature and select it
  React.useEffect(() => {
    if (pendingFeature && styleLoaded && cameraRef.current && features.length > 0) {
      // Switch to correct dataset if needed
      const featureType = pendingFeature.type;
      if (featureType === 'toilet' && activeDataset !== 'toilets') {
        setActiveDataset('toilets');
      } else if ((featureType === 'drinking' || featureType === 'decorative') && activeDataset !== 'fountains') {
        setActiveDataset('fountains');
      }

      // Fly camera to feature location
      const camera: any = cameraRef.current;
      if (camera?.setCamera) {
        camera.setCamera({
          centerCoordinate: pendingFeature.coordinates,
          zoomLevel: 15,
          animationMode: 'flyTo',
          animationDuration: 800,
        });
      }

      // Select the feature (find it in features list to get the full object)
      const found = features.find((f) => f.id === pendingFeature.id);
      if (found) {
        setSelected(found);
      } else {
        // Feature might not be loaded yet, just set the pending one
        setSelected(pendingFeature);
      }

      // Clear pending feature after handling
      clearPendingFeature();
    }
  }, [pendingFeature, styleLoaded, features, activeDataset, clearPendingFeature]);

  const filteredFeatures = React.useMemo(() => {
    return features.filter((f) =>
      activeDataset === 'fountains' ? f.type === 'drinking' || f.type === 'decorative' : f.type === 'toilet'
    );
  }, [features, activeDataset]);

  const featureCollection = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredFeatures.map((f) => ({
        type: 'Feature',
        id: f.id,
        properties: {
          id: f.id,
          title: f.title,
          description: f.description ?? '',
          type: f.type ?? 'drinking',
        },
        geometry: {
          type: 'Point',
          coordinates: f.coordinates,
        },
      })),
    } as const;
  }, [filteredFeatures]);

  // Clear selection when switching dataset so hidden selections don't linger
  React.useEffect(() => {
    setSelected(null);
    setCandidates([]);
  }, [activeDataset]);

  // Selected feature id (string or empty string for no selection).
  const selectedId = selected?.id ?? '';
  // Helper to scale icon size when the feature is selected (data-driven styling).
  const makeSelectedIconSize = React.useCallback(
    (baseSize: number) =>
      (['case', ['==', ['get', 'id'], selectedId], baseSize * 1.2, baseSize] as any),
    [selectedId]
  );

  const handleNavigate = React.useCallback(async () => {
    if (!selected) return;
    const [lng, lat] = selected.coordinates;
    try {
      await openDirections({ latitude: lat, longitude: lng, name: selected.title });
    } catch (e) {
      if (__DEV__) console.warn('[Map] Failed to open navigation', e);
    }
  }, [selected]);

  // Recenter the camera to the user's current location.
  // - Ensures permission is granted
  // - Fetches a fresh location if we don't have one yet
  // - Uses setCamera when available (more reliable on Android), with flyTo as a fallback
  const handleRecenter = React.useCallback(async () => {
    try {
      // Wait until map style is loaded to avoid native view tag errors
      if (!styleLoaded) return;

      // Request permission if we don't have it yet
      if (!hasLocationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        setHasLocationPermission(true);
      }

      let target: [number, number] | null = userLocation;
      if (!target) {
        const loc = await Location.getCurrentPositionAsync({});
        target = [loc.coords.longitude, loc.coords.latitude];
        setUserLocation(target);
      }
      if (!target) return;

      const camera: any = cameraRef.current as any;
      if (camera?.setCamera) {
        camera.setCamera({
          centerCoordinate: target,
          zoomLevel: Math.max(cameraZoom, 14),
          animationMode: 'flyTo',
          animationDuration: 600,
        });
      } else if (camera?.flyTo) {
        camera.flyTo(target, 600);
      }
    } catch (e) {
      if (__DEV__) console.warn('[Map] Failed to recenter', e);
    }
  }, [styleLoaded, hasLocationPermission, userLocation, cameraZoom]);

  // Extract a safe [lng, lat] tuple from a pressed feature
  const getFeatureCoordinate = React.useCallback((f: any): [number, number] | null => {
    let coords: any = f?.geometry?.coordinates;
    if (Array.isArray(coords)) {
      // Handle MultiPoint-like [[lng,lat], ...]
      if (Array.isArray(coords[0])) coords = coords[0];
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        return [coords[0], coords[1]];
      }
    }
    return null;
  }, []);

  // Build ShapeSource children as an array (Mapbox's types prefer arrays of elements, not nulls)
  const shapeLayers = React.useMemo(() => {
    const layers: React.ReactElement[] = [];
    layers.push(
      <Mapbox.CircleLayer
        key="selectedHalo"
        id="selectedHalo"
        filter={["==", ["get", "id"], selectedId] as any}
        style={{
          circleRadius: 12,
          circleColor: '#ffffff',
          circleOpacity: 0.8,
          circleStrokeColor: '#1d8bf1',
          circleStrokeWidth: 2,
        }}
      />
    );
    // Cluster circles
    layers.push(
      <Mapbox.CircleLayer
        key="clusteredPoints"
        id="clusteredPoints"
        filter={["has", "point_count"] as any}
        style={{
          circleColor: '#1d8bf1',
          circleOpacity: 0.85,
          circleRadius: [
            'step',
            ['get', 'point_count'],
            16,
            20,
            20,
            50,
            26,
          ] as any,
        }}
      />
    );
    // Cluster count labels
    layers.push(
      <Mapbox.SymbolLayer
        key="clusterCount"
        id="clusterCount"
        filter={["has", "point_count"] as any}
        style={{
          textField: ['get', 'point_count'] as any,
          textSize: 12,
          textColor: '#ffffff',
        }}
      />
    );
    layers.push(
      <Mapbox.SymbolLayer
        key="fountainSymbolsDrinking"
        id="fountainSymbolsDrinking"
        filter={["==", ["get", "type"], "drinking"] as any}
        style={{
          iconImage: 'fountainDrink',
          iconSize: makeSelectedIconSize(0.2),
          iconAllowOverlap: true,
          iconIgnorePlacement: true,
          iconAnchor: 'bottom',
        }}
      />
    );
    if (DATASETS.fountainsDecorative) {
      layers.push(
        <Mapbox.SymbolLayer
          key="fountainSymbolsDecor"
          id="fountainSymbolsDecor"
          filter={["==", ["get", "type"], "decorative"] as any}
          style={{
            iconImage: 'fountainDecor',
            iconSize: makeSelectedIconSize(1),
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconAnchor: 'bottom',
          }}
        />
      );
    }
    if (DATASETS.toiletsPublic) {
      layers.push(
        <Mapbox.SymbolLayer
          key="toiletsSymbols"
          id="toiletsSymbols"
          filter={["==", ["get", "type"], "toilet"] as any}
          style={{
            iconImage: 'toilet',
            iconSize: makeSelectedIconSize(0.18),
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconAnchor: 'bottom',
          }}
        />
      );
    }
    return layers;
  }, [selectedId, makeSelectedIconSize]);

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Light}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        onCameraChanged={(e: any) => {
          const z = e?.properties?.zoom;
          if (typeof z === 'number') setCameraZoom(z);
        }}
      >
        {styleLoaded ? (
          <>
            {/* Register custom images used by SymbolLayer icons */}
            <Mapbox.Images
              images={{
                fountainDrink: require('../../../assets/water-drop.png'),
                fountainDecor: require('../../../assets/decor.png'),
                toilet: require('../../../assets/toilet.png'),
              }}
            />
            {/* Zierbrunnen WMS fallback overlay (raster). Drawn below vector pins. */}
            {DATASETS.fountainsDecorative && useDecorWms ? (
              <Mapbox.RasterSource
                id="decorWms"
                tileUrlTemplates={[
                  'https://gdi.berlin.de/services/wms/zierbrunnen?service=WMS&version=1.3.0&request=GetMap&format=image/png&transparent=true&layers=zierbrunnen&styles=&crs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256',
                ]}
                tileSize={256}
              >
                <Mapbox.RasterLayer id="decorWmsLayer" style={{ rasterOpacity: 0.8 }} />
              </Mapbox.RasterSource>
            ) : null}
            <Mapbox.Camera
              ref={cameraRef}
              centerCoordinate={BERLIN_CENTER}
              zoomLevel={12}
              animationMode="flyTo"
              animationDuration={800}
            />
            {/* User location (only render if permission granted) */}
            {hasLocationPermission ? <Mapbox.UserLocation /> : null}

            {/* Pins via ShapeSource + SymbolLayers filtered by current dataset */}
            <Mapbox.ShapeSource
              id="fountains"
              ref={sourceRef}
              shape={featureCollection as any}
              cluster
              clusterRadius={44}
              clusterMaxZoomLevel={13}
              hitbox={{ width: 30, height: 30 } as any}
              onPress={(e) => {
                const feat = e.features?.[0];
                if (!feat) return;
                const props: any = feat.properties;
                // If cluster, expand
                if (props?.cluster) {
                  const coord = getFeatureCoordinate(feat);
                  const nextZoom = Math.min(Math.max(cameraZoom + 2, 13), 17);
                  if (coord && (cameraRef.current as any)?.setCamera) {
                    (cameraRef.current as any).setCamera({
                      centerCoordinate: coord as any,
                      zoomLevel: nextZoom,
                      animationMode: 'flyTo',
                      animationDuration: 500,
                    });
                  } else if (coord) {
                    (cameraRef.current as any)?.flyTo(coord as any, 500);
                  }
                  return;
                }
                // If multiple features under tap, show quick chooser
                const nonCluster = (e.features || []).filter((f: any) => !f.properties?.cluster);
                if (nonCluster.length > 1) {
                  const list: FeatureProps[] = [];
                  for (const f of nonCluster.slice(0, 6)) {
                    const id = String((f.properties as any)?.id ?? f.id);
                    const found = features.find((it) => it.id === id);
                    if (found) list.push(found);
                  }
                  setCandidates(list);
                } else {
                  setCandidates([]);
                }
                const id = String(props?.id ?? feat.id);
                const found = features.find((it) => it.id === id);
                if (found) setSelected(found);
              }}
            >
               {shapeLayers}
            </Mapbox.ShapeSource>
          </>
        ) : null}
      </Mapbox.MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}

      <ToggleBar activeDataset={activeDataset} setActiveDataset={setActiveDataset} />
      <ChoiceBar
        candidates={candidates}
        onPick={(c) => {
                  setSelected(c);
                  setCandidates([]);
                  (cameraRef.current as any)?.setCamera?.({
                    centerCoordinate: c.coordinates,
                    zoomLevel: 15,
                    animationMode: 'flyTo',
                    animationDuration: 400,
                  });
                }}
      />

      <RecenterButton onPress={handleRecenter} />

      <DetailsSheet
        refInstance={bottomSheetRef}
        selected={selected}
        onClose={() => setSelected(null)}
        distanceLine={distanceLine}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

// styles moved to ./map/styles


