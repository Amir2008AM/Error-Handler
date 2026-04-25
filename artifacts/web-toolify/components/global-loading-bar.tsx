'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type ProgressStatus = 'idle' | 'processing' | 'completed' | 'error'

interface LoadingBarContextType {
  isLoading: boolean
  progress: number
  status: ProgressStatus
  message: string
  error?: string
  startLoading: (message?: string) => void
  stopLoading: (message?: string) => void
  setProgress: (value: number, message?: string) => void
  setRealProgress: (value: number, message?: string) => void
  setError: (error: string) => void
  reset: () => void
}

const LoadingBarContext = createContext<LoadingBarContextType | null>(null)

export function useLoadingBar() {
  const context = useContext(LoadingBarContext)
  if (!context) {
    throw new Error('useLoadingBar must be used within a LoadingBarProvider')
  }
  return context
}

export function LoadingBarProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgressValue] = useState(0)
  const [status, setStatus] = useState<ProgressStatus>('idle')
  const [message, setMessage] = useState('')
  const [error, setErrorState] = useState<string | undefined>()
  const [useRealProgress, setUseRealProgress] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startLoading = useCallback((msg?: string) => {
    setIsLoading(true)
    setStatus('processing')
    setProgressValue(0)
    setMessage(msg || 'Processing...')
    setErrorState(undefined)
    setUseRealProgress(false)
    
    // Simulate progress with engine-like increments (fallback for non-real progress)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      setProgressValue((prev) => {
        // Only auto-increment if not using real progress
        // Slow down as we approach 90%
        if (prev >= 90) return prev
        const increment = Math.random() * (prev < 50 ? 15 : prev < 80 ? 5 : 2)
        return Math.min(prev + increment, 90)
      })
    }, 200)
  }, [])

  const stopLoading = useCallback((msg?: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Complete the progress bar
    setProgressValue(100)
    setStatus('completed')
    setMessage(msg || 'Completed')
    
    // Hide after animation completes
    setTimeout(() => {
      setIsLoading(false)
      setProgressValue(0)
      setStatus('idle')
      setMessage('')
    }, 2000)
  }, [])

  const setProgress = useCallback((value: number, msg?: string) => {
    setProgressValue(value)
    if (msg) setMessage(msg)
  }, [])

  // Real progress from backend - stops the simulated progress
  const setRealProgress = useCallback((value: number, msg?: string) => {
    // Stop simulated progress when receiving real progress
    if (intervalRef.current && !useRealProgress) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setUseRealProgress(true)
    }
    setProgressValue(Math.min(100, Math.max(0, value)))
    if (msg) setMessage(msg)
  }, [useRealProgress])

  const setError = useCallback((err: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setStatus('error')
    setErrorState(err)
    setMessage('Failed')
    
    // Hide after showing error
    setTimeout(() => {
      setIsLoading(false)
      setProgressValue(0)
      setStatus('idle')
      setMessage('')
      setErrorState(undefined)
    }, 3000)
  }, [])

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsLoading(false)
    setProgressValue(0)
    setStatus('idle')
    setMessage('')
    setErrorState(undefined)
    setUseRealProgress(false)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <LoadingBarContext.Provider 
      value={{ 
        isLoading, 
        progress, 
        status,
        message,
        error,
        startLoading, 
        stopLoading, 
        setProgress,
        setRealProgress,
        setError,
        reset,
      }}
    >
      {children}
    </LoadingBarContext.Provider>
  )
}

// Enhanced loading bar component with status display
interface LoadingBarProps {
  className?: string
  showStatus?: boolean
  showPercentage?: boolean
}

export function LoadingBar({ 
  className, 
  showStatus = true,
  showPercentage = true,
}: LoadingBarProps) {
  const { isLoading, progress, status, message, error } = useLoadingBar()

  const getBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
      case 'error':
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
      default:
        return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case 'processing':
        return <Loader2 className="w-3.5 h-3.5 text-green-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    if (error) return error
    return message || (status === 'processing' ? 'Processing...' : status === 'completed' ? 'Completed' : '')
  }
  
  return (
    <div
      className={cn(
        'w-full overflow-hidden transition-all duration-300',
        isLoading ? 'opacity-100 mt-3' : 'opacity-0 mt-0 h-0',
        className
      )}
    >
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-200 ease-out',
            getBarColor()
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status text */}
      {showStatus && isLoading && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs">
            {getStatusIcon()}
            <span
              className={cn(
                'font-medium truncate max-w-[200px]',
                status === 'completed' && 'text-green-600',
                status === 'error' && 'text-red-600',
                status === 'processing' && 'text-muted-foreground'
              )}
            >
              {getStatusText()}
            </span>
          </div>
          {showPercentage && status === 'processing' && (
            <span className="text-xs text-muted-foreground font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
