import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig, type SupabasePublicConfig } from './auth-state';

export function createBrowserSupabaseClient(config: SupabasePublicConfig = getRequiredSupabasePublicConfig()) {
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export function getBrowserSupabasePublicConfig(): SupabasePublicConfig | null {
  return getSupabasePublicConfig(import.meta.env);
}

function getRequiredSupabasePublicConfig(): SupabasePublicConfig {
  const config = getBrowserSupabasePublicConfig();
  if (!config) {
    throw new Error('Supabase public config is not available.');
  }

  return config;
}

