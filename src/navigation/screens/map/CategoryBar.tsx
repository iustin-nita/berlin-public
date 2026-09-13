import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CategoryKey, CATEGORY_LIST } from '../../../constants/categories';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { shadow } from '../../../constants/tokens';

type CategoryBarProps = {
  activeCategories: Set<CategoryKey>;
  onToggle: (key: CategoryKey) => void;
  onOpenFilters: () => void;
};

export function CategoryBar({ activeCategories, onToggle, onOpenFilters }: CategoryBarProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        onPress={() => { lightImpact(); onOpenFilters(); }}
        style={[styles.filtersChip, { backgroundColor: colors.ink }, shadow('chip', '#0f172a')]}
      >
        <Feather name="sliders" size={14} color="#ffffff" />
        <Text style={styles.filtersLabel}>Filters</Text>
        <View style={styles.filtersBadge}>
          <Text style={styles.filtersBadgeText}>{activeCategories.size}</Text>
        </View>
      </Pressable>

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
              { backgroundColor: colors.chipBg, borderColor: colors.hairline },
              shadow('chip'),
              active && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
          >
            <CategoryIcon categoryKey={cat.key} size={14} color={active ? '#ffffff' : cat.color} />
            <Text
              style={[
                styles.chipLabel,
                { color: colors.ink2 },
                active && styles.chipLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  filtersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  filtersLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13.5,
  },
  filtersBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filtersBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 11.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontWeight: '700',
    fontSize: 13.5,
  },
  chipLabelActive: {
    color: '#ffffff',
  },
});
