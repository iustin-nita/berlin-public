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
      [8, 20, 8],
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
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.brandHeader}>
        <BrandMark
          imageSize={64}
          spacing={14}
          textStyle={styles.brandText}
        />
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
                <Feather name={slide.iconName} size={48} color="#1a56db" />
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
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  brandHeader: {
    paddingTop: 88,
    alignItems: 'center',
    paddingBottom: 24,
  },
  brandText: {
    fontSize: 20,
    letterSpacing: 2,
    color: '#0f172a',
  },
  skipText: {
    fontSize: 16,
    color: '#1a56db',
    fontWeight: '600',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#000',
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
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
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a56db',
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  nextButton: {
    backgroundColor: '#1a56db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  getStartedButton: {
    backgroundColor: '#1a56db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
