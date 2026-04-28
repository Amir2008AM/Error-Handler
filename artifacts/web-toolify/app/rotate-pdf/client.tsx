'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function RotatePdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [rotation, setRotation] = useState<90 | 180 | 270>(90)
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    progress.reset()
  }, [progress])

  const handleRotate = async () => {
    if (!file) return
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('rotation', rotation.toString())

      const res = await xhrUpload({
        url: '/api/rotate-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Rotation failed')
      }

      progress.stageProcessing(undefined, ['Rotating pages...', 'Almost done...'])

      const blob = await res.blob()

      const downloadUrl = URL.createObjectURL(blob)
      const filename = `${file.name.replace(/\.pdf$/i, '')}-rotated.pdf`

      setResult({ downloadUrl, filename })
      progress.stageDone('Rotation complete!')
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    if (result) URL.revokeObjectURL(result.downloadUrl)
    setFile(null)
    setResult(null)
    setError(null)
    progress.reset()
  }

  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone
          accept="application/pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label="Drop a PDF here or click to browse"
          sublabel="Maximum file size: 50MB"
        />
      ) : (
        <div className="space-y-6">
          {/* File info + Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Preview */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 p-6 flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-16 h-20 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-red-600 font-bold text-sm">PDF</span>
              </div>
              <p className="font-medium text-foreground text-center break-all">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
              <button
                onClick={reset}
                disabled={isProcessing}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-destructive transition-colors disabled:opacity-50"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Controls */}
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-3">
                  Rotation Angle
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([90, 180, 270] as const).map((angle) => (
                    <button
                      key={angle}
                      onClick={() => { setRotation(angle); setResult(null) }}
                      disabled={isProcessing}
                      className={cn(
                        'py-4 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center gap-2 disabled:opacity-50',
                        rotation === angle
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      <RotateCw 
                        className="w-6 h-6"
                        style={{ transform: `rotate(${angle}deg)` }}
                      />
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>All pages will be rotated by {rotation} degrees clockwise.</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Rotating...</>
                  ) : (
                    <><RotateCw className="w-5 h-5" /> Rotate PDF</>
                  )}
                </button>

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
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">PDF rotated successfully!</p>
                  <p className="text-sm text-green-700">All pages rotated by {rotation} degrees</p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.filename}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Rotated PDF
                </a>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  New File
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
