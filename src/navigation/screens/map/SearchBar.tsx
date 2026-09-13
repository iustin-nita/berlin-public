import React from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectionFeedback } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { isInBerlin } from '../../../utils/location';

type SearchBarProps = {
  onResult: (coords: [number, number]) => void;
};

export function SearchBar({ onResult }: SearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  const handleSearch = React.useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || searching) return;

    setSearching(true);
    try {
      if (Platform.OS === 'android') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          toast.error('Search needs location access', { description: 'Enable location in Settings, or browse the map and categories.' });
          return;
        }
      }
      // Include the country: Apple's geocoder can otherwise return no result
      // even for common Berlin addresses such as Alexanderplatz.
      const searchQuery = /(?:^|[\s,])berlin(?:$|[\s,])/i.test(trimmed)
        ? `${trimmed}, Germany`
        : `${trimmed}, Berlin, Germany`;
      const results = await Location.geocodeAsync(searchQuery);
      const result = results.find(({ latitude, longitude }) => isInBerlin(latitude, longitude));
      if (result) {
        const { longitude, latitude } = result;
        selectionFeedback();
        onResult([longitude, latitude]);
        Keyboard.dismiss();
      } else {
        toast.error('No address found', { description: 'Try a street name or postcode in Berlin.' });
      }
    } catch {
      toast.error('Search unavailable', { description: 'Check your connection and try again.' });
    } finally {
      setSearching(false);
    }
  }, [query, searching, onResult]);

  const handleClear = React.useCallback(() => {
    setQuery('');
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: colors.searchBar }]}>
        <Feather name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search address..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
          accessibilityLabel="Search address in Berlin"
        />
        {searching ? <ActivityIndicator size="small" accessibilityLabel="Searching" /> : null}
        {query.length > 0 ? (
          <Pressable onPress={handleClear} accessibilityLabel="Clear search" style={styles.clearButton}>
            <Feather name="x" size={16} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 60,
    zIndex: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
});
