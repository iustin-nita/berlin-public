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
    left: 14,
    right: 14,
    bottom: 96,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7EBF0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  choiceTitle: { fontWeight: '700', fontSize: 13, color: '#64748B', marginBottom: 10, letterSpacing: 0.3 },
  choiceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    maxWidth: '48%',
  },
  choiceText: { color: '#0F172A', fontWeight: '600', fontSize: 13.5 },
});


