'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'
import { formatBytes } from '@/lib/utils/format-bytes'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'


type WatermarkPosition = 'center' | 'diagonal' | 'top' | 'bottom'


export function WatermarkPdfClient() {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [opacity, setOpacity] = useState(30)
  const [position, setPosition] = useState<WatermarkPosition>('diagonal')
  const [fontSize, setFontSize] = useState(50)
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

  const handleWatermark = async () => {
    if (progress.status === 'processing') return
    if (!file || !text.trim()) return
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('text', text.trim())
      formData.append('opacity', (opacity / 100).toString())
      formData.append('position', position)
      formData.append('fontSize', fontSize.toString())

      const res = await xhrUpload({
        url: '/api/watermark-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to add watermark')
      }

      progress.stageProcessing(undefined, ['Adding watermark...', 'Almost done...'])

      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const filename = `${file.name.replace(/\.pdf$/i, '')}-watermarked.pdf`

      setResult({ downloadUrl, filename })
      progress.stageDone(t('watermark.successTitle'))
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
          label={t('common.dropPdfHere')}
          sublabel={t('common.maxFileSizeMB')}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  {t('watermark.text')}
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setResult(null) }}
                  placeholder={t('watermark.placeholder')}
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  {t('watermark.position')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['diagonal', 'center', 'top', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => { setPosition(pos); setResult(null) }}
                      disabled={isProcessing}
                      className={cn(
                        'py-2 rounded-lg text-xs font-semibold border transition-all capitalize disabled:opacity-50',
                        position === pos
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    {t('watermark.opacity')}: <span className="text-primary">{opacity}%</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={opacity}
                  onChange={(e) => { setOpacity(parseInt(e.target.value, 10)); setResult(null) }}
                  disabled={isProcessing}
                  className="w-full accent-primary disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t('watermark.moreSubtle')}</span>
                  <span>{t('watermark.moreVisible')}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    {t('watermark.fontSize')}: <span className="text-primary">{fontSize}pt</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={fontSize}
                  onChange={(e) => { setFontSize(parseInt(e.target.value, 10)); setResult(null) }}
                  disabled={isProcessing}
                  className="w-full accent-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleWatermark}
                  disabled={isProcessing || !text.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> {t('watermark.processing')}</>
                  ) : (
                    <><Droplets className="w-5 h-5" /> {t('watermark.action')}</>
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
            </div>
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
                  <p className="font-semibold text-green-900">{t('watermark.successTitle')}</p>
                  <p className="text-sm text-green-700">&quot;{text}&quot; watermark applied to all pages</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.filename}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('watermark.download')}
                </a>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('watermark.newFile')}
                </button>
              </div>
            </div>
          )}
          {result && progress.status === 'completed' && (
            <ShareButtons downloadUrl={result.downloadUrl} filename={result.filename} />
          )}
          {result && progress.status === 'completed' && <TrustpilotReview />}
        </div>
      )}
    </div>
  )
}
