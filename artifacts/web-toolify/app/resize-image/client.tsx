'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, Link, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'

interface ResizeResult {
  downloadUrl: string
  filename: string
  width: number
  height: number
  originalSize: number
  outputSize: number
}

export function ResizeImageClient() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [origWidth, setOrigWidth] = useState(0)
  const [origHeight, setOrigHeight] = useState(0)
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [keepRatio, setKeepRatio] = useState(true)
  const [result, setResult] = useState<ResizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    progress.reset()
    const url = URL.createObjectURL(f)
    setPreview(url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setOrigWidth(img.naturalWidth)
      setOrigHeight(img.naturalHeight)
      setWidth(img.naturalWidth.toString())
      setHeight(img.naturalHeight.toString())
    }
    img.src = url
  }, [progress])

  const handleWidthChange = (val: string) => {
    setWidth(val)
    if (keepRatio && origWidth && origHeight) {
      const w = parseInt(val, 10)
      if (!isNaN(w) && w > 0) setHeight(Math.round((w / origWidth) * origHeight).toString())
    }
    setResult(null)
  }

  const handleHeightChange = (val: string) => {
    setHeight(val)
    if (keepRatio && origWidth && origHeight) {
      const h = parseInt(val, 10)
      if (!isNaN(h) && h > 0) setWidth(Math.round((h / origHeight) * origWidth).toString())
    }
    setResult(null)
  }

  const handleResize = async () => {
    if (!file) return
    const w = parseInt(width, 10)
    const h = parseInt(height, 10)
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      setError('Please enter valid width and height values.')
      return
    }

    setError(null)
    setResult(null)
    progress.startProcessing('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('width', w.toString())
      formData.append('height', h.toString())
      formData.append('maintainAspect', keepRatio ? 'true' : 'false')
      formData.append('unit', 'px')
      formData.append('format', 'same')
      formData.append('quality', '90')

      progress.updateProgress(20, 'Loading image...')

      const res = await fetch('/api/resize-image', { method: 'POST', body: formData })
      
      progress.updateProgress(50, 'Resizing image...')
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Resize failed')
      }

      progress.updateProgress(80, 'Encoding output...')

      const blob = await res.blob()
      const outW = parseInt(res.headers.get('X-Output-Width') ?? w.toString(), 10)
      const outH = parseInt(res.headers.get('X-Output-Height') ?? h.toString(), 10)
      const origSize = parseInt(res.headers.get('X-Original-Size') ?? '0', 10)
      const outSize = parseInt(res.headers.get('X-Output-Size') ?? '0', 10)

      progress.updateProgress(95, 'Preparing download...')

      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/avif' ? 'avif' : 'jpg'
      const filename = `${file.name.replace(/\.[^/.]+$/, '')}-${outW}x${outH}.${ext}`
      setResult({ downloadUrl: URL.createObjectURL(blob), filename, width: outW, height: outH, originalSize: origSize, outputSize: outSize })
      
      progress.complete('Resize complete!')
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
    setWidth('')
    setHeight('')
    setOrigWidth(0)
    setOrigHeight(0)
    progress.reset()
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      {!file ? (
        <UploadDropzone
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
          sublabel="Supports JPG, PNG, WebP, AVIF"
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview ?? ''} alt="Preview" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={reset} 
                disabled={isProcessing}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-destructive transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                {origWidth} × {origHeight}px
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Dimensions</label>
                <button
                  onClick={() => setKeepRatio(!keepRatio)}
                  disabled={isProcessing}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50',
                    keepRatio ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  {keepRatio ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                  {keepRatio ? 'Ratio locked' : 'Free resize'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Width (px)</label>
                  <input 
                    type="number" 
                    value={width} 
                    onChange={(e) => handleWidthChange(e.target.value)} 
                    min={1}
                    disabled={isProcessing}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Height (px)</label>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => handleHeightChange(e.target.value)} 
                    min={1}
                    disabled={isProcessing}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white disabled:opacity-50" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResize}
                  disabled={isProcessing || !width || !height}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Resizing...</>
                  ) : (
                    'Resize Image'
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

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {result && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Resized to {result.width} × {result.height}px</p>
                  <p className="text-sm text-green-700">
                    {result.originalSize > 0 && result.outputSize > 0
                      ? `${formatBytes(result.originalSize)} → ${formatBytes(result.outputSize)}`
                      : result.filename}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={result.downloadUrl} 
                  download={result.filename} 
                  className="flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button 
                  onClick={reset} 
                  className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
