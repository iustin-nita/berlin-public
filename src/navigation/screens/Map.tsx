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
  type?: 'drinking' | 'decorative';
  imageUrl?: string;
};

const BERLIN_CENTER: [number, number] = [13.405, 52.52];

Mapbox.setAccessToken((Constants.expoConfig?.extra as any)?.mapboxPublicToken);

export function MapScreen() {
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [features, setFeatures] = React.useState<FeatureProps[]>([]);
  const [selected, setSelected] = React.useState<FeatureProps | null>(null);
  const [loading, setLoading] = React.useState(true);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const cameraRef = React.useRef<Mapbox.Camera>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Request location once on first launch
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
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
        // Fetch WFS GeoJSON for Berlin drinking water fountains
        // The GetCapabilities URL shows availability; we query GeoJSON directly
        const url =
          'https://gdi.berlin.de/services/wfs/trinkwasserbrunnen?service=WFS&version=2.0.0&request=GetFeature&typeNames=trinkwasserbrunnen:trinkwasserbrunnen&outputFormat=application/json&srsName=EPSG:4326';
        const res = await fetch(url);
        const geo = await res.json();
        if (!geo || !geo.features) throw new Error('Invalid GeoJSON');
        const mapped: FeatureProps[] = geo.features
          .map((f: any, idx: number) => {
            const coords: [number, number] | undefined = f?.geometry?.coordinates;
            if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
              return null;
            }
            const name: string = f?.properties?.standort || f?.properties?.name || 'Fountain';
            return {
              id: String(f.id ?? idx),
              title: name,
              description: f?.properties?.bezirk || undefined,
              coordinates: coords,
              type: 'drinking',
            } as FeatureProps;
          })
          .filter(Boolean);
        if (isMounted) {
          setFeatures(mapped);
        }
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

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Light}>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={initialCenter}
          zoomLevel={12}
          animationMode="flyTo"
          animationDuration={800}
        />
        {/* User location */}
        <Mapbox.UserLocation showsUserHeadingIndicator animated visible />

        {/* Pins */}
        {features.map((f) => (
          <Mapbox.PointAnnotation
            key={f.id}
            id={f.id}
            coordinate={f.coordinates}
            onSelected={() => setSelected(f)}
          />
        ))}
      </Mapbox.MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}

      {/* Recenter button */}
      <Pressable
        accessibilityLabel="Recenter map to my location"
        onPress={() => {
          if (userLocation) {
            cameraRef.current?.setCamera({
              centerCoordinate: userLocation,
              zoomLevel: 13,
              animationDuration: 600,
            } as any);
          }
        }}
        style={styles.recenterButton}
      >
        <Text style={styles.recenterGlyph}>➤</Text>
      </Pressable>

      {/* Bottom sheet for details */}
      <BottomSheet ref={bottomSheetRef} snapPoints={[0, '35%']} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          {selected ? (
            <View>
              <Text style={styles.title}>{selected.title}</Text>
              {selected.description ? (
                <Text style={styles.subtitle}>{selected.description}</Text>
              ) : null}
              <View style={{ height: 8 }} />
              <Text style={styles.meta}>Drinking water fountain</Text>
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
});


