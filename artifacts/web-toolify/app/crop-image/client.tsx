'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, Crop } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function CropImageClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 })
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    setResult(null)
    setError(null)
    progress.reset()
    
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      const cropW = Math.round(img.width * 0.5)
      const cropH = Math.round(img.height * 0.5)
      setCropArea({
        x: Math.round((img.width - cropW) / 2),
        y: Math.round((img.height - cropH) / 2),
        width: cropW,
        height: cropH,
      })
    }
    img.src = url
  }, [progress])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }
  }, [preview])

  const handleCrop = async () => {
    if (!file || !imageSize) return
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('left', cropArea.x.toString())
      formData.append('top', cropArea.y.toString())
      formData.append('width', cropArea.width.toString())
      formData.append('height', cropArea.height.toString())

      const res = await xhrUpload({
        url: '/api/crop-image',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading image...')
        },
      })

      progress.stageValidation('Validating image...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Crop failed')
      }

      progress.stageProcessing(undefined, ['Cropping image...', 'Almost done...'])

      const blob = await res.blob()

      const downloadUrl = URL.createObjectURL(blob)
      const ext = file.name.split('.').pop() ?? 'jpg'
      const filename = `${file.name.replace(/\.[^/.]+$/, '')}-cropped.${ext}`

      setResult({ downloadUrl, filename })
      progress.stageDone('Crop complete!')
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
    setImageSize(null)
    setResult(null)
    setError(null)
    progress.reset()
  }

  const getScale = () => {
    if (!imageSize || containerSize.width === 0) return 1
    const scaleX = containerSize.width / imageSize.width
    const scaleY = (containerSize.height || 300) / imageSize.height
    return Math.min(scaleX, scaleY, 1)
  }

  const scale = getScale()
  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label={t(lang, 'crop.dropImage')}
          sublabel="Supports JPG, PNG, WebP"
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{file.name}</p>
              <button
                onClick={reset}
                disabled={isProcessing}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t(lang, 'crop.remove')}
              </button>
            </div>

            <div 
              ref={containerRef}
              className="relative rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center"
              style={{ minHeight: 300 }}
            >
              {preview && imageSize && (
                <div className="relative" style={{ 
                  width: imageSize.width * scale, 
                  height: imageSize.height * scale 
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="block"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  
                  <div 
                    className="absolute inset-0 bg-black/50 pointer-events-none"
                    style={{
                      clipPath: `polygon(
                        0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                        ${(cropArea.x / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%,
                        ${(cropArea.x / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%,
                        ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%,
                        ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%,
                        ${(cropArea.x / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%
                      )`
                    }}
                  />
                  
                  <div 
                    className="absolute border-2 border-white border-dashed"
                    style={{
                      left: cropArea.x * scale,
                      top: cropArea.y * scale,
                      width: cropArea.width * scale,
                      height: cropArea.height * scale,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {imageSize && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t(lang, 'crop.xPosition')}</label>
                <input
                  type="number"
                  value={cropArea.x}
                  min={0}
                  max={imageSize.width - cropArea.width}
                  disabled={isProcessing}
                  onChange={(e) => setCropArea({ ...cropArea, x: Math.max(0, Math.min(parseInt(e.target.value) || 0, imageSize.width - cropArea.width)) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t(lang, 'crop.yPosition')}</label>
                <input
                  type="number"
                  value={cropArea.y}
                  min={0}
                  max={imageSize.height - cropArea.height}
                  disabled={isProcessing}
                  onChange={(e) => setCropArea({ ...cropArea, y: Math.max(0, Math.min(parseInt(e.target.value) || 0, imageSize.height - cropArea.height)) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t(lang, 'crop.width')}</label>
                <input
                  type="number"
                  value={cropArea.width}
                  min={10}
                  max={imageSize.width - cropArea.x}
                  disabled={isProcessing}
                  onChange={(e) => setCropArea({ ...cropArea, width: Math.max(10, Math.min(parseInt(e.target.value) || 10, imageSize.width - cropArea.x)) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{t(lang, 'crop.height')}</label>
                <input
                  type="number"
                  value={cropArea.height}
                  min={10}
                  max={imageSize.height - cropArea.y}
                  disabled={isProcessing}
                  onChange={(e) => setCropArea({ ...cropArea, height: Math.max(10, Math.min(parseInt(e.target.value) || 10, imageSize.height - cropArea.y)) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {imageSize && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-center justify-between">
              <span>{t(lang, 'crop.original')}: {imageSize.width} x {imageSize.height}px</span>
              <span>{t(lang, 'crop.cropArea')}: {cropArea.width} x {cropArea.height}px</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t(lang, 'crop.processing')}</>
              ) : (
                <><Crop className="w-5 h-5" /> {t(lang, 'crop.action')}</>
              )}
            </button>

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

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {result && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">{t(lang, 'crop.successTitle')}</p>
                  <p className="text-sm text-green-700">{t(lang, 'crop.cropArea')}: {cropArea.width} x {cropArea.height}px</p>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.filename}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t(lang, 'crop.download')}
                </a>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t(lang, 'crop.newImage')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
