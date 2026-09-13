import {
  Map as MapView,
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  Images,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FeatureProps } from '../../types/api';
import { openDirections } from './map/navigationIntents';
import { MapTopChrome } from './map/MapTopChrome';
import { FilterSheet } from './map/FilterSheet';
import { ChoiceBar } from './map/ChoiceBar';
import { RecenterButton } from './map/RecenterButton';
import { DetailsSheet } from './map/DetailsSheet';
import { MapHint } from './map/MapHint';
import { StatusBanner } from './map/StatusBanner';
import { ListViewItem } from './map/ListViewItem';
import { styles } from './Map.styles';
import { useMapNavigation } from '../MapNavigationContext';
import { useCachedFountainsData } from './map/useCachedFountainsData';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { MapScaleBar } from './map/MapScaleBar';
import { isInBerlin } from '../../utils/location';
import { CATEGORIES, CategoryKey, CATEGORY_LIST } from '../../constants/categories';
import { markerImages as buildMarkerImages, MARKER_ICON_SIZE } from '../../constants/markerAssets';
import { usePreferences } from '../../preferences/PreferencesContext';
import { palette } from '../../constants/tokens';
import { useTheme } from '../../hooks/useTheme';
import { lightImpact } from '../../utils/haptics';
import { haversineDistance, formatDistance, walkingEta } from './map/utils';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const BERLIN_CENTER: [number, number] = [13.405, 52.52];

