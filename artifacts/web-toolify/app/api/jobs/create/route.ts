/**
 * Create Job API Route
 *
 * Validates the upload, stores files, and enqueues a job.
 * The server NEVER processes files directly in this handler.
 *
 * When REDIS_URL is set (BullMQ backend):
 *   Upload → disk (streaming, zero RAM) → TempStorage → Redis queue → return jobId
 *
 * Fallback (in-memory backend):
 *   Upload → disk → read buffer → in-memory queue → fire-and-forget process
 *
 * Rate limited: 20 job submissions per minute per IP.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { getJobManager, processJob } from '@/lib/queue'
import { applyRateLimit, JOB_CREATE_LIMIT } from '@/lib/middleware/rate-limit'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import type { JobType, JobOptions } from '@/lib/queue/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const VALID_JOB_TYPES = new Set<JobType>([
  'merge-pdf', 'split-pdf', 'rotate-pdf', 'compress-pdf', 'watermark-pdf',
  'protect-pdf', 'unlock-pdf', 'sign-pdf', 'pdf-to-jpg', 'pdf-to-word',
  'pdf-to-excel', 'word-to-pdf', 'excel-to-pdf', 'html-to-pdf', 'ppt-to-pdf',
  'compress-image', 'resize-image', 'convert-image',
  'crop-image', 'image-to-pdf', 'add-page-numbers', 'organize-pdf',
  'extract-pages', 'delete-pages', 'repair-pdf',
])

/**
 * Determine which magic-byte family to validate against for a given job type.
 * Document-conversion types (word-to-pdf, ppt-to-pdf, etc.) use 'any' because
 * their containers are OLE2 / ZIP — not PDF or image headers.
 */
function getFileKind(type: JobType): 'pdf' | 'image' | 'any' {
  const PDF_ONLY = new Set<JobType>([
    'merge-pdf', 'split-pdf', 'rotate-pdf', 'compress-pdf', 'watermark-pdf',
    'protect-pdf', 'unlock-pdf', 'sign-pdf', 'pdf-to-jpg', 'pdf-to-word',
    'pdf-to-excel', 'add-page-numbers', 'organize-pdf', 'extract-pages',
    'delete-pages', 'repair-pdf',
  ])
  const IMAGE_ONLY = new Set<JobType>([
    'compress-image', 'resize-image', 'convert-image', 'crop-image',
  ])
  if (PDF_ONLY.has(type))   return 'pdf'
  if (IMAGE_ONLY.has(type)) return 'image'
  return 'any'
}

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(request, JOB_CREATE_LIMIT, 'job-create')
  if (rateLimited) return rateLimited

  // Stream the upload to disk — never buffers the whole request in RAM
  const uploadResult = await streamUpload(request).catch((err: Error & { _status?: number }) => {
    const msg = err.message || 'Upload failed'
    const status = err._status ?? 413
    throw Object.assign(new Error(msg), { _status: status })
  })

  const { fields, files: diskFiles, cleanup } = uploadResult

  try {
    // ── Validate job type ──────────────────────────────────────────────────
    const jobType = fields['type'] as JobType
    if (!jobType || !VALID_JOB_TYPES.has(jobType)) {
      return NextResponse.json({ error: `Invalid job type: ${jobType || '(missing)'}` }, { status: 400 })
    }

    if (diskFiles.length === 0) {
      return NextResponse.json({ error: 'At least one file is required.' }, { status: 400 })
    }

    // ── Parse options ──────────────────────────────────────────────────────
    let options: JobOptions = {}
    const optionsStr = fields['options']
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr)
      } catch {
        return NextResponse.json({ error: 'Invalid options JSON.' }, { status: 400 })
      }
    }

    // ── Validate files (magic bytes) ───────────────────────────────────────
    const kind = getFileKind(jobType)
    for (const file of diskFiles) {
      const err = await validateStreamedFile(file, kind)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
    }

    // ── BullMQ path — stream files to TempStorage, push fileIds to Redis ──
    if (process.env.REDIS_URL) {
      const { enqueueJob, isRedisAvailable } = await import('@/lib/queue/bullmq-backend')

      const redisOk = await isRedisAvailable().catch(() => false)
      if (redisOk) {
        const storage = getTempStorage()
        const inputFileIds:  string[] = []
        const fileNames:     string[] = []
        const fileMimeTypes: string[] = []

        for (const file of diskFiles) {
          // Stream directly from disk → TempStorage (zero in-RAM buffer)
          const stream = createReadStream(file.path)
          const fileId = await storage.storeStream(
            stream,
            file.filename,
            file.mimeType,
            { expectedSize: file.size }
          )
          inputFileIds.push(fileId)
          fileNames.push(file.filename)
          fileMimeTypes.push(file.mimeType)
        }

        const jobId = await enqueueJob(jobType, inputFileIds, fileNames, fileMimeTypes, options)

        return NextResponse.json({
          id:       jobId,
          status:   'pending',
          progress: 0,
          pollUrl:  `/api/jobs/${encodeURIComponent(jobId)}`,
        })
      }
    }

    // ── In-memory fallback ─────────────────────────────────────────────────
    const fileBuffers: Array<{ name: string; buffer: Buffer; type: string }> = []
    for (const file of diskFiles) {
      const buffer = await readFile(file.path)
      fileBuffers.push({ name: file.filename, buffer, type: file.mimeType })
    }

    const manager = getJobManager()
    const job = manager.createJob(jobType, fileBuffers, options)

    // Fire-and-forget: client polls /api/jobs/:id
    processJob(job.id).catch((err: Error) => {
      console.error(`[Queue] Job ${job.id} (${job.type}) failed:`, err.message)
    })

    return NextResponse.json({
      id:       job.id,
      status:   'pending',
      progress: 0,
      pollUrl:  `/api/jobs/${job.id}`,
    })

  } catch (error) {
    console.error('[jobs/create]', error)
    const msg    = error instanceof Error ? error.message : 'Failed to create job'
    const status = (error as { _status?: number })._status ?? 500
    return NextResponse.json({ error: msg }, { status })
  } finally {
    // Always clean up the temp upload directory
    await cleanup()
  }
}
