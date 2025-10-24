import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Text } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFavorites, FavoriteItem } from '../../favorites/FavoritesContext';
import { useMapNavigation } from '../MapNavigationContext';
import { buildDistanceLine } from './map/utils';

type SortOption = 'distance' | 'recent' | 'name';

export function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();
  const navigation = useNavigation();
  const { navigateToFeature } = useMapNavigation();
  const [sortBy, setSortBy] = React.useState<SortOption>('recent');
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);

  // Get user location for distance sorting
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation([loc.coords.longitude, loc.coords.latitude]);
        }
      } catch {}
    })();
  }, []);

  const handleNavigateToMap = React.useCallback((item: FavoriteItem) => {
    navigateToFeature(item);
    navigation.navigate('Map' as never);
  }, [navigation, navigateToFeature]);

  // Calculate distance for each favorite
  const favoritesWithDistance = React.useMemo(() => {
    if (!userLocation) {
      return favorites.map((f) => ({
        ...f,
        distance: Infinity,
        distanceText: null,
      }));
    }

    return favorites.map((f) => {
      const distanceText = buildDistanceLine(userLocation, f);
      // Extract meters from distance calculation for sorting
      const [userLng, userLat] = userLocation;
      const [destLng, destLat] = f.coordinates;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(destLat - userLat);
      const dLng = toRad(destLng - userLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(userLat)) * Math.cos(toRad(destLat)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const meters = R * c;

      return { ...f, distance: meters, distanceText };
    });
  }, [favorites, userLocation]);

  // Sort favorites based on selected option
  const sortedFavorites = React.useMemo(() => {
    const sorted = [...favoritesWithDistance];

    switch (sortBy) {
      case 'distance':
        sorted.sort((a, b) => a.distance - b.distance);
        break;
      case 'recent':
        sorted.sort((a, b) => b.dateAdded - a.dateAdded);
        break;
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return sorted;
  }, [favoritesWithDistance, sortBy]);

  const renderItem = ({ item }: { item: FavoriteItem & { distance: number; distanceText?: string | null } }) => {
    // Get appropriate icon and color palette for each type
    const getTypeInfo = (type: FavoriteItem['type']) => {
      switch (type) {
        case 'toilet':
          return {
            label: 'Public Toilet',
            badgeColor: '#E7F4FF',
            badgeBorder: '#D0E6FF',
            icon: require('../../../assets/toilet.png'),
          };
        case 'decorative':
          return {
            label: 'Decorative Fountain',
            badgeColor: '#FFF4EC',
            badgeBorder: '#FFE1CC',
            icon: require('../../../assets/decor.png'),
          };
        default:
          return {
            label: 'Drinking Water',
            badgeColor: '#E8F8FF',
            badgeBorder: '#CCEFFF',
            icon: require('../../../assets/water-drop.png'),
          };
      }
    };

    const typeInfo = getTypeInfo(item.type);

    return (
      <Pressable
        style={styles.card}
        onPress={() => handleNavigateToMap(item)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.title} on map`}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.datasetBadge,
                { backgroundColor: typeInfo.badgeColor, borderColor: typeInfo.badgeBorder },
              ]}
            >
              <Image source={typeInfo.icon} style={styles.datasetIcon} resizeMode="contain" />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          {item.description ? (
            <RNText style={styles.subtitle}>{item.description}</RNText>
          ) : null}
          <RNText style={styles.meta}>{typeInfo.label}</RNText>
          {item.distanceText ? (
            <View style={styles.distanceRow}>
              <Feather name="navigation" size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <RNText style={styles.distance}>{item.distanceText}</RNText>
            </View>
          ) : null}
        </View>
        <Pressable
          style={styles.favButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.title} from favorites`}
          accessibilityHint="Double tap to remove this location from your saved list."
        >
          <MaterialCommunityIcons name="star" size={22} color="#F59E0B" />
        </Pressable>
      </Pressable>
    );
  };

  if (favorites.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="star-outline" size={28} color="#2563EB" />
        </View>
        <Text style={{ fontWeight: '600' }}>No favorites yet</Text>
        <RNText style={styles.emptySubtitle}>
          Explore the map and tap the star to keep fountains and toilets handy.
        </RNText>
      </View>
    );
  }

  const sortOptions: Array<{ value: SortOption; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = [
    { value: 'recent', label: 'Recently Added', icon: 'clock' },
    { value: 'distance', label: 'Distance', icon: 'navigation' },
    { value: 'name', label: 'Name A-Z', icon: 'type' },
  ];

  const renderSortControls = React.useCallback(() => (
    <View style={styles.sortControls}>
      {sortOptions.map((option) => {
        const active = sortBy === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.sortButton, active && styles.sortButtonActive]}
            onPress={() => setSortBy(option.value)}
            accessibilityRole="button"
          >
            <View style={styles.sortButtonInner}>
              <Feather
                name={option.icon}
                size={14}
                color={active ? '#FFFFFF' : '#6b7280'}
              />
              <RNText style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>
                {option.label}
              </RNText>
            </View>
          </Pressable>
        );
      })}
    </View>
  ), [sortBy]);

  return (
    <FlatList
      data={sortedFavorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ flex: 1 }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={renderSortControls}
      ListHeaderComponentStyle={styles.sortHeader}
      stickyHeaderIndices={[0]}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtitle: {
    color: '#6b7280',
    textAlign: 'center',
  },
  sortHeader: {
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  sortButtonActive: {
    backgroundColor: '#2563EB',
  },
  sortButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#6b7280' },
  meta: { color: '#4b5563', fontSize: 13, fontWeight: '500' },
  datasetBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datasetIcon: {
    width: 18,
    height: 18,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  favButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
