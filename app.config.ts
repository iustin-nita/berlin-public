import { ExpoConfig, ConfigContext } from 'expo/config';
import withAndroidPlayConsoleFixes from './plugins/withAndroidPlayConsoleFixes.js';
import withFixReanimatedWorklets from './plugins/withFixReanimatedWorklets.js';
import withMapLibreNetworking from './plugins/withMapLibreNetworking.js';

// Dynamic Expo config equivalent of app.json

// Public Worker URL only; database credentials never belong in the app.
const COMMUNITY_API_URL = process.env.COMMUNITY_API_URL;
if (process.env.EAS_BUILD === 'true' && !COMMUNITY_API_URL?.startsWith('https://')) {
  throw new Error('Set COMMUNITY_API_URL to the deployed HTTPS Worker before building a store release');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Berlin Public',
  slug: 'berlin-public',
  version: '1.1.0',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'berlinpublic',
  description: 'Find public fountains, restrooms, and essential amenities across Berlin. Save favorites and browse cached amenity data offline.',
  primaryColor: '#3B82F6',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.blobstudio.berlinpublic',
    buildNumber: '10',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'We use your location to show nearby public amenities and calculate approximate distances.',
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
    [
      'expo-build-properties',
      {
        ios: {
          enableSceneSupport: true,
        },
      },
    ],
    withAndroidPlayConsoleFixes as any,
    withFixReanimatedWorklets as any,
    withMapLibreNetworking as any,
    'expo-asset',
    'expo-font',
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
    communityApiUrl: COMMUNITY_API_URL,
    eas: {
      projectId: '3b7bdd53-574d-4362-ae7c-6d9883b4dfca',
    },
  },
});
