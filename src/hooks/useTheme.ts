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
  chipBg: 'rgba(255,255,255,0.96)',
  overlay: 'rgba(255,255,255,0.98)',
  searchBar: 'rgba(255,255,255,0.98)',
  statusBannerBg: '#FFF3CD',
  statusBannerOfflineBg: '#FFE5E5',
  statusBannerOutOfBoundsBg: '#FEF3C7',
  // "Clean Berlin" surface / text / border tokens (see constants/tokens.ts).
  ink: '#0F172A',
  ink2: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  surface2: '#F6F8FB',
  surface3: '#F1F5F9',
  hairline: '#E7EBF0',
  hairline2: '#EDF1F5',
  blueSoft: '#EFF4FF',
  // OpenFreeMap — free, keyless, OSM-based vector tiles (MapLibre-compatible)
  mapStyle: 'https://tiles.openfreemap.org/styles/liberty',
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
  // "Clean Berlin" surface / text / border tokens (dark variants).
  ink: '#F1F5F9',
  ink2: '#E2E8F0',
  muted: '#94A3B8',
  faint: '#64748B',
  surface2: '#1E293B',
  surface3: '#334155',
  hairline: '#334155',
  hairline2: '#293548',
  blueSoft: '#1E2A44',
  // TODO: OpenFreeMap has no official dark style yet — using minimal 'positron'
  // as a placeholder. Replace with a custom dark style (Maputnik export) later.
  mapStyle: 'https://tiles.openfreemap.org/styles/positron',
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
