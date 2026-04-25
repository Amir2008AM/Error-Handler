/**
 * Job Queue System Types
 * Supports async processing with status tracking
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type JobType = 
  | 'merge-pdf'
  | 'split-pdf'
  | 'rotate-pdf'
  | 'compress-pdf'
  | 'watermark-pdf'
  | 'protect-pdf'
  | 'unlock-pdf'
  | 'sign-pdf'
  | 'pdf-to-jpg'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'html-to-pdf'
  | 'ocr-pdf'
  | 'ocr-image'
  | 'compress-image'
  | 'resize-image'
  | 'convert-image'
  | 'crop-image'
  | 'image-to-pdf'
  | 'add-page-numbers'
  | 'organize-pdf'
  | 'extract-pages'
  | 'delete-pages'
  | 'repair-pdf'

export interface JobFile {
  id: string
  name: string
  size: number
  type: string
  buffer: Buffer
}

export interface JobOptions {
  // PDF options
  password?: string
  permissions?: PDFPermissions
  quality?: 'low' | 'medium' | 'high'
  dpi?: number
  format?: string
  pages?: number[] | string // "1,3,5-7" or [1,3,5,6,7]
  rotation?: 0 | 90 | 180 | 270
  
  // Image options
  width?: number
  height?: number
  maintainAspectRatio?: boolean
  outputFormat?: 'jpg' | 'png' | 'webp' | 'gif'
  
  // Watermark options
  watermarkText?: string
  watermarkImage?: Buffer
  watermarkPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  watermarkOpacity?: number
  
  // OCR options
  language?: string
  outputType?: 'text' | 'searchable-pdf'
  
  // Batch options
  outputAsZip?: boolean
  
  // Generic
  [key: string]: unknown
}

export interface PDFPermissions {
  printing?: boolean
  modifying?: boolean
  copying?: boolean
  annotating?: boolean
  fillingForms?: boolean
  contentAccessibility?: boolean
  documentAssembly?: boolean
}

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  progress: number // 0-100
  files: JobFile[]
  options: JobOptions
  result?: JobResult
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  expiresAt: number
}

export interface JobResult {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  downloadUrl: string
  // For batch results
  files?: Array<{
    fileId: string
    fileName: string
    fileSize: number
    mimeType: string
    downloadUrl: string
  }>
  // For text extraction
  text?: string
  metadata?: Record<string, unknown>
}

export interface CreateJobRequest {
  type: JobType
  files: Array<{
    name: string
    buffer: Buffer
    type: string
  }>
  options?: JobOptions
}

export interface JobStatusResponse {
  id: string
  status: JobStatus
  progress: number
  result?: JobResult
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

// Queue configuration
export interface QueueConfig {
  maxConcurrentJobs: number
  jobTimeoutMs: number
  jobTtlMs: number
  maxJobsPerUser: number
  maxFileSizeBytes: number
  maxTotalFileSizeBytes: number
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrentJobs: 3,
  jobTimeoutMs: 5 * 60 * 1000, // 5 minutes
  jobTtlMs: 10 * 60 * 1000, // 10 minutes
  maxJobsPerUser: 10,
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  maxTotalFileSizeBytes: 500 * 1024 * 1024, // 500MB total
}
