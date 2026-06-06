/**
 * Shared helper — enqueue a job through BullMQ (or in-memory fallback).
 *
 * Use this in direct API routes instead of duplicating the BullMQ/fallback
 * logic everywhere. Each route stays thin: validate → call enqueueOrFallback
 * → return { jobId, pollUrl }.
 */

import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { getTempStorage } from '@/lib/storage'
import { getJobManager, processJob } from '@/lib/queue'
import type { JobType, JobOptions } from '@/lib/queue/types'

export interface UploadedFile {
  path: string
  filename: string
  mimeType: string
  size: number
  fieldname: string
}

export interface EnqueueResult {
  jobId: string
  pollUrl: string
}

export async function enqueueOrFallback(
  jobType: JobType,
  diskFiles: UploadedFile[],
  options: JobOptions = {},
): Promise<EnqueueResult> {
  if (process.env.REDIS_URL) {
    const { enqueueJob, isRedisAvailable } = await import('./bullmq-backend')
    const redisOk = await isRedisAvailable().catch(() => false)
    if (redisOk) {
      const storage = getTempStorage()
      const inputFileIds: string[] = []
      const fileNames: string[] = []
      const fileMimeTypes: string[] = []

      for (const file of diskFiles) {
        const stream = createReadStream(file.path)
        const fileId = await storage.storeStream(stream, file.filename, file.mimeType, {
          expectedSize: file.size,
        })
        inputFileIds.push(fileId)
        fileNames.push(file.filename)
        fileMimeTypes.push(file.mimeType)
      }

      const jobId = await enqueueJob(jobType, inputFileIds, fileNames, fileMimeTypes, options)
      return { jobId, pollUrl: `/api/jobs/${encodeURIComponent(jobId)}` }
    }
  }

  const fileBuffers = await Promise.all(
    diskFiles.map(async (file) => ({
      name: file.filename,
      buffer: await readFile(file.path),
      type: file.mimeType,
    })),
  )

  const manager = getJobManager()
  const job = manager.createJob(jobType, fileBuffers, options)
  processJob(job.id).catch((err: Error) => {
    console.error(`[Queue] Job ${job.id} (${job.type}) failed:`, err.message)
  })
  return { jobId: job.id, pollUrl: `/api/jobs/${job.id}` }
}
