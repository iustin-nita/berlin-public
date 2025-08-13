import { FeatureProps } from '../../../types/api';

// Haversine distance and simple walking ETA line builder
export function buildDistanceLine(
  userLocation: [number, number] | null,
  selected: FeatureProps | null
): string {
  if (!userLocation || !selected) return '';
  const [userLng, userLat] = userLocation;
  const [destLng, destLat] = selected.coordinates;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(destLat - userLat);
  const dLng = toRad(destLng - userLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) * Math.cos(toRad(destLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  const formatDistance = (m: number) => {
    if (m < 950) return `${Math.round(m)} m`;
    const km = m / 1000;
    const fixed = km >= 10 ? km.toFixed(0) : km.toFixed(1);
    return `${fixed} km`;
  };
  // Assume ~4.5 km/h walking speed → 75 m/min
  const minutes = Math.max(1, Math.round(meters / 75));
  return `📍 ${formatDistance(meters)} · ${minutes} min walk`;
}

// Clean "Info" text by stripping any embedded URL and trailing "Link:" label
export function getSanitizedInfo(info?: string | null, url?: string | null): string {
  if (!info) return '';
  let text = String(info).trim();
  // Strip leading generic labels like "Info:" or "Informationen:"
  text = text.replace(/^\s*(info(?:rmationen)?)\s*[:\-]+\s*/i, '').trim();
  if (url) {
    text = text.replace(url, '').trim();
  }
  // Remove a leftover trailing ", Link:" (with any spaces) if present
  text = text.replace(/[\,\s]*Link\s*:\s*$/i, '').trim();
  // Collapse excess spaces
  text = text.replace(/\s{2,}/g, ' ');
  return text;
}

// Detect 24/7/open-all-day semantics in a freeform hours string
export function isTwentyFourSeven(hours?: string | null): boolean {
  if (!hours || typeof hours !== 'string') return false;
  const h = hours.toLowerCase();
  return (
    /24\s*\/\s*7/.test(h) ||
    /24h/.test(h) ||
    /00:00\s*[-–]\s*24:00/.test(h) ||
    /durchgehend/.test(h) ||
    /ganztags/.test(h)
  );
}

// Extract a safe [lng, lat] tuple from a pressed Mapbox feature
export function getFeatureCoordinate(f: any): [number, number] | null {
  let coords: any = f?.geometry?.coordinates;
  if (Array.isArray(coords)) {
    // Handle MultiPoint-like [[lng,lat], ...]
    if (Array.isArray(coords[0])) coords = coords[0];
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [coords[0], coords[1]];
    }
  }
  return null;
}


