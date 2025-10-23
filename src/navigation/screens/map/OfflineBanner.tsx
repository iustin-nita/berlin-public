import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type OfflineBannerProps = {
  isOnline: boolean;
  cacheAge: number | null; // in milliseconds
  isStale: boolean;
  onRefresh?: () => void;
};

export function OfflineBanner({ isOnline, cacheAge, isStale, onRefresh }: OfflineBannerProps) {
  // Don't show banner if online and cache is fresh
  if (isOnline && !isStale) {
    return null;
  }

  const formatCacheAge = (ageMs: number | null): string => {
    if (ageMs === null) return 'unknown';

    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (minutes > 0) {
      return `${minutes} min ago`;
    }
    return 'just now';
  };

  return (
    <View style={[styles.banner, !isOnline && styles.bannerOffline]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{!isOnline ? '📡' : '⏱️'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {!isOnline ? "You're offline" : 'Data may be outdated'}
          </Text>
          <Text style={styles.subtitle}>
            {!isOnline
              ? `Using cached data · Updated ${formatCacheAge(cacheAge)}`
              : `Last updated ${formatCacheAge(cacheAge)}`}
          </Text>
        </View>
        {isOnline && onRefresh ? (
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
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  bannerOffline: {
    backgroundColor: '#FFE5E5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  refreshButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refreshText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
