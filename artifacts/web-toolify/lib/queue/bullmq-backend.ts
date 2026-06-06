/**
 * BullMQ + Redis Queue Backend
 *
 * Architecture:
 *   Upload → /api/jobs/create → store files in TempStorage → push {fileIds} to Redis
 *   Worker → load files from TempStorage → process → store result → update job state
 *   Poll   → /api/jobs/:id → query BullMQ job state + result
 *
 * Worker Groups (separate queues for independent concurrency):
 *   toolify-pdf      → PDF processing  (Ghostscript + pdf-lib)
 *   toolify-image    → Image processing (Sharp)
 *   toolify-ocr      → OCR             (Tesseract)
 *   toolify-document → Document conv.  (LibreOffice)
 *
 * File data NEVER enters Redis — only file IDs stored in TempStorage.
 * BullMQ handles: persistence, retries, TTL cleanup, progress tracking.
 */

import { Queue, Worker, Job as BullJob, UnrecoverableError } from 'bullmq'
import { Redis } from 'ioredis'
import { nanoid } from 'nanoid'
import { cpus } from 'node:os'
import { getTempStorage } from '../storage'
import { getJobManager } from './job-manager'
import { processJob } from './job-processor'
import type { JobType, JobResult, JobOptions, JobStatusResponse } from './types'
import { reportError } from '../telegram/error-monitor'
import { emitEvent, emitWorkerStatus } from '../monitoring/emitter'

// ── Constants ────────────────────────────────────────────────────────────────

const JOB_TTL_COMPLETED_MS = 20 * 60 * 1000  // 20 min — matches TempStorage TTL
const JOB_TTL_FAILED_MS    = 10 * 60 * 1000  // 10 min
const JOB_TIMEOUT_MS       = 10 * 60 * 1000  // 10 min per job (safety net)
const PROGRESS_POLL_MS     = 300              // how often to bridge in-memory progress → BullMQ

// ── Worker group routing ─────────────────────────────────────────────────────

const PDF_TYPES = new Set<JobType>([
  'merge-pdf', 'split-pdf', 'rotate-pdf', 'compress-pdf', 'watermark-pdf',
  'protect-pdf', 'unlock-pdf', 'sign-pdf', 'pdf-to-jpg', 'pdf-to-word',
  'add-page-numbers', 'organize-pdf', 'extract-pages', 'delete-pages', 'repair-pdf',
])
const IMAGE_TYPES = new Set<JobType>([
  'compress-image', 'resize-image', 'convert-image', 'crop-image', 'image-to-pdf',
])
const OCR_TYPES = new Set<JobType>(['ocr-image', 'ocr-pdf'])
const DOCUMENT_TYPES = new Set<JobType>(['word-to-pdf', 'excel-to-pdf', 'html-to-pdf', 'ppt-to-pdf'])

type WorkerGroup = 'pdf' | 'image' | 'ocr' | 'document'

export function getWorkerGroup(type: JobType): WorkerGroup {
  if (PDF_TYPES.has(type))      return 'pdf'
  if (IMAGE_TYPES.has(type))    return 'image'
  if (OCR_TYPES.has(type))      return 'ocr'
  if (DOCUMENT_TYPES.has(type)) return 'document'
  return 'pdf'
}

const QUEUE_NAMES: Record<WorkerGroup, string> = {
  pdf:      'toolify-pdf',
  image:    'toolify-image',
  ocr:      'toolify-ocr',
  document: 'toolify-document',
}

const CONCURRENCY: Record<WorkerGroup, number> = {
  pdf:      Math.max(1, Math.floor(cpus().length / 2)),
  image:    Math.max(2, cpus().length),
  ocr:      Math.max(1, Math.floor(cpus().length / 2)),
  document: 1, // LibreOffice must NOT run concurrently
}

// ── Job payload (what goes into Redis — must be small) ───────────────────────

export interface BullMQPayload {
  type: JobType
  /** TempStorage file IDs for input files (NOT the buffers themselves) */
  inputFileIds: string[]
  fileNames: string[]
  fileMimeTypes: string[]
  options: JobOptions
}

// ── Redis connection factory ─────────────────────────────────────────────────

let redisInstance: Redis | null = null

function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      lazyConnect: false,
      enableReadyCheck: false,
    })
    redisInstance.on('error', (err: Error) => {
      console.error('[BullMQ] Redis connection error:', err.message)
      reportError({
        service:  'Redis (BullMQ Connection)',
        location: 'lib/queue/bullmq-backend.ts → getRedis()',
        error:    err,
      })
    })
  }
  return redisInstance
}

// ── Queue instances ──────────────────────────────────────────────────────────

const queues = new Map<WorkerGroup, Queue>()

