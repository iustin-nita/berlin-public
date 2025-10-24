import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActiveDataset } from './useFountainsData';

type ToggleBarProps = {
  activeDataset: ActiveDataset;
  setActiveDataset: (v: ActiveDataset) => void;
};

export function ToggleBar({ activeDataset, setActiveDataset }: ToggleBarProps) {
  return (
    <View style={styles.toggleBar} pointerEvents="box-none">
      <View style={styles.togglePill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show fountains"
          onPress={() => setActiveDataset('fountains')}
          style={[styles.toggleItem, activeDataset === 'fountains' && styles.toggleItemActive]}
        >
          <View style={styles.toggleItemInner}>
            <Image source={require('../../../../assets/water-drop.png')} style={styles.iconImage} />
            <Text style={[styles.toggleText, activeDataset === 'fountains' && styles.toggleTextActive]}>
              Fountains
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show toilets"
          onPress={() => setActiveDataset('toilets')}
          style={[styles.toggleItem, activeDataset === 'toilets' && styles.toggleItemActive]}
        >
          <View style={styles.toggleItemInner}>
            <Image source={require('../../../../assets/toilet.png')} style={styles.iconImage} />
            <Text style={[styles.toggleText, activeDataset === 'toilets' && styles.toggleTextActive]}>
              Toilets
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBar: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  toggleItem: {
    borderRadius: 999,
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  toggleItemActive: {
    backgroundColor: '#e7f1ff',
  },
  toggleItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconImage: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  toggleText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#1d4ed8' },
});
