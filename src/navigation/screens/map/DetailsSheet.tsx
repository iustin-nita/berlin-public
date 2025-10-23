import React from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { FeatureProps } from '../../../types/api';
import { getSanitizedInfo, isTwentyFourSeven } from './utils';
import { useFavorites } from '../../../favorites/FavoritesContext';
import { useCommunityStatus } from '../../../community/useCommunityStatus';
import { getStatusBadgeText, getStatusBadgeColor } from '../../../community/utils';

export type DetailsSheetProps = {
  refInstance: React.RefObject<BottomSheet | null>;
  selected: FeatureProps | null;
  onClose: () => void;
  distanceLine: string;
  onNavigate?: () => void;
};

export function DetailsSheet({ refInstance, selected, onClose, distanceLine, onNavigate }: DetailsSheetProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = selected ? isFavorite(selected.id) : false;
  
  // Community status hook
  const communityStatus = useCommunityStatus(selected?.id || null);

  const buildShareLink = React.useCallback((): { url: string; message: string; title: string } | null => {
    if (!selected) return null;
    const [lng, lat] = selected.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const title = selected.title || 'Water Source';
    const message = `${title}\n${url}`;
    return { url, message, title };
  }, [selected]);

  const handleShare = React.useCallback(async () => {
    try {
      const payload = buildShareLink();
      if (!payload) return;
      await Share.share({
        message: payload.message,
        url: payload.url,
        title: payload.title,
      });
    } catch (e) {
      // No-op; user may cancel
    }
  }, [buildShareLink]);

  const handleCopy = React.useCallback(async () => {
    const payload = buildShareLink();
    if (!payload) return;
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(payload.url);
      Toast.show({
        type: 'success',
        text1: 'Link copied',
        text2: 'The location link has been copied to your clipboard.',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e) {
      try {
        await Share.share({ message: payload.url });
      } catch {}
      Toast.show({
        type: 'info',
        text1: 'Clipboard unavailable',
        text2: 'Could not access the clipboard on this build. Shared the link instead.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  }, [buildShareLink]);
  const handleOpenUrl = React.useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  }, []);

  const metaChips = React.useMemo(() => {
    const chips: { icon: string; label: string }[] = [];
    if (!selected) return chips;
    if (selected.type === 'toilet' && selected.toilet) {
      if (isTwentyFourSeven(selected.toilet.hours)) chips.push({ icon: '⏱️', label: 'Always available' });
      if (selected.toilet.barrierFree === true) chips.push({ icon: '♿', label: 'Accessible' });
      else if (selected.toilet.barrierReduced === true) chips.push({ icon: '♿', label: 'Accessible (reduced)' });
    }
    if (selected.type === 'drinking' && selected.drinking) {
      const infoClean = getSanitizedInfo(selected.drinking.info, selected.drinking.infoUrl || undefined);
      const seasonMatch = infoClean.match(/^\s*Betriebszeit\s*:\s*(.+)$/i);
      const seasonText = seasonMatch ? seasonMatch[1].trim() : '';
      if (seasonText) {
        const lower = seasonText.toLowerCase();
        const yearRound = /ganzj[aä]hrig|year\s*round|全年/.test(lower);
        if (!yearRound) chips.push({ icon: '❄️', label: 'Winter: Off' });
      }
    }
    return chips;
  }, [selected]);

  return (
    <BottomSheet
      ref={refInstance}
      snapPoints={['38%', '68%']}
      index={-1}
      enablePanDownToClose
      handleIndicatorStyle={styles.sheetHandle}
      onClose={onClose}
    >
      <BottomSheetView style={styles.sheetContent}>
        {selected ? (
          <View>
            <View style={styles.headerSection}>
              <View style={{ flex: 1 }}>
                <View
                  style={[
                    styles.typePill,
                    selected.type === 'decorative'
                      ? styles.typePillDecor
                      : selected.type === 'toilet'
                      ? styles.typePillToilet
                      : styles.typePillDrink,
                  ]}
                >
                  <Text style={styles.typePillText}>
                    {selected.type === 'toilet'
                      ? 'Public Toilet'
                      : selected.type === 'decorative'
                      ? 'Decorative Fountain'
                      : 'Drinking Water'}
                  </Text>
                </View>
                <Text style={styles.title}>{selected.title || 'Water Source'}</Text>
                {selected.description ? <Text style={styles.subtitle}>{selected.description}</Text> : null}
                {distanceLine ? (
                  <View style={styles.distanceRow}>
                    <Text style={styles.distanceText}>{distanceLine}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                style={styles.favButton}
                accessibilityRole="button"
                accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => {
                  if (selected) toggleFavorite(selected);
                }}
              >
                <Text style={{ fontSize: 18 }}>{isFav ? '⭐' : '☆'}</Text>
              </Pressable>
            </View>

            {metaChips.length > 0 ? (
              <View style={styles.metaRow}>
                {metaChips.map((c, idx) => (
                  <View key={`${c.label}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipIcon}>{c.icon}</Text>
                    <Text style={styles.chipText}>{c.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {selected.type === 'drinking' && selected.drinking ? (
              <View style={styles.detailsCard}>
                {selected.drinking.fountainType ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{selected.drinking.fountainType}</Text>
                  </View>
                ) : null}
                {selected.drinking.yearBuilt != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Year built</Text>
                    <Text style={styles.detailValue}>{selected.drinking.yearBuilt}</Text>
                  </View>
                ) : null}
                {(() => {
                  const infoClean = getSanitizedInfo(selected.drinking!.info, selected.drinking!.infoUrl || undefined);
                  const seasonMatch = infoClean.match(/^\s*Betriebszeit\s*:\s*(.+)$/i);
                  const seasonText = seasonMatch ? seasonMatch[1].trim() : '';
                  if (seasonText) {
                    return (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Operating season</Text>
                        <Text style={styles.detailValue}>{seasonText}</Text>
                      </View>
                    );
                  }
                  if (infoClean) {
                    return (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Info</Text>
                        <Text style={styles.detailValue}>{infoClean}</Text>
                      </View>
                    );
                  }
                  return null;
                })()}
                {selected.drinking.infoUrl ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Website</Text>
                    <Text
                      style={[styles.detailValue, styles.link]}
                      accessibilityRole="link"
                      onPress={() => handleOpenUrl(selected.drinking!.infoUrl!)}
                    >
                      {selected.drinking.infoUrl}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {selected.type === 'toilet' && selected.toilet ? (
              <View style={styles.detailsCard}>
                {selected.toilet.hours ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hours</Text>
                    <Text style={styles.detailValue}>{selected.toilet.hours}</Text>
                  </View>
                ) : null}
                {selected.toilet.fee != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fee</Text>
                    <Text style={styles.detailValue}>
                      {selected.toilet.fee === 0 ? 'Free' : `${selected.toilet.fee} €`}
                    </Text>
                  </View>
                ) : null}
                {selected.toilet.payment ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment</Text>
                    <Text style={styles.detailValue}>{selected.toilet.payment}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Accessibility</Text>
                  <Text style={styles.detailValue}>
                    {selected.toilet.barrierFree === true
                      ? 'Barrier-free'
                      : selected.toilet.barrierFree === false
                      ? 'Not barrier-free'
                      : 'Unknown'}
                    {selected.toilet.barrierReduced != null
                      ? selected.toilet.barrierReduced
                        ? ' · Accessible (reduced)'
                        : ' · Not barrier-reduced'
                      : ''}
                  </Text>
                </View>
                {selected.toilet.hasChangingTable != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Baby-changing table</Text>
                    <Text style={styles.detailValue}>{selected.toilet.hasChangingTable ? 'Yes' : 'No'}</Text>
                  </View>
                ) : null}
                {selected.toilet.operator ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operator</Text>
                    <Text style={styles.detailValue}>{selected.toilet.operator}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Community Status</Text>
                {communityStatus.status ? (
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusBadgeColor(communityStatus.status).backgroundColor }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: getStatusBadgeColor(communityStatus.status).textColor }
                    ]}>
                      {getStatusBadgeText(communityStatus.status)}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#616161' }]}>
                      No reports yet
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.voteRow}>
                <Pressable 
                  style={[
                    styles.voteButton, 
                    styles.voteYes,
                    communityStatus.status?.myVote === 'working' && styles.voteButtonSelected
                  ]} 
                  accessibilityRole="button"
                  disabled={communityStatus.submitting}
                  onPress={() => {
                    if (selected) {
                      communityStatus.submitReport('working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0]
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text style={[
                      styles.voteText,
                      communityStatus.status?.myVote === 'working' && styles.voteTextSelected
                    ]}>
                      👍 Working
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#2E7D32" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text style={[
                        styles.voteCount,
                        communityStatus.status?.myVote === 'working' && styles.voteCountSelected
                      ]}>
                        ({communityStatus.status?.totals.working || 0})
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable 
                  style={[
                    styles.voteButton, 
                    styles.voteNo,
                    communityStatus.status?.myVote === 'not_working' && styles.voteButtonSelected
                  ]} 
                  accessibilityRole="button"
                  disabled={communityStatus.submitting}
                  onPress={() => {
                    if (selected) {
                      communityStatus.submitReport('not_working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0]
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text style={[
                      styles.voteText,
                      communityStatus.status?.myVote === 'not_working' && styles.voteTextSelected
                    ]}>
                      👎 Not Working
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#C62828" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text style={[
                        styles.voteCount,
                        communityStatus.status?.myVote === 'not_working' && styles.voteCountSelected
                      ]}>
                        ({communityStatus.status?.totals.notWorking || 0})
                      </Text>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.primaryAction]}
                accessibilityRole="button"
                onPress={onNavigate}
              >
                <Text style={styles.actionText}>🧭 Navigate</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.secondaryAction]}
                accessibilityRole="button"
                onPress={handleShare}
                onLongPress={handleCopy}
              >
                <Text style={[styles.actionText, styles.secondaryActionText]}>📤 Share</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: { padding: 16 },
  sheetHandle: { backgroundColor: '#E0E0E0' },
  headerSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  typePillDrink: { backgroundColor: '#E3F2FD' },
  typePillDecor: { backgroundColor: '#FFF3E0' },
  typePillToilet: { backgroundColor: '#E0F2F1' },
  typePillText: { color: '#1f2937', fontWeight: '600', fontSize: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { color: '#707070', marginTop: 2 },
  distanceRow: { marginTop: 6 },
  distanceText: { color: '#475569', fontWeight: '500' },
  favButton: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f2f6ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipIcon: { fontSize: 12 },
  chipText: { color: '#334155', fontWeight: '500' },
  detailsCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  detailLabel: { color: '#6b7280', fontWeight: '600' },
  detailValue: { color: '#111827', flexShrink: 1, textAlign: 'right' },
  link: { color: '#1d4ed8', textDecorationLine: 'underline' },
  statusCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  statusBadge: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
  voteRow: { flexDirection: 'row', gap: 12 },
  voteButton: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  voteButtonSelected: { borderWidth: 2, borderColor: '#1976D2' },
  voteButtonContent: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  voteYes: { backgroundColor: '#E8F5E9' },
  voteNo: { backgroundColor: '#FFEBEE' },
  voteText: { fontWeight: '700', color: '#334155' },
  voteTextSelected: { color: '#1976D2' },
  voteCount: { fontSize: 11, color: '#64748b', marginTop: 2 },
  voteCountSelected: { color: '#1976D2', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { backgroundColor: '#1976D2' },
  secondaryAction: { backgroundColor: '#E8F5E9' },
  actionText: { color: 'white', fontWeight: '700' },
  secondaryActionText: { color: '#2E7D32' },
});


