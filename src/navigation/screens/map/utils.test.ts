import type { FeatureProps } from '../../../types/api';
import {
  buildDistanceLine,
  getFeatureCoordinate,
  getSanitizedInfo,
  isTwentyFourSeven,
} from './utils';

describe('map utils', () => {
  const feature: FeatureProps = {
    id: 'drink_1',
    title: 'Test Fountain',
    coordinates: [13.405, 52.52],
    type: 'drinking',
  };

  it('returns an empty distance line when location data is missing', () => {
    expect(buildDistanceLine(null, feature)).toBe('');
    expect(buildDistanceLine([13.405, 52.52], null)).toBe('');
  });

  it('builds a human readable distance line', () => {
    expect(buildDistanceLine([13.41, 52.521], feature)).toMatch(/^\d+ m · \d+ min walk$/);
  });

  it('sanitizes info text and removes embedded links', () => {
    expect(
      getSanitizedInfo('Informationen: Seasonal fountain https://example.com Link:', 'https://example.com')
    ).toBe('Seasonal fountain');
  });

  it('detects around-the-clock hours', () => {
    expect(isTwentyFourSeven('00:00-24:00')).toBe(true);
    expect(isTwentyFourSeven('Mon-Fri 08:00-18:00')).toBe(false);
  });

  it('extracts point and nested point coordinates safely', () => {
    expect(
      getFeatureCoordinate({
        geometry: {
          coordinates: [13.405, 52.52],
        },
      })
    ).toEqual([13.405, 52.52]);

    expect(
      getFeatureCoordinate({
        geometry: {
          coordinates: [[13.405, 52.52]],
        },
      })
    ).toEqual([13.405, 52.52]);
  });
});
