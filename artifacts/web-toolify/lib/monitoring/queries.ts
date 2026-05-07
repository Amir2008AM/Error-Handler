/**
 * Monitoring — Supabase Read Queries
 *
 * Used exclusively by the Telegram bot commands.
 * Every function returns null on failure — callers fall back to SQLite.
 * All queries are read-only (SELECT / RPC STABLE).
 */

import { getMonitoringClient } from './client'
import type {
  SupabaseGlobalStats, SupabaseToolStat, SupabaseError,
  SupabaseWorkerStatus, SupabaseLiveEvent, SupabaseMetric,
} from './types'

export type { SupabaseGlobalStats, SupabaseToolStat, SupabaseError, SupabaseWorkerStatus, SupabaseLiveEvent, SupabaseMetric }

// ── /stats ────────────────────────────────────────────────────────────────────

export async function queryGlobalStats(): Promise<SupabaseGlobalStats | null> {
  const client = getMonitoringClient()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('mon_global_stats')
    if (error || !data) return null
    return data as SupabaseGlobalStats
  } catch { return null }
}

// ── /tools ────────────────────────────────────────────────────────────────────

export async function queryToolStats(): Promise<SupabaseToolStat[] | null> {
  const client = getMonitoringClient()
  if (!client) return null
  try {
    const { data, error } = await client.rpc('mon_tool_stats')
    if (error || !data) return null
    return data as SupabaseToolStat[]
  } catch { return null }
}

// ── /live and /queue ──────────────────────────────────────────────────────────

export async function queryLiveEvents(windowMs = 10_000): Promise<SupabaseLiveEvent[]> {
  const client = getMonitoringClient()
  if (!client) return []
  try {
    const since = new Date(Date.now() - windowMs).toISOString()
    const { data } = await client
      .from('mon_events')
      .select('event_type, tool, status, duration_ms, session_id, timestamp')
      .gte('timestamp', since)
      .in('event_type', ['job_completed', 'job_failed', 'job_started'])
      .order('timestamp', { ascending: false })
      .limit(200)
    return (data ?? []) as SupabaseLiveEvent[]
  } catch { return [] }
}

// ── /errors ───────────────────────────────────────────────────────────────────

export async function queryRecentErrors(limit = 20): Promise<SupabaseError[]> {
  const client = getMonitoringClient()
  if (!client) return []
  try {
    const { data } = await client
      .from('mon_errors')
      .select('id, timestamp, tool, error_type, error_message, severity, session_id')
      .order('timestamp', { ascending: false })
      .limit(limit)
    return (data ?? []) as SupabaseError[]
  } catch { return [] }
}

// ── /health ───────────────────────────────────────────────────────────────────

export async function queryLatestMetric(): Promise<SupabaseMetric | null> {
  const client = getMonitoringClient()
  if (!client) return null
  try {
    const { data } = await client
      .from('mon_metrics')
      .select('cpu_usage, memory_pct, heap_used, heap_total, active_jobs, queue_depth, uptime_s, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    return (data ?? null) as SupabaseMetric | null
  } catch { return null }
}

// ── /queue ────────────────────────────────────────────────────────────────────

export async function queryWorkerStatus(): Promise<SupabaseWorkerStatus[]> {
  const client = getMonitoringClient()
  if (!client) return []
  try {
    const { data } = await client
      .from('mon_worker_status')
      .select('worker_id, worker_type, status, current_job, jobs_done, jobs_failed, last_seen')
      .order('last_seen', { ascending: false })
    return (data ?? []) as SupabaseWorkerStatus[]
  } catch { return [] }
}

// ── /users ────────────────────────────────────────────────────────────────────

export async function queryActiveSessions(windowHours = 24): Promise<{ total: number; newToday: number; top: { sessionId: string; count: number }[] }> {
  const client = getMonitoringClient()
  if (!client) return { total: 0, newToday: 0, top: [] }
  try {
    const since24h = new Date(Date.now() - windowHours * 3_600_000).toISOString()
    const { data } = await client
      .from('mon_live_sessions')
      .select('session_id, request_count, started_at, last_active')
      .gte('last_active', since24h)
      .order('request_count', { ascending: false })
    if (!data) return { total: 0, newToday: 0, top: [] }
    const since1d = new Date(Date.now() - 86_400_000).toISOString()
    const newToday = data.filter((s) => s.started_at >= since1d).length
    return {
      total:    data.length,
      newToday,
      top: data.slice(0, 5).map((s) => ({ sessionId: s.session_id, count: s.request_count })),
    }
  } catch { return { total: 0, newToday: 0, top: [] } }
}

// ── Connectivity probe ────────────────────────────────────────────────────────

export async function pingSupabase(): Promise<boolean> {
  const client = getMonitoringClient()
  if (!client) return false
  try {
    const { error } = await client.from('mon_metrics').select('id').limit(1)
    return !error
  } catch { return false }
}
