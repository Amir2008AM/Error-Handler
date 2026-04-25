/**
 * Progress Manager
 * Manages real-time progress tracking with callbacks
 */

import type { ProgressCallback, ProgressState, ProgressStep, ProgressUpdate, ProgressResult } from './types'

export class ProgressManager {
  private progress: number = 0
  private message: string = ''
  private steps: Map<string, ProgressStep> = new Map()
  private listeners: Array<(update: ProgressUpdate) => void> = []
  private status: ProgressState['status'] = 'idle'

  /**
   * Subscribe to progress updates
   */
  subscribe(listener: (update: ProgressUpdate) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Emit progress update to all listeners
   */
  private emit(update: ProgressUpdate): void {
    this.listeners.forEach((listener) => listener(update))
  }

  /**
   * Get a progress callback for processors
   */
  getProgressCallback(): ProgressCallback {
    return (progress: number, message?: string) => {
      this.progress = Math.min(100, Math.max(0, progress))
      if (message) this.message = message
      this.emit({
        type: 'progress',
        progress: this.progress,
        message: this.message,
      })
    }
  }

  /**
   * Start processing
   */
  start(message: string = 'Starting...'): void {
    this.status = 'processing'
    this.progress = 0
    this.message = message
    this.steps.clear()
    this.emit({
      type: 'progress',
      progress: 0,
      message,
    })
  }

  /**
   * Update overall progress
   */
  update(progress: number, message?: string): void {
    this.progress = Math.min(100, Math.max(0, progress))
    if (message) this.message = message
    this.emit({
      type: 'progress',
      progress: this.progress,
      message: this.message,
    })
  }

  /**
   * Start a processing step
   */
  startStep(stepId: string, label: string): void {
    const step: ProgressStep = {
      id: stepId,
      label,
      status: 'active',
      progress: 0,
    }
    this.steps.set(stepId, step)
    this.emit({
      type: 'step',
      step,
    })
  }

  /**
   * Update step progress
   */
  updateStep(stepId: string, progress: number): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.progress = progress
      this.emit({
        type: 'step',
        step,
      })
    }
  }

  /**
   * Complete a step
   */
  completeStep(stepId: string): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'completed'
      step.progress = 100
      this.emit({
        type: 'step',
        step,
      })
    }
  }

  /**
   * Mark step as failed
   */
  failStep(stepId: string, error?: string): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'error'
      this.emit({
        type: 'step',
        step,
      })
    }
  }

  /**
   * Complete processing successfully
   */
  complete(result?: ProgressResult, message: string = 'Completed'): void {
    this.status = 'completed'
    this.progress = 100
    this.message = message
    this.emit({
      type: 'complete',
      progress: 100,
      message,
      result,
    })
  }

  /**
   * Fail processing with error
   */
  fail(error: string): void {
    this.status = 'error'
    this.message = error
    this.emit({
      type: 'error',
      error,
    })
  }

  /**
   * Get current state
   */
  getState(): ProgressState {
    return {
      status: this.status,
      progress: this.progress,
      message: this.message,
      steps: Array.from(this.steps.values()),
    }
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.progress = 0
    this.message = ''
    this.status = 'idle'
    this.steps.clear()
    this.listeners = []
  }
}

// Create progress-enabled response for streaming
export function createProgressStream(
  processor: (onProgress: ProgressCallback) => Promise<{ data: Buffer; fileName: string; mimeType: string; metadata?: Record<string, unknown> }>
): ReadableStream {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: ProgressUpdate) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`))
      }

      try {
        const onProgress: ProgressCallback = (progress, message) => {
          sendUpdate({
            type: 'progress',
            progress,
            message,
          })
        }

        const result = await processor(onProgress)
        
        // Store the result and send completion
        // The actual file will be served separately
        sendUpdate({
          type: 'complete',
          progress: 100,
          message: 'Processing complete',
          result: {
            fileName: result.fileName,
            fileSize: result.data.length,
            mimeType: result.mimeType,
            metadata: result.metadata,
          },
        })
      } catch (error) {
        sendUpdate({
          type: 'error',
          error: error instanceof Error ? error.message : 'Processing failed',
        })
      } finally {
        controller.close()
      }
    },
  })
}
