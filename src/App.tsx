import { Assets as NavigationAssets } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { Navigation } from './navigation';
import { FavoritesProvider } from './favorites/FavoritesContext';
import { MapNavigationProvider } from './navigation/MapNavigationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/newspaper.png'),
  require('./assets/bell.png'),
]);

SplashScreen.preventAutoHideAsync();

// Silence noisy NativeEventEmitter warnings from third-party modules in dev as early as possible
LogBox.ignoreLogs([
  'new NativeEventEmitter()',
  'NativeEventEmitter',
]);

export function App() {
  const colorScheme = useColorScheme();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [navReady, setNavReady] = React.useState(false);
  const navigationRef = React.useRef<any>(null);

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  React.useEffect(() => {
    const checkOnboarding = async () => {
      const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding:v1');
      if (hasCompleted !== 'true' && navigationRef.current) {
        // Navigate to onboarding if not completed
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, []);

  // Hide splash screen when both navigation and onboarding check are ready
  React.useEffect(() => {
    if (onboardingChecked && navReady) {
      SplashScreen.hideAsync();
    }
  }, [onboardingChecked, navReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FavoritesProvider>
        <MapNavigationProvider>
          <Navigation
            ref={navigationRef}
            theme={theme}
            linking={{
              enabled: 'auto',
              prefixes: [
                // Change the scheme to match your app's scheme defined in app.json
                'berlinfountains://',
              ],
            }}
            onReady={() => setNavReady(true)}
          />
          <Toast />
        </MapNavigationProvider>
      </FavoritesProvider>
    </GestureHandlerRootView>
  );
}
