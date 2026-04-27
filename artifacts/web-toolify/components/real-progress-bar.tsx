'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export type ProgressStatus = 'idle' | 'processing' | 'completed' | 'error'

export interface ProgressState {
  status: ProgressStatus
  progress: number
  message: string
  error?: string
}

interface RealProgressBarProps {
  status: ProgressStatus
  progress: number
  message?: string
  error?: string
  className?: string
  showPercentage?: boolean
  showMessage?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  onHidden?: () => void
}

export function RealProgressBar({
  status,
  progress,
  message,
  error,
  className,
  showPercentage = true,
  showMessage = true,
  autoHide = true,
  autoHideDelay = 2000,
  onHidden,
}: RealProgressBarProps) {
  const [visible, setVisible] = useState(false)
  const [displayProgress, setDisplayProgress] = useState(0)
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Smooth progress animation
  useEffect(() => {
    if (status === 'processing' || status === 'completed') {
      // Animate to target progress
      const diff = progress - displayProgress
      if (Math.abs(diff) > 0.5) {
        const step = diff > 0 ? Math.min(diff, 5) : Math.max(diff, -5)
        const timer = setTimeout(() => {
          setDisplayProgress(prev => Math.min(100, Math.max(0, prev + step)))
        }, 16)
        return () => clearTimeout(timer)
      } else {
        setDisplayProgress(progress)
      }
    }
  }, [progress, displayProgress, status])

  // Handle visibility
  useEffect(() => {
    if (status === 'processing') {
      setVisible(true)
      setDisplayProgress(0)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    } else if (status === 'completed') {
      setDisplayProgress(100)
      if (autoHide) {
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false)
          onHidden?.()
        }, autoHideDelay)
      }
    } else if (status === 'error') {
      setVisible(true)
      if (autoHide) {
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false)
          onHidden?.()
        }, autoHideDelay + 1000)
      }
    } else if (status === 'idle') {
      setVisible(false)
      setDisplayProgress(0)
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [status, autoHide, autoHideDelay, onHidden])

  if (!visible && status === 'idle') {
    return null
  }

  const getBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-green-500'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return error || 'Failed'
      case 'processing':
        return message || 'Processing...'
      default:
        return ''
    }
  }

  return (
    <div
      className={cn(
        'w-full transition-all duration-300 ease-out',
        visible ? 'opacity-100 mt-3' : 'opacity-0 mt-0 h-0 overflow-hidden',
        className
      )}
    >
      {/* Progress bar */}
      <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out',
            getBarColor(),
            status === 'processing' && 'shadow-[0_0_10px_rgba(34,197,94,0.5)]'
          )}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Status text */}
      {(showMessage || showPercentage) && (
        <div className="flex items-center justify-between mt-2">
          {showMessage && (
            <div className="flex items-center gap-1.5 text-xs">
              {getStatusIcon()}
              <span
                className={cn(
                  'font-medium',
                  status === 'completed' && 'text-green-600',
                  status === 'error' && 'text-red-600',
                  status === 'processing' && 'text-muted-foreground'
                )}
              >
                {getStatusText()}
              </span>
            </div>
          )}
          {showPercentage && status === 'processing' && (
            <span className="text-xs text-muted-foreground font-medium">
              {Math.round(displayProgress)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Standardized stage milestones used across all tools.
// Stage     -> overall progress
//   Upload  ->   0% .. 10%   (driven by real upload bytes)
//   Validation ->     20%    (server has accepted + validated)
//   Processing -> 20% .. 70% (work in progress on the server)
//   Done    ->          100% (success)
export const PROGRESS_STAGES = {
  UPLOAD_END: 10,
  VALIDATION_END: 20,
  PROCESSING_END: 70,
  DONE: 100,
} as const

// Hook for using real progress with fetch-based processing
export function useRealProgress() {
  const [state, setState] = useState<ProgressState>({
    status: 'idle',
    progress: 0,
    message: '',
  })

  const startProcessing = useCallback((message: string = 'Processing...') => {
    setState({
      status: 'processing',
      progress: 0,
      message,
    })
  }, [])

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message || prev.message,
    }))
  }, [])

  const complete = useCallback((message: string = 'Completed') => {
    setState({
      status: 'completed',
      progress: 100,
      message,
    })
  }, [])

  const fail = useCallback((error: string) => {
    setState({
      status: 'error',
      progress: 0,
      message: 'Failed',
      error,
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      message: '',
    })
  }, [])

  // ---- Standardized stage helpers (Upload 10 -> Validation 20 -> Processing 70 -> Done 100) ----

  // Map upload bytes (0..100) to overall 0..UPLOAD_END (10%).
  const stageUpload = useCallback((uploadPct: number, message: string = 'Uploading...') => {
    const clamped = Math.min(100, Math.max(0, uploadPct))
    const overall = (clamped / 100) * PROGRESS_STAGES.UPLOAD_END
    setState(prev => ({
      status: 'processing',
      progress: Math.max(prev.progress, overall),
      message,
    }))
  }, [])

  // Server has received the request and validated the input.
  const stageValidation = useCallback((message: string = 'Validating...') => {
    setState(prev => ({
      status: 'processing',
      progress: Math.max(prev.progress, PROGRESS_STAGES.VALIDATION_END),
      message,
    }))
  }, [])

  // Work happening on the server. Optional 0..100 sub-progress maps into 20..70.
  const stageProcessing = useCallback((stagePct?: number, message: string = 'Processing...') => {
    const span = PROGRESS_STAGES.PROCESSING_END - PROGRESS_STAGES.VALIDATION_END
    const overall =
      stagePct === undefined
        ? PROGRESS_STAGES.PROCESSING_END
        : PROGRESS_STAGES.VALIDATION_END + (Math.min(100, Math.max(0, stagePct)) / 100) * span
    setState(prev => ({
      status: 'processing',
      progress: Math.max(prev.progress, overall),
      message,
    }))
  }, [])

  // Successful completion -> 100%.
  const stageDone = useCallback((message: string = 'Done') => {
    setState({
      status: 'completed',
      progress: PROGRESS_STAGES.DONE,
      message,
    })
  }, [])

  // Process with streaming progress updates
  const processWithProgress = useCallback(async (
    url: string,
    formData: FormData,
    options?: {
      onComplete?: (blob: Blob, headers: Headers) => void
      onError?: (error: string) => void
    }
  ) => {
    startProcessing('Uploading...')

    try {
      // First, upload and process
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Processing failed' }))
        throw new Error(errorData.error || 'Processing failed')
      }

      // Check if this is a streaming response
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE streaming progress
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) throw new Error('No response body')

        let resultBlob: Blob | null = null
        let resultHeaders = response.headers

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                  updateProgress(data.progress, data.message)
                } else if (data.type === 'complete') {
                  complete(data.message || 'Completed')
                  if (data.downloadUrl) {
                    // Fetch the result file
                    const fileResponse = await fetch(data.downloadUrl)
                    resultBlob = await fileResponse.blob()
                    resultHeaders = fileResponse.headers
                  }
                  options?.onComplete?.(resultBlob!, resultHeaders)
                  return
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      } else {
        // Non-streaming response - simulate progress based on response
        updateProgress(30, 'Processing...')
        
        const blob = await response.blob()
        updateProgress(90, 'Finalizing...')
        
        complete('Completed')
        options?.onComplete?.(blob, response.headers)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed'
      fail(message)
      options?.onError?.(message)
    }
  }, [startProcessing, updateProgress, complete, fail])

  return {
    ...state,
    startProcessing,
    updateProgress,
    complete,
    fail,
    reset,
    processWithProgress,
    // Standardized stages: Upload -> 10, Validation -> 20, Processing -> 70, Done -> 100
    stageUpload,
    stageValidation,
    stageProcessing,
    stageDone,
  }
}

