/**
 * BullMQ + Redis Queue Backend
 *
 * Architecture:
 *   Upload → /api/jobs/create → store files in TempStorage → push {fileIds} to Redis
 *   Worker → load files from TempStorage → process → store result → update job state
 *   Poll   → /api/jobs/:id → query BullMQ job state + result
 *
 * Worker Groups — 5 independent queues so fast tools never block behind slow ones:
 *
 *   toolify-pdf-fast   → Quick PDF ops (rotate, watermark, protect…) — concurrency 4
 *   toolify-pdf-heavy  → Slow PDF ops (merge, compress, pdf→jpg…)    — concurrency 2
 *   toolify-image      → Image processing (Sharp)                     — concurrency 4
 *   toolify-ocr        → OCR (Tesseract)                              — concurrency 2
 *   toolify-document   → Document conv. (LibreOffice)                 — concurrency 2
 *
 * File data NEVER enters Redis — only file IDs stored in TempStorage.
 * BullMQ handles: persistence, retries, TTL cleanup, progress tracking.
 *
 * Per-stage timing is embedded in every completed job's returnvalue.metadata._timings
 * and surfaced in the status API as { timings: { queueWaitMs, fileLoadMs, engineMs, totalMs } }.
 */

import { Queue, Worker, Job as BullJob, UnrecoverableError } from 'bullmq'
import { Redis } from 'ioredis'
import { nanoid } from 'nanoid'
import { cpus } from 'node:os'
import { getTempStorage } from '../storage'
import { getJobManager } from './job-manager'
import { processJob } from './job-processor'
import type { JobType, JobResult, JobOptions, JobStatusResponse, JobTimings } from './types'
import { emitEvent, emitWorkerStatus } from '../monitoring/emitter'

// ── Constants ────────────────────────────────────────────────────────────────

const JOB_TTL_COMPLETED_MS = 20 * 60 * 1000  // 20 min — matches TempStorage TTL
const JOB_TTL_FAILED_MS    = 10 * 60 * 1000  // 10 min
const JOB_TIMEOUT_MS       = 10 * 60 * 1000  // 10 min per job (safety net)
const PROGRESS_POLL_MS     = 300              // how often to bridge in-memory progress → BullMQ

// ── Worker group routing ─────────────────────────────────────────────────────

/**
 * PDF-FAST: quick in-process operations — typically <2 seconds.
 * These must never wait behind compress-pdf or merge-pdf jobs.
 */
const PDF_FAST_TYPES = new Set<JobType>([
  'rotate-pdf', 'watermark-pdf', 'add-page-numbers', 'organize-pdf',
  'protect-pdf', 'unlock-pdf', 'sign-pdf',
  'extract-pages', 'delete-pages',
])

/**
 * PDF-HEAVY: CPU-intensive or multi-step ops — 2 s to 3 min.
 * Isolated so they don't starve the fast queue.
 */
const PDF_HEAVY_TYPES = new Set<JobType>([
  'merge-pdf', 'split-pdf', 'compress-pdf', 'repair-pdf',
  'pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel',
])

const IMAGE_TYPES = new Set<JobType>([
  'compress-image', 'resize-image', 'convert-image', 'crop-image', 'image-to-pdf',
])

const OCR_TYPES = new Set<JobType>(['ocr-image', 'ocr-pdf'])

/**
 * DOCUMENT: LibreOffice-based conversions — includes pdf-to-ppt which was
 * previously (incorrectly) falling through to the pdf queue.
 */
const DOCUMENT_TYPES = new Set<JobType>([
  'word-to-pdf', 'excel-to-pdf', 'html-to-pdf', 'ppt-to-pdf', 'pdf-to-ppt',
])

export type WorkerGroup = 'pdf-fast' | 'pdf-heavy' | 'image' | 'ocr' | 'document'

export function getWorkerGroup(type: JobType): WorkerGroup {
  if (PDF_FAST_TYPES.has(type))     return 'pdf-fast'
  if (PDF_HEAVY_TYPES.has(type))    return 'pdf-heavy'
  if (IMAGE_TYPES.has(type))        return 'image'
  if (OCR_TYPES.has(type))          return 'ocr'
  if (DOCUMENT_TYPES.has(type))     return 'document'
  // Safe default — unclassified PDF-like types go to heavy queue
  return 'pdf-heavy'
}

