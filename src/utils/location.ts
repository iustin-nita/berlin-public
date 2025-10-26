// Berlin city bounding box (approximate administrative boundaries)
export const BERLIN_BOUNDS = {
  north: 52.68,
  south: 52.34,
  east: 13.76,
  west: 13.09,
};

/**
 * Check if coordinates are within Berlin city boundaries
 */
export const isInBerlin = (lat: number, lon: number): boolean => {
  return (
    lat >= BERLIN_BOUNDS.south &&
    lat <= BERLIN_BOUNDS.north &&
    lon >= BERLIN_BOUNDS.west &&
    lon <= BERLIN_BOUNDS.east
  );
};
