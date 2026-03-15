import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryKey, CATEGORY_LIST } from '../../../constants/categories';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';

type CategoryBarProps = {
  activeCategories: Set<CategoryKey>;
  onToggle: (key: CategoryKey) => void;
};

export function CategoryBar({ activeCategories, onToggle }: CategoryBarProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {CATEGORY_LIST.map((cat) => {
          const active = activeCategories.has(cat.key);
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              accessibilityLabel={`${active ? 'Hide' : 'Show'} ${cat.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => { lightImpact(); onToggle(cat.key); }}
              style={[
                styles.chip,
                { backgroundColor: colors.chipBg },
                active && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
            >
              <CategoryIcon categoryKey={cat.key} size={13} color={active ? '#ffffff' : '#64748b'} />
              <Text
                style={[
                  styles.chipLabel,
                  active && { color: '#ffffff', fontWeight: '700' },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipLabel: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
});