const QUEUE_NAMES: Record<WorkerGroup, string> = {
  'pdf-fast':  'toolify-pdf-fast',
  'pdf-heavy': 'toolify-pdf-heavy',
  image:       'toolify-image',
  ocr:         'toolify-ocr',
  document:    'toolify-document',
}

const CONCURRENCY: Record<WorkerGroup, number> = {
  // Fast PDF ops — no expensive spawns, pure JS — use all CPUs
  'pdf-fast':  Math.max(2, cpus().length),
  // Heavy PDF ops — Ghostscript/pdf-lib — cap at half CPUs to avoid RAM/CPU saturation
  'pdf-heavy': Math.max(1, Math.floor(cpus().length / 2)),
  // Sharp (libvips, async/non-blocking) — use all CPUs
  image:       Math.max(2, cpus().length),
  // Tesseract — LSTM is CPU+RAM heavy — cap at half CPUs
  ocr:         Math.max(1, Math.floor(cpus().length / 2)),
  // LibreOffice — each process uses 200–600 MB RAM.
  // Two concurrent conversions are safe on ≥4 GB available RAM.
  document:    2,
}

// ── Job payload (what goes into Redis — must be small) ───────────────────────

export interface BullMQPayload {
  type: JobType
  /** TempStorage file IDs for input files (NOT the buffers themselves) */
  inputFileIds: string[]
  fileNames: string[]
  fileMimeTypes: string[]
  options: JobOptions
  /** Unix ms — when the job was enqueued (for accurate queue-wait measurement) */
  enqueuedAt: number
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
 * Returns a prefixed jobId: `bq-<group>-<bullJobId>` (e.g. `bq-pdf-fast-abc123`)
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

  const payload: BullMQPayload = {
    type, inputFileIds, fileNames, fileMimeTypes, options,
    enqueuedAt: Date.now(),
  }

  const bullJob = await queue.add(type, payload, { jobId: customId })
  return `bq-${group}-${bullJob.id!}`
}

// ── Status query ─────────────────────────────────────────────────────────────

/**
 * Ordered group name list for ID parsing — longer names must come first so
 * 'pdf-fast' is matched before 'pdf' would be (if 'pdf' were still present).
 */
const KNOWN_GROUPS: WorkerGroup[] = ['pdf-fast', 'pdf-heavy', 'image', 'ocr', 'document']

/**
 * Parse a prefixed job ID (e.g. `bq-pdf-fast-abc123`) and fetch its BullMQ status.
 * Returns null if not found or if the ID is not a BullMQ job.
 */
export async function getBullMQJobStatus(
  prefixedId: string
): Promise<JobStatusResponse | null> {
  if (!prefixedId.startsWith('bq-')) return null

  const rest = prefixedId.slice(3) // remove 'bq-'

  let group: WorkerGroup | null = null
  let bullId: string | null = null
  for (const g of KNOWN_GROUPS) {
    if (rest.startsWith(g + '-')) {
      group = g
      bullId = rest.slice(g.length + 1)
      break
    }
  }
  if (!group || !bullId) return null

  const queue   = getQueue(group)
  const bullJob = await queue.getJob(bullId)
  if (!bullJob) return null

  const state    = await bullJob.getState()
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

  const response: JobStatusResponse = {
    id: prefixedId,
    status,
    progress: status === 'completed' ? 100 : progress,
    createdAt: bullJob.timestamp,
    startedAt: bullJob.processedOn ?? undefined,
    completedAt: bullJob.finishedOn ?? undefined,
  }

  if (state === 'completed' && bullJob.returnvalue) {
    const rv = bullJob.returnvalue as JobResult
    response.result = rv

    // Extract per-stage timings embedded by executeBullMQJob
    const embedded = rv.metadata?._timings as Record<string, number> | undefined
    const timings: JobTimings = {
      queueWaitMs: bullJob.processedOn != null
        ? bullJob.processedOn - bullJob.timestamp
        : undefined,
      fileLoadMs:  embedded?.fileLoadMs,
      engineMs:    embedded?.engineMs,
      totalMs:     bullJob.finishedOn != null
        ? bullJob.finishedOn - bullJob.timestamp
        : undefined,
    }
    response.timings = timings
  }

  if (state === 'failed') {
    response.error = bullJob.failedReason || 'Job failed'
  }

  return response
}

