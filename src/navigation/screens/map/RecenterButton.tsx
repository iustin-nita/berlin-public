import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type RecenterButtonProps = {
  onPress: () => void;
};

export function RecenterButton({ onPress }: RecenterButtonProps) {
  return (
    <Pressable accessibilityLabel="Recenter map to my location" onPress={onPress} style={styles.recenterButton}>
      <Text style={styles.recenterGlyph}>➤</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    height: 48,
    width: 48,
    backgroundColor: 'white',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  recenterGlyph: { fontSize: 20 },
});


