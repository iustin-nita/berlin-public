import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
type ActiveDataset = 'fountains' | 'toilets';

type ToggleBarProps = {
  activeDataset: ActiveDataset;
  setActiveDataset: (v: ActiveDataset) => void;
};

export function ToggleBar({ activeDataset, setActiveDataset }: ToggleBarProps) {
  const fountainActive = activeDataset === 'fountains';
  const toiletActive = activeDataset === 'toilets';

  return (
    <View style={styles.toggleBar} pointerEvents="box-none">
      <View style={styles.togglePill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show fountains"
          onPress={() => setActiveDataset('fountains')}
          style={[styles.toggleItem, fountainActive && styles.toggleItemActive]}
        >
          <View style={styles.toggleItemInner}>
            <Feather
              name="droplet"
              size={15}
              color={fountainActive ? '#2563EB' : '#94a3b8'}
            />
            <Text style={[styles.toggleText, fountainActive && styles.toggleTextFountainActive]}>
              Fountains
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show toilets"
          onPress={() => setActiveDataset('toilets')}
          style={[styles.toggleItem, toiletActive && styles.toggleItemActive]}
        >
          <View style={styles.toggleItemInner}>
            <Feather
              name="users"
              size={15}
              color={toiletActive ? '#1f2937' : '#94a3b8'}
            />
            <Text style={[styles.toggleText, toiletActive && styles.toggleTextToiletActive]}>
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
    top: 8,
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
  toggleText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  toggleTextFountainActive: { color: '#2563EB' },
  toggleTextToiletActive: { color: '#1f2937' },
});
