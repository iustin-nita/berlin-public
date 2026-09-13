import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner-native';
import { ReportStatus, StatusSummary, getStatus, submitReport } from './store';

type CommunityState = {
  featureId: string | null;
  status: StatusSummary | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
};

export function useCommunityStatus(featureId: string | null) {
  const currentId = useRef(featureId);
  currentId.current = featureId;
  const sequence = useRef(0);
  const pending = useRef(new Set<string>());
  const [state, setState] = useState<CommunityState>({
    featureId, status: null, loading: Boolean(featureId), submitting: false, error: null,
  });

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!featureId) {
      setState({ featureId, status: null, loading: false, submitting: false, error: null });
      return;
    }
    setState((previous) => ({
      featureId,
      status: previous.featureId === featureId ? previous.status : null,
      loading: true, submitting: pending.current.has(featureId), error: null,
    }));
    try {
      const status = await getStatus(featureId);
      if (request === sequence.current && currentId.current === featureId) {
        setState((previous) => ({ ...previous, status, loading: false }));
      }
    } catch {
      if (request === sequence.current && currentId.current === featureId) {
        setState((previous) => ({ ...previous, loading: false, error: 'Community status is unavailable. Please try again.' }));
      }
    }
  }, [featureId]);

  useEffect(() => {
    refresh();
    return () => { sequence.current += 1; };
  }, [refresh]);

  const handleSubmit = useCallback(async (
    reportStatus: ReportStatus,
    coordinates?: { lat: number; lng: number },
  ) => {
    if (!featureId || pending.current.has(featureId)) return;
    pending.current.add(featureId);
    setState((previous) => ({ ...previous, submitting: true, error: null }));
    try {
      const result = await submitReport(featureId, reportStatus, coordinates);
      if (!result.success) throw new Error(result.error || 'Could not save your report.');
      if (currentId.current === featureId) {
        await refresh();
        toast.success('Report saved', { description: 'Thank you for sharing the current status of this amenity.' });
      }
    } catch (error) {
      if (currentId.current === featureId) {
        const message = error instanceof Error ? error.message : 'Could not save your report. Please try again.';
        setState((previous) => ({ ...previous, error: message }));
        toast.error('Report not saved', { description: message });
      }
    } finally {
      pending.current.delete(featureId);
      if (currentId.current === featureId) setState((previous) => ({ ...previous, submitting: false }));
    }
  }, [featureId, refresh]);

  const visible = state.featureId === featureId ? state : {
    featureId, status: null, loading: Boolean(featureId), submitting: false, error: null,
  };
  return { ...visible, refresh, submitReport: handleSubmit };
}
