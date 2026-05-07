export type EventType =
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'upload_received'
  | 'worker_crashed'
  | 'queue_stalled'
  | 'timeout_detected'
  | 'memory_warning'
  | 'api_exception'
  | 'cleanup_completed'

export interface MonitoringEvent {
  timestamp?:     string
  event_type:     EventType
  tool?:          string | null
  status?:        string | null
  duration_ms?:   number | null
  file_size?:     number | null
  memory_usage?:  number | null
  cpu_usage?:     number | null
  worker_id?:     string | null
  request_id?:    string | null
  session_id?:    string | null
  error_message?: string | null
  metadata?:      Record<string, unknown>
}

export interface MetricSnapshot {
  cpu_usage:    number
  memory_used:  number
  memory_total: number
  memory_pct:   number
  heap_used:    number
  heap_total:   number
  active_jobs:  number
  queue_depth:  number
  uptime_s:     number
}

export interface WorkerStatusUpdate {
  worker_id:    string
  worker_type:  string
  status:       'idle' | 'busy' | 'crashed' | 'paused'
  current_job?: string | null
  jobs_done?:   number
  jobs_failed?: number
}

export interface SupabaseGlobalStats {
  total_jobs:     number
  total_success:  number
  total_failed:   number
  avg_duration:   number
  online_now:     number
  jobs_today:     number
  total_sessions: number
  success_rate:   number
}

export interface SupabaseToolStat {
  tool:         string
  total:        number
  success:      number
  avg_ms:       number
  success_rate: number
}

export interface SupabaseError {
  id:            number
  timestamp:     string
  tool:          string | null
  error_type:    string | null
  error_message: string | null
  severity:      string
  session_id:    string | null
}

export interface SupabaseWorkerStatus {
  worker_id:   string
  worker_type: string
  status:      string
  current_job: string | null
  jobs_done:   number
  jobs_failed: number
  last_seen:   string
}

export interface SupabaseLiveEvent {
  event_type:  string
  tool:        string | null
  status:      string | null
  duration_ms: number | null
  session_id:  string | null
  timestamp:   string
}

export interface SupabaseMetric {
  cpu_usage:    number | null
  memory_pct:   number | null
  heap_used:    number | null
  heap_total:   number | null
  active_jobs:  number | null
  queue_depth:  number | null
  uptime_s:     number | null
  timestamp:    string
}
