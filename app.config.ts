import { ExpoConfig, ConfigContext } from 'expo/config';
import withAndroidPlayConsoleFixes from './plugins/withAndroidPlayConsoleFixes.js';
import withFixReanimatedWorklets from './plugins/withFixReanimatedWorklets.js';

// Dynamic Expo config equivalent of app.json

// Supabase configuration (provided via env in dev/build)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Berlin Public',
  slug: 'berlin-public',
  version: '1.0.0',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
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
      backgroundColor: '#3CA8E8',
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
    withAndroidPlayConsoleFixes as any,
    withFixReanimatedWorklets as any,
    'expo-asset',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#3CA8E8',
        image: './assets/splash-icon.png',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Show your location and find nearby public amenities.',
      },
    ],
    '@maplibre/maplibre-react-native',
  ],
  extra: {
    // Make Supabase runtime config available to the app
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    eas: {
      projectId: '3b7bdd53-574d-4362-ae7c-6d9883b4dfca',
    },
  },
});