// Hook for job-based progress with polling
export function useJobProgress(pollInterval: number = 500) {
  const [state, setState] = useState<ProgressState>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [jobId, setJobId] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const pollingRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: 'Job not found or expired',
          }))
          if (pollingRef.current) clearInterval(pollingRef.current)
          return
        }
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()
      
      setState({
        status: data.status === 'pending' || data.status === 'processing' 
          ? 'processing' 
          : data.status === 'completed' 
            ? 'completed' 
            : 'error',
        progress: data.progress,
        message: data.status === 'pending' 
          ? 'Waiting in queue...' 
          : data.status === 'processing' 
            ? 'Processing...' 
            : data.status === 'completed'
              ? 'Completed'
              : 'Failed',
        error: data.error,
      })

      if (data.status === 'completed') {
        setResult(data.result)
        if (pollingRef.current) clearInterval(pollingRef.current)
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    } catch (error) {
      console.error('Error polling job status:', error)
    }
  }, [])

  const startJob = useCallback(async (
    type: string,
    files: File[],
    options?: Record<string, unknown>
  ) => {
    setState({
      status: 'processing',
      progress: 0,
      message: 'Starting...',
    })
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('type', type)
      
      if (options) {
        formData.append('options', JSON.stringify(options))
      }

      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })

      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const data = await response.json()
      setJobId(data.id)

      // If already completed (processNow=true)
      if (data.status === 'completed') {
        setState({
          status: 'completed',
          progress: 100,
          message: 'Completed',
        })
        setResult(data.result)
        return data.id
      }

      // Start polling
      pollingRef.current = setInterval(() => {
        pollStatus(data.id)
      }, pollInterval)

      // Initial poll
      pollStatus(data.id)

      return data.id
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed'
      setState({
        status: 'error',
        progress: 0,
        message: 'Failed',
        error: message,
      })
      return null
    }
  }, [pollStatus, pollInterval])

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    setJobId(null)
    setResult(null)
    setState({
      status: 'idle',
      progress: 0,
      message: '',
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return {
    ...state,
    jobId,
    result,
    startJob,
    reset,
  }
}