function getQueue(group: WorkerGroup): Queue {
  if (!queues.has(group)) {
    queues.set(group, new Queue(QUEUE_NAMES[group], {
      connection: getRedis() as never,
      defaultJobOptions: {
        attempts: 1,                    // let job-processor.ts handle internal retries
        removeOnComplete: { age: JOB_TTL_COMPLETED_MS / 1000 },
        removeOnFail:     { age: JOB_TTL_FAILED_MS    / 1000 },
      },
    }))
  }
  return queues.get(group)!
}

// ── Enqueue a job ────────────────────────────────────────────────────────────

/**
 * Push a job to the appropriate queue.
 * Returns a prefixed jobId: `bq-${group}-${bullJobId}` (e.g. `bq-pdf-abc123`)
 */
export async function enqueueJob(
  type: JobType,
  inputFileIds: string[],
  fileNames: string[],
  fileMimeTypes: string[],
  options: JobOptions = {}
): Promise<string> {
  const group = getWorkerGroup(type)
  const queue = getQueue(group)
  const customId = nanoid(12)

  const payload: BullMQPayload = { type, inputFileIds, fileNames, fileMimeTypes, options }

  const bullJob = await queue.add(type, payload, { jobId: customId })
  // Return a prefixed ID so the status route knows which queue to query
  return `bq-${group}-${bullJob.id!}`
}

// ── Status query ─────────────────────────────────────────────────────────────

/**
 * Parse a prefixed job ID (e.g. `bq-pdf-abc123`) and fetch its BullMQ status.
 * Returns null if not found or if the ID is not a BullMQ job.
 */
export async function getBullMQJobStatus(
  prefixedId: string
): Promise<JobStatusResponse | null> {
  if (!prefixedId.startsWith('bq-')) return null

  // Format: bq-<group>-<bullId>
  const rest = prefixedId.slice(3)
  const dashIdx = rest.indexOf('-')
  if (dashIdx === -1) return null

  const group = rest.slice(0, dashIdx) as WorkerGroup
  const bullId = rest.slice(dashIdx + 1)

  if (!QUEUE_NAMES[group]) return null

  const queue = getQueue(group)
  const bullJob = await queue.getJob(bullId)
  if (!bullJob) return null

  const state = await bullJob.getState()
  const progress = typeof bullJob.progress === 'number' ? bullJob.progress : 0

  const statusMap: Record<string, JobStatusResponse['status']> = {
    waiting:   'pending',
    delayed:   'pending',
    active:    'processing',
    completed: 'completed',
    failed:    'failed',
    unknown:   'failed',
  }

  const status: JobStatusResponse['status'] = statusMap[state] ?? 'failed'

  const result: JobStatusResponse = {
    id: prefixedId,
    status,
    progress: status === 'completed' ? 100 : progress,
    createdAt: bullJob.timestamp,
    startedAt: bullJob.processedOn ?? undefined,
    completedAt: bullJob.finishedOn ?? undefined,
  }

  if (state === 'completed' && bullJob.returnvalue) {
    result.result = bullJob.returnvalue as JobResult
  }
  if (state === 'failed') {
    result.error = bullJob.failedReason || 'Job failed'
  }

  return result
}

// ── Worker processor ─────────────────────────────────────────────────────────

/**
 * Core processing function executed inside each BullMQ worker.
 *
 * Flow:
 *   1. Load input files from TempStorage into Buffers
 *   2. Register a temporary in-memory job (using BullMQ job ID) so existing
 *      job-processor.ts can run without changes
 *   3. Bridge progress: poll in-memory job → push to BullMQ
 *   4. Run processJob() which handles engines + internal retries
 *   5. Extract result → return as BullMQ job returnvalue
 *   6. Cleanup: delete input files from TempStorage
 */
async function executeBullMQJob(bullJob: BullJob<BullMQPayload>): Promise<JobResult> {
  const payload = bullJob.data
  const storage  = getTempStorage()
  const manager  = getJobManager()

  // ── 1. Load input files ──
  const files: Array<{ name: string; buffer: Buffer; type: string }> = []
  for (let i = 0; i < payload.inputFileIds.length; i++) {
    const stored = await storage.get(payload.inputFileIds[i])
    if (!stored) {
      // File missing from TempStorage (TTL expired or storage cleared)
      throw new UnrecoverableError(
        `Input file "${payload.fileNames[i]}" is no longer available (expired). Please re-upload.`
      )
    }
    files.push({
      name: payload.fileNames[i],
      buffer: stored.buffer,
      type:   payload.fileMimeTypes[i],
    })
  }

  // ── 2. Register temporary in-memory job with BullMQ's job ID ──
  const inMemId = bullJob.id!
  manager.registerJobWithId(inMemId, payload.type, files, payload.options)

  // ── 3. Progress bridge ──
  const progressPoller = setInterval(() => {
    const s = manager.getJobStatus(inMemId)
    if (s?.progress != null) {
      bullJob.updateProgress(s.progress).catch(() => {})
    }
  }, PROGRESS_POLL_MS)

  try {
    // ── 4. Process (engines + retries all handled inside processJob) ──
    await processJob(inMemId)

    const status = manager.getJobStatus(inMemId)
    if (!status?.result) {
      throw new Error(status?.error ?? 'Processing produced no result')
    }

    // ── 5. Return result as BullMQ returnvalue ──
    return status.result

  } finally {
    clearInterval(progressPoller)

    // ── 6. Cleanup input files (result file stays in TempStorage) ──
    for (const fileId of payload.inputFileIds) {
      storage.delete(fileId).catch(() => {})
    }

    // Release in-memory buffers (result is safe in TempStorage)
    // We intentionally do NOT call manager.deleteJob() here because that
    // would also delete the TempStorage result file. The in-memory entry
    // will be evicted by the normal TTL cleanup.
  }
}

