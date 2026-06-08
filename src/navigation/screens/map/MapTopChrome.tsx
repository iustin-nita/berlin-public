import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BrandMark } from '../../../components/BrandMark';
import { SearchBar } from './SearchBar';
import { CategoryBar } from './CategoryBar';
import { CategoryKey } from '../../../constants/categories';
import { useTheme } from '../../../hooks/useTheme';
import { shadow } from '../../../constants/tokens';

type MapTopChromeProps = {
  onSettings: () => void;
  onSearchResult: (coords: [number, number]) => void;
  viewMode: 'map' | 'list';
  onToggleView: () => void;
  activeCategories: Set<CategoryKey>;
  onToggleCategory: (key: CategoryKey) => void;
  onOpenFilters: () => void;
};

/**
 * Floating map chrome — brand pill + settings gear, search bar, and the
 * scrolling category/filter chips. Stacked over the map, safe-area aware.
 */
export function MapTopChrome({
  onSettings,
  onSearchResult,
  viewMode,
  onToggleView,
  activeCategories,
  onToggleCategory,
  onOpenFilters,
}: MapTopChromeProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
      <View style={styles.padded} pointerEvents="box-none">
        <View style={styles.brandRow} pointerEvents="box-none">
          <View style={[styles.brandPill, { backgroundColor: colors.searchBar, borderColor: colors.hairline }, shadow('floating')]}>
            <BrandMark imageSize={22} spacing={7} textStyle={styles.brandText} />
          </View>
          <Pressable
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={[styles.gear, { backgroundColor: colors.searchBar, borderColor: colors.hairline }, shadow('floating')]}
          >
            <Feather name="settings" size={20} color={colors.ink2} />
          </Pressable>
        </View>

        <View style={styles.searchSlot} pointerEvents="box-none">
          <SearchBar onResult={onSearchResult} viewMode={viewMode} onToggleView={onToggleView} />
        </View>
      </View>

      <View style={styles.chipSlot} pointerEvents="box-none">
        <CategoryBar
          activeCategories={activeCategories}
          onToggle={onToggleCategory}
          onOpenFilters={onOpenFilters}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 12,
  },
  padded: {
    paddingHorizontal: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 9,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandText: {
    fontSize: 13.5,
    letterSpacing: 1.2,
  },
  gear: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSlot: {
    marginBottom: 10,
  },
  chipSlot: {
    // chips scroll full-bleed; horizontal padding lives in CategoryBar content
  },
});
