import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { ReportStatus, StatusSummary, getStatus, submitReport } from './store';

interface CommunityStatusHook {
  status: StatusSummary | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  submitReport: (reportStatus: ReportStatus, coordinates?: { lat: number; lng: number }) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing community status data and report submissions.
 */
export function useCommunityStatus(featureId: string | null): CommunityStatusHook {
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load status data for the current feature
  const loadStatus = useCallback(async () => {
    if (!featureId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const statusData = await getStatus(featureId);
      setStatus(statusData);
    } catch (err) {
      setError('Failed to load community status');
      if (__DEV__) console.warn('[Community] Failed to load status', err);
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  // Submit a new report with optimistic updates
  const handleSubmitReport = useCallback(async (
    reportStatus: ReportStatus,
    coordinates?: { lat: number; lng: number }
  ) => {
    if (!featureId || submitting) return;

    setSubmitting(true);
    setError(null);

    // Optimistic update
    const currentStatus = status || {
      totals: { working: 0, notWorking: 0 },
      confidence: 0
    };

    const optimisticStatus: StatusSummary = {
      ...currentStatus,
      totals: {
        working: reportStatus === 'working' 
          ? currentStatus.totals.working + 1 
          : currentStatus.totals.working,
        notWorking: reportStatus === 'not_working' 
          ? currentStatus.totals.notWorking + 1 
          : currentStatus.totals.notWorking
      },
      lastReport: {
        status: reportStatus,
        createdAt: Date.now()
      },
      myVote: reportStatus
    };

    setStatus(optimisticStatus);

    try {
      const result = await submitReport(featureId, reportStatus, coordinates);
      
      if (!result.success) {
        // Revert optimistic update and show error
        setStatus(currentStatus);
        setError(result.error || 'Failed to submit report');
        
        if (result.error?.includes('recently')) {
          Toast.show({
            type: 'info',
            text1: 'Report Cooldown',
            text2: result.error,
            position: 'top',
            visibilityTime: 4000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: result.error || 'Failed to submit report. Please try again.',
            position: 'top',
            visibilityTime: 4000,
          });
        }
        return;
      }

      // Reload actual status after successful submission
      await loadStatus();
      
      // Show success feedback
      Toast.show({
        type: 'success',
        text1: 'Report Submitted',
        text2: `Thank you for reporting this ${reportStatus === 'working' ? 'working' : 'broken'} ${featureId.includes('toilet') ? 'toilet' : 'fountain'}!`,
        position: 'top',
        visibilityTime: 3000,
      });
      
    } catch (err) {
      // Revert optimistic update
      setStatus(currentStatus);
      setError('Network error. Please try again.');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to submit report. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
      
      if (__DEV__) console.warn('[Community] Failed to submit report', err);
    } finally {
      setSubmitting(false);
    }
  }, [featureId, status, submitting, loadStatus]);

  // Load status when featureId changes
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    status,
    loading,
    submitting,
    error,
    submitReport: handleSubmitReport,
    refresh: loadStatus
  };
}
