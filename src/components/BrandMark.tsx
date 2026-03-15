import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

const logoSource = require('../../assets/logo.png');

type BrandMarkProps = {
  style?: StyleProp<ViewStyle>;
  imageSize?: number;
  spacing?: number;
  textStyle?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  direction?: 'row' | 'column';
};

export function BrandMark({
  style,
  imageSize = 28,
  spacing = 8,
  textStyle,
  imageStyle,
  direction = 'row',
}: BrandMarkProps) {
  const isColumn = direction === 'column';
  return (
    <View
      style={[
        styles.wrapper,
        isColumn && styles.wrapperColumn,
        style,
      ]}
    >
      <Image
        source={logoSource}
        style={[
          styles.logo,
          { width: imageSize, height: imageSize },
          imageStyle,
        ]}
      />
      <Text
        style={[
          styles.text,
          isColumn ? { marginTop: spacing } : { marginLeft: spacing },
          textStyle,
        ]}
      >
        BERLIN PUBLIC
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapperColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logo: {
    resizeMode: 'contain',
  },
  text: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 24,
    letterSpacing: .5,
    color: '#111827',
  },
});
