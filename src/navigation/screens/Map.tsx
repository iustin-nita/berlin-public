import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

type FeatureProps = {
  id: string;
  title: string;
  description?: string;
  coordinates: [number, number];
  type?: 'drinking' | 'decorative' | 'toilet';
  imageUrl?: string;
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
  const [loading, setLoading] = React.useState(true);
  const [useDecorWms, setUseDecorWms] = React.useState(false);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const sourceRef = React.useRef<Mapbox.ShapeSource>(null);
  const [cameraZoom, setCameraZoom] = React.useState<number>(12);

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
              const name: string =
                f?.properties?.standort ||
                f?.properties?.name ||
                f?.properties?.bezeichnung ||
                f?.properties?.anlage ||
                f?.properties?.titel ||
                f?.properties?.objekt ||
                'Fountain';
              return {
                id: String(f.id ?? idx),
                title: name,
                description: f?.properties?.bezirk || f?.properties?.ortsteil || undefined,
                coordinates: coords,
                type,
              } as FeatureProps;
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

  const featureCollection = React.useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: features.map((f) => ({
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
  }, [features]);

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
        onCameraChanged={(e: any) => {
          const z = e?.properties?.zoom;
          if (typeof z === 'number') setCameraZoom(z);
        }}
      >
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

        {/* Pins via ShapeSource + SymbolLayers filtered by type */}
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
      </Mapbox.MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}
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
        snapPoints={['35%']}
        index={-1}
        enablePanDownToClose
        onClose={() => setSelected(null)}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selected ? (
            <View>
              <Text style={styles.title}>{selected.title}</Text>
              {selected.description ? (
                <Text style={styles.subtitle}>{selected.description}</Text>
              ) : null}
              <View style={{ height: 8 }} />
              <Text style={styles.meta}>
                {selected.type === 'drinking'
                  ? 'Drinking water fountain'
                  : selected.type === 'decorative'
                  ? 'Decorative fountain'
                  : 'Water fountain (non-drinkable)'}
              </Text>
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
  subtitle: {
    color: '#707070',
    marginTop: 2,
  },
  meta: {
    color: '#4a4a4a',
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
});


