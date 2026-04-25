'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Download, 
  RefreshCw,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLoadingBar } from '@/components/global-loading-bar'

export interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  result?: {
    fileId: string
    fileName: string
    fileSize: number
    mimeType: string
    downloadUrl: string
    files?: Array<{
      fileId: string
      fileName: string
      fileSize: number
      mimeType: string
      downloadUrl: string
    }>
  }
  error?: string
}

interface ProcessingStatusProps {
  jobId: string
  onComplete?: (result: JobStatus['result']) => void
  onError?: (error: string) => void
  onCancel?: () => void
  className?: string
  showDownload?: boolean
  autoDownload?: boolean
}

export function ProcessingStatus({
  jobId,
  onComplete,
  onError,
  onCancel,
  className,
  showDownload = true,
  autoDownload = false,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [polling, setPolling] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const { startLoading, stopLoading, setProgress } = useLoadingBar()

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setStatus({
            id: jobId,
            status: 'failed',
            progress: 0,
            error: 'Job not found or expired',
          })
          setPolling(false)
          return
        }
        throw new Error('Failed to fetch status')
      }

      const data: JobStatus = await response.json()
      setStatus(data)
      
      // Update global loading bar progress
      if (data.status === 'pending' || data.status === 'processing') {
        setProgress(data.progress)
      }

      if (data.status === 'completed') {
        setPolling(false)
        stopLoading()
        onComplete?.(data.result)
        
        if (autoDownload && data.result?.downloadUrl) {
          handleDownload(data.result.downloadUrl, data.result.fileName)
        }
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setPolling(false)
        stopLoading()
        if (data.error) {
          onError?.(data.error)
        }
      }
    } catch (error) {
      console.error('Error fetching job status:', error)
    }
  }, [jobId, onComplete, onError, autoDownload])

  useEffect(() => {
    if (!polling) return

    startLoading()
    fetchStatus()
    
    const interval = setInterval(fetchStatus, 1000)
    
    return () => clearInterval(interval)
  }, [fetchStatus, polling, startLoading])

  const handleCancel = async () => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      setStatus((prev) => prev ? { ...prev, status: 'cancelled' } : null)
      setPolling(false)
      stopLoading()
      onCancel?.()
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  const handleDownload = async (url: string, fileName: string) => {
    setDownloading(true)
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error downloading file:', error)
    } finally {
      setDownloading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!status) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="py-6">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.status === 'pending' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="font-medium">Waiting in queue...</span>
                </>
              )}
              {status.status === 'processing' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">Processing...</span>
                </>
              )}
              {status.status === 'completed' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Completed</span>
                </>
              )}
              {status.status === 'failed' && (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium text-destructive">Failed</span>
                </>
              )}
              {status.status === 'cancelled' && (
                <>
                  <X className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Cancelled</span>
                </>
              )}
            </div>

            {(status.status === 'pending' || status.status === 'processing') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {(status.status === 'pending' || status.status === 'processing') && (
            <div className="space-y-2">
              <Progress value={status.progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-right">
                {status.progress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {status.status === 'failed' && status.error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {status.error}
            </div>
          )}

          {/* Download Section */}
          {status.status === 'completed' && status.result && showDownload && (
            <div className="space-y-3">
              {status.result.files && status.result.files.length > 1 ? (
                // Multiple files
                <div className="space-y-2">
                  {status.result.files.map((file, index) => (
                    <div
                      key={file.fileId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file.downloadUrl, file.fileName)}
                        disabled={downloading}
                      >
                        {downloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                // Single file
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{status.result.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(status.result.fileSize)}
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      handleDownload(
                        status.result!.downloadUrl,
                        status.result!.fileName
                      )
                    }
                    disabled={downloading}
                    className="ml-4"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Retry Button for Failed Jobs */}
          {status.status === 'failed' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for using job processing
export function useJobProcessor() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitJob = async (
    type: string,
    files: File[],
    options?: Record<string, unknown>,
    processNow = true
  ): Promise<string | null> => {
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('type', type)
      
      if (options) {
        formData.append('options', JSON.stringify(options))
      }

      if (processNow) {
        formData.append('processNow', 'true')
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
      
      return data.id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed'
      setError(message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setJobId(null)
    setIsProcessing(false)
    setError(null)
  }

  return {
    jobId,
    isProcessing,
    error,
    submitJob,
    reset,
  }
}
