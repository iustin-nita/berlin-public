import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MarkerStyle } from '../constants/markerAssets';

type PreferencesContextValue = {
  markerStyle: MarkerStyle;
  setMarkerStyle: (style: MarkerStyle) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | undefined>(undefined);

const MARKER_STYLE_KEY = 'pref:markerStyle:v1';
const DEFAULT_MARKER_STYLE: MarkerStyle = 'teardrop';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [markerStyle, setMarkerStyleState] = React.useState<MarkerStyle>(DEFAULT_MARKER_STYLE);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(MARKER_STYLE_KEY);
        if (raw === 'teardrop' || raw === 'classic') setMarkerStyleState(raw);
      } catch (e) {
        if (__DEV__) console.warn('[Preferences] Failed to load marker style', e);
      }
    })();
  }, []);

  const setMarkerStyle = React.useCallback((style: MarkerStyle) => {
    setMarkerStyleState(style);
    AsyncStorage.setItem(MARKER_STYLE_KEY, style).catch((e) => {
      if (__DEV__) console.warn('[Preferences] Failed to persist marker style', e);
    });
  }, []);

  const value = React.useMemo(
    () => ({ markerStyle, setMarkerStyle }),
    [markerStyle, setMarkerStyle]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
