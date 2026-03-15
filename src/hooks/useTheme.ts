import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceSecondary: '#F8F9FA',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  chipBg: 'rgba(255,255,255,0.94)',
  overlay: 'rgba(255,255,255,0.98)',
  searchBar: 'rgba(255,255,255,0.96)',
  statusBannerBg: '#FFF3CD',
  statusBannerOfflineBg: '#FFE5E5',
  statusBannerOutOfBoundsBg: '#FEF3C7',
  mapStyle: 'mapbox://styles/mapbox/outdoors-v12',
  shadow: '#0f172a',
} as const;

const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceSecondary: '#1e293b',
  card: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  chipBg: 'rgba(30,41,59,0.94)',
  overlay: 'rgba(15,23,42,0.98)',
  searchBar: 'rgba(30,41,59,0.96)',
  statusBannerBg: '#422006',
  statusBannerOfflineBg: '#450a0a',
  statusBannerOutOfBoundsBg: '#422006',
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  shadow: '#000000',
} as const;

export type ThemeColors = typeof lightColors;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
}
