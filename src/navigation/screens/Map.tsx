import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { FeatureProps } from '../../types/api';
import { openDirections } from './map/navigationIntents';
import { ToggleBar } from './map/ToggleBar';
import { ChoiceBar } from './map/ChoiceBar';
import { RecenterButton } from './map/RecenterButton';
import { DetailsSheet } from './map/DetailsSheet';
import { MapHint } from './map/MapHint';
import { OfflineBanner } from './map/OfflineBanner';
import { OutOfBoundsBanner } from './map/OutOfBoundsBanner';
import { styles } from './Map.styles';
import { useMapNavigation } from '../MapNavigationContext';
import { useCachedFountainsData } from './map/useCachedFountainsData';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { MapScaleBar } from './map/MapScaleBar';
import { isInBerlin } from '../../utils/location';

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
// Simple dataset flags so we can toggle sources independently.
// Future-friendly: add `toiletsPublic` when we wire the toilets feed.
const DATASETS = {
  fountainsDrinking: true,
  fountainsDecorative: false,
  toiletsPublic: true, 
} as const;

Mapbox.setAccessToken((Constants.expoConfig?.extra as any)?.mapboxPublicToken);

// Suppress Mapbox telemetry to reduce noise
Mapbox.setTelemetryEnabled(false);

