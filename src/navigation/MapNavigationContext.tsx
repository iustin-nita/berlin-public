import React from 'react';
import { FeatureProps } from '../types/api';

type MapNavigationContextValue = {
  navigateToFeature: (feature: FeatureProps) => void;
  pendingFeature: FeatureProps | null;
  clearPendingFeature: () => void;
};

const MapNavigationContext = React.createContext<MapNavigationContextValue | undefined>(undefined);

export function MapNavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingFeature, setPendingFeature] = React.useState<FeatureProps | null>(null);

  const navigateToFeature = React.useCallback((feature: FeatureProps) => {
    setPendingFeature(feature);
  }, []);

  const clearPendingFeature = React.useCallback(() => {
    setPendingFeature(null);
  }, []);

  const value = React.useMemo(
    () => ({
      navigateToFeature,
      pendingFeature,
      clearPendingFeature,
    }),
    [navigateToFeature, pendingFeature, clearPendingFeature]
  );

  return <MapNavigationContext.Provider value={value}>{children}</MapNavigationContext.Provider>;
}

export function useMapNavigation() {
  const ctx = React.useContext(MapNavigationContext);
  if (!ctx) throw new Error('useMapNavigation must be used within MapNavigationProvider');
  return ctx;
}
