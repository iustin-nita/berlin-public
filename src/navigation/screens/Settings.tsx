import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import { useTheme } from '../../hooks/useTheme';
import { palette, shadow } from '../../constants/tokens';
import { usePreferences } from '../../preferences/PreferencesContext';
import type { MarkerStyle } from '../../constants/markerAssets';
import { lightImpact } from '../../utils/haptics';

const logoSource = require('../../../assets/logo.png');

export function Settings() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { markerStyle, setMarkerStyle } = usePreferences();

  const handleShowTutorial = async () => {
    await AsyncStorage.removeItem('hasCompletedOnboarding:v1');
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface2 }]} contentContainerStyle={styles.content}>
      <SectionLabel color={colors.faint}>Help</SectionLabel>
      <Card colors={colors}>
        <Row
          colors={colors}
          icon={<Feather name="book-open" size={17} color={palette.blue} />}
          label="Show tutorial again"
          onPress={handleShowTutorial}
        />
        <Row
          colors={colors}
          icon={<Feather name="info" size={17} color={palette.blue} />}
          label="About & data sources"
          value="Berlin Open Data"
          last
          onPress={() => toast('Data: Berlin Open Data (WFS)', { description: 'Amenity data © Geoportal Berlin' })}
        />
        <Row
          colors={colors}
          icon={<Feather name="shield" size={17} color={palette.blue} />}
          label="Privacy policy"
          last
          onPress={() => Linking.openURL('https://github.com/iustin-nita/berlin-public/blob/main/PRIVACY_POLICY.md').catch(() => toast.error('Could not open privacy policy'))}
        />
      </Card>

      {__DEV__ ? (
        <>
          <SectionLabel color={colors.faint}>Developer</SectionLabel>
          <Card colors={colors}>
            <View style={styles.toggleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.blueSoft }]}>
                <Feather name="map-pin" size={17} color={palette.blue} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.ink }]}>Marker style</Text>
              <Segmented value={markerStyle} onChange={setMarkerStyle} colors={colors} />
            </View>
          </Card>
        </>
      ) : null}

      <View style={styles.footer}>
        <Image source={logoSource} style={styles.footerLogo} />
        <Text style={[styles.footerText, { color: colors.faint }]}>Berlin Public · Made in Kreuzberg</Text>
        <Text style={[styles.footerCredit, { color: colors.faint }]}>Amenity data © Geoportal Berlin</Text>
      </View>
    </ScrollView>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{children}</Text>;
}

function Card({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline2 }, shadow('card')]}>
      {children}
    </View>
  );
}

type RowProps = {
  colors: ReturnType<typeof useTheme>['colors'];
  icon: React.ReactNode;
  label: string;
  value?: string;
  last?: boolean;
  onPress?: () => void;
};

function Row({ colors, icon, label, value, last, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline2 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.blueSoft }]}>{icon}</View>
      <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: colors.faint }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color={colors.faint} />
    </Pressable>
  );
}

function Segmented({ value, onChange, colors }: { value: MarkerStyle; onChange: (s: MarkerStyle) => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  const opts: { key: MarkerStyle; label: string }[] = [
    { key: 'teardrop', label: 'Teardrop' },
    { key: 'classic', label: 'Classic' },
  ];
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface3 }]}>
      {opts.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => { lightImpact(); onChange(o.key); }}
            style={[styles.segment, on && { backgroundColor: palette.blue }]}
          >
            <Text style={[styles.segmentText, { color: on ? '#ffffff' : colors.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15.5, fontWeight: '600' },
  rowValue: { fontSize: 14 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3 },
  segment: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 6, gap: 8 },
  footerLogo: { width: 30, height: 30, resizeMode: 'contain' },
  footerText: { fontSize: 12.5 },
  footerCredit: { fontSize: 11.5 },
});
