import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const METERS_PER_PIXEL_AT_EQUATOR = 156543.03392;
const DEFAULT_TARGET_WIDTH = 120;
const MIN_WIDTH = 48;
const NICE_STEPS = [1, 2, 5];

type MapScaleBarProps = {
  zoomLevel: number;
  latitude: number;
  offsetBottom?: number;
};

const getMetersPerPixel = (latitude: number, zoomLevel: number) => {
  const latRad = (latitude * Math.PI) / 180;
  return (
    (METERS_PER_PIXEL_AT_EQUATOR * Math.cos(latRad)) /
    Math.pow(2, zoomLevel)
  );
};

const chooseDistance = (maxMeters: number) => {
  if (!isFinite(maxMeters) || maxMeters <= 0) {
    return 0;
  }

  const exponent = Math.floor(Math.log10(maxMeters));
  const candidates: number[] = [];

  for (let e = exponent + 1; e >= exponent - 3; e -= 1) {
    const base = Math.pow(10, e);
    for (const step of NICE_STEPS) {
      candidates.push(step * base);
    }
  }

  candidates.sort((a, b) => a - b);

  let best = candidates[0] ?? maxMeters;
  for (const candidate of candidates) {
    if (candidate <= maxMeters) {
      best = candidate;
    } else {
      break;
    }
  }

  return best;
};

const formatLabel = (meters: number) => {
  if (meters >= 1000) {
    const km = meters / 1000;
    const fixed = km >= 10 ? km.toFixed(0) : km.toFixed(1);
    return `${fixed} km`;
  }

  if (meters >= 100) {
    return `${Math.round(meters)} m`;
  }

  return `${Math.max(1, Math.round(meters))} m`;
};

export function MapScaleBar({
  zoomLevel,
  latitude,
  offsetBottom = 32,
}: MapScaleBarProps) {
  const { widthPx, label } = React.useMemo(() => {
    const metersPerPixel = getMetersPerPixel(latitude, zoomLevel);
    const maxMeters = metersPerPixel * DEFAULT_TARGET_WIDTH;
    const distanceMeters = chooseDistance(maxMeters);
    if (distanceMeters <= 0 || !isFinite(metersPerPixel)) {
      return { widthPx: DEFAULT_TARGET_WIDTH, label: '0 m' };
    }

    const width = Math.max(
      MIN_WIDTH,
      distanceMeters / Math.max(metersPerPixel, 0.0001)
    );

    return {
      widthPx: width,
      label: formatLabel(distanceMeters),
    };
  }, [latitude, zoomLevel]);

  return (
    <View
      pointerEvents="none"
      style={[styles.wrapper, { bottom: offsetBottom }]}
      accessibilityHint="Map scale indicator"
    >
      <View style={[styles.scaleContainer, { width: widthPx }]}>
        <View style={styles.bar}>
          <View style={[styles.barSegment, styles.barDark]} />
          <View style={[styles.barSegment, styles.barLight]} />
        </View>
        <View style={styles.labelRow}>
          <Text style={styles.label}>0</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
  },
  scaleContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barSegment: {
    flex: 1,
  },
  barDark: {
    backgroundColor: '#111827',
  },
  barLight: {
    backgroundColor: '#e2e8f0',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
});
