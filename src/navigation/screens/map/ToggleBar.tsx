import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
          style={[styles.toggleItem, activeDataset === 'fountains' ? styles.toggleItemActive : null]}
        >
          <Text style={[styles.toggleText, activeDataset === 'fountains' ? styles.toggleTextActive : null]}>Fountains</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show toilets"
          onPress={() => setActiveDataset('toilets')}
          style={[styles.toggleItem, activeDataset === 'toilets' ? styles.toggleItemActive : null]}
        >
          <Text style={[styles.toggleText, activeDataset === 'toilets' ? styles.toggleTextActive : null]}>Toilets</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBar: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  toggleItemActive: { backgroundColor: '#e6f0ff' },
  toggleText: { color: '#334155', fontWeight: '500' },
  toggleTextActive: { color: '#1d4ed8', fontWeight: '700' },
});


