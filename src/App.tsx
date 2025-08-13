import { Assets as NavigationAssets } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Navigation } from './navigation';
import { FavoritesProvider } from './favorites/FavoritesContext';

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

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FavoritesProvider>
        <Navigation
          theme={theme}
          linking={{
            enabled: 'auto',
            prefixes: [
              // Change the scheme to match your app's scheme defined in app.json
              'berlinfountains://',
            ],
          }}
          onReady={() => {
            SplashScreen.hideAsync();
          }}
        />
      </FavoritesProvider>
    </GestureHandlerRootView>
  );
}
