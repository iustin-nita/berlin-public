import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook for detecting network connectivity status
 * Returns true when online, false when offline
 *
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!mounted) return;
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}
