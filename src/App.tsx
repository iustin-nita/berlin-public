import { Assets as NavigationAssets } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { Navigation } from './navigation';
import { FavoritesProvider } from './favorites/FavoritesContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { MapNavigationProvider } from './navigation/MapNavigationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/newspaper.png'),
  require('./assets/bell.png'),
]);

SplashScreen.preventAutoHideAsync();

// Silence noisy warnings from third-party modules in dev as early as possible
LogBox.ignoreLogs([
  'new NativeEventEmitter()',
  'NativeEventEmitter',
]);

export function App() {
  const colorScheme = useColorScheme();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [navReady, setNavReady] = React.useState(false);
  const [shouldShowOnboarding, setShouldShowOnboarding] = React.useState<boolean | null>(null);
  const navigationRef = React.useRef<any>(null);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  React.useEffect(() => {
    if (fontError && __DEV__) {
      console.warn('[Fonts] Failed to load Montserrat fonts', fontError);
    }
  }, [fontError]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding:v1');
        if (isMounted) {
          setShouldShowOnboarding(hasCompleted !== 'true');
        }
      } catch {
        if (isMounted) {
          setShouldShowOnboarding(false);
        }
      } finally {
        if (isMounted) {
          setOnboardingChecked(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!navReady || !onboardingChecked || shouldShowOnboarding !== true) {
      return;
    }
    const navigator = navigationRef.current;
    if (navigator?.reset) {
      navigator.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  }, [navReady, onboardingChecked, shouldShowOnboarding]);

  // Hide splash screen when both navigation and onboarding check are ready
  React.useEffect(() => {
    if (onboardingChecked && navReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [onboardingChecked, navReady, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <PreferencesProvider>
          <MapNavigationProvider>
            <Navigation
              ref={navigationRef}
              theme={theme}
              linking={{
                enabled: 'auto',
                prefixes: [
                  'berlinpublic://',
                ],
              }}
              onReady={() => setNavReady(true)}
            />
            <Toaster />
          </MapNavigationProvider>
          </PreferencesProvider>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
