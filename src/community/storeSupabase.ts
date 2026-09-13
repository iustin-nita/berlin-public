import { supabase } from './supabase';
import { getDeviceId } from './deviceId';
import type { ReportStatus, StatusSummary } from './store';

function calculateDecayWeight(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-Math.LN2 * ageDays / 14);
}

export async function submitReport(
  featureId: string,
  status: ReportStatus,
  coordinates?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    const deviceId = await getDeviceId();
    const { error } = await supabase
      .from('reports')
      .upsert(
        {
          feature_id: featureId,
          status,
          device_id: deviceId,
          created_at: new Date().toISOString(),
          lat: coordinates?.lat,
          lng: coordinates?.lng,
        },
        { onConflict: 'feature_id,device_id' }
      );

    if (error) {
      if (__DEV__) console.warn(`[Community] Supabase submit error: ${error.code} – ${error.message} (hint: ${error.hint ?? 'none'})`);
      return { success: false, error: 'Failed to save report. Please try again.' };
    }

    return { success: true };
  } catch (e) {
    if (__DEV__) console.warn('[Community] Supabase submit error', e);
    return { success: false, error: 'Failed to save report. Please try again.' };
  }
}

export async function getStatus(featureId: string): Promise<StatusSummary> {
  try {
    if (!supabase) throw new Error('Community service is not configured');

    const deviceId = await getDeviceId();
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('feature_id', featureId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.warn(`[Community] Supabase get status error: ${error.code} – ${error.message} (hint: ${error.hint ?? 'none'})`);
      throw new Error('Community status could not be loaded');
    }

    const reports = data ?? [];
    if (reports.length === 0) return { totals: { working: 0, notWorking: 0 }, confidence: 0 };

    let workingWeight = 0;
    let notWorkingWeight = 0;
    let lastReport: StatusSummary['lastReport'] | undefined;
    let myVote: ReportStatus | undefined;

    for (const r of reports) {
      const weight = calculateDecayWeight(r.created_at);
      if (r.status === 'working') workingWeight += weight; else notWorkingWeight += weight;
      if (!lastReport) lastReport = { status: r.status as ReportStatus, createdAt: new Date(r.created_at).getTime() };
      if (r.device_id === deviceId) myVote = r.status as ReportStatus;
    }

    const total = workingWeight + notWorkingWeight;
    const confidence = total > 0 ? Math.abs(workingWeight - notWorkingWeight) / total : 0;

    return {
      totals: { working: reports.filter((r) => r.status === 'working').length, notWorking: reports.filter((r) => r.status === 'not_working').length },
      lastReport,
      myVote,
      confidence,
    };
  } catch (e) {
    if (__DEV__) console.warn('[Community] Supabase get status error', e);
    throw new Error('Community status could not be loaded');
  }
}

