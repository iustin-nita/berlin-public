import { ExpoConfig, ConfigContext } from 'expo/config';

// Dynamic Expo config equivalent of app.json
// Keep simple and static for now; secrets can be moved to env later.

// Public runtime token (pk.*) used by Mapbox SDK at runtime
const MAPBOX_PUBLIC_TOKEN =
  'pk.eyJ1IjoiaXVzdGlubiIsImEiOiJjbTlpc2l3MjkwNHNsMmtzNjl3bG54dGNrIn0.HQ7d38Y6aQdteG-P3LODnw';
// Secret downloads token (sk.*) required by native SDK downloads during prebuild
const MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN;

// Supabase configuration (provided via env in dev/build)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Berlin Public',
  slug: 'berlin-public',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  // Mapbox (@rnmapbox/maps) does not yet support the React Native New Architecture (Fabric/JSI),
  // so keep it disabled to avoid Android ViewTagResolver crashes when layers mount.
  newArchEnabled: false,
  scheme: 'berlinpublic',
  description: 'Find public fountains, restrooms, and essential amenities across Berlin. Works offline with community-driven updates.',
  primaryColor: '#3B82F6',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.blobstudio.berlinpublic',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We use your location to show nearby public amenities and calculate walking distances.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.blobstudio.berlinpublic',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION'
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-asset',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/splash-icon.png',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Show your location and find nearby public amenities.',
      },
    ],
    'react-native-edge-to-edge',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        RNMapboxMapsDownloadToken: MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
  ],
  extra: {
    mapboxPublicToken: MAPBOX_PUBLIC_TOKEN,
    // Make Supabase runtime config available to the app
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    eas: {
      projectId: '3b7bdd53-574d-4362-ae7c-6d9883b4dfca',
    },
  },
});

