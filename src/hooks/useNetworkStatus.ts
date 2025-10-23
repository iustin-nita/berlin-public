import { useState, useEffect } from 'react';

/**
 * Hook for detecting network connectivity status
 * Returns true when online, false when offline
 *
 * Note: This is a simple implementation. For production, consider using
 * @react-native-community/netinfo for more accurate detection
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Simple connectivity check using fetch with timeout
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    // Check immediately
    checkConnection();

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return isOnline;
}
