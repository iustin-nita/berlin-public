import React from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectionFeedback, lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { isInBerlin } from '../../../utils/location';
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
        accessibilityLabel="Search address in Berlin"
      />
      {searching ? <ActivityIndicator size="small" accessibilityLabel="Searching" /> : null}
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
