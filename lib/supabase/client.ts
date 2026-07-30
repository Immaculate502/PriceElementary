'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config'

/**
 * Browser Supabase client. Returns null when the integration is not
 * connected so client components can degrade gracefully to demo mode.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export { isSupabaseConfigured }
