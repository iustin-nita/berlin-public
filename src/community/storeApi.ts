import Constants from 'expo-constants';
import { getDeviceId } from './deviceId';
import type { ReportStatus, StatusSummary } from './store';

const REQUEST_TIMEOUT_MS = 10000;

function serviceUrl(path: string): string {
  const baseUrl: unknown = Constants.expoConfig?.extra?.communityApiUrl;
  if (typeof baseUrl !== 'string' || !/^https:\/\//.test(baseUrl)) throw new Error('Community service is not configured');
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const deviceId = await getDeviceId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(serviceUrl(path), {
      ...options,
      headers: { 'X-Device-ID': deviceId, ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a minute before trying again.' : 'Community service temporarily unavailable');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

function isStatus(value: unknown): value is ReportStatus {
  return value === 'working' || value === 'not_working';
}

function isSummary(value: unknown): value is StatusSummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as StatusSummary;
  return !!summary.totals &&
    Number.isSafeInteger(summary.totals.working) && summary.totals.working >= 0 &&
    Number.isSafeInteger(summary.totals.notWorking) && summary.totals.notWorking >= 0 &&
    Number.isFinite(summary.confidence) && summary.confidence >= 0 && summary.confidence <= 1 &&
    (summary.myVote === undefined || isStatus(summary.myVote)) &&
    (summary.lastReport === undefined || (isStatus(summary.lastReport.status) && Number.isFinite(summary.lastReport.createdAt)));
}

export async function submitReport(
  featureId: string,
  status: ReportStatus,
  coordinates?: { lat: number; lng: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await request('/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId, status, coordinates }),
    });
    if (!result || typeof result !== 'object' || (result as { success?: unknown }).success !== true) throw new Error('Invalid response');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error && error.message === 'Please wait a minute before trying again.'
      ? error.message : 'Failed to save report. Please try again.';
    return { success: false, error: message };
  }
}

export async function getStatus(featureId: string): Promise<StatusSummary> {
  try {
    const result = await request(`/v1/status?featureId=${encodeURIComponent(featureId)}`);
    if (!isSummary(result)) throw new Error('Invalid response');
    return result;
  } catch { throw new Error('Community status could not be loaded'); }
}
