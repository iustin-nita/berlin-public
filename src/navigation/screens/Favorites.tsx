import React from 'react';
import { FlatList, Pressable, StyleSheet, View, Text as RNText, Image } from 'react-native';
import { Text } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
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
    if (!userLocation) return favorites.map((f) => ({ ...f, distance: Infinity }));

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

  const renderItem = ({ item }: { item: FavoriteItem & { distance: number; distanceText?: string } }) => {
    // Get appropriate icon and color for each type
    const getTypeInfo = (type: FavoriteItem['type']) => {
      switch (type) {
        case 'toilet':
          return {
            icon: require('../../../assets/toilet.png'),
            label: 'Public Toilet',
            color: '#E0F2F1'
          };
        case 'decorative':
          return {
            icon: require('../../../assets/decor.png'),
            label: 'Decorative Fountain',
            color: '#FFF3E0'
          };
        default:
          return {
            icon: require('../../../assets/water-drop.png'),
            label: 'Drinking Water',
            color: '#E3F2FD'
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
        <View style={[styles.iconContainer, { backgroundColor: typeInfo.color }]}>
          <Image source={typeInfo.icon} style={styles.typeIcon} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description ? <RNText style={styles.subtitle}>{item.description}</RNText> : null}
          <View style={styles.metaRow}>
            <RNText style={styles.meta}>{typeInfo.label}</RNText>
            {sortBy === 'distance' && item.distanceText ? (
              <RNText style={styles.distance}>{item.distanceText}</RNText>
            ) : null}
          </View>
        </View>
        <Pressable
          style={styles.favButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item);
          }}
          accessibilityRole="button"
          accessibilityLabel="Remove from favorites"
        >
          <RNText style={{ fontSize: 18 }}>⭐</RNText>
        </Pressable>
      </Pressable>
    );
  };

  if (favorites.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>No favorites yet</Text>
        <RNText style={styles.subtitle}>Tap the ⭐ on a location to save it.</RNText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Sort Controls */}
      <View style={styles.sortControls}>
        <Pressable
          style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
          onPress={() => setSortBy('recent')}
          accessibilityRole="button"
        >
          <RNText style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>
            Recently Added
          </RNText>
        </Pressable>
        <Pressable
          style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
          onPress={() => setSortBy('distance')}
          accessibilityRole="button"
        >
          <RNText style={[styles.sortButtonText, sortBy === 'distance' && styles.sortButtonTextActive]}>
            Distance
          </RNText>
        </Pressable>
        <Pressable
          style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
          onPress={() => setSortBy('name')}
          accessibilityRole="button"
        >
          <RNText style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
            Name A-Z
          </RNText>
        </Pressable>
      </View>

      <FlatList
        data={sortedFavorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  sortControls: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#1976D2',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    width: 24,
    height: 24,
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#6b7280' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  meta: { color: '#334155', fontWeight: '500' },
  distance: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  favButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
