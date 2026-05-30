/**
 * Worker Control
 *
 * Allows pausing / resuming BullMQ workers and clearing queues.
 * All operations are async and fire-and-forget safe.
 */

import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const QUEUE_NAMES = ['toolify-pdf', 'toolify-image', 'toolify-ocr', 'toolify-document']

let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
    })
    _redis.on('error', () => {})
  }
  return _redis
}

async function withQueues<T>(fn: (q: Queue) => Promise<T>): Promise<T[]> {
  const r = getRedis()
  if (!r) return []
  return Promise.all(
    QUEUE_NAMES.map(async (name) => {
      const q = new Queue(name, {
        connection: r as never,
      })
      try { return await fn(q) } finally { await q.close() }
    })
  )
}

export async function pauseAllQueues(): Promise<void> {
  await withQueues((q) => q.pause())
}

export async function resumeAllQueues(): Promise<void> {
  await withQueues((q) => q.resume())
}

export async function clearAllQueues(): Promise<number> {
  const counts = await withQueues(async (q) => {
    const waiting = await q.getWaiting()
    await Promise.all(waiting.map((j) => j.remove()))
    return waiting.length
  })
  return counts.reduce((a, b) => a + b, 0)
}
