'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Download, AlertCircle, RefreshCw } from 'lucide-react'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'

interface ProcessedFileCardProps {
  fileId: string
  filename: string
  children?: React.ReactNode
}

export function ProcessedFileCard({ fileId, filename, children }: ProcessedFileCardProps) {
  const [autoFailed, setAutoFailed]     = useState(false)
  const [downloading, setDownloading]   = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    const timer = setTimeout(() => {
      try {
        const a = document.createElement('a')
        a.href = `/api/files/${fileId}`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch {
        setAutoFailed(true)
      }
    }, 200)

    const hint = setTimeout(() => setAutoFailed(true), 4000)
    return () => { clearTimeout(timer); clearTimeout(hint) }
  }, [fileId, filename])

  const handleManualDownload = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await fetch(`/api/files/${fileId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || `Server returned ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed. The file may have expired.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-800">File ready</p>
            <p className="text-sm text-green-700 truncate">{filename}</p>

            {children && <div className="mt-2">{children}</div>}

            {autoFailed && !downloadError && (
              <p className="text-xs text-green-700 mt-2">
                Didn&apos;t start? Click the button to download.
              </p>
            )}

            {downloadError && (
              <div className="flex items-start gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{downloadError}</p>
              </div>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleManualDownload}
            disabled={downloading}
            className="shrink-0"
            aria-label={`Download ${filename}`}
          >
            {downloading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            <span className="ml-1.5">{downloadError ? 'Retry' : 'Download'}</span>
          </Button>
        </div>

        <div className="mt-3 pt-3 border-t border-green-100">
          <ShareButtons fileId={fileId} filename={filename} />
        </div>
      </Card>

      <TrustpilotReview />
    </>
  )
}
