import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList, Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Text } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFavorites, FavoriteItem } from '../../favorites/FavoritesContext';
import { useMapNavigation } from '../MapNavigationContext';
import { buildDistanceLine, haversineDistance } from './map/utils';
import { getCategoryByKey } from '../../constants/categories';
import { CategoryIcon } from '../../components/CategoryIcon';
import { useTheme } from '../../hooks/useTheme';

type SortOption = 'distance' | 'recent';

export function Favorites() {
  const { colors } = useTheme();
  const { favorites, toggleFavorite } = useFavorites();
  const navigation = useNavigation();
  const { navigateToFeature } = useMapNavigation();
  const [sortBy, setSortBy] = React.useState<SortOption>('recent');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [sortLoaded, setSortLoaded] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('favorites:sort:v1').then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.by === 'distance' || saved.by === 'recent') setSortBy(saved.by);
      if (saved.order === 'asc' || saved.order === 'desc') setSortOrder(saved.order);
    }).catch(() => {}).finally(() => setSortLoaded(true));
  }, []);

  React.useEffect(() => {
    if (sortLoaded) AsyncStorage.setItem('favorites:sort:v1', JSON.stringify({ by: sortBy, order: sortOrder })).catch(() => {});
  }, [sortBy, sortOrder, sortLoaded]);

  // Get user location for distance sorting
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
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
      const meters = haversineDistance(userLocation, f.coordinates);
      return { ...f, distance: meters, distanceText };
    });
  }, [favorites, userLocation]);

  // Sort favorites based on selected option
  const sortedFavorites = React.useMemo(() => {
    const sorted = [...favoritesWithDistance];

    switch (sortBy) {
      case 'distance':
        sorted.sort((a, b) => sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance);
        break;
      case 'recent':
        sorted.sort((a, b) => sortOrder === 'asc' ? a.dateAdded - b.dateAdded : b.dateAdded - a.dateAdded);
        break;
    }

    return sorted;
  }, [favoritesWithDistance, sortBy, sortOrder]);

  const sortOptions: Array<{ value: SortOption; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = [
    { value: 'recent', label: 'Recently Added', icon: 'clock' },
    { value: 'distance', label: 'Distance', icon: 'navigation' },
  ];

  const handleSortPress = React.useCallback((option: SortOption) => {
    if (sortBy === option) {
      // Toggle order if same option is clicked
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort option with default order
      setSortBy(option);
      setSortOrder(option === 'recent' ? 'desc' : 'asc');
    }
  }, [sortBy, sortOrder]);

  const renderSortControls = React.useCallback(() => (
    <View style={styles.sortControls}>
      {sortOptions.map((option) => {
        const active = sortBy === option.value;
        const arrow = active ? (sortOrder === 'asc' ? 'arrow-up' : 'arrow-down') : null;
        return (
          <Pressable
            key={option.value}
            style={[styles.sortButton, { backgroundColor: colors.surfaceSecondary }, active && styles.sortButtonActive]}
            disabled={option.value === 'distance' && !userLocation}
            accessibilityState={{ selected: active, disabled: option.value === 'distance' && !userLocation }}
            onPress={() => handleSortPress(option.value)}
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
              {arrow && (
                <Feather
                  name={arrow}
                  size={12}
                  color="#FFFFFF"
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  ), [sortBy, sortOrder, handleSortPress, colors, userLocation]);

  const renderItem = ({ item }: { item: FavoriteItem & { distance: number; distanceText?: string | null } }) => {
    const cat = getCategoryByKey(item.type ?? 'drinking');
    const typeInfo = {
      label: cat?.label ?? 'Location',
      key: cat?.key ?? 'drinking',
      color: cat?.color ?? '#1a56db',
    };

    return (
      <Pressable
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => handleNavigateToMap(item)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.title} on map`}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.titleRow}>
            <View style={styles.datasetBadge}>
              <CategoryIcon categoryKey={typeInfo.key} size={18} color={typeInfo.color} />
            </View>
            <Text style={[styles.title, { flex: 1, color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          {item.description ? (
            <RNText style={[styles.subtitle, { color: colors.textSecondary }]}>{item.description}</RNText>
          ) : null}
          <RNText style={[styles.meta, { color: colors.textSecondary }]}>{typeInfo.label}</RNText>
          {item.distanceText ? (
            <View style={styles.distanceRow}>
              <Feather name="navigation" size={14} color="#1a56db" style={{ marginRight: 4 }} />
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
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="star-outline" size={28} color="#1a56db" />
        </View>
        <Text style={{ fontWeight: '600', color: colors.text }}>No favorites yet</Text>
        <RNText style={styles.emptySubtitle}>
          Explore the map and tap the star to keep amenities handy.
        </RNText>
        <Pressable
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Map' as never)}
          accessibilityRole="button"
          accessibilityLabel="Explore the map"
        >
          <Feather name="map" size={16} color="#ffffff" />
          <RNText style={styles.emptyButtonText}>Explore the Map</RNText>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={sortedFavorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={renderSortControls}
      ListHeaderComponentStyle={[styles.sortHeader, { backgroundColor: colors.background }]}
      stickyHeaderIndices={[0]}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a56db',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  sortHeader: {
    paddingBottom: 8,
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
    backgroundColor: '#1a56db',
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
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { color: '#6b7280' },
  meta: { color: '#4b5563', fontSize: 13, fontWeight: '500' },
  datasetBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 13,
    color: '#1a56db',
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