// ── Worker pool lifecycle ────────────────────────────────────────────────────

const workers: Worker[] = []
let workersStarted = false

/** Start one worker per group. Call from instrumentation.ts at server boot. */
export function startWorkers(): void {
  if (workersStarted) return
  workersStarted = true

  const groups: WorkerGroup[] = ['pdf', 'image', 'ocr', 'document']

  for (const group of groups) {
    const worker = new Worker(
      QUEUE_NAMES[group],
      executeBullMQJob,
      {
        connection:  getRedis() as never,
        concurrency: CONCURRENCY[group],
        lockDuration: JOB_TIMEOUT_MS + 30_000, // must be > job timeout
      }
    )

    // Register worker in Supabase monitoring (fire-and-forget)
    emitWorkerStatus({ worker_id: group, worker_type: group, status: 'idle' })

    worker.on('active', (job) => {
      emitWorkerStatus({ worker_id: group, worker_type: group, status: 'busy', current_job: job.name })
      emitEvent({ event_type: 'job_started', tool: job.name, worker_id: group, session_id: job.id ?? undefined })
    })
    worker.on('completed', (job) => {
      console.log(`[Worker:${group}] Job ${job.id} (${job.name}) completed`)
      emitWorkerStatus({ worker_id: group, worker_type: group, status: 'idle', current_job: null })
    })
    worker.on('failed', (job, err) => {
      const jobType = job?.name ?? 'unknown'
      console.error(`[Worker:${group}] Job ${job?.id} (${jobType}) failed:`, err.message)
      reportError({
        service:  `${group.charAt(0).toUpperCase() + group.slice(1)} Worker`,
        location: `lib/queue/bullmq-backend.ts → worker.on('failed')`,
        error:    err,
        jobType,
      })
      emitWorkerStatus({ worker_id: group, worker_type: group, status: 'idle', current_job: null })
      emitEvent({ event_type: 'job_failed', tool: jobType, worker_id: group, error_message: err.message.slice(0, 500) })
    })
    worker.on('error', (err) => {
      console.error(`[Worker:${group}] Worker error:`, err.message)
      reportError({
        service:  `${group.charAt(0).toUpperCase() + group.slice(1)} Worker`,
        location: `lib/queue/bullmq-backend.ts → worker.on('error')`,
        error:    err,
      })
      emitWorkerStatus({ worker_id: group, worker_type: group, status: 'crashed' })
      emitEvent({ event_type: 'worker_crashed', worker_id: group, error_message: err.message.slice(0, 500) })
    })

    workers.push(worker)
    console.log(`[Worker:${group}] Started — concurrency: ${CONCURRENCY[group]}`)
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Workers] Shutting down...')
    await Promise.all(workers.map((w) => w.close()))
    if (redisInstance) await redisInstance.quit().catch(() => {})
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT',  shutdown)
}

/**
 * Check if Redis is reachable using a short-lived probe connection.
 *
 * Result is cached for 60 seconds so every job-create request doesn't
 * open a new TCP connection to Redis. On failure the cache TTL is 10 s
 * so recovery is fast once Redis comes back.
 */
let _redisAvailableCache: boolean | null = null
let _redisAvailableCheckedAt = 0

export async function isRedisAvailable(): Promise<boolean> {
  const now = Date.now()
  const ttl = _redisAvailableCache === false ? 10_000 : 60_000
  if (_redisAvailableCache !== null && now - _redisAvailableCheckedAt < ttl) {
    return _redisAvailableCache
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const probe = new Redis(url, {
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    enableReadyCheck: false,
    connectTimeout: 3000,
  })

  try {
    await Promise.race([
      probe.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis probe timeout')), 3000)
      ),
    ])
    _redisAvailableCache = true
    _redisAvailableCheckedAt = Date.now()
    return true
  } catch {
    _redisAvailableCache = false
    _redisAvailableCheckedAt = Date.now()
    return false
  } finally {
    probe.disconnect()
  }
}
