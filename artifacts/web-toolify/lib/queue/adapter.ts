/**
 * Queue Backend Adapter
 *
 * Defines a clean `QueueBackend` interface so the queue implementation can
 * be swapped from in-memory → BullMQ + Redis without changing any caller.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  How to upgrade to Redis + BullMQ when ready:                   │
 * │                                                                  │
 * │  1. Install: pnpm add bullmq ioredis                            │
 * │  2. Set env: REDIS_URL=redis://...                              │
 * │  3. Implement BullMQBackend below (or in a separate file)       │
 * │  4. Change createQueueBackend() to return BullMQBackend         │
 * │     when REDIS_URL is set                                       │
 * │                                                                  │
 * │  The in-memory backend stays as the fallback for local dev      │
 * │  and environments without Redis.                                │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Horizontal scaling notes:
 *  - With BullMQ, multiple Next.js server instances can share one
 *    Redis queue — each instance runs its own worker consumers.
 *  - File storage must also be external (S3/GCS) for multi-server
 *    setups; see lib/storage/temp-storage.ts for the interface.
 *  - The in-memory backend works correctly for single-server deploys
 *    (including serverless with long-lived instances like Replit).
 */

export type BackendType = 'memory' | 'bullmq'

export interface QueueBackendConfig {
  type: BackendType
  /** BullMQ only: Redis connection URL (e.g. redis://localhost:6379) */
  redisUrl?: string
  /** BullMQ only: Queue name prefix */
  queuePrefix?: string
  /** Max parallel jobs this instance will process */
  concurrency?: number
  /** Job TTL after completion (ms) */
  jobTtlMs?: number
  /** Max retries per job */
  maxRetries?: number
}

/**
 * Abstract description of what a queue backend must provide.
 * Used for documentation + type-checking; both backends satisfy this shape.
 */
export interface QueueBackend {
  /** Submit a new job; returns job id immediately. */
  enqueue(type: string, payload: unknown): Promise<string>

  /** Retrieve current status + result for a job. */
  getStatus(jobId: string): Promise<QueueJobStatus | null>

  /** Cancel a pending job. */
  cancel(jobId: string): Promise<boolean>

  /** Remove a completed/failed job and its stored output. */
  remove(jobId: string): Promise<boolean>

  /** Aggregate counts for the health endpoint. */
  stats(): Promise<QueueStats>
}

export interface QueueJobStatus {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  result?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  total: number
  backend: BackendType
}

/**
 * Factory: returns the correct backend based on environment / config.
 *
 * Currently always returns 'memory'.
 * Add REDIS_URL detection here when upgrading.
 */
export function createQueueBackend(config: Partial<QueueBackendConfig> = {}): BackendType {
  if (config.redisUrl ?? process.env.REDIS_URL) {
    // Future: return new BullMQBackend(config)
    console.warn(
      '[Queue] REDIS_URL is set but BullMQ backend is not yet activated. ' +
      'Falling back to in-memory queue. Install bullmq and implement BullMQBackend to enable.'
    )
  }
  return 'memory'
}

/**
 * BullMQ backend scaffold (not implemented — shows the shape for when
 * you're ready to wire Redis in).
 *
 * To activate:
 *   1. pnpm add bullmq ioredis
 *   2. Uncomment + implement the methods below
 *   3. Update createQueueBackend() above
 *
 * @example
 * import { Queue, Worker, Job } from 'bullmq'
 * import { Redis } from 'ioredis'
 *
 * class BullMQBackend implements QueueBackend {
 *   private queue: Queue
 *   private worker: Worker
 *   private connection: Redis
 *
 *   constructor(config: QueueBackendConfig) {
 *     this.connection = new Redis(config.redisUrl!, { maxRetriesPerRequest: null })
 *     this.queue = new Queue(config.queuePrefix ?? 'toolify', { connection: this.connection })
 *     this.worker = new Worker(
 *       config.queuePrefix ?? 'toolify',
 *       async (job: Job) => processJobPayload(job.data),
 *       {
 *         connection: this.connection,
 *         concurrency: config.concurrency ?? 3,
 *       }
 *     )
 *   }
 *
 *   async enqueue(type: string, payload: unknown): Promise<string> {
 *     const job = await this.queue.add(type, payload, {
 *       attempts: (config.maxRetries ?? 2) + 1,
 *       backoff: { type: 'exponential', delay: 1000 },
 *       removeOnComplete: { age: (config.jobTtlMs ?? 600_000) / 1000 },
 *       removeOnFail: { age: (config.jobTtlMs ?? 600_000) / 1000 },
 *     })
 *     return job.id!
 *   }
 *
 *   async getStatus(jobId: string): Promise<QueueJobStatus | null> {
 *     const job = await this.queue.getJob(jobId)
 *     if (!job) return null
 *     const state = await job.getState()
 *     return { id: jobId, type: job.name, status: state as QueueJobStatus['status'],
 *              progress: (job.progress as number) || 0, result: job.returnvalue,
 *              error: job.failedReason, createdAt: job.timestamp }
 *   }
 *
 *   async cancel(jobId: string): Promise<boolean> {
 *     const job = await this.queue.getJob(jobId)
 *     if (!job) return false
 *     await job.remove()
 *     return true
 *   }
 *
 *   async remove(jobId: string): Promise<boolean> { return this.cancel(jobId) }
 *
 *   async stats(): Promise<QueueStats> {
 *     const counts = await this.queue.getJobCounts()
 *     return { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0), backend: 'bullmq' }
 *   }
 * }
 */
