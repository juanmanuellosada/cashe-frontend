import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Session configuration
export const SESSION_CONFIG = {
  // Inactivity timeout in milliseconds (30 minutes)
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,
  // Warning before logout in milliseconds (5 minutes before)
  WARNING_BEFORE_LOGOUT: 5 * 60 * 1000,
  // Session check interval (every 1 minute)
  SESSION_CHECK_INTERVAL: 60 * 1000,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use PKCE flow for better security
    flowType: 'pkce',
    // Storage key for session
    storageKey: 'cashe-auth',
  },
});
