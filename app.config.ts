import { ExpoConfig, ConfigContext } from 'expo/config';

// Dynamic Expo config equivalent of app.json
// Keep simple and static for now; secrets can be moved to env later.

// Public runtime token (pk.*) used by Mapbox SDK at runtime
const MAPBOX_PUBLIC_TOKEN =
  'pk.eyJ1IjoiaXVzdGlubiIsImEiOiJjbTlpc2l3MjkwNHNsMmtzNjl3bG54dGNrIn0.HQ7d38Y6aQdteG-P3LODnw';
// Secret downloads token (sk.*) required by native SDK downloads during prebuild
const MAPBOX_DOWNLOADS_TOKEN =
  process.env.MAPBOX_DOWNLOADS_TOKEN ||
  'sk.eyJ1IjoiaXVzdGlubiIsImEiOiJjbWUzeWxrbnkwYmphMmpzOTh1Z2p0dTAxIn0.itJMp15YV5sX8ZzcW2HRxg';

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
  },
});


