/**
 * Job Manager
 * In-memory job queue management for Vercel serverless
 */

import { nanoid } from 'nanoid'
import {
  Job,
  JobStatus,
  JobType,
  JobOptions,
  JobFile,
  JobResult,
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
   * Create a new job
   */
  createJob(
    type: JobType,
    files: Array<{ name: string; buffer: Buffer; type: string }>,
    options: JobOptions = {}
  ): Job {
    // Validate file sizes
    let totalSize = 0
    for (const file of files) {
      if (file.buffer.length > this.config.maxFileSizeBytes) {
        throw new Error(
          `File "${file.name}" exceeds maximum size of ${Math.round(this.config.maxFileSizeBytes / 1024 / 1024)}MB`
        )
      }
      totalSize += file.buffer.length
    }

    if (totalSize > this.config.maxTotalFileSizeBytes) {
      throw new Error(
        `Total file size exceeds maximum of ${Math.round(this.config.maxTotalFileSizeBytes / 1024 / 1024)}MB`
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

  /**
   * Get a job by ID
   */
  getJob(id: string): Job | null {
    const job = this.jobs.get(id)
    
    if (!job) {
      return null
    }

    // Check if expired
    if (Date.now() > job.expiresAt) {
      this.deleteJob(id)
      return null
    }

    return job
  }

  /**
   * Get job status (public-safe response)
   */
  getJobStatus(id: string): JobStatusResponse | null {
    const job = this.getJob(id)
    
    if (!job) {
      return null
    }

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

  /**
   * Update job status
   */
  updateJobStatus(id: string, status: JobStatus, progress?: number): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    job.status = status
    
    if (progress !== undefined) {
      job.progress = Math.min(100, Math.max(0, progress))
    }

    if (status === 'processing' && !job.startedAt) {
      job.startedAt = Date.now()
    }

    if (status === 'completed' || status === 'failed') {
      job.completedAt = Date.now()
      // Clear file buffers to free memory
      this.clearJobFiles(job)
    }

    return true
  }

  /**
   * Update job progress
   */
  updateJobProgress(id: string, progress: number): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    job.progress = Math.min(100, Math.max(0, progress))
    return true
  }

  /**
   * Set job result
   */
  setJobResult(
    id: string,
    resultBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    // Store result in temp storage
    const storage = getTempStorage()
    const fileId = storage.store(resultBuffer, fileName, mimeType)

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

    // Clear input files to free memory
    this.clearJobFiles(job)

    return true
  }

  /**
   * Set job result with multiple files
   */
  setJobResultBatch(
    id: string,
    results: Array<{ buffer: Buffer; fileName: string; mimeType: string }>
  ): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    const storage = getTempStorage()
    const files = results.map((r) => {
      const fileId = storage.store(r.buffer, r.fileName, r.mimeType)
      return {
        fileId,
        fileName: r.fileName,
        fileSize: r.buffer.length,
        mimeType: r.mimeType,
        downloadUrl: `/api/files/${fileId}`,
      }
    })

    // If multiple files, also create a ZIP
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

  /**
   * Set job error
   */
  setJobError(id: string, error: string): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    job.status = 'failed'
    job.error = error
    job.completedAt = Date.now()

    this.clearJobFiles(job)

    return true
  }

  /**
   * Cancel a job
   */
  cancelJob(id: string): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false // Cannot cancel finished jobs
    }

    job.status = 'cancelled'
    job.completedAt = Date.now()
    this.clearJobFiles(job)

    return true
  }

  /**
   * Delete a job
   */
  deleteJob(id: string): boolean {
    const job = this.jobs.get(id)
    
    if (!job) {
      return false
    }

    this.clearJobFiles(job)
    this.jobs.delete(id)

    return true
  }

  /**
   * Get next pending job for processing
   */
  getNextPendingJob(): Job | null {
    if (this.processingCount >= this.config.maxConcurrentJobs) {
      return null
    }

    for (const job of this.jobs.values()) {
      if (job.status === 'pending') {
        return job
      }
    }

    return null
  }

  /**
   * Increment processing count
   */
  startProcessing(): void {
    this.processingCount++
  }

  /**
   * Decrement processing count
   */
  finishProcessing(): void {
    this.processingCount = Math.max(0, this.processingCount - 1)
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    cancelled: number
  } {
    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    for (const job of this.jobs.values()) {
      stats.total++
      stats[job.status]++
    }

    return stats
  }

  /**
   * Clear job file buffers to free memory
   */
  private clearJobFiles(job: Job): void {
    for (const file of job.files) {
      // @ts-expect-error - Intentionally clearing buffer
      file.buffer = null
    }
  }

  /**
   * Cleanup expired jobs
   */
  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [id, job] of this.jobs) {
      if (now > job.expiresAt) {
        this.clearJobFiles(job)
        this.jobs.delete(id)
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return
    }

    // Cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    for (const job of this.jobs.values()) {
      this.clearJobFiles(job)
    }
    this.jobs.clear()
    this.processingCount = 0
  }
}

// Singleton instance
let managerInstance: JobManager | null = null

export function getJobManager(config?: Partial<QueueConfig>): JobManager {
  if (!managerInstance) {
    managerInstance = new JobManager(config)
  }
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
