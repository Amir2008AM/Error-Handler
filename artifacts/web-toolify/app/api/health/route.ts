/**
 * Health & Stats Endpoint
 *
 * GET /api/health
 *
 * Returns system health, queue statistics, and storage usage.
 * Useful for monitoring, load balancers, and dashboards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobManager } from '@/lib/queue'
import { getTempStorage } from '@/lib/storage'

const startTime = Date.now()

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  try {
    const manager = getJobManager()
    const queueStats = manager.getStats()
    const storageStats = await getTempStorage().getStats()

    const uptimeMs = Date.now() - startTime
    const uptimeSec = Math.floor(uptimeMs / 1000)

    return NextResponse.json(
      {
        status: 'ok',
        version: process.env.npm_package_version ?? '1.0.0',
        uptime: {
          seconds: uptimeSec,
          human: formatUptime(uptimeSec),
        },
        queue: {
          backend: 'memory',
          redisReady: !!process.env.REDIS_URL,
          stats: queueStats,
          note: process.env.REDIS_URL
            ? 'REDIS_URL detected — upgrade to BullMQ backend to enable distributed queue'
            : 'Running in-memory queue. Set REDIS_URL to enable Redis + BullMQ.',
        },
        storage: {
          backend: 'local-fs',
          fileCount: storageStats.fileCount,
          usedBytes: storageStats.totalSize,
          maxBytes: storageStats.maxSize,
          usagePercent: parseFloat(storageStats.usagePercent.toFixed(1)),
          usedHuman: formatBytes(storageStats.totalSize),
          maxHuman: formatBytes(storageStats.maxSize),
        },
        concurrency: {
          maxJobs: 3,
          processing: queueStats.processing,
          pending: queueStats.pending,
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', error: message },
      { status: 500 }
    )
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
