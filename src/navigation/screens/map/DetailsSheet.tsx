import React from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';
import { FeatureProps } from '../../../types/api';
import { getSanitizedInfo, isTwentyFourSeven } from './utils';
import { useFavorites } from '../../../favorites/FavoritesContext';
import { useCommunityStatus } from '../../../community/useCommunityStatus';
import { getStatusBadgeText, getStatusBadgeColor } from '../../../community/utils';
import { getCategoryByKey, getVoteLabels } from '../../../constants/categories';
import { CategoryIcon } from '../../../components/CategoryIcon';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { lightImpact } from '../../../utils/haptics';
import { useTheme } from '../../../hooks/useTheme';
import { palette } from '../../../constants/tokens';

export type DetailsSheetProps = {
  refInstance: React.RefObject<BottomSheet | null>;
  selected: FeatureProps | null;
  onClose: () => void;
  distanceInfo: { distanceText: string; etaMinutes: number } | null;
  isOnline: boolean;
  onNavigate?: () => void;
};

export function DetailsSheet({ refInstance, selected, onClose, distanceInfo, isOnline, onNavigate }: DetailsSheetProps) {
  const { colors } = useTheme();
  const styles = useDetailStyles();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = selected ? isFavorite(selected.id) : false;

  const communityStatus = useCommunityStatus(selected?.id || null);
  const workingCount = communityStatus.status?.totals.working ?? 0;
  const notWorkingCount = communityStatus.status?.totals.notWorking ?? 0;
  const totalReports = workingCount + notWorkingCount;
  const hasReports = totalReports > 0;
  const myVote = communityStatus.status?.myVote;
  const votingDisabled = !isOnline || communityStatus.submitting;

  const voteLabels = React.useMemo(
    () => getVoteLabels(selected?.type),
    [selected?.type]
  );

  const buildShareLink = React.useCallback((): { url: string; message: string; title: string } | null => {
    if (!selected) return null;
    const [lng, lat] = selected.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const title = selected.title || 'Location';
    const message = `${title}\n${url}`;
    return { url, message, title };
  }, [selected]);

  const handleShare = React.useCallback(async () => {
    try {
      const payload = buildShareLink();
      if (!payload) return;
      await Share.share({ message: payload.message, url: payload.url, title: payload.title });
    } catch {}
  }, [buildShareLink]);

  const handleCopy = React.useCallback(async () => {
    const payload = buildShareLink();
    if (!payload) return;
    try {
      await Clipboard.setStringAsync(payload.url);
      toast.success('Link copied', { description: 'The location link has been copied to your clipboard.' });
    } catch {
      try { await Share.share({ message: payload.url }); } catch {}
      toast('Clipboard unavailable', { description: 'Could not access the clipboard on this build.' });
    }
  }, [buildShareLink]);

  const handleOpenUrl = React.useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  }, []);

  const metaChips = React.useMemo(() => {
    const chips: { iconName: React.ComponentProps<typeof Feather>['name']; label: string }[] = [];
    if (!selected) return chips;
    if (selected.type === 'toilet' && selected.toilet) {
      if (selected.toilet.barrierFree === true) chips.push({ iconName: 'check-circle', label: 'Accessible' });
      else if (selected.toilet.barrierReduced === true) chips.push({ iconName: 'check-circle', label: 'Accessible (reduced)' });
      if (selected.toilet.hours && isTwentyFourSeven(selected.toilet.hours)) {
        chips.push({ iconName: 'clock', label: '24/7' });
      }
    }
    if (selected.type === 'drinking' && selected.drinking) {
      const infoClean = getSanitizedInfo(selected.drinking.info, selected.drinking.infoUrl || undefined);
      const seasonMatch = infoClean.match(/^\s*Betriebszeit\s*:\s*(.+)$/i);
      const seasonText = seasonMatch ? seasonMatch[1].trim() : '';
      if (seasonText) {
        const lower = seasonText.toLowerCase();
        const yearRound = /ganzj[aä]hrig|year\s*round|全年/.test(lower);
        if (!yearRound) chips.push({ iconName: 'cloud-snow', label: 'Winter: Off' });
      }
    }
    if (selected.type === 'coolSpace' && selected.coolSpace) {
      if (selected.coolSpace.wheelchairAccessible === true) chips.push({ iconName: 'check-circle', label: 'Accessible' });
    }
    if (selected.type === 'evCharging' && selected.evCharging) {
      if (selected.evCharging.isPublic === true) chips.push({ iconName: 'globe', label: 'Public' });
    }
    return chips;
  }, [selected]);

  const typeConfig = React.useMemo(() => {
    if (!selected?.type) return null;
    const cat = getCategoryByKey(selected.type);
    if (!cat) return null;
    return {
      key: cat.key,
      label: cat.label,
      color: cat.color,
    };
  }, [selected]);

  return (
    <BottomSheet
      ref={refInstance}
      snapPoints={['45%', '88%']}
      enableDynamicSizing={false}
      accessible={false}
      index={-1}
      containerStyle={{ zIndex: 20 }}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={styles.sheetHandle}
      onClose={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        {selected ? (
          <View>
            <View style={styles.headerSection}>
              <View style={styles.headerTopRow}>
                {typeConfig ? (
                  <View style={[styles.typePill, { backgroundColor: typeConfig.color }]}>
                    <CategoryIcon categoryKey={typeConfig.key} size={12} color="#ffffff" />
                    <Text style={styles.typePillText}>{typeConfig.label}</Text>
                  </View>
                ) : null}
                <Pressable
                  style={[styles.favButton, isFav && styles.favButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  onPress={() => { lightImpact(); if (selected) toggleFavorite(selected); }}
                >
                  <MaterialCommunityIcons
                    name={isFav ? 'star' : 'star-outline'}
                    size={22}
                    color={isFav ? '#F59E0B' : '#64748b'}
                  />
                </Pressable>
              </View>
              <Text style={styles.title}>{selected.title || 'Location'}</Text>
              {selected.description ? (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.locationText}>{selected.description}</Text>
                </View>
              ) : null}
              {distanceInfo ? (
                <View style={styles.distanceRow}>
                  <Feather name="navigation" size={14} color="#1a56db" />
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
                    <Feather name={c.iconName} size={11} color="#64748b" />
                    <Text style={styles.chipText}>{c.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Drinking fountain details */}
            {selected.type === 'drinking' && selected.drinking ? (
              <View style={styles.detailsCard}>
                {selected.drinking.fountainType ? (
                  <DetailRow label="Type" value={selected.drinking.fountainType} />
                ) : null}
                {selected.drinking.yearBuilt != null ? (
                  <DetailRow label="Year built" value={String(selected.drinking.yearBuilt)} />
                ) : null}
                {(() => {
                  const infoClean = getSanitizedInfo(selected.drinking!.info, selected.drinking!.infoUrl || undefined);
                  const seasonMatch = infoClean.match(/^\s*Betriebszeit\s*:\s*(.+)$/i);
                  const seasonText = seasonMatch ? seasonMatch[1].trim() : '';
                  if (seasonText) return <DetailRow label="Operating season" value={seasonText} />;
                  if (infoClean) return <DetailRow label="Info" value={infoClean} />;
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

            {/* Toilet details */}
            {selected.type === 'toilet' && selected.toilet ? (
              <View style={styles.detailsCard}>
                {selected.toilet.hours ? <DetailRow label="Hours" value={selected.toilet.hours} /> : null}
                {selected.toilet.fee != null ? (
                  <DetailRow label="Fee" value={selected.toilet.fee === 0 ? 'Free' : `${selected.toilet.fee} €`} />
                ) : null}
                {selected.toilet.payment ? <DetailRow label="Payment" value={selected.toilet.payment} /> : null}
                <DetailRow
                  label="Accessibility"
                  value={
                    (selected.toilet.barrierFree === true ? 'Barrier-free' :
                      selected.toilet.barrierFree === false ? 'Not barrier-free' : 'Unknown') +
                    (selected.toilet.barrierReduced != null
                      ? selected.toilet.barrierReduced ? ' · Accessible (reduced)' : ' · Not barrier-reduced'
                      : '')
                  }
                />
                {selected.toilet.hasChangingTable != null ? (
                  <DetailRow label="Baby-changing table" value={selected.toilet.hasChangingTable ? 'Yes' : 'No'} />
                ) : null}
                {selected.toilet.operator ? <DetailRow label="Operator" value={selected.toilet.operator} /> : null}
              </View>
            ) : null}

            {/* Bathing spot details */}
            {selected.type === 'bathing' && selected.bathing ? (
              <View style={styles.detailsCard}>
                {selected.bathing.waterQuality ? <DetailRow label="Water quality" value={selected.bathing.waterQuality} /> : null}
                {selected.bathing.cyanobacteria ? <DetailRow label="Cyanobacteria" value={selected.bathing.cyanobacteria} /> : null}
                {selected.bathing.season ? <DetailRow label="Season" value={selected.bathing.season} /> : null}
                {selected.bathing.district ? <DetailRow label="District" value={selected.bathing.district} /> : null}
              </View>
            ) : null}

            {/* Cool space details */}
            {selected.type === 'coolSpace' && selected.coolSpace ? (
              <View style={styles.detailsCard}>
                {selected.coolSpace.spaceType ? <DetailRow label="Type" value={selected.coolSpace.spaceType} /> : null}
                {selected.coolSpace.hours ? <DetailRow label="Hours" value={selected.coolSpace.hours} /> : null}
                {selected.coolSpace.wheelchairAccessible != null ? (
                  <DetailRow label="Accessible" value={selected.coolSpace.wheelchairAccessible ? 'Yes' : 'No'} />
                ) : null}
                {selected.coolSpace.district ? <DetailRow label="District" value={selected.coolSpace.district} /> : null}
              </View>
            ) : null}

            {/* BBQ area details */}
            {selected.type === 'bbq' && selected.bbq ? (
              <View style={styles.detailsCard}>
                {selected.bbq.fee ? <DetailRow label="Fee" value={selected.bbq.fee} /> : null}
                {selected.bbq.rules ? <DetailRow label="Rules" value={selected.bbq.rules} /> : null}
                {selected.bbq.bookingUrl ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking</Text>
                    <View style={styles.detailValueContainer}>
                      <Pressable
                        onPress={() => handleOpenUrl(selected.bbq!.bookingUrl!)}
                        accessibilityRole="link"
                        style={styles.linkRow}
                      >
                        <Text style={[styles.detailValue, styles.link]} numberOfLines={1}>Book online</Text>
                        <Feather name="external-link" size={14} color="#1d4ed8" />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {selected.bbq.district ? <DetailRow label="District" value={selected.bbq.district} /> : null}
              </View>
            ) : null}

            {/* Bike repair details */}
            {selected.type === 'bikeRepair' && selected.bikeRepair ? (
              <View style={styles.detailsCard}>
                {selected.bikeRepair.stationType ? <DetailRow label="Type" value={selected.bikeRepair.stationType} /> : null}
                {selected.bikeRepair.district ? <DetailRow label="District" value={selected.bikeRepair.district} /> : null}
              </View>
            ) : null}

            {/* EV charging details */}
            {selected.type === 'evCharging' && selected.evCharging ? (
              <View style={styles.detailsCard}>
                {selected.evCharging.connectorTypes ? <DetailRow label="Connectors" value={selected.evCharging.connectorTypes} /> : null}
                {selected.evCharging.powerKw != null ? <DetailRow label="Power" value={`${selected.evCharging.powerKw} kW`} /> : null}
                {selected.evCharging.operator ? <DetailRow label="Operator" value={selected.evCharging.operator} /> : null}
                {selected.evCharging.isPublic != null ? (
                  <DetailRow label="Access" value={selected.evCharging.isPublic ? 'Public' : 'Private'} />
                ) : null}
                {selected.evCharging.address ? <DetailRow label="Address" value={selected.evCharging.address} /> : null}
              </View>
            ) : null}

            {/* Playground details */}
            {selected.type === 'playground' && selected.playground ? (
              <View style={styles.detailsCard}>
                {selected.playground.area != null ? <DetailRow label="Area" value={`${selected.playground.area} m²`} /> : null}
                {selected.playground.equipment ? <DetailRow label="Equipment" value={selected.playground.equipment} /> : null}
                {selected.playground.district ? <DetailRow label="District" value={selected.playground.district} /> : null}
              </View>
            ) : null}

            {/* Community status */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Community Status</Text>
                {communityStatus.loading ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
                    <ActivityIndicator size="small" color="#616161" />
                  </View>
                ) : communityStatus.status ? (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(communityStatus.status).backgroundColor }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusBadgeColor(communityStatus.status).textColor }]}>
                      {getStatusBadgeText(communityStatus.status)}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#616161' }]}>{communityStatus.error ? 'Unavailable' : 'No reports yet'}</Text>
                  </View>
                )}
              </View>
              {communityStatus.error && isOnline ? (
                <Pressable onPress={communityStatus.refresh} accessibilityRole="button" accessibilityLabel="Retry community status">
                  <Text style={styles.statusHint}>{communityStatus.error} Tap to retry.</Text>
                </Pressable>
              ) : !isOnline ? (
                <Text style={styles.statusHint}>Voting is available only while online.</Text>
              ) : !hasReports && !communityStatus.loading ? (
                <Text style={styles.statusHint}>Help others - report current status</Text>
              ) : communityStatus.loading ? (
                <Text style={styles.statusHint}> </Text>
              ) : null}
              <View style={styles.voteRow}>
                <Pressable
                  style={[
                    styles.voteButton,
                    (hasReports || myVote === 'working') ? styles.voteYes : styles.voteButtonMuted,
                    myVote === 'working' && styles.voteSelectedYes,
                  ]}
                  accessibilityRole="button"
                  disabled={votingDisabled}
                  onPress={() => {
                    lightImpact();
                    if (selected) {
                      communityStatus.submitReport('working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0],
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text style={[
                      styles.voteText,
                      !hasReports && myVote !== 'working' && styles.voteTextMuted,
                      myVote === 'working' && styles.voteTextSelected,
                    ]}>
                      {voteLabels.positive}
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#047857" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text style={[
                        styles.voteCount,
                        !hasReports && myVote !== 'working' && styles.voteCountMuted,
                        myVote === 'working' && styles.voteCountSelected,
                      ]}>
                        {workingCount}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  style={[
                    styles.voteButton,
                    (hasReports || myVote === 'not_working') ? styles.voteNo : styles.voteButtonMuted,
                    myVote === 'not_working' && styles.voteSelectedNo,
                  ]}
                  accessibilityRole="button"
                  disabled={votingDisabled}
                  onPress={() => {
                    lightImpact();
                    if (selected) {
                      communityStatus.submitReport('not_working', {
                        lat: selected.coordinates[1],
                        lng: selected.coordinates[0],
                      });
                    }
                  }}
                >
                  <View style={styles.voteButtonContent}>
                    <Text style={[
                      styles.voteText,
                      !hasReports && myVote !== 'not_working' && styles.voteTextMuted,
                      myVote === 'not_working' && styles.voteTextSelected,
                    ]}>
                      {voteLabels.negative}
                    </Text>
                    {communityStatus.submitting ? (
                      <ActivityIndicator size="small" color="#b91c1c" style={{ marginLeft: 4 }} />
                    ) : (
                      <Text style={[
                        styles.voteCount,
                        !hasReports && myVote !== 'not_working' && styles.voteCountMuted,
                        myVote === 'not_working' && styles.voteCountSelected,
                      ]}>
                        {notWorkingCount}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Actions: Navigate (primary), Share + Copy (icon squares) */}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.primaryAction]}
                accessibilityRole="button"
                accessibilityLabel="Navigate"
                onPress={onNavigate}
              >
                <View style={styles.actionContent}>
                  <Feather name="navigation" size={17} color="#ffffff" />
                  <Text style={styles.actionText}>Navigate</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.iconAction}
                accessibilityRole="button"
                accessibilityLabel="Share"
                onPress={handleShare}
              >
                <Feather name="share-2" size={18} color="#1E293B" />
              </Pressable>
              <Pressable
                style={styles.iconAction}
                accessibilityRole="button"
                accessibilityLabel="Copy link"
                onPress={handleCopy}
              >
                <Feather name="copy" size={18} color="#1E293B" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

/** Simple detail row helper */
function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useDetailStyles();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  sheetContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 26 },
  sheetHandle: { backgroundColor: '#DDE3EA', width: 38, height: 5, borderRadius: 3 },
  headerSection: { marginBottom: 2, gap: 7 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typePillText: { fontWeight: '800', fontSize: 11.5, color: '#ffffff', letterSpacing: 0.4 },
  title: { fontSize: 23, fontWeight: '800', color: '#0F172A', lineHeight: 27, letterSpacing: -0.5, marginTop: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: '#64748B', fontSize: 13, flexShrink: 1 },
  distanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: palette.blueSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9, alignSelf: 'flex-start',
  },
  distanceText: { color: palette.blue, fontWeight: '700', fontSize: 13 },
  favButton: {
    height: 38, width: 38, borderRadius: 19,
    borderWidth: 1, borderColor: '#E7EBF0',
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  favButtonActive: { backgroundColor: palette.starSoft, borderColor: palette.starBorder },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13, marginBottom: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { color: '#1E293B', fontWeight: '600', fontSize: 12 },
  detailsCard: {
    backgroundColor: '#F6F8FB', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 2,
    marginTop: 15, borderWidth: 1, borderColor: '#EDF1F5',
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDF1F5' },
  detailLabel: { width: 110, color: '#64748B', fontWeight: '600', fontSize: 13 },
  detailValueContainer: { flex: 1, alignItems: 'flex-start', gap: 4 },
  detailValue: { color: '#0F172A', fontSize: 13.5, lineHeight: 19 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { color: palette.blue, fontWeight: '600' },
  statusCard: { backgroundColor: '#F6F8FB', borderRadius: 16, padding: 15, marginTop: 14, gap: 11, borderWidth: 1, borderColor: '#EDF1F5' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontWeight: '800', fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  statusHint: { color: '#94A3B8', fontSize: 11.5, textAlign: 'center' },
  voteRow: { flexDirection: 'row', gap: 9 },
  voteButton: {
    flex: 1, borderRadius: 13, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#E7EBF0',
  },
  voteButtonMuted: { backgroundColor: '#ffffff', borderColor: '#E7EBF0' },
  voteSelectedYes: { backgroundColor: palette.good, borderWidth: 0 },
  voteSelectedNo: { backgroundColor: palette.bad, borderWidth: 0 },
  voteButtonContent: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  voteYes: { backgroundColor: '#ffffff', borderColor: '#E7EBF0' },
  voteNo: { backgroundColor: '#ffffff', borderColor: '#E7EBF0' },
  voteText: { fontWeight: '700', color: '#1E293B', fontSize: 13.5 },
  voteTextMuted: { color: '#475569', fontWeight: '700' },
  voteTextSelected: { color: '#ffffff' },
  voteCount: { fontSize: 11.5, color: '#64748B', fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F1F5F9' },
  voteCountMuted: { color: '#64748b' },
  voteCountSelected: { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.25)' },
  actionsRow: { flexDirection: 'row', gap: 9, marginTop: 15 },
  actionButton: {
    flex: 1.5, height: 52, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryAction: { backgroundColor: palette.blue },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 15.5 },
  iconAction: {
    width: 52, height: 52, borderRadius: 15, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
});

function useDetailStyles() {
  const { colors } = useTheme();
  return {
    ...baseStyles,
    title: { ...baseStyles.title, color: colors.text },
    locationText: { ...baseStyles.locationText, color: colors.textSecondary },
    detailsCard: { ...baseStyles.detailsCard, backgroundColor: colors.background },
    detailLabel: { ...baseStyles.detailLabel, color: colors.textSecondary },
    detailValue: { ...baseStyles.detailValue, color: colors.text },
    statusCard: { ...baseStyles.statusCard, backgroundColor: colors.background },
    statusLabel: { ...baseStyles.statusLabel, color: colors.textSecondary },
    statusHint: { ...baseStyles.statusHint, color: colors.textSecondary },
    sheetHandle: { ...baseStyles.sheetHandle, backgroundColor: colors.textMuted },
  };
}
