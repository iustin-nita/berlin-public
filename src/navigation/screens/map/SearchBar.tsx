import React from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectionFeedback } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';

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
      // Append "Berlin" to bias results
      const searchQuery = trimmed.toLowerCase().includes('berlin')
        ? trimmed
        : `${trimmed}, Berlin`;
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { longitude, latitude } = results[0];
        selectionFeedback();
        onResult([longitude, latitude]);
        Keyboard.dismiss();
      }
    } catch {
      // Geocoding failed silently
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
        />
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
    right: 12,
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