export function MapScreen() {
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = React.useState(false);
  const [isOutOfBounds, setIsOutOfBounds] = React.useState(false);
  const [selected, setSelected] = React.useState<FeatureProps | null>(null);
  const [candidates, setCandidates] = React.useState<FeatureProps[]>([]);
  const [activeDataset, setActiveDataset] = React.useState<'fountains' | 'toilets'>('fountains');
  const [useDecorWms, setUseDecorWms] = React.useState(false);
  // Render map layers only after the style is fully loaded to avoid Android dev-reload native view tag errors
  const [styleLoaded, setStyleLoaded] = React.useState(false);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const sourceRef = React.useRef<Mapbox.ShapeSource>(null);
  const [cameraZoom, setCameraZoom] = React.useState<number>(3);
  const [cameraCenter, setCameraCenter] = React.useState<[number, number]>(BERLIN_CENTER);
  const hasInitiallyCentered = React.useRef(false);
  const hasHandledPendingFeature = React.useRef(false);

  const { pendingFeature, clearPendingFeature } = useMapNavigation();
  const [showMapHint, setShowMapHint] = React.useState(false);

  // Use caching hook for data management
  const { features, loading, cacheAge, isStale, refresh } = useCachedFountainsData();
  const isOnline = useNetworkStatus();
  // Temporary visual-only flag: hide the photo placeholder section
  const SHOW_IMAGE_PLACEHOLDER = false;

  // Compute distance and simple walking ETA from user location to selected feature
  const distanceInfo = React.useMemo(() => {
    if (!userLocation || !selected) return null;
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
    return { distanceText: formatDistance(meters), etaMinutes: minutes };
  }, [userLocation, selected]);

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

  // Check if user is outside Berlin boundaries
  React.useEffect(() => {
    if (userLocation) {
      const [lon, lat] = userLocation;
      setIsOutOfBounds(!isInBerlin(lat, lon));
    }
  }, [userLocation]);

  // Check if user has seen the map hint, show if not
  React.useEffect(() => {
    (async () => {
      try {
        const hasSeenHint = await AsyncStorage.getItem('hasSeenMapHint');
        if (!hasSeenHint && styleLoaded && features.length > 0) {
          setShowMapHint(true);
        }
      } catch {
        // Ignore storage errors
      }
    })();
  }, [styleLoaded, features]);

  const handleDismissHint = React.useCallback(async () => {
    setShowMapHint(false);
    try {
      await AsyncStorage.setItem('hasSeenMapHint', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Fly to user location once it becomes available on initial load
  // Combined approach: useEffect for reactivity + useFocusEffect for navigation events
  // Skip if we have a pendingFeature or have already handled one (navigating from Favorites)
  const performInitialZoom = React.useCallback(() => {
    if (!hasInitiallyCentered.current && userLocation && styleLoaded && cameraRef.current && !pendingFeature && !hasHandledPendingFeature.current) {
      const camera: any = cameraRef.current;
      try {
        if (camera?.setCamera) {
          camera.setCamera({
            centerCoordinate: userLocation,
            zoomLevel: 14,
            animationMode: 'flyTo',
            animationDuration: 800,
          });
          hasInitiallyCentered.current = true;
        } else if (camera?.flyTo) {
          camera.flyTo(userLocation, 800);
          hasInitiallyCentered.current = true;
        }
      } catch (e) {
        if (__DEV__) console.warn('[Map] Failed to zoom to location', e);
      }
    }
  }, [userLocation, styleLoaded, pendingFeature]);

  // Trigger zoom when location/style become available
  React.useEffect(() => {
    performInitialZoom();
  }, [performInitialZoom]);

  // Also trigger when screen comes into focus (e.g., from onboarding)
  // Reset flag and wait for navigation animation to complete before zooming
  useFocusEffect(
    React.useCallback(() => {
      // Reset the flag on focus to allow retry after navigation from onboarding
      // This handles the case where Map mounted in background with incomplete conditions
      if (hasInitiallyCentered.current) {
        hasInitiallyCentered.current = false;
      }

      // Wait for navigation animation to complete (~300-500ms) before attempting zoom
      // This ensures the map is fully visible and interactive
      const timer1 = setTimeout(performInitialZoom, 600);
      const timer2 = setTimeout(performInitialZoom, 1000);
      const timer3 = setTimeout(performInitialZoom, 1500);
      const timer4 = setTimeout(performInitialZoom, 2000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }, [performInitialZoom])
  );

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
      // Mark that we've handled a pending feature (prevents initial zoom from firing)
      hasHandledPendingFeature.current = true;
      hasInitiallyCentered.current = true;

      // Switch to correct dataset if needed
      const featureType = pendingFeature.type;
      const needsDatasetSwitch =
        (featureType === 'toilet' && activeDataset !== 'toilets') ||
        ((featureType === 'drinking' || featureType === 'decorative') && activeDataset !== 'fountains');

      if (needsDatasetSwitch) {
        if (featureType === 'toilet') {
          setActiveDataset('toilets');
        } else {
          setActiveDataset('fountains');
        }
        // Wait for next tick to let dataset switch complete, then select
        setTimeout(() => {
          const found = features.find((f) => f.id === pendingFeature.id);
          setSelected(found || pendingFeature);
        }, 50);
      } else {
        // No dataset switch needed, select immediately
        const found = features.find((f) => f.id === pendingFeature.id);
        setSelected(found || pendingFeature);
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
      (['case', ['==', ['get', 'id'], selectedId], baseSize * 1.25, baseSize] as any),
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
    const clusterPalette =
      activeDataset === 'toilets'
        ? { fill: '#1e3a8a', stroke: '#c7d2fe', glow: 'rgba(30,58,138,0.35)' }
        : { fill: '#1d8bf1', stroke: '#bfdbfe', glow: 'rgba(29,139,241,0.28)' };

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
          circleStrokeColor: clusterPalette.fill,
          circleStrokeWidth: 2,
        }}
      />
    );
    // Cluster glow effect (outer ring)
    layers.push(
      <Mapbox.CircleLayer
        key="clusterGlow"
        id="clusterGlow"
        filter={["has", "point_count"] as any}
        style={{
          circleColor: clusterPalette.glow,
          circleOpacity: 1,
          circleRadius: [
            'step',
            ['get', 'point_count'],
            22,  // +6 from base
            20,
            26,  // +6 from base
            50,
            32,  // +6 from base
          ] as any,
          circleBlur: 0.5,
        }}
      />
    );
    // Cluster circles (main)
    layers.push(
      <Mapbox.CircleLayer
        key="clusteredPoints"
        id="clusteredPoints"
        filter={["has", "point_count"] as any}
        style={{
          circleColor: clusterPalette.fill,
          circleOpacity: 0.92,
          circleStrokeWidth: 2,
          circleStrokeColor: clusterPalette.stroke,
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
  }, [selectedId, makeSelectedIconSize, activeDataset]);

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Light}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        onMapLoadingError={(error) => {
          if (__DEV__) console.warn('[Map] Map loading error:', error);
        }}
        onCameraChanged={(e: any) => {
          const z = e?.properties?.zoom;
          if (typeof z === 'number') setCameraZoom(z);
          const center = e?.properties?.center;
          if (Array.isArray(center) && center.length >= 2) {
            const [lng, lat] = center as [number, number];
            if (typeof lng === 'number' && typeof lat === 'number') {
              setCameraCenter([lng, lat]);
            }
          }
        }}
        onPress={(e) => {
          // Deselect fountain when tapping empty map (no features)
          if (!e.features || e.features.length === 0) {
            setSelected(null);
            setCandidates([]);
          }
        }}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
      >
        {styleLoaded ? (
          <>
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
                // Dismiss hint on first marker tap
                if (showMapHint) {
                  handleDismissHint();
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

      {showMapHint && <MapHint onDismiss={handleDismissHint} />}

      <OfflineBanner
        isOnline={isOnline}
        cacheAge={cacheAge}
        isStale={isStale}
        onRefresh={refresh}
      />

      <OutOfBoundsBanner
        isOutOfBounds={isOutOfBounds}
        offsetTop={(!isOnline || isStale) ? 132 : 60}
      />

      <ToggleBar activeDataset={activeDataset} setActiveDataset={setActiveDataset} />
      <MapScaleBar
        zoomLevel={cameraZoom}
        latitude={cameraCenter[1]}
        offsetBottom={candidates.length > 1 ? 164 : 32}
      />
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
        distanceInfo={distanceInfo}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

// styles moved to ./map/styles
