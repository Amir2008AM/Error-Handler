/**
 * Monitoring — Supabase Client
 *
 * Single lazy-initialised client for the monitoring/observability layer.
 * The main website NEVER imports this — only lib/monitoring/* uses it.
 *
 * Safe-fail: if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing or
 * the client fails to construct, getMonitoringClient() returns null and
 * all callers silently skip their write.
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client:  SupabaseClient | null = null
let _checked: boolean               = false
let _enabled: boolean               = false

export function getMonitoringClient(): SupabaseClient | null {
  if (_checked) return _enabled ? _client : null
  _checked = true

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn('[Monitoring] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase monitoring disabled')
    return null
  }

  try {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    _enabled = true
    console.log('[Monitoring] ✅ Supabase monitoring client ready')
    return _client
  } catch (err) {
    console.warn('[Monitoring] Supabase client failed to init:', (err as Error).message)
    return null
  }
}

export function isMonitoringEnabled(): boolean {
  if (!_checked) getMonitoringClient()
  return _enabled
}
