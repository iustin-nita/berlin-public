import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'community:device_id';
let deviceIdPromise: Promise<string> | undefined;

/**
 * Generate and cache a unique device identifier for community reporting.
 * This persists across app launches but resets on app reinstall.
 */
export async function getDeviceId(): Promise<string> {
  // Multiple sheets can request status during startup. Use one identity even
  // before the first storage write completes or when storage is unavailable.
  deviceIdPromise ??= loadDeviceId();
  return deviceIdPromise;
}

async function loadDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from storage
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }

    // Generate new device ID (simple random string)
    const deviceId = generateRandomId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch (error) {
    // Fallback to session-only ID if storage fails
    if (__DEV__) console.warn('[Community] Failed to access AsyncStorage for device ID', error);
    return generateRandomId();
  }
}

/**
 * Generate a random alphanumeric ID for device identification.
 */
function generateRandomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
