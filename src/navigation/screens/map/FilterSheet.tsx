import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { CategoryKey, CATEGORY_LIST, DEFAULT_ACTIVE_CATEGORIES } from '../../../constants/categories';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { palette } from '../../../constants/tokens';

type FilterSheetProps = {
  visible: boolean;
  activeCategories: Set<CategoryKey>;
  onToggle: (key: CategoryKey) => void;
  setCategories: (keys: CategoryKey[]) => void;
  onClose: () => void;
};

export function FilterSheet({ visible, activeCategories, onToggle, setCategories, onClose }: FilterSheetProps) {
  const { colors } = useTheme();
  const ref = React.useRef<BottomSheet>(null);
  const allSelected = activeCategories.size === CATEGORY_LIST.length;

  React.useEffect(() => {
    if (visible) ref.current?.expand();
    else ref.current?.close();
  }, [visible]);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.28} />
    ),
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['64%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, { backgroundColor: colors.hairline }]}
      backgroundStyle={{ backgroundColor: colors.surface }}
      onClose={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.ink }]}>Show on map</Text>
          <Pressable
            onPress={() => { lightImpact(); setCategories(allSelected ? [...DEFAULT_ACTIVE_CATEGORIES] : CATEGORY_LIST.map((c) => c.key)); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.action}>{allSelected ? 'Reset' : 'Select all'}</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {CATEGORY_LIST.map((cat) => {
            const active = activeCategories.has(cat.key);
            return (
              <Pressable
                key={cat.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => { lightImpact(); onToggle(cat.key); }}
                style={[
                  styles.card,
                  { backgroundColor: active ? cat.pillBg : colors.surface2, borderColor: active ? cat.color : 'transparent' },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: active ? cat.color : colors.surface, borderColor: active ? cat.color : colors.hairline }]}>
                  <CategoryIcon categoryKey={cat.key} size={19} color={active ? '#ffffff' : cat.color} />
                </View>
                <Text style={[styles.cardLabel, { color: colors.ink }]} numberOfLines={1}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onClose} style={[styles.cta, { backgroundColor: colors.ink }]}>
          <Text style={styles.ctaText}>
            Show {activeCategories.size} categor{activeCategories.size === 1 ? 'y' : 'ies'}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: { width: 38, height: 5, borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  action: { fontSize: 14, color: palette.blue, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },
  card: {
    width: '48.5%',
    height: 66,
    borderRadius: 15,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, flexShrink: 1 },
  cta: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
