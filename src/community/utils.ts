import { StatusSummary } from './store';

/**
 * Format a timestamp as relative time (e.g., "2 days ago", "just now").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 5) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) {
      return '1 month ago';
    } else if (diffMonths < 12) {
      return `${diffMonths} months ago`;
    } else {
      return 'over a year ago';
    }
  }
}

/**
 * Get the dominant status from community reports.
 */
export function getDominantStatus(status: StatusSummary): 'working' | 'not_working' | 'uncertain' {
  const { working, notWorking } = status.totals;
  const total = working + notWorking;
  
  if (total === 0) {
    return 'uncertain';
  }
  
  // Require at least 60% confidence and some minimum reports for certainty
  if (status.confidence < 0.6 || total < 2) {
    return 'uncertain';
  }
  
  return working > notWorking ? 'working' : 'not_working';
}

/**
 * Get display text for the status badge.
 */
export function getStatusBadgeText(status: StatusSummary): string {
  const dominantStatus = getDominantStatus(status);
  const { lastReport } = status;
  
  if (!lastReport) {
    return 'No reports yet';
  }
  
  const timeAgo = formatRelativeTime(lastReport.createdAt);
  
  switch (dominantStatus) {
    case 'working':
      return `✓ Working · ${timeAgo}`;
    case 'not_working':
      return `✗ Not working · ${timeAgo}`;
    case 'uncertain':
      return `? Uncertain · ${timeAgo}`;
    default:
      return `Last report · ${timeAgo}`;
  }
}

/**
 * Get CSS-style background color for status badge.
 */
export function getStatusBadgeColor(status: StatusSummary): { backgroundColor: string; textColor: string } {
  const dominantStatus = getDominantStatus(status);
  
  switch (dominantStatus) {
    case 'working':
      return { backgroundColor: '#E8F5E9', textColor: '#2E7D32' };
    case 'not_working':
      return { backgroundColor: '#FFEBEE', textColor: '#C62828' };
    case 'uncertain':
    default:
      return { backgroundColor: '#F5F5F5', textColor: '#616161' };
  }
}
