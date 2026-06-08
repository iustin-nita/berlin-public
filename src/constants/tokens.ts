import { Platform, type ViewStyle } from 'react-native';

/**
 * "Clean Berlin" design tokens.
 *
 * `palette` holds the scheme-independent brand, status and accent colors used
 * across the app. Surface / text / border colors that change with light vs
 * dark live in `useTheme` instead.
 */
export const palette = {
  // Brand / accent
  blue: '#1a56db',
  blueDark: '#1E3A8A',
  blueSoft: '#EFF4FF',

  // Status
  good: '#16A34A',
  goodSoft: '#DCFCE7',
  goodInk: '#166534',
  warn: '#CA8A04',
  warnSoft: '#FEF9C3',
  warnInk: '#854D0E',
  bad: '#DC2626',
  badSoft: '#FEE2E2',
  badInk: '#991B1B',

  // Favourite star
  star: '#F59E0B',
  starSoft: '#FFF7E6',
  starBorder: '#F6CE72',

  white: '#FFFFFF',
} as const;

/** Corner radii used by the design. */
export const radii = {
  sm: 9,
  md: 13,
  lg: 16,
  xl: 19,
  sheet: 22,
  pill: 999,
} as const;

/** Spacing scale (loose — most layout still uses literal values). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

type ShadowLevel = 'chip' | 'card' | 'floating' | 'fab' | 'sheet';

/**
 * Cross-platform shadow presets. Returns iOS shadow* props + Android
 * elevation. `color` lets the FAB cast a tinted (blue) shadow.
 */
export function shadow(level: ShadowLevel, color = '#0f172a'): ViewStyle {
  const presets: Record<ShadowLevel, { opacity: number; radius: number; offsetY: number; elevation: number }> = {
    chip: { opacity: 0.07, radius: 8, offsetY: 2, elevation: 2 },
    card: { opacity: 0.04, radius: 3, offsetY: 1, elevation: 1 },
    floating: { opacity: 0.1, radius: 12, offsetY: 3, elevation: 4 },
    fab: { opacity: 0.42, radius: 18, offsetY: 6, elevation: 8 },
    sheet: { opacity: 0.22, radius: 40, offsetY: -10, elevation: 16 },
  };
  const p = presets[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: p.opacity,
      shadowRadius: p.radius,
      shadowOffset: { width: 0, height: p.offsetY },
    },
    android: { elevation: p.elevation },
    default: {},
  })!;
}
