'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { formatBytes } from '@/lib/utils/format-bytes'
import { useState, useCallback, useEffect, useRef } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw, X,
  Scissors, FileText, Plus, Trash2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import type { JobResult } from '@/lib/queue/types'

type SplitMode = 'range' | 'pages'

interface PageRange {
  id: number
  from: number
  to: number
}

interface PageThumb {
  pageNum: number
  dataUrl: string
}

let thumbIdSeq = 0

async function renderPageThumb(pdf: unknown, pageNum: number, width = 120): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await (pdf as any).getPage(pageNum)
  const vp = page.getViewport({ scale: 1 })
  const scale = width / vp.width
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.7)
}

export function SplitPdfClient() {
  const { t } = useI18n()

  const [file, setFile]           = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [thumbs, setThumbs]       = useState<PageThumb[]>([])
  const [thumbsLoading, setThumbsLoading] = useState(false)

  const [mode, setMode]           = useState<SplitMode>('range')

  // Range mode state
  const [ranges, setRanges]       = useState<PageRange[]>([{ id: 0, from: 1, to: 1 }])
  const [mergeRanges, setMergeRanges] = useState(false)

  // Pages mode state
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  const [jobId, setJobId]         = useState<string | null>(null)
  const [result, setResult]       = useState<JobResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const progress                  = useRealProgress()
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef                    = useRef<any>(null)

  // ---------- thumbnail loading ----------
  useEffect(() => {
    if (!file) return
    let cancelled = false
    setThumbs([])
    setThumbsLoading(true)

    const load = async () => {
      try {
        const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const ab = await file.arrayBuffer()
        const pdf = await getDocument({ data: ab }).promise
        if (cancelled) return

        pdfRef.current = pdf
        const n = pdf.numPages
        setTotalPages(n)
        setRanges([{ id: thumbIdSeq++, from: 1, to: n }])
        setSelectedPages(new Set())

        const BATCH = 4
        for (let start = 1; start <= n && !cancelled; start += BATCH) {
          const end  = Math.min(start + BATCH - 1, n)
          const batch: PageThumb[] = await Promise.all(
            Array.from({ length: end - start + 1 }, (_, i) => start + i).map(async (p) => ({
              pageNum: p,
              dataUrl: await renderPageThumb(pdf, p),
            }))
          )
          if (!cancelled) setThumbs(prev => [...prev, ...batch])
        }
      } catch (e) {
        console.error('pdfjs thumb error', e)
      } finally {
        if (!cancelled) setThumbsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [file])

  // ---------- job polling ----------
  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const res  = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.progress === 'number' && data.progress > 0) {
          progress.stageProcessing(Math.round((data.progress / 100) * 35), 'Splitting…')
        }
        if (data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setResult(data.result as JobResult)
          progress.stageDone('Split complete!')
        } else if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          const msg = (data.error as string) ?? 'Split failed'
          setError(msg)
          progress.fail(msg)
        }
      } catch { /* keep polling */ }
    }
    poll()
    pollRef.current = setInterval(poll, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelected = useCallback((files: File[]) => {
    setFile(files[0])
    setJobId(null)
    setResult(null)
    setError(null)
    progress.reset()
  }, [progress])

  // ---------- range helpers ----------
  const addRange = () =>
    setRanges(prev => [...prev, { id: thumbIdSeq++, from: 1, to: totalPages || 1 }])

  const removeRange = (id: number) =>
    setRanges(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev)

  const updateRange = (id: number, field: 'from' | 'to', raw: string) => {
    const val = parseInt(raw, 10)
    if (isNaN(val)) return
    const n = Math.max(1, Math.min(val, totalPages || 9999))
    setRanges(prev => prev.map(r => {
      if (r.id !== id) return r
      if (field === 'from') return { ...r, from: Math.min(n, r.to) }
      return { ...r, to: Math.max(n, r.from) }
    }))
  }

  // ---------- pages helpers ----------
  const togglePage = (p: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }
  const selectAll   = () => setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)))
  const deselectAll = () => setSelectedPages(new Set())

  // ---------- submit ----------
  const handleSplit = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (mode === 'range' && ranges.every(r => r.from > r.to)) {
      setError('Please check your page ranges.')
      return
    }
    if (mode === 'pages' && selectedPages.size === 0) {
      setError('Please select at least one page.')
      return
    }

    setError(null)
    setResult(null)
    setJobId(null)
    progress.startProcessing('Uploading PDF…')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('mode', mode)

      if (mode === 'range') {
        const rangeStr = ranges.map(r => r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`).join(',')
        formData.append('range', rangeStr)
        formData.append('merge', mergeRanges ? 'true' : 'false')
      } else {
        formData.append('pages', Array.from(selectedPages).sort((a, b) => a - b).join(','))
      }

      const res = await xhrUpload({
        url: '/api/split-pdf',
        formData,
        onUploadProgress: (pct) => progress.stageUpload(pct, 'Uploading PDF…'),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error((err.error as string) ?? 'Split failed')
      }

      const data = await res.json() as { jobId: string }
      progress.stageValidation('Processing…')
      setJobId(data.jobId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setFile(null)
    setJobId(null)
    setResult(null)
    setError(null)
    setThumbs([])
    setTotalPages(0)
    setRanges([{ id: thumbIdSeq++, from: 1, to: 1 }])
    setSelectedPages(new Set())
    setMode('range')
    progress.reset()
    pdfRef.current = null
  }

  const isProcessing = progress.status === 'processing'
  const isZip        = result?.mimeType === 'application/zip' || result?.fileName?.endsWith('.zip')
  const dlName       = result?.fileName ?? (isZip ? 'toolify-split.zip' : 'toolify-split.pdf')

  // ===================== RENDER =====================
  return (
    <div className="space-y-6">
      <BackButton />

      {!file ? (
        <UploadDropzone
          accept="application/pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label={t('split.dropFile')}
          sublabel={t('split.subLabel')}
        />
      ) : (
        <div className="space-y-6">

          {/* File bar */}
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
                {totalPages > 0 && <> · {totalPages} pages</>}
              </p>
            </div>
            <button
              onClick={reset}
              disabled={isProcessing}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit">
            {(['range', 'pages'] as SplitMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setResult(null); setError(null) }}
                disabled={isProcessing}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize disabled:opacity-50',
                  mode === m
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'range' ? 'By Range' : 'By Pages'}
              </button>
            ))}
          </div>

          {/* ── RANGE MODE ── */}
          {mode === 'range' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each range becomes a separate PDF part. You can add multiple ranges.
              </p>

              <div className="space-y-3">
                {ranges.map((r, idx) => (
                  <div key={r.id} className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">
                      Range {idx + 1}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground shrink-0">From</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages || 9999}
                        value={r.from}
                        onChange={e => updateRange(r.id, 'from', e.target.value)}
                        disabled={isProcessing}
                        className="w-16 text-center border border-border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                      />
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0">To</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages || 9999}
                        value={r.to}
                        onChange={e => updateRange(r.id, 'to', e.target.value)}
                        disabled={isProcessing}
                        className="w-16 text-center border border-border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                      />
                    </div>
                    {/* page count hint */}
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {r.to >= r.from ? r.to - r.from + 1 : 0}p
                    </span>
                    <button
                      onClick={() => removeRange(r.id)}
                      disabled={isProcessing || ranges.length === 1}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRange}
                disabled={isProcessing}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add Range
              </button>

              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={mergeRanges}
                  onChange={e => setMergeRanges(e.target.checked)}
                  disabled={isProcessing}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Merge all ranges into one PDF file</span>
              </label>
            </div>
          )}

          {/* ── PAGES MODE ── */}
          {mode === 'pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tap pages to select. Selected pages will be merged into one PDF.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    disabled={isProcessing}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    All
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={deselectAll}
                    disabled={isProcessing}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    None
                  </button>
                </div>
              </div>

              {selectedPages.size > 0 && (
                <p className="text-xs text-primary font-medium">
                  {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected
                </p>
              )}

              {/* Thumbnail grid */}
              {thumbsLoading && thumbs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading pages…</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {thumbs.map(({ pageNum, dataUrl }) => {
                    const sel = selectedPages.has(pageNum)
                    return (
                      <button
                        key={pageNum}
                        onClick={() => togglePage(pageNum)}
                        disabled={isProcessing}
                        className={cn(
                          'group relative flex flex-col items-center rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none disabled:opacity-60',
                          sel
                            ? 'border-primary shadow-md shadow-primary/20 scale-[1.02]'
                            : 'border-border hover:border-primary/40 hover:shadow-sm'
                        )}
                      >
                        {/* selection ring overlay */}
                        {sel && (
                          <div className="absolute inset-0 bg-primary/8 pointer-events-none z-10" />
                        )}
                        {/* checkmark */}
                        {sel && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-20 shadow">
                            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-white">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        <div className="w-full bg-gray-50 flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={dataUrl}
                            alt={`Page ${pageNum}`}
                            className="w-full h-auto max-h-28 object-contain"
                          />
                        </div>
                        <div className={cn(
                          'w-full py-1 text-center text-xs font-medium transition-colors',
                          sel ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'
                        )}>
                          {pageNum}
                        </div>
                      </button>
                    )
                  })}
                  {/* skeleton cards while still loading */}
                  {thumbsLoading && Array.from({ length: Math.max(0, totalPages - thumbs.length) }, (_, i) => (
                    <div key={`sk-${i}`} className="rounded-xl border-2 border-border overflow-hidden">
                      <div className="w-full aspect-[3/4] bg-muted animate-pulse" />
                      <div className="py-1 bg-muted/50" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSplit}
                disabled={isProcessing || (mode === 'pages' && selectedPages.size === 0)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
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

          {/* Result */}
          {result && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">Split complete!</p>
                  <p className="text-sm text-green-700">
                    {isZip ? 'Multiple PDFs packaged as ZIP' : 'Single PDF ready'}
                  </p>
                </div>
              </div>
              <a
                href={`/api/files/${result.fileId}`}
                download={dlName}
                className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                {isZip ? 'Download ZIP' : 'Download PDF'}
              </a>
            </div>
          )}
          {result && progress.status === 'completed' && <TrustpilotReview />}
        </div>
      )}
    </div>
  )
}
