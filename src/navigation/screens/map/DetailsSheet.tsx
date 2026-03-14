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
  isOnline: boolean;
  onNavigate?: () => void;
};

export function DetailsSheet({ refInstance, selected, onClose, distanceInfo, isOnline, onNavigate }: DetailsSheetProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = selected ? isFavorite(selected.id) : false;
  
  // Community status hook
  const communityStatus = useCommunityStatus(selected?.id || null);
  const workingCount = communityStatus.status?.totals.working ?? 0;
  const notWorkingCount = communityStatus.status?.totals.notWorking ?? 0;
  const totalReports = workingCount + notWorkingCount;
  const hasReports = totalReports > 0;
  const myVote = communityStatus.status?.myVote;
  const votingDisabled = !isOnline || communityStatus.submitting;

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
      if (selected.toilet.hours && isTwentyFourSeven(selected.toilet.hours)) {
        chips.push({ icon: '🕐', label: '24/7' });
      }
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
                {communityStatus.loading ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
                    <ActivityIndicator size="small" color="#616161" />
                  </View>
                ) : communityStatus.status ? (
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
              {!hasReports && !communityStatus.loading ? (
                <Text style={styles.statusHint}>
                  Help others - report current status
                </Text>
              ) : !isOnline ? (
                <Text style={styles.statusHint}>
                  Voting is available only while online. You can still browse cached amenity details offline.
                </Text>
              ) : communityStatus.loading ? (
                <Text style={styles.statusHint}> </Text>
              ) : null}
              <View style={styles.voteRow}>
                <Pressable
                  style={[
                    styles.voteButton,
                    (hasReports || myVote === 'working') ? styles.voteYes : styles.voteButtonMuted,
                    myVote === 'working' && styles.voteButtonSelected,
                  ]}
                  accessibilityRole="button"
                  disabled={votingDisabled}
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
                  disabled={votingDisabled}
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
                  <Feather name="navigation" size={18} color="#ffffff" />
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
                  <Feather name="share-2" size={18} color="#10b981" />
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
  sheetContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  sheetHandle: { backgroundColor: '#E0E0E0' },
  headerSection: { marginBottom: 8, gap: 4 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    width: 13,
    height: 13,
    resizeMode: 'contain',
  },
  typePillText: { color: '#0f172a', fontWeight: '600', fontSize: 11 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', lineHeight: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#64748b', fontSize: 12, flexShrink: 1 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { color: '#2563EB', fontWeight: '600', fontSize: 12 },
  favButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipIcon: { fontSize: 11 },
  chipText: { color: '#334155', fontWeight: '500', fontSize: 11 },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 2,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, gap: 10 },
  detailLabel: { width: 90, color: '#475569', fontWeight: '600', fontSize: 12 },
  detailValueContainer: { flex: 1, alignItems: 'flex-start', gap: 4 },
  detailValue: { color: '#111827', fontSize: 12, lineHeight: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { color: '#1d4ed8', textDecorationLine: 'underline' },
  inlineBadge: { backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  inlineBadgeText: { color: '#0369a1', fontSize: 10, fontWeight: '600' },
  statusCard: { backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10, marginBottom: 8, gap: 6 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { color: '#6b7280', fontSize: 12, fontWeight: '500' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontWeight: '700', fontSize: 11 },
  statusHint: { color: '#94a3b8', fontSize: 11 },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  voteButtonMuted: {
    backgroundColor: '#fafafa',
    borderColor: '#e5e7eb',
  },
  voteButtonSelected: {
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voteButtonContent: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  voteYes: {
    backgroundColor: '#ffffff',
    borderColor: '#86efac',
  },
  voteNo: {
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
  },
  voteText: { fontWeight: '700', color: '#1e293b', fontSize: 13 },
  voteTextMuted: { color: '#94a3b8', fontWeight: '600' },
  voteTextSelected: { color: '#2563EB' },
  voteCount: { fontSize: 11, color: '#64748b', marginLeft: 4, fontWeight: '600' },
  voteCountMuted: { color: '#cbd5e1' },
  voteCountSelected: { color: '#2563EB', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: '#2563EB',
  },
  secondaryAction: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowOpacity: 0.08,
  },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  secondaryActionText: { color: '#10b981', fontWeight: '700' },
});
