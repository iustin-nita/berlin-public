import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type RecenterButtonProps = {
  onPress: () => void;
};

export function RecenterButton({ onPress }: RecenterButtonProps) {
  return (
    <Pressable accessibilityLabel="Recenter map to my location" onPress={onPress} style={styles.recenterButton}>
      <Feather name="navigation" size={22} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    height: 52,
    width: 52,
    backgroundColor: '#2563EB',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

