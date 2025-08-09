import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

type FeatureProps = {
  id: string;
  title: string;
  description?: string;
  coordinates: [number, number];
  type?: 'drinking' | 'decorative' | 'toilet';
  imageUrl?: string;
  // Optional structured metadata for toilets (rendered in details sheet)
  toilet?: {
    operator?: string;
    district?: string;
    hours?: string;
    fee?: number | null;
    payment?: string;
    hasChangingTable?: boolean | null;
    barrierFree?: boolean | null;
    barrierReduced?: boolean | null;
  };
  // Optional metadata for drinking fountains
  drinking?: {
    district?: string;
    yearBuilt?: number | null;
    fountainType?: string;
    restrictions?: string;
    info?: string;
    infoUrl?: string | null;
    number?: number | null;
    postalCode?: number | null;
  };
};

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

        const drinkFeatures = mapCollection(drinkGeo, 'drinking');
        const decorFeatures = DATASETS.fountainsDecorative ? mapCollection(decorGeo, 'decorative') : [];
        const toiletFeatures = DATASETS.toiletsPublic ? mapCollection(toiletsGeo, 'toilet') : [];
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

        // Enable WMS fallback overlay if decorative WFS returns nothing
        setUseDecorWms(decorFeatures.length === 0);

        if (isMounted) setFeatures(mapped);
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

  const initialCenter = userLocation ?? BERLIN_CENTER;

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
              centerCoordinate={initialCenter}
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

      {/* Dataset toggle: only one dataset visible at a time */}
      <View style={styles.toggleBar} pointerEvents="box-none">
        <View style={styles.togglePill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show fountains"
            onPress={() => setActiveDataset('fountains')}
            style={[
              styles.toggleItem,
              activeDataset === 'fountains' ? styles.toggleItemActive : null,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeDataset === 'fountains' ? styles.toggleTextActive : null,
              ]}
            >
              Fountains
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show toilets"
            onPress={() => setActiveDataset('toilets')}
            style={[
              styles.toggleItem,
              activeDataset === 'toilets' ? styles.toggleItemActive : null,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                activeDataset === 'toilets' ? styles.toggleTextActive : null,
              ]}
            >
              Toilets
            </Text>
          </Pressable>
        </View>
      </View>
      {/* Small chooser when multiple features overlap under the tap */}
      {candidates.length > 1 && (
        <View style={styles.choiceBar}>
          <Text style={styles.choiceTitle}>Select a place:</Text>
          <View style={styles.choiceList}>
            {candidates.map((c) => (
              <Pressable
                key={c.id}
                style={styles.choiceItem}
                onPress={() => {
                  setSelected(c);
                  setCandidates([]);
                  // Slight zoom-in to improve separation
                  (cameraRef.current as any)?.setCamera?.({
                    centerCoordinate: c.coordinates,
                    zoomLevel: 15,
                    animationMode: 'flyTo',
                    animationDuration: 400,
                  });
                }}
              >
                <Text numberOfLines={1} style={styles.choiceText}>{c.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Recenter button */}
      <Pressable
        accessibilityLabel="Recenter map to my location"
        onPress={() => {
          if (userLocation) {
            // Use Mapbox camera flyTo helper for reliability
            (cameraRef.current as any)?.flyTo(userLocation, 600);
          }
        }}
        style={styles.recenterButton}
      >
        <Text style={styles.recenterGlyph}>➤</Text>
      </Pressable>

      {/* Bottom sheet for details */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['38%', '68%']}
        index={-1}
        enablePanDownToClose
        handleIndicatorStyle={styles.sheetHandle}
        onClose={() => setSelected(null)}
      >
          <BottomSheetView style={styles.sheetContent}>
          {selected ? (
            <View>
              {/* Header with type pill, title, subtitle, distance and favorite */}
              <View style={styles.headerSection}>
                <View style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.typePill,
                      selected.type === 'decorative' ? styles.typePillDecor :
                      selected.type === 'toilet' ? styles.typePillToilet : styles.typePillDrink,
                    ]}
                  >
                    <Text style={styles.typePillText}>
                      {selected.type === 'toilet'
                        ? 'Public Toilet'
                        : selected.type === 'decorative'
                        ? 'Decorative Fountain'
                        : 'Drinking Water'}
                    </Text>
                  </View>
                  <Text style={styles.title}>{selected.title || 'Water Source'}</Text>
                  {selected.description ? (
                    <Text style={styles.subtitle}>{selected.description}</Text>
                  ) : null}
                  <View style={styles.distanceRow}>
                    <Text style={styles.distanceText}>📍 340m · 4 min walk</Text>
                  </View>
                </View>
                <Pressable style={styles.favButton} accessibilityRole="button">
                  <Text style={{ fontSize: 18 }}>⭐</Text>
                </Pressable>
              </View>

              {/* Image placeholder */}
              <View style={styles.imageCard}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, opacity: 0.5 }}>📷</Text>
                  <Text style={styles.imageText}>Add a photo</Text>
                </View>
              </View>

              {/* Metadata row (placeholders) */}
              <View style={styles.metaRow}>
                <View style={styles.metaItemRow}><Text>🕐</Text><Text style={styles.meta}>Always available</Text></View>
                <View style={styles.metaItemRow}><Text>♿</Text><Text style={styles.meta}>Accessible</Text></View>
                <View style={styles.metaItemRow}><Text>❄️</Text><Text style={styles.meta}>Winter: Off</Text></View>
              </View>

              {/* Community status */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Text style={styles.statusLabel}>Community Status</Text>
                  <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>✓ Working · 2 days ago</Text></View>
                </View>
                <View style={styles.voteRow}>
                  <Pressable style={[styles.voteButton, styles.voteYes]} accessibilityRole="button">
                    <Text style={styles.voteText}>👍 Working</Text>
                    <Text style={styles.voteCount}>(127)</Text>
                  </Pressable>
                  <Pressable style={[styles.voteButton, styles.voteNo]} accessibilityRole="button">
                    <Text style={styles.voteText}>👎 Not Working</Text>
                    <Text style={styles.voteCount}>(3)</Text>
                  </Pressable>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionButton, styles.primaryAction]} accessibilityRole="button">
                  <Text style={styles.actionText}>🧭 Navigate</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.secondaryAction]} accessibilityRole="button">
                  <Text style={[styles.actionText, styles.secondaryActionText]}>📤 Share</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View />
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    padding: 16,
  },
  sheetHandle: {
    backgroundColor: '#E0E0E0',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typePillDrink: {
    backgroundColor: '#E3F2FD',
  },
  typePillDecor: {
    backgroundColor: '#FFF3E0',
  },
  typePillToilet: {
    backgroundColor: '#E0F2F1',
  },
  typePillText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 12,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    height: 48,
    width: 48,
    backgroundColor: 'white',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  recenterGlyph: { fontSize: 20 },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  distanceRow: {
    marginTop: 6,
  },
  distanceText: {
    color: '#475569',
    fontWeight: '500',
  },
  favButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#707070',
    marginTop: 2,
  },
  meta: {
    color: '#4a4a4a',
  },
  link: {
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
  imageCard: {
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageText: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 12,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteYes: {
    backgroundColor: '#E8F5E9',
  },
  voteNo: {
    backgroundColor: '#FFEBEE',
  },
  voteText: {
    fontWeight: '700',
    color: '#334155',
  },
  voteCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#1976D2',
  },
  secondaryAction: {
    backgroundColor: '#E8F5E9',
  },
  actionText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryActionText: {
    color: '#2E7D32',
  },
  choiceBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 88,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  choiceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f1f4f8',
    borderRadius: 8,
    maxWidth: '48%',
  },
  choiceText: {
    color: '#102a43',
  },
  toggleBar: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  toggleItemActive: {
    backgroundColor: '#e6f0ff',
  },
  toggleText: {
    color: '#334155',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});


