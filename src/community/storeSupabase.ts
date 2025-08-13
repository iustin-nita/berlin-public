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
      .insert({
        feature_id: featureId,
        status,
        device_id: deviceId,
        lat: coordinates?.lat,
        lng: coordinates?.lng,
      });

    if (error) {
      // 23505 unique_violation used in trigger to indicate cooldown
      if (error.code === '23505' || /Cooldown/i.test(error.message)) {
        return { success: false, error: 'You reported this recently. Try again later or change your vote.' };
      }
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
    if (!supabase) return { totals: { working: 0, notWorking: 0 }, confidence: 0 };

    const deviceId = await getDeviceId();
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('feature_id', featureId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.warn('[Community] Supabase get status error', error);
      return { totals: { working: 0, notWorking: 0 }, confidence: 0 };
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
      totals: { working: Math.round(workingWeight), notWorking: Math.round(notWorkingWeight) },
      lastReport,
      myVote,
      confidence,
    };
  } catch (e) {
    if (__DEV__) console.warn('[Community] Supabase get status error', e);
    return { totals: { working: 0, notWorking: 0 }, confidence: 0 };
  }
}


