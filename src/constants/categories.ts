import { ImageSourcePropType } from 'react-native';

/**
 * All category keys used throughout the app.
 * Adding a new dataset = adding one entry to CATEGORIES below.
 */
export type CategoryKey =
  | 'drinking'
  | 'toilet'
  | 'bbq'
  | 'bikeRepair'
  | 'playground'
  | 'evCharging'
  | 'bathing'
  | 'coolSpace'
  | 'decorative';

export type CategoryDef = {
  key: CategoryKey;
  label: string;
  icon: string;
  iconLib: 'Feather' | 'MCI';
  color: string;
  /** Background tint for chips / pills */
  pillBg: string;
  pillBorder: string;
  /** WFS endpoint URL */
  wfsUrl: string;
  /** Prefix for feature IDs to avoid collisions */
  idPrefix: string;
  /** Mapbox image key */
  markerImageKey: string;
  /** Mapbox marker icon asset */
  markerIcon: ImageSourcePropType;
  /** Mapbox icon size */
  markerIconSize: number;
  /** Vote button labels */
  voteLabels: { positive: string; negative: string };
  /** Whether this category is enabled */
  enabled: boolean;
};

const WFS_BASE = 'https://gdi.berlin.de/services/wfs';
const wfsUrl = (service: string, typeName: string) =>
  `${WFS_BASE}/${service}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${typeName}&outputFormat=application/json&srsName=EPSG:4326`;

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  drinking: {
    key: 'drinking',
    label: 'Drinking',
    icon: 'water',
    iconLib: 'MCI',
    color: '#1a56db',
    pillBg: '#E8F8FF',
    pillBorder: '#CCEFFF',
    wfsUrl: wfsUrl('trinkwasserbrunnen', 'trinkwasserbrunnen:trinkwasserbrunnen'),
    idPrefix: 'drink_',
    markerImageKey: 'fountainDrink',
    markerIcon: require('../../assets/marker_drinking.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Water flowing', negative: 'Dry / Off' },
    enabled: true,
  },
  toilet: {
    key: 'toilet',
    label: 'Toilets',
    icon: 'human-male-female',
    iconLib: 'MCI',
    color: '#1E3A8A',
    pillBg: '#E7F4FF',
    pillBorder: '#D0E6FF',
    wfsUrl: wfsUrl('toiletten', 'toiletten:toiletten'),
    idPrefix: 'toilet_',
    markerImageKey: 'toilet',
    markerIcon: require('../../assets/marker_toilet.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Open', negative: 'Closed' },
    enabled: true,
  },
  bbq: {
    key: 'bbq',
    label: 'BBQ',
    icon: 'grill',
    iconLib: 'MCI',
    color: '#EA580C',
    pillBg: '#FFF7ED',
    pillBorder: '#FFEDD5',
    wfsUrl: wfsUrl('grillflaechen', 'grillflaechen:grillflaechen'),
    idPrefix: 'bbq_',
    markerImageKey: 'bbq',
    markerIcon: require('../../assets/marker_bbq.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Available', negative: 'Unavailable' },
    enabled: true,
  },
  bikeRepair: {
    key: 'bikeRepair',
    label: 'Bike Repair',
    icon: 'wrench',
    iconLib: 'MCI',
    color: '#6B7280',
    pillBg: '#F3F4F6',
    pillBorder: '#E5E7EB',
    wfsUrl: wfsUrl('fahrradreparatur', 'fahrradreparatur:fahrradreparatur'),
    idPrefix: 'bike_',
    markerImageKey: 'bikeRepair',
    markerIcon: require('../../assets/marker_bike_repair.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Available', negative: 'Unavailable' },
    enabled: true,
  },
  evCharging: {
    key: 'evCharging',
    label: 'EV Charging',
    icon: 'ev-station',
    iconLib: 'MCI',
    color: '#16A34A',
    pillBg: '#F0FDF4',
    pillBorder: '#DCFCE7',
    wfsUrl: wfsUrl('eladesaeulen', 'eladesaeulen:lades_standorte'),
    idPrefix: 'ev_',
    markerImageKey: 'evCharging',
    markerIcon: require('../../assets/marker_ev_charging.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Available', negative: 'Unavailable' },
    enabled: true,
  },
  playground: {
    key: 'playground',
    label: 'Playgrounds',
    icon: 'slide',
    iconLib: 'MCI',
    color: '#CA8A04',
    pillBg: '#FEFCE8',
    pillBorder: '#FEF9C3',
    wfsUrl: wfsUrl('gruenanlagen', 'gruenanlagen:spielplaetze'),
    idPrefix: 'play_',
    markerImageKey: 'playground',
    markerIcon: require('../../assets/marker_playground.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Available', negative: 'Unavailable' },
    enabled: true,
  },
   bathing: {
    key: 'bathing',
    label: 'Bathing',
    icon: 'swim',
    iconLib: 'MCI',
    color: '#0D9488',
    pillBg: '#E6FFFA',
    pillBorder: '#B2F5EA',
    wfsUrl: wfsUrl('badegewaesser', 'badegewaesser:aa_badestellen'),
    idPrefix: 'bath_',
    markerImageKey: 'bathing',
    markerIcon: require('../../assets/marker_bathing.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Safe to swim', negative: 'Avoid' },
    enabled: true,
  },
  coolSpace: {
    key: 'coolSpace',
    label: 'Cool Spaces',
    icon: 'snowflake',
    iconLib: 'MCI',
    color: '#4F46E5',
    pillBg: '#EEF2FF',
    pillBorder: '#C7D2FE',
    wfsUrl: wfsUrl('kuehle_raeume', 'kuehle_raeume:kuehle_raeume'),
    idPrefix: 'cool_',
    markerImageKey: 'coolSpace',
    markerIcon: require('../../assets/marker_cooling.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Open', negative: 'Closed' },
    enabled: true,
  },
    decorative: {
    key: 'decorative',
    label: 'Decorative',
    icon: 'fountain',
    iconLib: 'MCI',
    color: '#EA580C',
    pillBg: '#FFF4EC',
    pillBorder: '#FFE1CC',
    wfsUrl: wfsUrl('zierbrunnen', 'zierbrunnen:bez_zierbrunnen'),
    idPrefix: 'decor_',
    markerImageKey: 'fountainDecor',
    markerIcon: require('../../assets/marker_decorative.png'),
    markerIconSize: 0.22,
    voteLabels: { positive: 'Running', negative: 'Off' },
    enabled: true,
  },
};

/** Ordered list of enabled categories for the UI chip bar */
export const CATEGORY_LIST: CategoryDef[] = Object.values(CATEGORIES).filter((c) => c.enabled);

/** Default active categories (what users see on first launch) */
export const DEFAULT_ACTIVE_CATEGORIES: CategoryKey[] = ['toilet', 'drinking'];

/** Get category def by feature type key */
export function getCategoryByKey(key: string): CategoryDef | undefined {
  return CATEGORIES[key as CategoryKey];
}

/** Get vote labels for a feature type */
export function getVoteLabels(type?: string): { positive: string; negative: string } {
  if (!type) return { positive: 'Available', negative: 'Unavailable' };
  const cat = getCategoryByKey(type);
  return cat?.voteLabels ?? { positive: 'Available', negative: 'Unavailable' };
}
