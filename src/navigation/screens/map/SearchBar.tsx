import React from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectionFeedback, lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { shadow } from '../../../constants/tokens';

type SearchBarProps = {
  onResult: (coords: [number, number]) => void;
  viewMode: 'map' | 'list';
  onToggleView: () => void;
};

export function SearchBar({ onResult, viewMode, onToggleView }: SearchBarProps) {
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
    <View style={[styles.bar, { backgroundColor: colors.searchBar, borderColor: colors.hairline }, shadow('floating')]}>
      <Feather name="search" size={18} color={colors.muted} style={styles.searchIcon} />
      <TextInput
        style={[styles.input, { color: colors.ink }]}
        placeholder="Search address or place…"
        placeholderTextColor={colors.faint}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
      />
      {query.length > 0 ? (
        <Pressable onPress={handleClear} accessibilityLabel="Clear search" style={styles.clearButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={16} color={colors.faint} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => { lightImpact(); onToggleView(); }}
        accessibilityRole="button"
        accessibilityLabel={viewMode === 'map' ? 'Switch to list view' : 'Switch to map view'}
        style={[styles.toggle, { backgroundColor: colors.surface3 }]}
      >
        <Feather name={viewMode === 'map' ? 'list' : 'map'} size={17} color={colors.ink2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 14,
    paddingRight: 7,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
