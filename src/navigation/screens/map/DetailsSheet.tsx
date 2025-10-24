import React from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View, ActivityIndicator, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { FeatureProps } from '../../../types/api';
import { getSanitizedInfo, isTwentyFourSeven } from './utils';
import { useFavorites } from '../../../favorites/FavoritesContext';
import { useCommunityStatus } from '../../../community/useCommunityStatus';
import { getStatusBadgeText, getStatusBadgeColor } from '../../../community/utils';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export type DetailsSheetProps = {
  refInstance: React.RefObject<BottomSheet | null>;
  selected: FeatureProps | null;
  onClose: () => void;
  distanceInfo: { distanceText: string; etaMinutes: number } | null;
  onNavigate?: () => void;
};

export function DetailsSheet({ refInstance, selected, onClose, distanceInfo, onNavigate }: DetailsSheetProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = selected ? isFavorite(selected.id) : false;
  
  // Community status hook
  const communityStatus = useCommunityStatus(selected?.id || null);
  const workingCount = communityStatus.status?.totals.working ?? 0;
  const notWorkingCount = communityStatus.status?.totals.notWorking ?? 0;
  const totalReports = workingCount + notWorkingCount;
  const hasReports = totalReports > 0;
  const myVote = communityStatus.status?.myVote;

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

  const typeConfig = React.useMemo(() => {
    if (!selected) return null;
    switch (selected.type) {
      case 'toilet':
        return {
          label: 'Public Toilet',
          pillBg: '#E7F4FF',
          pillBorder: '#D0E6FF',
          icon: require('../../../../assets/toilet.png'),
        };
      case 'decorative':
        return {
          label: 'Decorative Fountain',
          pillBg: '#FFF4EC',
          pillBorder: '#FFE1CC',
          icon: require('../../../../assets/decor.png'),
        };
      default:
        return {
          label: 'Drinking Water',
          pillBg: '#E8F8FF',
          pillBorder: '#CCEFFF',
          icon: require('../../../../assets/water-drop.png'),
        };
    }
  }, [selected]);

  return (
    <BottomSheet
      ref={refInstance}
      snapPoints={['32%', '58%']}
      index={-1}
      enablePanDownToClose
      handleIndicatorStyle={styles.sheetHandle}
      onClose={onClose}
    >
      <BottomSheetView style={styles.sheetContent}>
        {selected ? (
          <View>
            <View style={styles.headerSection}>
              <View style={styles.headerTopRow}>
                {typeConfig ? (
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: typeConfig.pillBg, borderColor: typeConfig.pillBorder },
                    ]}
                  >
                    <View style={styles.typeIconWrap}>
                      <Image source={typeConfig.icon} style={styles.typeIcon} />
                    </View>
                    <Text style={styles.typePillText}>{typeConfig.label}</Text>
                  </View>
                ) : null}
                <Pressable
                  style={[styles.favButton, isFav && styles.favButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  onPress={() => {
                    if (selected) toggleFavorite(selected);
                  }}
                >
                  <MaterialCommunityIcons
                    name={isFav ? 'star' : 'star-outline'}
                    size={22}
                    color={isFav ? '#F59E0B' : '#64748b'}
                  />
                </Pressable>
              </View>
              <Text style={styles.title}>{selected.title || 'Water Source'}</Text>
              {selected.description ? (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.locationText}>{selected.description}</Text>
                </View>
              ) : null}
              {distanceInfo ? (
                <View style={styles.distanceRow}>
                  <Feather name="navigation" size={14} color="#2563EB" />
                  <Text style={styles.distanceText}>
                    {distanceInfo.distanceText} · {distanceInfo.etaMinutes} min walk
                  </Text>
                </View>
              ) : null}
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
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.drinking.fountainType}</Text>
                    </View>
                  </View>
                ) : null}
                {selected.drinking.yearBuilt != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Year built</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.drinking.yearBuilt}</Text>
                    </View>
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
                        <View style={styles.detailValueContainer}>
                          <Text style={styles.detailValue}>{seasonText}</Text>
                        </View>
                      </View>
                    );
                  }
                  if (infoClean) {
                    return (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Info</Text>
                        <View style={styles.detailValueContainer}>
                          <Text style={styles.detailValue}>{infoClean}</Text>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}
                {selected.drinking.infoUrl ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Website</Text>
                    <View style={styles.detailValueContainer}>
                      <Pressable
                        onPress={() => handleOpenUrl(selected.drinking!.infoUrl!)}
                        accessibilityRole="link"
                        style={styles.linkRow}
                      >
                        <Text style={[styles.detailValue, styles.link]} numberOfLines={1}>
                          {selected.drinking.infoUrl}
                        </Text>
                        <Feather name="external-link" size={14} color="#1d4ed8" />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {selected.type === 'toilet' && selected.toilet ? (
              <View style={styles.detailsCard}>
                {selected.toilet.hours ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hours</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.toilet.hours}</Text>
                      {isTwentyFourSeven(selected.toilet.hours) ? (
                        <View style={styles.inlineBadge}>
                          <Text style={styles.inlineBadgeText}>24/7</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                {selected.toilet.fee != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fee</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>
                        {selected.toilet.fee === 0 ? 'Free' : `${selected.toilet.fee} €`}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {selected.toilet.payment ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.toilet.payment}</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Accessibility</Text>
                  <View style={styles.detailValueContainer}>
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
                </View>
                {selected.toilet.hasChangingTable != null ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Baby-changing table</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.toilet.hasChangingTable ? 'Yes' : 'No'}</Text>
                    </View>
                  </View>
                ) : null}
                {selected.toilet.operator ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operator</Text>
                    <View style={styles.detailValueContainer}>
                      <Text style={styles.detailValue}>{selected.toilet.operator}</Text>
                    </View>
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
              {!hasReports ? (
                <Text style={styles.statusHint}>
                  Be the first to report how this location is performing.
                </Text>
              ) : null}
              <View style={styles.voteRow}>
                <Pressable
                  style={[
                    styles.voteButton,
                    (hasReports || myVote === 'working') ? styles.voteYes : styles.voteButtonMuted,
                    myVote === 'working' && styles.voteButtonSelected,
                  ]}
                  accessibilityRole="button"
                  disabled={communityStatus.submitting}
                  onPress={() => {
                    if (selected) {
                      communityStatus.submitReport('working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0],
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text
                      style={[
                        styles.voteText,
                        !hasReports && myVote !== 'working' && styles.voteTextMuted,
                        myVote === 'working' && styles.voteTextSelected,
                      ]}
                    >
                      👍 Working
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#047857" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text
                        style={[
                          styles.voteCount,
                          !hasReports && myVote !== 'working' && styles.voteCountMuted,
                          myVote === 'working' && styles.voteCountSelected,
                        ]}
                      >
                        ({workingCount})
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  style={[
                    styles.voteButton,
                    (hasReports || myVote === 'not_working') ? styles.voteNo : styles.voteButtonMuted,
                    myVote === 'not_working' && styles.voteButtonSelected,
                  ]}
                  accessibilityRole="button"
                  disabled={communityStatus.submitting}
                  onPress={() => {
                    if (selected) {
                      communityStatus.submitReport('not_working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0],
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text
                      style={[
                        styles.voteText,
                        !hasReports && myVote !== 'not_working' && styles.voteTextMuted,
                        myVote === 'not_working' && styles.voteTextSelected,
                      ]}
                    >
                      👎 Not Working
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#b91c1c" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text
                        style={[
                          styles.voteCount,
                          !hasReports && myVote !== 'not_working' && styles.voteCountMuted,
                          myVote === 'not_working' && styles.voteCountSelected,
                        ]}
                      >
                        ({notWorkingCount})
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
                <View style={styles.actionContent}>
                  <Feather name="navigation" size={16} color="#ffffff" />
                  <Text style={styles.actionText}>Navigate</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.secondaryAction]}
                accessibilityRole="button"
                onPress={handleShare}
                onLongPress={handleCopy}
              >
                <View style={styles.actionContent}>
                  <Feather name="share-2" size={16} color="#047857" />
                  <Text style={[styles.actionText, styles.secondaryActionText]}>Share</Text>
                </View>
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
  sheetContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  sheetHandle: { backgroundColor: '#E0E0E0' },
  headerSection: { marginBottom: 12, gap: 6 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  typePillText: { color: '#0f172a', fontWeight: '600', fontSize: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#0f172a', lineHeight: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#64748b', fontSize: 13, flexShrink: 1 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distanceText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  favButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  favButtonActive: {
    backgroundColor: '#FFF7E6',
    borderColor: '#f59e0b',
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipIcon: { fontSize: 12 },
  chipText: { color: '#334155', fontWeight: '500', fontSize: 12 },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 12 },
  detailLabel: { width: 120, color: '#475569', fontWeight: '600', fontSize: 13 },
  detailValueContainer: { flex: 1, alignItems: 'flex-start', gap: 6 },
  detailValue: { color: '#111827', fontSize: 13, lineHeight: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { color: '#1d4ed8', textDecorationLine: 'underline' },
  inlineBadge: { backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  inlineBadgeText: { color: '#0369a1', fontSize: 11, fontWeight: '600' },
  statusCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  statusBadge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontWeight: '700', fontSize: 12 },
  statusHint: { color: '#94a3b8', fontSize: 12 },
  voteRow: { flexDirection: 'row', gap: 12 },
  voteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  voteButtonMuted: {
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  voteButtonSelected: { borderWidth: 2, borderColor: '#2563EB' },
  voteButtonContent: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  voteYes: { backgroundColor: '#E8F5E9' },
  voteNo: { backgroundColor: '#FFEBEE' },
  voteText: { fontWeight: '700', color: '#334155' },
  voteTextMuted: { color: '#94a3b8' },
  voteTextSelected: { color: '#2563EB' },
  voteCount: { fontSize: 11, color: '#64748b', marginLeft: 4 },
  voteCountMuted: { color: '#cbd5f5' },
  voteCountSelected: { color: '#2563EB', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { backgroundColor: '#2563EB' },
  secondaryAction: { backgroundColor: '#ECFDF5', borderWidth: StyleSheet.hairlineWidth, borderColor: '#bbf7d0' },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '700' },
  secondaryActionText: { color: '#047857' },
});
