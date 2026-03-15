import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from '../../../components/BrandMark';
import { useTheme } from '../../../hooks/useTheme';

export function MapHeader() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 2,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <BrandMark direction="row" imageSize={28} spacing={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
