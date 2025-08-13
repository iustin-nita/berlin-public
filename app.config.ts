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
  name: 'berlin-fountains',
  slug: 'berlin-fountains',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'berlinfountains',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.satya164.reactnavigationtemplate',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'We use your location to show nearby fountains on the map.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.satya164.reactnavigationtemplate',
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
        locationWhenInUsePermission: 'Show current location on map.',
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
      slug: 'berlin-fountains',
      projectId: '217c7d26-d257-41ef-b6cf-19e97076d160',
    },
  },
});


