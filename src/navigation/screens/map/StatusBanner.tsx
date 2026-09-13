import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';

type StatusBannerProps = {
  isOnline: boolean;
  cacheAge: number | null;
  isStale: boolean;
  isOutOfBounds: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

function formatCacheAge(ageMs: number | null): string {
  if (ageMs === null) return 'unknown';
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return 'just now';
}

export function StatusBanner({ isOnline, cacheAge, isStale, isOutOfBounds, error, onRefresh }: StatusBannerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const showOffline = !isOnline;
  const showStale = isOnline && isStale;
  const showOutOfBounds = isOutOfBounds;

  if (!showOffline && !showStale && !showOutOfBounds && !error) return null;

  let icon: React.ReactNode;
  let title: string;
  let subtitle: string;
  let bgColor: string;
  let canRefresh = false;

  if (showOffline) {
    icon = <Feather name="wifi-off" size={18} color="#dc2626" />;
    title = "You're offline";
    subtitle = cacheAge === null ? 'Connect to download amenities for offline browsing' : `Cached amenities · Updated ${formatCacheAge(cacheAge)}`;
    bgColor = colors.statusBannerOfflineBg;
    if (showOutOfBounds) {
      subtitle += ' · Outside Berlin';
    }
  } else if (error) {
    icon = <Feather name="alert-circle" size={18} color="#d97706" />;
    title = 'Some amenities could not be updated';
    subtitle = error;
    bgColor = colors.statusBannerBg;
    canRefresh = true;
  } else if (showStale) {
    icon = <Feather name="clock" size={18} color="#d97706" />;
    title = 'Data may be outdated';
    subtitle = `Last updated ${formatCacheAge(cacheAge)}`;
    bgColor = colors.statusBannerBg;
    canRefresh = true;
    if (showOutOfBounds) {
      subtitle += ' · Outside Berlin';
    }
  } else {
    icon = <Feather name="map-pin" size={18} color="#d97706" />;
    title = 'Outside Berlin';
    subtitle = 'This app shows public amenities in Berlin';
    bgColor = colors.statusBannerOutOfBoundsBg;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, top: insets.top + 162 }]}>
      <View style={styles.content}>
        {icon}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
        {canRefresh && onRefresh ? (
          <Pressable
            style={styles.refreshButton}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh data"
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  textContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#6b7280' },
  refreshButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refreshText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
});
