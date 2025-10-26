import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type OutOfBoundsBannerProps = {
  isOutOfBounds: boolean;
  offsetTop?: number; // Offset when stacking with other banners
};

export function OutOfBoundsBanner({ isOutOfBounds, offsetTop = 60 }: OutOfBoundsBannerProps) {
  if (!isOutOfBounds) {
    return null;
  }

  return (
    <View style={[styles.banner, { top: offsetTop }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>📍</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Outside Berlin</Text>
          <Text style={styles.subtitle}>
            This app only shows fountains and facilities in Berlin
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FEF3C7',
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
});
