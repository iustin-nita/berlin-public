import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 140,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  stateTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  stateText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  stateActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  stateButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stateButtonPrimary: {
    backgroundColor: '#1976D2',
  },
  stateButtonSecondary: {
    backgroundColor: '#E2E8F0',
  },
  stateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stateButtonTextSecondary: {
    color: '#1e293b',
    fontWeight: '600',
  },
  sheetContent: {
    padding: 16,
  },
  sheetHandle: {
    backgroundColor: '#E0E0E0',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typePillDrink: {
    backgroundColor: '#E3F2FD',
  },
  typePillDecor: {
    backgroundColor: '#FFF3E0',
  },
  typePillToilet: {
    backgroundColor: '#E0F2F1',
  },
  typePillText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  distanceRow: {
    marginTop: 6,
  },
  distanceText: {
    color: '#475569',
    fontWeight: '500',
  },
  favButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#707070',
    marginTop: 2,
  },
  meta: {
    color: '#4a4a4a',
  },
  link: {
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
  imageCard: {
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageText: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f2f6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipIcon: {
    fontSize: 12,
  },
  chipText: {
    color: '#334155',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  detailLabel: {
    color: '#6b7280',
    fontWeight: '600',
  },
  detailValue: {
    color: '#111827',
    flexShrink: 1,
    textAlign: 'right',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 12,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteYes: {
    backgroundColor: '#E8F5E9',
  },
  voteNo: {
    backgroundColor: '#FFEBEE',
  },
  voteText: {
    fontWeight: '700',
    color: '#334155',
  },
  voteCount: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#1976D2',
  },
  secondaryAction: {
    backgroundColor: '#E8F5E9',
  },
  actionText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryActionText: {
    color: '#2E7D32',
  },
  choiceBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 88,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  choiceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f1f4f8',
    borderRadius: 8,
    maxWidth: '48%',
  },
  choiceText: {
    color: '#102a43',
  },
  toggleBar: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  toggleItemActive: {
    backgroundColor: '#e6f0ff',
  },
  toggleText: {
    color: '#334155',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
