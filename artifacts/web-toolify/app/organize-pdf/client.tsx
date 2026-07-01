'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'
import { useState, useCallback, useEffect, useRef } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw,
  Trash2, FileText, GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PDFDocument } from 'pdf-lib'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'

interface PageItem {
  id: string
  originalIndex: number
  thumbnail: string | null
}

let _seq = 0
const uid = () => `p${++_seq}`

async function renderThumbnail(pdfDoc: any, pageNum: number): Promise<string> {
  const page     = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 0.4 })
  const canvas   = document.createElement('canvas')
  canvas.width   = Math.round(viewport.width)
  canvas.height  = Math.round(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.75)
}

// ── Drag state lives entirely in refs — no re-renders during drag ────────────
interface DragRef {
  active:    boolean
  sourceId:  string | null
  el:        HTMLElement | null
  pid:       number | null
  startX:    number
  startY:    number
  timer:     ReturnType<typeof setTimeout> | null
}

export function OrganizePdfClient() {
  const [file,          setFile]          = useState<File | null>(null)
  const [pages,         setPages]         = useState<PageItem[]>([])
  const [downloadUrl,   setDownloadUrl]   = useState<string | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [loadingThumbs, setLoadingThumbs] = useState(false)
  const progress = useRealProgress()

  // UI drag state — only set at key transitions (not every move)
  const [pressingId,  setPressingId]  = useState<string | null>(null) // during 500ms hold
  const [draggingId,  setDraggingId]  = useState<string | null>(null) // after activation
  const [dragOverId,  setDragOverId]  = useState<string | null>(null) // drop target

  const drag = useRef<DragRef>({
    active: false, sourceId: null, el: null, pid: null,
    startX: 0, startY: 0, timer: null,
  })

  // ── Load PDF & render thumbnails ───────────────────────────────────────────
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const selected = files[0]
    if (!selected) return
    setDownloadUrl(null); setError(null); setLoadingThumbs(true)
    progress.reset(); setFile(selected)

    try {
      const buf   = await selected.arrayBuffer()
      const doc   = await PDFDocument.load(buf, { ignoreEncryption: true })
      const count = doc.getPageCount()

      const initial: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: uid(), originalIndex: i, thumbnail: null,
      }))
      setPages(initial)

      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

      const updated = [...initial]
      for (let i = 0; i < count; i += 4) {
        await Promise.all(
          Array.from({ length: Math.min(4, count - i) }, (_, j) => i + j).map(async (idx) => {
            updated[idx] = { ...updated[idx], thumbnail: await renderThumbnail(pdfDoc, idx + 1) }
          })
        )
        setPages([...updated])
      }
      pdfDoc.destroy()
    } catch {
      setError('Could not read this PDF — it may be password-protected or corrupted.')
      setFile(null); setPages([])
    } finally {
      setLoadingThumbs(false)
    }
  }, [progress])

  // ── Delete page ────────────────────────────────────────────────────────────
  const deletePage = useCallback((id: string) => {
    setPages(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id))
    setDownloadUrl(null)
  }, [])

  // ── Drag helpers ───────────────────────────────────────────────────────────
  const cancelAll = useCallback(() => {
    const d = drag.current
    if (d.timer) { clearTimeout(d.timer); d.timer = null }
    d.active = false; d.sourceId = null; d.el = null; d.pid = null
    setPressingId(null); setDraggingId(null); setDragOverId(null)
  }, [])

  const activateDrag = useCallback((id: string) => {
    const d = drag.current
    d.timer  = null
    d.active = true
    setPressingId(null)
    setDraggingId(id)
    // setPointerCapture: all future pointer events route to d.el regardless of position
    if (d.el && d.pid !== null) {
      try { d.el.setPointerCapture(d.pid) } catch {}
    }
    navigator.vibrate?.(35)
  }, [])

  // ── Pointer event handlers ─────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (progress.status === 'processing') return
    // Only react to primary pointer (finger or left mouse)
    if (e.pointerType === 'mouse' && e.button !== 0) return

    cancelAll()

    const d    = drag.current
    d.sourceId = id
    d.el       = e.currentTarget        // DOM node — safe to keep past event
    d.pid      = e.pointerId
    d.startX   = e.clientX
    d.startY   = e.clientY
    d.active   = false

    setPressingId(id)

    d.timer = setTimeout(() => activateDrag(id), 500)
  }, [progress.status, cancelAll, activateDrag])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current

    if (!d.active) {
      // Cancel long press if finger moves more than 14 px (natural jitter tolerance)
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (Math.sqrt(dx * dx + dy * dy) > 14) cancelAll()
      return
    }

    // elementFromPoint works correctly even when pointer is captured
    const under = document.elementFromPoint(e.clientX, e.clientY)
    const card  = under?.closest('[data-pid]') as HTMLElement | null
    const oId   = card?.dataset.pid ?? null
    setDragOverId(oId && oId !== d.sourceId ? oId : null)
  }, [cancelAll])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d.timer) { clearTimeout(d.timer); d.timer = null }

    if (!d.active) { cancelAll(); return }

    const under = document.elementFromPoint(e.clientX, e.clientY)
    const card  = under?.closest('[data-pid]') as HTMLElement | null
    const toId  = card?.dataset.pid

    if (toId && toId !== d.sourceId) {
      const fromId = d.sourceId!
      setPages(prev => {
        const arr  = [...prev]
        const from = arr.findIndex(p => p.id === fromId)
        const to   = arr.findIndex(p => p.id === toId)
        if (from === -1 || to === -1) return prev
        const [moved] = arr.splice(from, 1)
        arr.splice(to, 0, moved)
        return arr
      })
      setDownloadUrl(null)
    }
    cancelAll()
  }, [cancelAll])

  // ── Generate PDF ───────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (progress.status === 'processing' || !file || pages.length === 0) return
    setError(null); setDownloadUrl(null)
    progress.startProcessing('Reading PDF…')
    try {
      progress.stageUpload(100, 'Reading PDF…')
      const buf    = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(buf)
      const outDoc = await PDFDocument.create()
      progress.stageProcessing(20, 'Reordering pages…')
      const copied = await outDoc.copyPages(srcDoc, pages.map(p => p.originalIndex))
      copied.forEach(p => outDoc.addPage(p))
      progress.stageProcessing(80, 'Saving document…')
      const bytes = await outDoc.save()
      const blob  = new Blob([bytes], { type: 'application/pdf' })
      setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      progress.stageDone(`Done — ${pages.length} page${pages.length !== 1 ? 's' : ''} in new order`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to organize PDF'
      setError(msg); progress.fail(msg)
    }
  }

  const reset = () => {
    cancelAll(); setFile(null); setPages([]); setError(null)
    setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    progress.reset()
  }

  useEffect(() => () => cancelAll(), [cancelAll])

  const isProcessing  = progress.status === 'processing'
  const originalCount = file ? Math.max(...pages.map(p => p.originalIndex), 0) + 1 : 0

  return (
    <div className="space-y-6">
      <UploadDropzone
        accept="application/pdf"
        multiple={false}
        onFilesSelected={handleFilesSelected}
        label="Drop a PDF here or click to browse"
        sublabel="Long-press a page and drag to reorder · tap 🗑 to delete"
        maxSizeMB={50}
        maxTotalSizeMB={50}
        currentTotalSize={file?.size ?? 0}
      />

      {file && pages.length > 0 && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate max-w-xs">{file.name}</span>
              <span className="text-muted-foreground shrink-0 hidden sm:inline">
                — {originalCount} page{originalCount !== 1 ? 's' : ''}
              </span>
            </div>
            <button onClick={reset} disabled={isProcessing}
              className="text-xs text-destructive font-medium hover:underline disabled:opacity-50">
              Clear
            </button>
          </div>

          {/* Hint */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 text-sm text-primary flex items-center gap-2">
            <GripVertical className="w-4 h-4 shrink-0" />
            <span><strong>Hold</strong> a page until it shrinks, then drag it to the new position.</span>
          </div>

          {loadingThumbs && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering previews…
            </div>
          )}

          {/* ── Page grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {pages.map((page) => {
              const isPressing = pressingId  === page.id
              const isDragged  = draggingId  === page.id
              const isTarget   = dragOverId  === page.id

              return (
                <div
                  key={page.id}
                  data-pid={page.id}
                  // ── Pointer handlers — all on same element ──
                  onPointerDown={e => onPointerDown(e, page.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={cancelAll}
                  onContextMenu={e => e.preventDefault()}
                  className={cn(
                    'relative bg-white border-2 rounded-xl overflow-hidden select-none',
                    // CRITICAL: touch-action:none prevents browser from firing
                    // pointercancel during the 500ms hold window
                    'touch-none',
                    // Smooth transform for all states
                    'transition-[transform,opacity,border-color,box-shadow] duration-150',
                    // ── States ──
                    isPressing && !isDragged && [
                      'border-primary/50 scale-[0.97]',
                    ],
                    isDragged && [
                      'opacity-40 scale-90 border-primary shadow-xl z-10',
                    ],
                    isTarget && !isDragged && [
                      'border-primary ring-2 ring-primary/40 scale-[1.04] shadow-md',
                    ],
                    !isPressing && !isDragged && !isTarget && 'border-border',
                    isProcessing && 'pointer-events-none opacity-60',
                    !draggingId && 'cursor-grab',
                    draggingId && !isDragged && 'cursor-grabbing',
                  )}
                >
                  {/* Hold-progress ring — animates over 500ms while pressing */}
                  {isPressing && (
                    <div
                      className="absolute inset-0 rounded-[10px] pointer-events-none z-10"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), transparent)',
                        animation: 'none',
                      }}
                    />
                  )}
                  {isPressing && (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full z-10"
                      style={{ animation: 'hold-progress 500ms linear forwards' }}
                    />
                  )}

                  {/* Thumbnail */}
                  <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                    {page.thumbnail ? (
                      <img
                        src={page.thumbnail}
                        alt={`Page ${page.originalIndex + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {page.originalIndex + 1}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                    <span className="text-xs font-semibold text-foreground">
                      {page.originalIndex + 1}
                    </span>
                    {!isProcessing && (
                      <button
                        // Stop propagation so delete tap doesn't trigger drag
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); deletePage(page.id) }}
                        disabled={pages.length <= 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {file && pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleProcess}
              disabled={isProcessing || pages.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Organizing…</>
                : <><Download className="w-5 h-5" /> Download Organized PDF</>}
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
            showPercentage showMessage autoHide={false}
          />
        </div>
      )}

      {downloadUrl && progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">PDF organized successfully!</p>
              <p className="text-sm text-green-700">
                {pages.length} page{pages.length !== 1 ? 's' : ''} · ready to download
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              download={`organized-${file?.name ?? 'document.pdf'}`}
              className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
            <ShareButtons downloadUrl={downloadUrl} filename={`organized-${file?.name ?? 'document.pdf'}`} />
          </div>
        </div>
      )}
      {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}

      {/* Hold-progress keyframe — injected once */}
      <style>{`
        @keyframes hold-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
