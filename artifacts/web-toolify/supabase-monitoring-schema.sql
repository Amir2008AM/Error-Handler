-- ══════════════════════════════════════════════════════════════════════════════
-- Web Toolify — Monitoring Schema
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Events (central event log) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mon_events (
  id            bigserial    PRIMARY KEY,
  timestamp     timestamptz  NOT NULL DEFAULT now(),
  event_type    text         NOT NULL,
  tool          text,
  status        text,
  duration_ms   integer,
  file_size     bigint,
  memory_usage  bigint,
  cpu_usage     real,
  worker_id     text,
  request_id    text,
  session_id    text,
  error_message text,
  metadata      jsonb        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS mon_events_ts_idx      ON public.mon_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS mon_events_type_idx    ON public.mon_events(event_type);
CREATE INDEX IF NOT EXISTS mon_events_tool_idx    ON public.mon_events(tool);
CREATE INDEX IF NOT EXISTS mon_events_session_idx ON public.mon_events(session_id);
CREATE INDEX IF NOT EXISTS mon_events_status_idx  ON public.mon_events(status);

-- ── System metrics snapshots ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mon_metrics (
  id           bigserial    PRIMARY KEY,
  timestamp    timestamptz  NOT NULL DEFAULT now(),
  cpu_usage    real,
  memory_used  bigint,
  memory_total bigint,
  memory_pct   real,
  heap_used    bigint,
  heap_total   bigint,
  active_jobs  integer      NOT NULL DEFAULT 0,
  queue_depth  integer      NOT NULL DEFAULT 0,
  uptime_s     integer
);

CREATE INDEX IF NOT EXISTS mon_metrics_ts_idx ON public.mon_metrics(timestamp DESC);

-- ── Errors (enriched error log) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mon_errors (
  id            bigserial    PRIMARY KEY,
  timestamp     timestamptz  NOT NULL DEFAULT now(),
  tool          text,
  error_type    text,
  error_message text,
  severity      text         NOT NULL DEFAULT 'medium',
  session_id    text,
  request_id    text,
  metadata      jsonb        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS mon_errors_ts_idx       ON public.mon_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS mon_errors_tool_idx     ON public.mon_errors(tool);
CREATE INDEX IF NOT EXISTS mon_errors_severity_idx ON public.mon_errors(severity);

-- ── Worker status (upsert by worker_id) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mon_worker_status (
  worker_id    text         PRIMARY KEY,
  worker_type  text         NOT NULL,
  status       text         NOT NULL DEFAULT 'idle',
  current_job  text,
  jobs_done    integer      NOT NULL DEFAULT 0,
  jobs_failed  integer      NOT NULL DEFAULT 0,
  started_at   timestamptz  NOT NULL DEFAULT now(),
  last_seen    timestamptz  NOT NULL DEFAULT now()
);

-- ── Live sessions (upsert by session_id) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mon_live_sessions (
  session_id    text         PRIMARY KEY,
  tool          text,
  status        text         NOT NULL DEFAULT 'active',
  started_at    timestamptz  NOT NULL DEFAULT now(),
  last_active   timestamptz  NOT NULL DEFAULT now(),
  request_count integer      NOT NULL DEFAULT 1,
  metadata      jsonb        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS mon_live_sessions_la_idx ON public.mon_live_sessions(last_active DESC);

-- ── RLS (server-only — no public access) ─────────────────────────────────────
ALTER TABLE public.mon_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_errors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_worker_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mon_live_sessions ENABLE ROW LEVEL SECURITY;

-- ── Aggregation RPCs ──────────────────────────────────────────────────────────
-- Used by the Telegram bot commands (/stats, /tools) for efficient queries.

CREATE OR REPLACE FUNCTION public.mon_global_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_jobs',      COUNT(*)         FILTER (WHERE event_type IN ('job_completed','job_failed')),
    'total_success',   COUNT(*)         FILTER (WHERE event_type = 'job_completed'),
    'total_failed',    COUNT(*)         FILTER (WHERE event_type = 'job_failed'),
    'avg_duration',    COALESCE(ROUND(AVG(duration_ms) FILTER (WHERE event_type IN ('job_completed','job_failed') AND duration_ms IS NOT NULL))::integer, 0),
    'online_now',      COUNT(DISTINCT session_id) FILTER (WHERE timestamp > now() - interval '10 seconds' AND session_id IS NOT NULL),
    'jobs_today',      COUNT(*)         FILTER (WHERE event_type IN ('job_completed','job_failed') AND timestamp > now() - interval '24 hours'),
    'total_sessions',  COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL),
    'success_rate',    CASE WHEN COUNT(*) FILTER (WHERE event_type IN ('job_completed','job_failed')) = 0 THEN 100
                            ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'job_completed')
                                 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('job_completed','job_failed')), 0), 1)
                       END
  )
  FROM public.mon_events
$$;

CREATE OR REPLACE FUNCTION public.mon_tool_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT
      tool,
      COUNT(*)                                                                                AS total,
      COUNT(*) FILTER (WHERE event_type = 'job_completed')                                   AS success,
      COALESCE(ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL))::integer, 0)   AS avg_ms,
      CASE WHEN COUNT(*) = 0 THEN 100
           ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'job_completed') / COUNT(*), 1)
      END AS success_rate
    FROM public.mon_events
    WHERE event_type IN ('job_completed','job_failed') AND tool IS NOT NULL
    GROUP BY tool
    ORDER BY total DESC
    LIMIT 15
  ) t
$$;

-- Live-session upsert with counter increment
CREATE OR REPLACE FUNCTION public.mon_upsert_session(p_session_id text, p_tool text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.mon_live_sessions (session_id, tool, last_active)
  VALUES (p_session_id, p_tool, now())
  ON CONFLICT (session_id) DO UPDATE
    SET last_active   = now(),
        tool          = COALESCE(p_tool, mon_live_sessions.tool),
        request_count = mon_live_sessions.request_count + 1;
END;
$$;

-- ── Optional auto-cleanup (requires pg_cron extension) ───────────────────────
-- Enable pg_cron: Database → Extensions → pg_cron → Enable
-- Then run:
--
-- SELECT cron.schedule('mon-cleanup', '0 3 * * *', $$
--   DELETE FROM public.mon_events        WHERE timestamp    < now() - interval '30 days';
--   DELETE FROM public.mon_metrics       WHERE timestamp    < now() - interval '30 days';
--   DELETE FROM public.mon_errors        WHERE timestamp    < now() - interval '30 days';
--   DELETE FROM public.mon_live_sessions WHERE last_active  < now() - interval '7 days';
-- $$);
