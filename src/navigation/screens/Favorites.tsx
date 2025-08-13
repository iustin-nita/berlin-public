import React from 'react';
import { FlatList, Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Text } from '@react-navigation/elements';
import { useFavorites } from '../../favorites/FavoritesContext';
import { FeatureProps } from '../../types/api';

export function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();

  const renderItem = ({ item }: { item: FeatureProps }) => {
    // Get appropriate icon and color for each type
    const getTypeInfo = (type: FeatureProps['type']) => {
      switch (type) {
        case 'toilet':
          return { icon: '🚻', label: 'Public Toilet', color: '#E0F2F1' };
        case 'decorative':
          return { icon: '⛲', label: 'Decorative Fountain', color: '#FFF3E0' };
        default:
          return { icon: '💧', label: 'Drinking Water', color: '#E3F2FD' };
      }
    };

    const typeInfo = getTypeInfo(item.type);

    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: typeInfo.color }]}>
          <RNText style={styles.typeIcon}>{typeInfo.icon}</RNText>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description ? <RNText style={styles.subtitle}>{item.description}</RNText> : null}
          <RNText style={styles.meta}>{typeInfo.label}</RNText>
        </View>
        <Pressable
          style={styles.favButton}
          onPress={() => toggleFavorite(item)}
          accessibilityRole="button"
          accessibilityLabel="Remove from favorites"
        >
          <RNText style={{ fontSize: 18 }}>⭐</RNText>
        </Pressable>
      </View>
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
    <FlatList
      data={favorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
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
    fontSize: 20,
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#6b7280' },
  meta: { marginTop: 6, color: '#334155', fontWeight: '500' },
  favButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
