export type ReportStatus = 'working' | 'not_working';

export interface Report {
  id: string;
  featureId: string;
  status: ReportStatus;
  deviceId: string;
  createdAt: number; // timestamp
  lat?: number;
  lng?: number;
}

export interface StatusSummary {
  totals: {
    working: number;
    notWorking: number;
  };
  lastReport?: {
    status: ReportStatus;
    createdAt: number;
  };
  myVote?: ReportStatus;
  confidence: number; // 0-1, how confident we are in the status
}

// Community reports must reach the shared backend; local-only writes cannot
// truthfully be shown as shared votes. A missing service returns an error.
export { getStatus, submitReport } from './storeSupabase';
