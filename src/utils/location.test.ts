import { BERLIN_BOUNDS, isInBerlin } from './location';

describe('location utilities', () => {
  it('returns true for coordinates inside Berlin bounds', () => {
    expect(isInBerlin(52.52, 13.405)).toBe(true);
  });

  it('returns false for coordinates outside Berlin bounds', () => {
    expect(isInBerlin(48.137, 11.575)).toBe(false);
  });

  it('treats boundary coordinates as inside Berlin', () => {
    expect(isInBerlin(BERLIN_BOUNDS.north, BERLIN_BOUNDS.west)).toBe(true);
    expect(isInBerlin(BERLIN_BOUNDS.south, BERLIN_BOUNDS.east)).toBe(true);
  });
});