export function MapScreen() {
  const { isDark, colors } = useTheme();
  const { markerStyle } = usePreferences();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  // Height of the floating top chrome (pill + search + chips) — list content
  // starts below it so rows aren't hidden behind the overlay.
  const chromeOffset = insets.top + 162;
  const [viewMode, setViewMode] = React.useState<'map' | 'list'>('map');
  const [filterOpen, setFilterOpen] = React.useState(false);

  // Defer Mapbox init to component mount so Fabric native views are ready
  const [mapboxReady, setMapboxReady] = React.useState(false);
  const mapboxInitRef = React.useRef(false);

  React.useEffect(() => {
    if (mapboxInitRef.current) return;
    mapboxInitRef.current = true;
    // MapLibre is tokenless — no access token or telemetry setup needed.
    setMapboxReady(true);
  }, []);

  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = React.useState(false);
  const [isOutOfBounds, setIsOutOfBounds] = React.useState(false);
  const [selected, setSelected] = React.useState<FeatureProps | null>(null);
  const [candidates, setCandidates] = React.useState<FeatureProps[]>([]);
  // Render map layers only after the style is fully loaded to avoid Android dev-reload native view tag errors
  const [styleLoaded, setStyleLoaded] = React.useState(false);
  const [mapLoadFailed, setMapLoadFailed] = React.useState(false);
  const [mapAttempt, setMapAttempt] = React.useState(0);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const cameraRef = React.useRef<CameraRef>(null);
  const sourceRef = React.useRef<GeoJSONSourceRef>(null);
  const [cameraZoom, setCameraZoom] = React.useState<number>(3);
  const [cameraCenter, setCameraCenter] = React.useState<[number, number]>(BERLIN_CENTER);
  const hasInitiallyCentered = React.useRef(false);
  const hasHandledPendingFeature = React.useRef(false);

  const { pendingFeature, clearPendingFeature } = useMapNavigation();
  const [showMapHint, setShowMapHint] = React.useState(false);

  // Use caching hook for data management (now category-aware)
  const {
    features, loading, error, cacheAge, isStale, hasCachedData,
    activeCategories, toggleCategory, setCategories, refresh,
  } = useCachedFountainsData();
  const isOnline = useNetworkStatus();

  // Compute distance and simple walking ETA from user location to selected feature
  const distanceInfo = React.useMemo(() => {
    if (!userLocation || !selected) return null;
    const meters = haversineDistance(userLocation, selected.coordinates);
    return { distanceText: formatDistance(meters), etaMinutes: walkingEta(meters) };
  }, [userLocation, selected]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          const loc = await Location.getCurrentPositionAsync({});
          if (isMounted) {
            setUserLocation([loc.coords.longitude, loc.coords.latitude]);
          }
        }
      } catch {}
    })();
    return () => { isMounted = false; };
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
      } catch {}
    })();
  }, [styleLoaded, features]);

  const handleDismissHint = React.useCallback(async () => {
    setShowMapHint(false);
    try {
      await AsyncStorage.setItem('hasSeenMapHint', 'true');
    } catch {}
  }, []);

  // Fly to user location once it becomes available on initial load
  const performInitialZoom = React.useCallback(() => {
    if (!hasInitiallyCentered.current && userLocation && styleLoaded && cameraRef.current && !pendingFeature && !hasHandledPendingFeature.current) {
      try {
        cameraRef.current.flyTo({
          center: isInBerlin(userLocation[1], userLocation[0]) ? userLocation : BERLIN_CENTER,
          zoom: 14,
          duration: 800,
        });
        hasInitiallyCentered.current = true;
      } catch (e) {
        if (__DEV__) console.warn('[Map] Failed to zoom to location', e);
      }
    }
  }, [userLocation, styleLoaded, pendingFeature]);

  React.useEffect(() => {
    performInitialZoom();
  }, [performInitialZoom]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(performInitialZoom, 800);
      return () => { clearTimeout(timer); };
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
    if (pendingFeature && styleLoaded && cameraRef.current) {
      setViewMode('map');
      hasHandledPendingFeature.current = true;
      hasInitiallyCentered.current = true;

      // Ensure the category for this feature is active
      const featureType = pendingFeature.type as CategoryKey | undefined;
      if (featureType && !activeCategories.has(featureType)) {
        toggleCategory(featureType);
        setSelected(pendingFeature);
      } else {
        const found = features.find((f) => f.id === pendingFeature.id);
        setSelected(found || pendingFeature);
      }

      cameraRef.current?.flyTo({
        center: pendingFeature.coordinates,
        zoom: 15,
        duration: 800,
      });

      clearPendingFeature();
    }
  }, [pendingFeature, styleLoaded, features, activeCategories, clearPendingFeature, toggleCategory]);

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

  const selectedId = selected?.id ?? '';
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

  const handleRecenter = React.useCallback(async () => {
    try {
      if (!styleLoaded) return;
      if (!hasLocationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location access is off', 'Enable location in Settings to find amenities near you. You can still browse Berlin without it.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { Linking.openSettings(); } },
          ]);
          return;
        }
        setHasLocationPermission(true);
      }
      let target: [number, number] | null = userLocation;
      if (!target) {
        const loc = await Location.getCurrentPositionAsync({});
        target = [loc.coords.longitude, loc.coords.latitude];
        setUserLocation(target);
      }
      if (!target) return;
      cameraRef.current?.flyTo({
        center: target,
        zoom: Math.max(cameraZoom, 14),
        duration: 600,
      });
    } catch (e) {
      if (__DEV__) console.warn('[Map] Failed to recenter', e);
    }
  }, [styleLoaded, hasLocationPermission, userLocation, cameraZoom]);

  // Search result handler: fly camera to geocoded coords
  const handleSearchResult = React.useCallback((coords: [number, number]) => {
    setViewMode('map');
    setSelected(null);
    setCandidates([]);
    cameraRef.current?.flyTo({
      center: coords,
      zoom: 15,
      duration: 800,
    });
  }, []);

  const getFeatureCoordinate = React.useCallback((f: any): [number, number] | null => {
    let coords: any = f?.geometry?.coordinates;
    if (Array.isArray(coords)) {
      if (Array.isArray(coords[0])) coords = coords[0];
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        return [coords[0], coords[1]];
      }
    }
    return null;
  }, []);

  // Build Mapbox marker images record for the active marker style
  const markerImages = React.useMemo(() => buildMarkerImages(markerStyle), [markerStyle]);
  const markerIconSize = MARKER_ICON_SIZE[markerStyle];

  // Build SymbolLayers for each active category
  const shapeLayers = React.useMemo(() => {
    // "Clean Berlin" cluster bubbles: solid blue, white ring, soft blue glow.
    const clusterPalette = { fill: palette.blue, stroke: 'rgba(255,255,255,0.92)', glow: 'rgba(26,86,219,0.26)' };

    const layers: React.ReactElement[] = [];

    // Selection halo
    layers.push(
      <Layer
        type="circle"
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

    // Cluster layers
    layers.push(
      <Layer
        type="circle"
        key="clusterGlow"
        id="clusterGlow"
        filter={["has", "point_count"] as any}
        style={{
          circleColor: clusterPalette.glow,
          circleOpacity: 1,
          circleRadius: ['step', ['get', 'point_count'], 22, 20, 26, 50, 32] as any,
          circleBlur: 0.5,
        }}
      />
    );
    layers.push(
      <Layer
        type="circle"
        key="clusteredPoints"
        id="clusteredPoints"
        filter={["has", "point_count"] as any}
        style={{
          circleColor: clusterPalette.fill,
          circleOpacity: 0.92,
          circleStrokeWidth: 2,
          circleStrokeColor: clusterPalette.stroke,
          circleRadius: ['step', ['get', 'point_count'], 16, 20, 20, 50, 26] as any,
        }}
      />
    );
    layers.push(
      <Layer
        type="symbol"
        key="clusterCount"
        id="clusterCount"
        filter={["has", "point_count"] as any}
        style={{
          textField: ['get', 'point_count'] as any,
          textFont: ['Noto Sans Regular'],
          textSize: 12,
          textColor: '#ffffff',
        }}
      />
    );

    // One SymbolLayer per active category
    for (const cat of CATEGORY_LIST) {
      if (!activeCategories.has(cat.key)) continue;
      layers.push(
        <Layer
        type="symbol"
          key={`symbol_${cat.key}`}
          id={`symbol_${cat.key}`}
          filter={["==", ["get", "type"], cat.key] as any}
          style={{
            iconImage: cat.markerImageKey,
            iconSize: makeSelectedIconSize(markerIconSize),
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconAnchor: 'bottom',
          }}
        />
      );
    }

    return layers;
  }, [selectedId, makeSelectedIconSize, activeCategories, markerIconSize]);

  // Features sorted by distance for list view
  const sortedFeatures = React.useMemo(() => {
    if (!userLocation) return features;
    return [...features].sort((a, b) =>
      haversineDistance(userLocation, a.coordinates) - haversineDistance(userLocation, b.coordinates)
    );
  }, [features, userLocation]);

  const handleToggleView = React.useCallback(() => {
    lightImpact();
    setViewMode((v) => (v === 'map' ? 'list' : 'map'));
  }, []);

  const handleListItemPress = React.useCallback((item: FeatureProps) => {
    lightImpact();
    setSelected(item);
    setViewMode('map');
    cameraRef.current?.flyTo({
      center: item.coordinates,
      zoom: 15,
      duration: 800,
    });
  }, []);

  if (!mapboxReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        key={mapAttempt}
        style={styles.map}
        mapStyle={colors.mapStyle}
        onDidFinishLoadingStyle={() => {
          setStyleLoaded(true);
          setMapLoadFailed(false);
        }}
        onDidFailLoadingMap={() => {
          setMapLoadFailed(true);
          if (__DEV__) console.warn('[Map] Map loading error');
        }}
        onRegionDidChange={(e: any) => {
          const z = e?.nativeEvent?.zoom;
          if (typeof z === 'number') setCameraZoom(z);
          const center = e?.nativeEvent?.center;
          if (Array.isArray(center) && center.length >= 2) {
            const [lng, lat] = center as [number, number];
            if (typeof lng === 'number' && typeof lat === 'number') {
              setCameraCenter([lng, lat]);
            }
          }
        }}
        onPress={() => {
          // Fires only for empty-area taps; feature taps are handled in
          // GeoJSONSource.onPress (which calls stopPropagation).
          setSelected(null);
          setCandidates([]);
        }}
        logo={false}
        scaleBar={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: BERLIN_CENTER, zoom: 12 }}
        />
        {styleLoaded ? (
          <>
            <Images images={markerImages} />
            {hasLocationPermission ? <UserLocation /> : null}

            <GeoJSONSource
              id="fountains"
              ref={sourceRef}
              data={featureCollection as any}
              cluster
              clusterRadius={44}
              clusterMaxZoom={13}
              hitbox={{ top: 15, right: 15, bottom: 15, left: 15 }}
              onPress={async (e: any) => {
                e.stopPropagation?.();
                const feat = e.nativeEvent?.features?.[0];
                if (!feat) return;
                const props: any = feat.properties;
                if (props?.cluster) {
                  const coord = getFeatureCoordinate(feat);
                  if (!coord) return;
                  let nextZoom = Math.min(Math.max(cameraZoom + 2, 13), 17);
                  try {
                    const clusterId = props.cluster_id;
                    if (clusterId != null && sourceRef.current?.getClusterExpansionZoom) {
                      nextZoom = await sourceRef.current.getClusterExpansionZoom(clusterId);
                    }
                  } catch {
                    // fall back to heuristic zoom
                  }
                  cameraRef.current?.flyTo({ center: coord as any, zoom: nextZoom, duration: 500 });
                  return;
                }
                if (showMapHint) handleDismissHint();
                const nonCluster = (e.nativeEvent?.features || []).filter((f: any) => !f.properties?.cluster);
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
            </GeoJSONSource>
          </>
        ) : null}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && (mapLoadFailed || (error && !hasCachedData && features.length === 0)) ? (
        <View style={styles.stateOverlay}>
          <Text style={styles.stateTitle}>
            {mapLoadFailed
              ? 'Map failed to load'
              : !isOnline
              ? 'No cached data available yet'
              : 'Unable to load amenities'}
          </Text>
          <Text style={styles.stateText}>
            {mapLoadFailed
              ? 'Check your connection and try again. Saved amenities are also available in list view.'
              : !isOnline
              ? 'Connect once to download Berlin amenity data, then you can keep browsing cached results when offline.'
              : 'The amenity feed could not be loaded right now. You can try again in a moment.'}
          </Text>
          <View style={styles.stateActions}>
            <Pressable
              style={[styles.stateButton, styles.stateButtonPrimary]}
              onPress={() => {
                if (mapLoadFailed) {
                  setStyleLoaded(false);
                  setMapLoadFailed(false);
                  setMapAttempt((attempt) => attempt + 1);
                }
                refresh().catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading amenity data"
            >
              <Text style={styles.stateButtonText}>Retry</Text>
            </Pressable>
            {!hasLocationPermission ? (
              <Pressable
                style={[styles.stateButton, styles.stateButtonSecondary]}
                onPress={handleRecenter}
                accessibilityRole="button"
                accessibilityLabel="Request location access"
              >
                <Text style={styles.stateButtonTextSecondary}>Enable location</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {showMapHint && <MapHint onDismiss={handleDismissHint} />}

      <MapTopChrome
        onSettings={() => navigation.navigate('Settings')}
        onSearchResult={handleSearchResult}
        viewMode={viewMode}
        onToggleView={handleToggleView}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        onOpenFilters={() => setFilterOpen(true)}
      />

      {!selected && <StatusBanner
        isOnline={isOnline}
        cacheAge={cacheAge}
        isStale={isStale}
        isOutOfBounds={isOutOfBounds}
        error={error}
        onRefresh={() => { refresh().catch(() => {}); }}
      />}

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
          cameraRef.current?.flyTo({
            center: c.coordinates,
            zoom: 15,
            duration: 400,
          });
        }}
      />

      <RecenterButton onPress={handleRecenter} />

      <FilterSheet
        visible={filterOpen}
        activeCategories={activeCategories}
        onToggle={toggleCategory}
        setCategories={setCategories}
        onClose={() => setFilterOpen(false)}
      />

      {/* List view overlay */}
      {viewMode === 'list' ? (
        <View style={[styles.listOverlay, { backgroundColor: colors.background }]}>
          <FlatList
            data={sortedFeatures}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingTop: chromeOffset }]}
            ListEmptyComponent={<Text style={{ color: colors.textSecondary, padding: 16 }}>{loading ? 'Loading amenities…' : error || 'No amenities found for these categories.'}</Text>}
            renderItem={({ item }) => (
              <ListViewItem
                item={item}
                userLocation={userLocation}
                onPress={handleListItemPress}
              />
            )}
          />
        </View>
      ) : null}

      <DetailsSheet
        refInstance={bottomSheetRef}
        selected={selected}
        onClose={() => setSelected(null)}
        distanceInfo={distanceInfo}
        isOnline={isOnline}
        onNavigate={handleNavigate}
      />
    </View>
  );
}

export function MapScreenWithBoundary() {
  return (
    <ErrorBoundary>
      <MapScreen />
    </ErrorBoundary>
  );
}
