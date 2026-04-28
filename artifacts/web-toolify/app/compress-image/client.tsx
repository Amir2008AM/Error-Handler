'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

interface CompressedResult {
  originalSize: number
  compressedSize: number
  downloadUrl: string
  filename: string
  savings: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function CompressImageClient() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState('same')
  const [result, setResult] = useState<CompressedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
    progress.reset()
  }, [progress])

  const handleCompress = async () => {
    if (!file) return
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('quality', quality.toString())
      formData.append('format', format)


      const res = await xhrUpload({
        url: '/api/compress-image',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading image...')
        },
      })

      progress.stageValidation('Validating image...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Compression failed')
      }

      progress.stageProcessing(undefined, 'Compressing image...')

      const originalSize = parseInt(res.headers.get('X-Original-Size') ?? '0', 10)
      const compressedSize = parseInt(res.headers.get('X-Compressed-Size') ?? '0', 10)
      const blob = await res.blob()

      const downloadUrl = URL.createObjectURL(blob)
      const savings = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0
      const outputExt = format === 'same' ? file.name.split('.').pop() ?? 'jpg' : format
      const filename = `${file.name.replace(/\.[^/.]+$/, '')}-compressed.${outputExt}`

      setResult({ originalSize, compressedSize, downloadUrl, filename, savings })
      progress.stageDone('Compression complete!')
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    if (result) URL.revokeObjectURL(result.downloadUrl)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    progress.reset()
  }

  const qualityLabel =
    quality >= 90 ? 'Maximum quality' :
    quality >= 75 ? 'High quality' :
    quality >= 60 ? 'Balanced' :
    quality >= 40 ? 'Lower quality' :
    'Minimum quality'

  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
          sublabel="Supports JPG, PNG, WebP, AVIF"
        />
      ) : (
        <div className="space-y-6">
          {/* Preview + Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? ''}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={reset}
                disabled={isProcessing}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-destructive transition-colors disabled:opacity-50"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                {file.name}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1">
                  Original file size
                </label>
                <p className="text-2xl font-bold text-foreground">{formatBytes(file.size)}</p>
              </div>

              {/* Quality Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Quality: <span className="text-primary">{quality}%</span>
                  </label>
                  <span className="text-xs text-muted-foreground">{qualityLabel}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  disabled={isProcessing}
                  onChange={(e) => { setQuality(parseInt(e.target.value, 10)); setResult(null) }}
                  className="w-full accent-primary disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Output Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {['same', 'jpeg', 'png', 'webp'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => { setFormat(fmt); setResult(null) }}
                      disabled={isProcessing}
                      className={cn(
                        'py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50',
                        format === fmt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {fmt === 'same' ? 'Same' : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Compressing...</>
                  ) : (
                    <><ImageIcon className="w-5 h-5" /> Compress Image</>
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
                  <p className="font-semibold text-green-900">Image compressed successfully!</p>
                  <p className="text-sm text-green-700">Saved {result.savings}% of the original file size</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-muted-foreground">Original</p>
                  <p className="font-bold text-foreground">{formatBytes(result.originalSize)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-muted-foreground">Compressed</p>
                  <p className="font-bold text-green-700">{formatBytes(result.compressedSize)}</p>
                </div>
                <div className="bg-green-600 text-white rounded-lg p-3">
                  <p className="text-xs opacity-80">Saved</p>
                  <p className="font-bold text-xl">{result.savings}%</p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.filename}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Image
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
