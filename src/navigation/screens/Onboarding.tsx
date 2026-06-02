import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  type SharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { BrandMark } from '../../components/BrandMark';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CATEGORY_LIST } from '../../constants/categories';
import { palette, shadow } from '../../constants/tokens';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');

const SLIDES: {
  id: number;
  title: string;
  description: string;
  iconName: React.ComponentProps<typeof Feather>['name'] | null;
  subtitle: string;
  isLocationSlide?: boolean;
}[] = [
  {
    id: 1,
    title: 'Welcome to Berlin Public',
    description: 'Your guide to public amenities across Berlin',
    iconName: 'map',
    subtitle: 'Drinking water, toilets, bathing spots, EV chargers & more',
  },
  {
    id: 2,
    title: 'Everything You Need',
    description: 'Nine categories of public infrastructure',
    iconName: null,
    subtitle: 'Filter by type to find exactly what you need',
  },
  {
    id: 3,
    title: 'Save & Share',
    description: 'Bookmark your favorite spots for quick access',
    iconName: 'star',
    subtitle: 'Share locations with friends via link',
  },
  {
    id: 4,
    title: 'Enable Location',
    description: 'Allow location access for distances and nearby search',
    iconName: 'map-pin',
    subtitle: 'Your location stays on your device',
    isLocationSlide: true,
  },
];

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
}

function Dot({ index, scrollX }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [7, 22, 7],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function Onboarding() {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasCompletedOnboarding:v1', 'true');
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
    }
  };

  const handleGetStarted = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {}
    await AsyncStorage.setItem('hasCompletedOnboarding:v1', 'true');
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <BrandMark imageSize={26} spacing={8} textStyle={styles.brandText} />
        <TouchableOpacity onPress={handleSkip} hitSlop={10}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {slide.iconName ? (
              <View style={styles.iconContainer}>
                <Feather name={slide.iconName} size={52} color="#1a56db" />
              </View>
            ) : (
              <View style={styles.categoryPreview}>
                {CATEGORY_LIST.map((cat) => (
                  <View key={cat.key} style={[styles.previewChip, { backgroundColor: cat.pillBg, borderColor: cat.pillBorder }]}>
                    <CategoryIcon categoryKey={cat.key} size={14} color={cat.color} />
                    <Text style={styles.previewLabel}>{cat.label}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{slide.description}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{slide.subtitle}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <Dot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      <View style={styles.bottomContainer}>
        {isLastSlide ? (
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingHorizontal: 22,
  },
  brandText: {
    fontSize: 15,
    letterSpacing: 1.6,
    color: '#0f172a',
  },
  skipText: {
    fontSize: 15,
    color: '#1a56db',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EFF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 44,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
    color: '#0F172A',
  },
  description: {
    fontSize: 16.5,
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#94A3B8',
    lineHeight: 20,
  },
  categoryPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewLabel: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1a56db',
  },
  bottomContainer: {
    paddingHorizontal: 28,
    paddingBottom: 44,
  },
  nextButton: {
    backgroundColor: '#1a56db',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('fab', palette.blue),
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  getStartedButton: {
    backgroundColor: '#1a56db',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('fab', palette.blue),
  },
  getStartedText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
