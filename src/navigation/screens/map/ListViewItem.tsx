import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FeatureProps } from '../../../types/api';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { getCategoryByKey } from '../../../constants/categories';
import { haversineDistance, formatDistance, walkingEta } from './utils';

type ListViewItemProps = {
  item: FeatureProps;
  userLocation: [number, number] | null;
  onPress: (item: FeatureProps) => void;
};

export function ListViewItem({ item, userLocation, onPress }: ListViewItemProps) {
  const cat = getCategoryByKey(item.type ?? 'drinking');
  const distanceText = React.useMemo(() => {
    if (!userLocation) return null;
    const meters = haversineDistance(userLocation, item.coordinates);
    return `${formatDistance(meters)} · ${walkingEta(meters)} min`;
  }, [userLocation, item.coordinates]);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.title} on map`}
    >
      <View style={styles.iconBadge}>
        <CategoryIcon categoryKey={item.type ?? 'drinking'} size={18} color={cat?.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.subtitle} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.category}>{cat?.label ?? 'Location'}</Text>
      </View>
      {distanceText ? (
        <View style={styles.distanceCol}>
          <Feather name="navigation" size={12} color="#1a56db" />
          <Text style={styles.distanceText}>{distanceText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b' },
  category: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  distanceCol: { alignItems: 'center', gap: 2 },
  distanceText: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
});
