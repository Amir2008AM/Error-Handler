/**
 * Job Status API Route
 * Get job status and cancel/delete pending jobs.
 *
 * Supports two backends:
 *   - BullMQ jobs (prefixed `bq-<group>-<id>`) → queried from Redis
 *   - In-memory jobs (plain nanoid)             → queried from JobManager
 *
 * Rate limited: 120 status polls per minute per IP.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobManager } from '@/lib/queue'
import { applyRateLimit, JOB_STATUS_LIMIT } from '@/lib/middleware/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = applyRateLimit(request, JOB_STATUS_LIMIT, 'job-status')
  if (rateLimited) return rateLimited

  try {
    const { id } = await params

    // ── BullMQ job (id starts with 'bq-') ──
    if (id.startsWith('bq-') && process.env.REDIS_URL) {
      const { getBullMQJobStatus } = await import('@/lib/queue/bullmq-backend')
      const status = await getBullMQJobStatus(id).catch(() => null)
      if (status) return NextResponse.json(status)
      return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 })
    }

    // ── In-memory job ──
    const manager = getJobManager()
    const status = manager.getJobStatus(id)
    if (!status) {
      return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 })
    }
    return NextResponse.json(status)

  } catch (error) {
    console.error('[jobs/:id GET]', error)
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // BullMQ jobs: cancel by removing from queue (best-effort)
    if (id.startsWith('bq-') && process.env.REDIS_URL) {
      return NextResponse.json({ success: true, message: 'BullMQ job cancellation not supported; job will complete normally.' })
    }

    const manager = getJobManager()
    const job = manager.getJob(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 })
    }

    if (job.status === 'pending' || job.status === 'processing') {
      const cancelled = manager.cancelJob(id)
      if (!cancelled) return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Job cancelled' })
    }

    const deleted = await manager.deleteJob(id)
    if (!deleted) return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
    return NextResponse.json({ success: true, message: 'Job deleted' })

  } catch (error) {
    console.error('[jobs/:id DELETE]', error)
    return NextResponse.json({ error: 'Failed to cancel/delete job' }, { status: 500 })
  }
}
