'use client'

import { useCallback, useEffect, useState } from 'react'
import { BackButton } from '@/components/back-button'
import { CheckCircle2, Download, Droplets, FileImage, Loader2, RotateCcw, Type, X } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { ShareButtons } from '@/components/share-buttons'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { UploadDropzone } from '@/components/upload-dropzone'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { formatBytes } from '@/lib/utils/format-bytes'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'

type WatermarkPosition = 'center' | 'diagonal' | 'top' | 'bottom'
type WatermarkMode = 'text' | 'image'
const imageTypes = ['image/png', 'image/jpeg', 'image/svg+xml']

export function WatermarkPdfClient() {
  const { t } = useI18n()
  const progress = useRealProgress()
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<WatermarkMode>('text')
  const [text, setText] = useState('CONFIDENTIAL')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [opacity, setOpacity] = useState(30)
  const [position, setPosition] = useState<WatermarkPosition>('diagonal')
  const [fontSize, setFontSize] = useState(50)
  const [fontFamily, setFontFamily] = useState('Helvetica')
  const [color, setColor] = useState('#334155')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [rotation, setRotation] = useState(-35)
  const [pageRange, setPageRange] = useState('all')
  const [imageScale, setImageScale] = useState(35)
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!image) {
      setImagePreview('')
      return
    }
    const url = URL.createObjectURL(image)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const clearResult = () => {
    setResult(null)
    setError(null)
  }
  const handleFileSelected = useCallback((files: File[]) => {
    if (!files[0]) return
    setFile(files[0])
    clearResult()
    progress.reset()
  }, [progress])

  const handleImageSelected = (candidate: File | undefined) => {
    if (!candidate) return
    if (!imageTypes.includes(candidate.type) || candidate.size > 10 * 1024 * 1024) {
      setError('Choose a PNG, JPG, or SVG image up to 10 MB.')
      return
    }
    setImage(candidate)
    clearResult()
  }

  const handleWatermark = async () => {
    if (progress.status === 'processing' || !file || (mode === 'text' && !text.trim()) || (mode === 'image' && !image)) return
    setError(null)
    setResult(null)
    progress.startProcessing('Uploading PDF...')
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('text', mode === 'text' ? text.trim() : '')
      formData.append('opacity', (opacity / 100).toString())
      formData.append('position', position)
      formData.append('fontSize', fontSize.toString())
      formData.append('fontFamily', fontFamily)
      formData.append('color', color)
      formData.append('backgroundColor', backgroundColor)
      formData.append('rotation', rotation.toString())
      formData.append('pageRange', pageRange.trim() || 'all')
       formData.append('imageScale', imageScale.toString())
      if (mode === 'image' && image) formData.append('image', image)
      const res = await xhrUpload({
        url: '/api/watermark-pdf',
        formData,
        onUploadProgress: (pct) => progress.stageUpload(pct, 'Uploading PDF...'),
      })
      progress.stageValidation('Validating PDF...')
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to add watermark')
      }
      progress.stageProcessing(undefined, ['Adding watermark...', 'Almost done...'])
      const downloadUrl = URL.createObjectURL(await res.blob())
      const filename = `${file.name.replace(/\.pdf$/i, '')}-watermarked.pdf`
      setResult({ downloadUrl, filename })
      progress.stageDone(t('watermark.successTitle'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    if (result) URL.revokeObjectURL(result.downloadUrl)
    setFile(null)
    setImage(null)
    setResult(null)
    setError(null)
    progress.reset()
  }
  const isProcessing = progress.status === 'processing'
  const canSubmit = !!file && !isProcessing && (mode === 'text' ? !!text.trim() : !!image)
  const positionStyle = position === 'top' ? { top: '18%', left: '50%' } : position === 'bottom' ? { top: '82%', left: '50%' } : { top: '50%', left: '50%' }

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone accept="application/pdf" multiple={false} onFilesSelected={handleFileSelected} label={t('common.dropPdfHere')} sublabel={t('common.maxFileSizeMB')} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-6" aria-label="Live watermark preview">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Live preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sample page · updates as you edit</p>
                </div>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">{pageRange === 'all' ? 'All pages' : `Pages ${pageRange}`}</span>
              </div>
              <div className="relative mx-auto aspect-[8.5/11] max-w-[440px] overflow-hidden rounded-lg border border-border bg-[#fffdf8] shadow-lg">
                <div className="absolute inset-x-8 top-10 h-2 rounded bg-slate-200" />
                <div className="absolute inset-x-8 top-16 h-1.5 rounded bg-slate-100" />
                <div className="absolute inset-x-8 top-24 h-1.5 rounded bg-slate-100" />
                <div className="absolute inset-x-8 top-32 h-1.5 rounded bg-slate-100" />
                <div className="absolute inset-x-8 top-44 grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-12 rounded bg-slate-100" />)}
                </div>
                <div className="absolute transition-transform duration-200" style={{ ...positionStyle, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, opacity: opacity / 100 }}>
                  {mode === 'image' && imagePreview ? (
                    <img src={imagePreview} alt="Image watermark preview" className="max-h-24 max-w-40 object-contain" style={{ width: `${imageScale * 2.2}px` }} />
                  ) : (
                    <span className="whitespace-nowrap rounded px-2 py-1 font-semibold" style={{ color, backgroundColor: backgroundColor || 'transparent', fontFamily, fontSize: `${Math.max(12, fontSize / 2)}px` }}>{text || 'Your watermark'}</span>
                  )}
                </div>
                <span className="absolute bottom-4 right-5 text-[10px] text-slate-300">PDF preview</span>
              </div>
            </section>

            <section className="space-y-4" aria-label="Watermark settings">
              <div className="relative rounded-xl border border-border bg-background p-1.5">
                <div className="grid grid-cols-2 gap-1">
                  {(['text', 'image'] as const).map((item) => (
                    <button key={item} type="button" onClick={() => { setMode(item); clearResult() }} disabled={isProcessing} className={cn('flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors', mode === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                      {item === 'text' ? <Type className="h-4 w-4" /> : <FileImage className="h-4 w-4" />} {item === 'text' ? 'Text watermark' : 'Image watermark'}
                    </button>
                  ))}
                </div>
              </div>
              {mode === 'text' ? (
                <label className="block text-sm font-semibold">Watermark text
                  <input value={text} onChange={(e) => { setText(e.target.value); clearResult() }} disabled={isProcessing} placeholder="For review" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
              ) : (
                <div>
                  <label htmlFor="watermark-image" className="mb-2 block text-sm font-semibold">Watermark image</label>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
                    <input id="watermark-image" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={(e) => { handleImageSelected(e.target.files?.[0]); e.target.value = '' }} disabled={isProcessing} className="min-w-0 flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary" />
                    {image && <button type="button" onClick={() => setImage(null)} disabled={isProcessing} aria-label="Remove watermark image" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or SVG · up to 10 MB</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                   <label className="text-sm font-semibold">Font family
                   <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); clearResult() }} disabled={isProcessing} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal">
                     <option value="Helvetica">Helvetica</option>
                     <option value="HelveticaBold">Helvetica Bold</option>
                     <option value="TimesRoman">Times Roman</option>
                     <option value="TimesRomanBold">Times Roman Bold</option>
                     <option value="Courier">Courier</option>
                     <option value="CourierBold">Courier Bold</option>
                   </select>
                </label>
                <label className="text-sm font-semibold">Page range
                  <input value={pageRange} onChange={(e) => { setPageRange(e.target.value); clearResult() }} disabled={isProcessing} placeholder="all or 1-3, 7" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold">Text color <input type="color" value={color} onChange={(e) => { setColor(e.target.value); clearResult() }} disabled={isProcessing} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-border bg-background p-1" /></label>
                <label className="text-sm font-semibold">Background <input type="color" value={backgroundColor || '#ffffff'} onChange={(e) => { setBackgroundColor(e.target.value); clearResult() }} disabled={isProcessing} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-border bg-background p-1" /></label>
              </div>
              {backgroundColor && <button type="button" onClick={() => setBackgroundColor('')} disabled={isProcessing} className="text-left text-xs font-medium text-primary hover:underline">Remove background color</button>}
              <div className="space-y-4 rounded-xl bg-muted/40 p-4">
                <Range label="Opacity" value={opacity} min={10} max={100} suffix="%" onChange={setOpacity} disabled={isProcessing} />
                {mode === 'text' ? <Range label="Font size" value={fontSize} min={20} max={100} suffix=" pt" onChange={setFontSize} disabled={isProcessing} /> : <Range label="Image scale" value={imageScale} min={10} max={80} suffix="%" onChange={setImageScale} disabled={isProcessing} />}
                <Range label="Rotation" value={rotation} min={-180} max={180} suffix="°" onChange={setRotation} disabled={isProcessing} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Position</label>
                <div className="grid grid-cols-4 gap-2">{(['diagonal', 'center', 'top', 'bottom'] as const).map((pos) => <button key={pos} type="button" onClick={() => { setPosition(pos); clearResult() }} disabled={isProcessing} className={cn('rounded-lg border py-2 text-xs font-semibold capitalize', position === pos ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50')}>{pos}</button>)}</div>
              </div>
              <button onClick={handleWatermark} disabled={!canSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('watermark.processing')}</> : <><Droplets className="h-5 w-5" /> {t('watermark.action')}</>}</button>
              <RealProgressBar status={progress.status} progress={progress.progress} message={progress.message} error={progress.error} className="w-full" showPercentage showMessage autoHide={false} />
            </section>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileImage className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="text-xs text-muted-foreground">{formatBytes(file.size)} · PDF ready</p></div><button onClick={reset} disabled={isProcessing} className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">Change PDF</button></div>
          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
          {result && progress.status === 'completed' && <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" /><div><p className="font-semibold text-green-900">{t('watermark.successTitle')}</p><p className="text-sm text-green-700">Watermark applied to {pageRange === 'all' ? 'all pages' : `pages ${pageRange}`}</p></div></div><div className="flex gap-3"><a href={result.downloadUrl} download={result.filename} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700"><Download className="h-4 w-4" />{t('watermark.download')}</a><button onClick={reset} className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"><RotateCcw className="h-4 w-4" />{t('watermark.newFile')}</button></div><ShareButtons downloadUrl={result.downloadUrl} filename={result.filename} /></div>}
          {result && progress.status === 'completed' && <TrustpilotReview />}
        </div>
      )}
    </div>
  )
}

function Range({ label, value, min, max, suffix, onChange, disabled }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void; disabled: boolean }) {
  return <label className="block text-sm font-semibold">{label}<span className="float-right font-normal text-primary">{value}{suffix}</span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} className="mt-2 w-full accent-primary disabled:opacity-50" /></label>
}
