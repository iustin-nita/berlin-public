import {
  formatRelativeTime,
  getDominantStatus,
  getStatusBadgeColor,
  getStatusBadgeText,
} from './utils';
import type { StatusSummary } from './store';

describe('community utils', () => {
  const now = new Date('2026-03-14T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats recent timestamps as just now', () => {
    expect(formatRelativeTime(now - 4 * 60 * 1000)).toBe('just now');
  });

  it('formats multi-day timestamps', () => {
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('3 days ago');
  });

  it('returns uncertain when confidence is too low', () => {
    const status: StatusSummary = {
      totals: { working: 5, notWorking: 3 },
      confidence: 0.4,
    };

    expect(getDominantStatus(status)).toBe('uncertain');
  });

  it('builds a working badge when reports are confident', () => {
    const status: StatusSummary = {
      totals: { working: 4, notWorking: 1 },
      confidence: 0.8,
      lastReport: {
        status: 'working',
        createdAt: now - 10 * 60 * 1000,
      },
    };

    expect(getStatusBadgeText(status)).toBe('✓ Working · 10 min ago');
    expect(getStatusBadgeColor(status)).toEqual({
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    });
  });

  it('builds an uncertain badge when there is only one report', () => {
    const status: StatusSummary = {
      totals: { working: 1, notWorking: 0 },
      confidence: 1,
      lastReport: {
        status: 'working',
        createdAt: now - 60 * 60 * 1000,
      },
    };

    expect(getStatusBadgeText(status)).toBe('? Uncertain · 1h ago');
  });
});
