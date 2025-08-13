import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FeatureProps } from '../../../types/api';

type ChoiceBarProps = {
  candidates: FeatureProps[];
  onPick: (f: FeatureProps) => void;
};

export function ChoiceBar({ candidates, onPick }: ChoiceBarProps) {
  if (candidates.length <= 1) return null;
  return (
    <View style={styles.choiceBar}>
      <Text style={styles.choiceTitle}>Select a place:</Text>
      <View style={styles.choiceList}>
        {candidates.map((c) => (
          <Pressable key={c.id} style={styles.choiceItem} onPress={() => onPick(c)}>
            <Text numberOfLines={1} style={styles.choiceText}>
              {c.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  choiceBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 88,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceTitle: { fontWeight: '600', marginBottom: 8 },
  choiceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f1f4f8',
    borderRadius: 8,
    maxWidth: '48%',
  },
  choiceText: { color: '#102a43' },
});


