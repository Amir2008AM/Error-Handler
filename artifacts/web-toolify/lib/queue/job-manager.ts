/**
 * Job Manager
 *
 * In-memory job registry. Result storage is delegated to the async
 * `TempStorage` so we never block the event loop with sync `fs` writes
 * and so multi-hundred-MB outputs don't pin themselves to the JS heap.
 */

import { nanoid } from 'nanoid'
import {
  Job,
  JobStatus,
  JobType,
  JobOptions,
  JobFile,
  JobStatusResponse,
  QueueConfig,
  DEFAULT_QUEUE_CONFIG,
} from './types'
import { getTempStorage } from '../storage'

class JobManager {
  private jobs: Map<string, Job> = new Map()
  private config: QueueConfig
  private processingCount: number = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config }
    this.startCleanup()
  }

  /**
   * Create a new job. Inputs stay in memory only as long as the
   * processor needs them; after `setJobResult*` they are released.
   */
  createJob(
    type: JobType,
    files: Array<{ name: string; buffer: Buffer; type: string }>,
    options: JobOptions = {}
  ): Job {
    let totalSize = 0
    for (const file of files) {
      if (file.buffer.length > this.config.maxFileSizeBytes) {
        throw new Error(
          `File "${file.name}" exceeds maximum size of ${Math.round(
            this.config.maxFileSizeBytes / 1024 / 1024
          )}MB`
        )
      }
      totalSize += file.buffer.length
    }
    if (totalSize > this.config.maxTotalFileSizeBytes) {
      throw new Error(
        `Total file size exceeds maximum of ${Math.round(
          this.config.maxTotalFileSizeBytes / 1024 / 1024
        )}MB`
      )
    }

    const id = nanoid(12)
    const now = Date.now()

    const jobFiles: JobFile[] = files.map((f) => ({
      id: nanoid(8),
      name: f.name,
      size: f.buffer.length,
      type: f.type,
      buffer: f.buffer,
    }))

    const job: Job = {
      id,
      type,
      status: 'pending',
      progress: 0,
      files: jobFiles,
      options,
      createdAt: now,
      expiresAt: now + this.config.jobTtlMs,
    }
    this.jobs.set(id, job)
    return job
  }

  getJob(id: string): Job | null {
    const job = this.jobs.get(id)
    if (!job) return null
    if (Date.now() > job.expiresAt) {
      void this.deleteJob(id)
      return null
    }
    return job
  }

  getJobStatus(id: string): JobStatusResponse | null {
    const job = this.getJob(id)
    if (!job) return null
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }
  }

  updateJobStatus(id: string, status: JobStatus, progress?: number): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    job.status = status
    if (progress !== undefined) {
      job.progress = Math.min(100, Math.max(0, progress))
    }
    if (status === 'processing' && !job.startedAt) {
      job.startedAt = Date.now()
    }
    if (status === 'completed' || status === 'failed') {
      job.completedAt = Date.now()
      this.clearJobFiles(job)
    }
    return true
  }

  updateJobProgress(id: string, progress: number): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    job.progress = Math.min(100, Math.max(0, progress))
    return true
  }

  /**
   * Persist a single result via the async storage, then release input
   * buffers from the heap immediately.
   */
  async setJobResult(
    id: string,
    resultBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<boolean> {
    const job = this.jobs.get(id)
    if (!job) return false

    const fileId = await getTempStorage().store(resultBuffer, fileName, mimeType)
    job.result = {
      fileId,
      fileName,
      fileSize: resultBuffer.length,
      mimeType,
      downloadUrl: `/api/files/${fileId}`,
    }
    job.status = 'completed'
    job.progress = 100
    job.completedAt = Date.now()
    this.clearJobFiles(job)
    return true
  }

  /**
   * Persist a batch of results in parallel. The first result is also
   * exposed at the top-level `result` for clients that don't iterate.
   */
  async setJobResultBatch(
    id: string,
    results: Array<{ buffer: Buffer; fileName: string; mimeType: string }>
  ): Promise<boolean> {
    const job = this.jobs.get(id)
    if (!job) return false

    const storage = getTempStorage()
    const files = await Promise.all(
      results.map(async (r) => {
        const fileId = await storage.store(r.buffer, r.fileName, r.mimeType)
        return {
          fileId,
          fileName: r.fileName,
          fileSize: r.buffer.length,
          mimeType: r.mimeType,
          downloadUrl: `/api/files/${fileId}`,
        }
      })
    )

    job.result = {
      fileId: files[0].fileId,
      fileName: files[0].fileName,
      fileSize: files[0].fileSize,
      mimeType: files[0].mimeType,
      downloadUrl: files[0].downloadUrl,
      files,
    }
    job.status = 'completed'
    job.progress = 100
    job.completedAt = Date.now()
    this.clearJobFiles(job)
    return true
  }

  setJobError(id: string, error: string): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    job.status = 'failed'
    job.error = error
    job.completedAt = Date.now()
    this.clearJobFiles(job)
    return true
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    if (job.status === 'completed' || job.status === 'failed') return false
    job.status = 'cancelled'
    job.completedAt = Date.now()
    this.clearJobFiles(job)
    return true
  }

  async deleteJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id)
    if (!job) return false
    this.clearJobFiles(job)
    if (job.result?.fileId) {
      await getTempStorage().delete(job.result.fileId).catch(() => undefined)
      if (job.result.files) {
        await Promise.all(
          job.result.files.map((f) =>
            getTempStorage().delete(f.fileId).catch(() => undefined)
          )
        )
      }
    }
    this.jobs.delete(id)
    return true
  }

  getNextPendingJob(): Job | null {
    if (this.processingCount >= this.config.maxConcurrentJobs) return null
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') return job
    }
    return null
  }

  startProcessing(): void {
    this.processingCount++
  }

  finishProcessing(): void {
    this.processingCount = Math.max(0, this.processingCount - 1)
  }

  getStats() {
    const stats = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 }
    for (const job of this.jobs.values()) {
      stats.total++
      stats[job.status]++
    }
    return stats
  }

  /**
   * Drop references to input buffers so V8 can reclaim them after the
   * job moves to a terminal state. We don't `null` the buffer (would
   * require `@ts-expect-error`) — instead we point at a zero-length
   * Buffer so the original memory becomes unreachable.
   */
  private clearJobFiles(job: Job): void {
    const empty = Buffer.alloc(0)
    for (const file of job.files) {
      file.buffer = empty
    }
  }

  async cleanup(): Promise<number> {
    const now = Date.now()
    let removed = 0
    for (const [id, job] of this.jobs) {
      if (now > job.expiresAt) {
        this.clearJobFiles(job)
        if (job.result?.fileId) {
          await getTempStorage().delete(job.result.fileId).catch(() => undefined)
          if (job.result.files) {
            await Promise.all(
              job.result.files.map((f) =>
                getTempStorage().delete(f.fileId).catch(() => undefined)
              )
            )
          }
        }
        this.jobs.delete(id)
        removed++
      }
    }
    return removed
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => {
      void this.cleanup().catch(() => undefined)
    }, 60 * 1000)
    if (this.cleanupInterval.unref) this.cleanupInterval.unref()
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  clear(): void {
    for (const job of this.jobs.values()) this.clearJobFiles(job)
    this.jobs.clear()
    this.processingCount = 0
  }
}

let managerInstance: JobManager | null = null

export function getJobManager(config?: Partial<QueueConfig>): JobManager {
  if (!managerInstance) managerInstance = new JobManager(config)
  return managerInstance
}

export function resetJobManager(): void {
  if (managerInstance) {
    managerInstance.stopCleanup()
    managerInstance.clear()
    managerInstance = null
  }
}

export { JobManager }