// ── Worker processor ─────────────────────────────────────────────────────────

/**
 * Core processing function executed inside each BullMQ worker.
 *
 * Flow:
 *   1. Load input files from TempStorage into Buffers          → fileLoadMs
 *   2. Register temporary in-memory job (BullMQ job ID)
 *   3. Bridge progress: poll in-memory job → push to BullMQ
 *   4. Run processJob()                                        → engineMs
 *   5. Embed timings into result.metadata._timings
 *   6. Return result as BullMQ job returnvalue
 *   7. Cleanup: delete input files from TempStorage
 */
async function executeBullMQJob(bullJob: BullJob<BullMQPayload>): Promise<JobResult> {
  const payload = bullJob.data
  const storage  = getTempStorage()
  const manager  = getJobManager()

  // ── 1. Load input files ─────────────────────────────────────────────────
  const t0 = Date.now()

  const files: Array<{ name: string; buffer: Buffer; type: string }> = []
  for (let i = 0; i < payload.inputFileIds.length; i++) {
    const stored = await storage.get(payload.inputFileIds[i])
    if (!stored) {
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

  const t1 = Date.now()
  const fileLoadMs = t1 - t0

  // ── 2. Register temporary in-memory job ─────────────────────────────────
  const inMemId = bullJob.id!
  manager.registerJobWithId(inMemId, payload.type, files, payload.options)

  // ── 3. Progress bridge ──────────────────────────────────────────────────
  const progressPoller = setInterval(() => {
    const s = manager.getJobStatus(inMemId)
    if (s?.progress != null) {
      bullJob.updateProgress(s.progress).catch(() => {})
    }
  }, PROGRESS_POLL_MS)

  try {
    // ── 4. Process ──────────────────────────────────────────────────────
    await processJob(inMemId)

    const t2 = Date.now()
    const engineMs = t2 - t1

    const status = manager.getJobStatus(inMemId)
    if (!status?.result) {
      throw new Error(status?.error ?? 'Processing produced no result')
    }

    // ── 5. Embed per-stage timings ────────────────────────────────────────
    const queueWaitMs = payload.enqueuedAt > 0 ? t1 - payload.enqueuedAt : undefined
    const result: JobResult = {
      ...status.result,
      metadata: {
        ...status.result.metadata,
        _timings: { fileLoadMs, engineMs, queueWaitMs },
      },
    }

    // ── 6. Return result ──────────────────────────────────────────────────
    return result

  } finally {
    clearInterval(progressPoller)

    // ── 7. Cleanup input files (result stays in TempStorage) ──────────────
    for (const fileId of payload.inputFileIds) {
      storage.delete(fileId).catch(() => {})
    }
  }
}

// ── Worker pool lifecycle ────────────────────────────────────────────────────

const workers: Worker[] = []
let workersStarted = false

/** Start one worker per group. Call from instrumentation.ts at server boot. */
export function startWorkers(): void {
  if (workersStarted) return
  workersStarted = true

  const groups: WorkerGroup[] = ['pdf-fast', 'pdf-heavy', 'image', 'ocr', 'document']

  for (const group of groups) {
    const worker = new Worker(
      QUEUE_NAMES[group],
      executeBullMQJob,
      {
        connection:   getRedis() as never,
        concurrency:  CONCURRENCY[group],
        lockDuration: JOB_TIMEOUT_MS + 30_000, // must be > job timeout
      }
    )

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
      emitWorkerStatus({ worker_id: group, worker_type: group, status: 'idle', current_job: null })
      emitEvent({ event_type: 'job_failed', tool: jobType, worker_id: group, error_message: err.message.slice(0, 500) })
    })
    worker.on('error', (err) => {
      console.error(`[Worker:${group}] Worker error:`, err.message)
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
 * Result cached 60 s (10 s on failure).
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
