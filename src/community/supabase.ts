import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl: string | undefined = (Constants.expoConfig?.extra as any)?.supabaseUrl;
const supabaseAnonKey: string | undefined = (Constants.expoConfig?.extra as any)?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep a soft error to allow local (AsyncStorage) fallback
  if (__DEV__) console.warn('[Supabase] Missing supabaseUrl/supabaseAnonKey in app.config.ts extra. Falling back to local store.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : null;

export type DatabaseReport = {
  id: string;
  feature_id: string;
  status: 'working' | 'not_working';
  device_id: string;
  created_at: string;
  lat?: number;
  lng?: number;
  app_version?: string;
};


