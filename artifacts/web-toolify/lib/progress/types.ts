/**
 * Real Progress System Types
 * Defines types for real-time progress tracking
 */

export type ProgressStatus = 'idle' | 'processing' | 'completed' | 'error'

export interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  progress?: number // 0-100 for this step
}

export interface ProgressState {
  status: ProgressStatus
  progress: number // 0-100 overall
  message: string
  steps?: ProgressStep[]
  error?: string
  result?: ProgressResult
}

export interface ProgressResult {
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  files?: Array<{
    downloadUrl: string
    fileName: string
    fileSize: number
    mimeType: string
  }>
  metadata?: Record<string, unknown>
}

export interface ProgressUpdate {
  type: 'progress' | 'step' | 'complete' | 'error'
  progress?: number
  message?: string
  step?: ProgressStep
  error?: string
  result?: ProgressResult
}

// Progress callback for processors
export type ProgressCallback = (progress: number, message?: string) => void

// Step-based progress callback
export interface StepProgressCallback {
  updateProgress: (progress: number, message?: string) => void
  startStep: (stepId: string, label: string) => void
  completeStep: (stepId: string) => void
  failStep: (stepId: string, error?: string) => void
}
