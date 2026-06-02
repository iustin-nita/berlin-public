import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, shadow } from '../../../constants/tokens';

type RecenterButtonProps = {
  onPress: () => void;
};

export function RecenterButton({ onPress }: RecenterButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Recenter map to my location"
      onPress={onPress}
      style={[styles.recenterButton, shadow('fab', palette.blue)]}
    >
      <Feather name="navigation" size={22} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    height: 54,
    width: 54,
    backgroundColor: palette.blue,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
