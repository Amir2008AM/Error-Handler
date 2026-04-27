'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw, X,
  Scissors, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

type SplitMode = 'all' | 'range'

export function SplitPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<SplitMode>('all')
  const [rangeStr, setRangeStr] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('toolify-split.zip')
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFileSelected = useCallback((files: File[]) => {
    setFile(files[0])
    setDownloadUrl(null)
    setError(null)
    progress.reset()
  }, [progress])

  const handleSplit = async () => {
    if (!file) return
    if (mode === 'range' && !rangeStr.trim()) {
      setError('Please enter page ranges (e.g. 1-3, 5, 7-9)')
      return
    }

    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('mode', mode)
      formData.append('range', rangeStr)

      const res = await xhrUpload({
        url: '/api/split-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Split failed')
      }

      progress.stageProcessing(undefined, 'Splitting pages...')

      const contentType = res.headers.get('Content-Type') ?? ''
      const blob = await res.blob()

      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setDownloadFilename(
        contentType.includes('zip') ? 'toolify-split.zip' : 'toolify-split.pdf'
      )

      progress.stageDone('Split complete!')
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    setFile(null)
    setDownloadUrl(null)
    setError(null)
    setRangeStr('')
    setMode('all')
    progress.reset()
  }

  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      {!file ? (
        <UploadDropzone
          accept="application/pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label="Drop your PDF here or click to browse"
          sublabel="Select a PDF to split into multiple files or extract pages"
        />
      ) : (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button 
              onClick={reset} 
              disabled={isProcessing}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-3">Split Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setMode('all'); setDownloadUrl(null) }}
                disabled={isProcessing}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all disabled:opacity-50',
                  mode === 'all'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', mode === 'all' ? 'border-primary' : 'border-muted-foreground')}>
                    {mode === 'all' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-semibold text-sm">Split all pages</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Extract every page as a separate PDF file. Downloads as a ZIP archive.
                </p>
              </button>

              <button
                onClick={() => { setMode('range'); setDownloadUrl(null) }}
                disabled={isProcessing}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all disabled:opacity-50',
                  mode === 'range'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', mode === 'range' ? 'border-primary' : 'border-muted-foreground')}>
                    {mode === 'range' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-semibold text-sm">Custom page ranges</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Define specific pages or ranges to extract. Downloads as PDF or ZIP.
                </p>
              </button>
            </div>
          </div>

          {/* Range input */}
          {mode === 'range' && (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Page Ranges
              </label>
              <input
                type="text"
                value={rangeStr}
                onChange={(e) => { setRangeStr(e.target.value); setDownloadUrl(null) }}
                placeholder="e.g. 1-3, 5, 7-9"
                disabled={isProcessing}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Separate ranges with commas. Use hyphens for page ranges (e.g. <strong>1-3, 5, 8-10</strong>)
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSplit}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Splitting PDF...</>
                ) : (
                  <><Scissors className="w-5 h-5" /> Split PDF</>
                )}
              </button>
              <button
                onClick={reset}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>

            {/* Real Progress Bar */}
            <RealProgressBar
              status={progress.status}
              progress={progress.progress}
              message={progress.message}
              error={progress.error}
              className="w-full"
              showPercentage={true}
              showMessage={true}
              autoHide={false}
            />
          </div>

          {downloadUrl && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">PDF split successfully!</p>
                  <p className="text-sm text-green-700">
                    {downloadFilename.endsWith('.zip') ? 'Multiple PDFs packaged as ZIP' : 'Single PDF extracted'}
                  </p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                Download {downloadFilename.endsWith('.zip') ? 'ZIP' : 'PDF'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
