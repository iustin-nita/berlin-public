import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from './deviceId';
import Constants from 'expo-constants';
import * as Remote from './storeSupabase';

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

const REPORTS_KEY_PREFIX = 'community:reports:';
const SUPABASE_ENABLED = Boolean((Constants.expoConfig?.extra as any)?.supabaseUrl && (Constants.expoConfig?.extra as any)?.supabaseAnonKey);
const COOLDOWN_HOURS = 12;

/**
 * Get all reports for a specific feature from local storage.
 */
async function getReportsForFeature(featureId: string): Promise<Report[]> {
  try {
    const key = `${REPORTS_KEY_PREFIX}${featureId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.warn('[Community] Failed to load reports for feature', featureId, error);
    return [];
  }
}

/**
 * Save reports for a specific feature to local storage.
 */
async function saveReportsForFeature(featureId: string, reports: Report[]): Promise<void> {
  try {
    const key = `${REPORTS_KEY_PREFIX}${featureId}`;
    await AsyncStorage.setItem(key, JSON.stringify(reports));
  } catch (error) {
    if (__DEV__) console.warn('[Community] Failed to save reports for feature', featureId, error);
  }
}

/**
 * Calculate decay weight based on age of report.
 * Uses exponential decay with 14-day half-life.
 */
function calculateDecayWeight(createdAt: number): number {
  const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  return Math.exp(-Math.LN2 * ageDays / 14);
}

/**
 * Check if device is within cooldown period for a feature.
 */
async function isInCooldown(featureId: string, deviceId: string): Promise<boolean> {
  const reports = await getReportsForFeature(featureId);
  const cutoff = Date.now() - (COOLDOWN_HOURS * 60 * 60 * 1000);
  
  return reports.some(report => 
    report.deviceId === deviceId && report.createdAt > cutoff
  );
}

/**
 * Submit a community report for a feature.
 * Enforces per-device cooldown period.
 */
export async function submitReport(
  featureId: string, 
  status: ReportStatus,
  coordinates?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  // Prefer remote if configured
  if (SUPABASE_ENABLED) {
    return Remote.submitReport(featureId, status, coordinates);
  }
  try {
    const deviceId = await getDeviceId();
    
    // Check cooldown
    if (await isInCooldown(featureId, deviceId)) {
      return { 
        success: false, 
        error: 'You reported this recently. Try again later or change your vote.' 
      };
    }

    const reports = await getReportsForFeature(featureId);
    
    // Remove any existing report from this device
    const filteredReports = reports.filter(r => r.deviceId !== deviceId);
    
    // Add new report
    const newReport: Report = {
      id: `${deviceId}_${Date.now()}`,
      featureId,
      status,
      deviceId,
      createdAt: Date.now(),
      ...coordinates
    };
    
    filteredReports.push(newReport);
    
    // Keep only reports from last 60 days to prevent unbounded growth
    const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
    const recentReports = filteredReports.filter(r => r.createdAt > cutoff);
    
    await saveReportsForFeature(featureId, recentReports);
    
    if (__DEV__) {
      console.log('[Community] Submitted report:', { featureId, status, deviceId });
    }
    
    return { success: true };
  } catch (error) {
    if (__DEV__) console.warn('[Community] Failed to submit report', error);
    return { 
      success: false, 
      error: 'Failed to save report. Please try again.' 
    };
  }
}

/**
 * Get community status summary for a feature.
 */
export async function getStatus(featureId: string): Promise<StatusSummary> {
  // Prefer remote if configured
  if (SUPABASE_ENABLED) {
    return Remote.getStatus(featureId);
  }
  try {
    const reports = await getReportsForFeature(featureId);
    const deviceId = await getDeviceId();
    
    if (reports.length === 0) {
      return {
        totals: { working: 0, notWorking: 0 },
        confidence: 0
      };
    }
    
    // Calculate weighted totals using decay
    let workingWeight = 0;
    let notWorkingWeight = 0;
    let lastReport: StatusSummary['lastReport'] | undefined;
    let myVote: ReportStatus | undefined;
    
    // Sort by creation time (newest first) to find last report
    const sortedReports = [...reports].sort((a, b) => b.createdAt - a.createdAt);
    
    for (const report of sortedReports) {
      const weight = calculateDecayWeight(report.createdAt);
      
      if (report.status === 'working') {
        workingWeight += weight;
      } else {
        notWorkingWeight += weight;
      }
      
      // Track most recent report
      if (!lastReport || report.createdAt > lastReport.createdAt) {
        lastReport = {
          status: report.status,
          createdAt: report.createdAt
        };
      }
      
      // Track user's vote
      if (report.deviceId === deviceId) {
        myVote = report.status;
      }
    }
    
    // Calculate confidence based on difference between working/not working
    const totalWeight = workingWeight + notWorkingWeight;
    const confidence = totalWeight > 0 ? Math.abs(workingWeight - notWorkingWeight) / totalWeight : 0;
    
    return {
      totals: {
        working: Math.round(workingWeight),
        notWorking: Math.round(notWorkingWeight)
      },
      lastReport,
      myVote,
      confidence
    };
  } catch (error) {
    if (__DEV__) console.warn('[Community] Failed to get status for feature', featureId, error);
    return {
      totals: { working: 0, notWorking: 0 },
      confidence: 0
    };
  }
}
