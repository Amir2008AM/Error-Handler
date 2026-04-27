'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'

interface ConvertResult {
  downloadUrl: string
  filename: string
  format: string
}

const formats = [
  { value: 'jpeg', label: 'JPG', description: 'Best for photos' },
  { value: 'png', label: 'PNG', description: 'Lossless quality' },
  { value: 'webp', label: 'WebP', description: 'Modern & compact' },
  { value: 'avif', label: 'AVIF', description: 'Next-gen format' },
]

export function ConvertImageClient() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [targetFormat, setTargetFormat] = useState('webp')
  const [result, setResult] = useState<ConvertResult | null>(null)
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

  const handleConvert = async () => {
    if (!file) return
    
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('quality', '90')
      formData.append('format', targetFormat)

      progress.updateProgress(0, 'Uploading image...')

      const res = await xhrUpload({
        url: '/api/convert-image',
        formData,
        onUploadProgress: (pct) => {
          progress.updateProgress(Math.round(pct * 0.3), 'Uploading image...')
        },
      })

      progress.updateProgress(50, 'Converting format...')
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Conversion failed')
      }

      progress.updateProgress(80, 'Encoding output...')

      const blob = await res.blob()
      
      progress.updateProgress(95, 'Preparing download...')
      
      const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat
      const filename = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`
      setResult({ downloadUrl: URL.createObjectURL(blob), filename, format: targetFormat.toUpperCase() })
      
      progress.complete('Conversion complete!')
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

  const currentFormat = file?.type.replace('image/', '').toUpperCase() ?? ''
  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      {!file ? (
        <UploadDropzone
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label="Drop an image here or click to browse"
          sublabel="Supports JPG, PNG, WebP, AVIF, GIF"
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
                {currentFormat} → {targetFormat.toUpperCase()}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-3">Convert To</label>
                <div className="grid grid-cols-2 gap-2">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => { setTargetFormat(fmt.value); setResult(null) }}
                      disabled={isProcessing}
                      className={cn(
                        'text-left p-3 rounded-xl border-2 transition-all disabled:opacity-50',
                        targetFormat === fmt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <p className="font-bold text-sm text-foreground">{fmt.label}</p>
                      <p className="text-xs text-muted-foreground">{fmt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Converting...</>
                  ) : (
                    `Convert to ${targetFormat.toUpperCase()}`
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
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {result && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Converted to {result.format}!</p>
                  <p className="text-sm text-green-700">{result.filename}</p>
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
