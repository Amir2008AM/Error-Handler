'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
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
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 0.4 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.75)
}

export function OrganizePdfClient() {
  const [file,        setFile]        = useState<File | null>(null)
  const [pages,       setPages]       = useState<PageItem[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [loadingThumbs, setLoadingThumbs] = useState(false)
  const progress = useRealProgress()

  // ── Drag state (long-press pointer events) ─────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const isDraggingRef   = useRef(false)
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const capturedTarget  = useRef<HTMLElement | null>(null)
  const capturedPointer = useRef<number | null>(null)
  const pointerStartPos = useRef({ x: 0, y: 0 })

  // ── Load PDF ─────────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const selected = files[0]
    if (!selected) return
    setDownloadUrl(null)
    setError(null)
    setLoadingThumbs(true)
    progress.reset()
    setFile(selected)

    try {
      const buf  = await selected.arrayBuffer()
      const doc  = await PDFDocument.load(buf, { ignoreEncryption: true })
      const count = doc.getPageCount()

      const initial: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: uid(), originalIndex: i, thumbnail: null,
      }))
      setPages(initial)

      // Render thumbnails in batches of 4
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

      const updated = [...initial]
      const BATCH = 4
      for (let i = 0; i < count; i += BATCH) {
        await Promise.all(
          Array.from({ length: Math.min(BATCH, count - i) }, (_, j) => i + j).map(async (idx) => {
            updated[idx] = { ...updated[idx], thumbnail: await renderThumbnail(pdfDoc, idx + 1) }
          })
        )
        setPages([...updated])
      }
      pdfDoc.destroy()
    } catch {
      setError('Could not read this PDF — it may be password-protected or corrupted.')
      setFile(null)
      setPages([])
    } finally {
      setLoadingThumbs(false)
    }
  }, [progress])

  // ── Delete page ───────────────────────────────────────────────────────────
  const deletePage = useCallback((id: string) => {
    setPages(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id))
    setDownloadUrl(null)
  }, [])

  // ── Long-press pointer drag ────────────────────────────────────────────────
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (progress.status === 'processing') return
    pointerStartPos.current = { x: e.clientX, y: e.clientY }
    isDraggingRef.current = false
    capturedTarget.current  = e.currentTarget
    capturedPointer.current = e.pointerId

    longPressTimer.current = setTimeout(() => {
      isDraggingRef.current = true
      setDraggingId(id)
      capturedTarget.current?.setPointerCapture(capturedPointer.current!)
      navigator.vibrate?.(25)
    }, 420)
  }, [progress.status])

  const handlePointerMove = useCallback((e: React.PointerEvent, id: string) => {
    if (!isDraggingRef.current) {
      const dx = e.clientX - pointerStartPos.current.x
      const dy = e.clientY - pointerStartPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 6) cancelLongPress()
      return
    }
    const el   = document.elementFromPoint(e.clientX, e.clientY)
    const card = el?.closest('[data-pid]') as HTMLElement | null
    const overId = card?.dataset.pid ?? null
    setDragOverId(overId && overId !== id ? overId : null)
  }, [cancelLongPress])

  const handlePointerUp = useCallback((e: React.PointerEvent, id: string) => {
    cancelLongPress()
    if (!isDraggingRef.current) { isDraggingRef.current = false; return }
    isDraggingRef.current = false

    const el     = document.elementFromPoint(e.clientX, e.clientY)
    const card   = el?.closest('[data-pid]') as HTMLElement | null
    const toId   = card?.dataset.pid
    if (toId && toId !== id) {
      setPages(prev => {
        const arr  = [...prev]
        const from = arr.findIndex(p => p.id === id)
        const to   = arr.findIndex(p => p.id === toId)
        if (from === -1 || to === -1) return prev
        const [moved] = arr.splice(from, 1)
        arr.splice(to, 0, moved)
        return arr
      })
      setDownloadUrl(null)
    }
    setDraggingId(null)
    setDragOverId(null)
  }, [cancelLongPress])

  const handlePointerCancel = useCallback(() => {
    cancelLongPress()
    isDraggingRef.current = false
    setDraggingId(null)
    setDragOverId(null)
  }, [cancelLongPress])

  // ── Generate PDF ─────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (progress.status === 'processing' || !file || pages.length === 0) return
    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Reading PDF…')
    try {
      progress.stageUpload(100, 'Reading PDF…')
      const buf    = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(buf)
      const outDoc = await PDFDocument.create()
      progress.stageProcessing(20, 'Reordering pages…')
      const copied = await outDoc.copyPages(srcDoc, pages.map(p => p.originalIndex))
      copied.forEach(page => outDoc.addPage(page))
      progress.stageProcessing(80, 'Saving document…')
      const bytes = await outDoc.save()
      const blob  = new Blob([bytes], { type: 'application/pdf' })
      setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      progress.stageDone(`Done — ${pages.length} page${pages.length !== 1 ? 's' : ''} in new order`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to organize PDF'
      setError(msg)
      progress.fail(msg)
    }
  }

  const reset = () => {
    setFile(null); setPages([]); setError(null)
    setDownloadUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    progress.reset()
  }

  useEffect(() => () => { cancelLongPress() }, [cancelLongPress])

  const isProcessing   = progress.status === 'processing'
  const originalCount  = file ? Math.max(...pages.map(p => p.originalIndex), 0) + 1 : 0

  return (
    <div className="space-y-6">
      <UploadDropzone
        accept="application/pdf"
        multiple={false}
        onFilesSelected={handleFilesSelected}
        label="Drop a PDF here or click to browse"
        sublabel="Drag pages to reorder · delete unwanted pages · download your new PDF"
        maxSizeMB={50}
        maxTotalSizeMB={50}
        currentTotalSize={file?.size ?? 0}
      />

      {file && pages.length > 0 && (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate max-w-xs">{file.name}</span>
              <span className="text-muted-foreground shrink-0">
                — {originalCount} original page{originalCount !== 1 ? 's' : ''},&nbsp;
                {pages.length} in output
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
            <span>
              <strong>Long press</strong> a page then drag to reorder.&nbsp;
              Tap <strong>🗑</strong> to delete.
            </span>
          </div>

          {/* Thumbnail loading indicator */}
          {loadingThumbs && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Rendering previews…
            </div>
          )}

          {/* Page grid — same size as original */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            style={{ touchAction: draggingId ? 'none' : undefined }}
          >
            {pages.map((page) => {
              const isDragged = draggingId === page.id
              const isTarget  = dragOverId  === page.id
              return (
                <div
                  key={page.id}
                  data-pid={page.id}
                  onPointerDown={e => handlePointerDown(e, page.id)}
                  onPointerMove={e => handlePointerMove(e, page.id)}
                  onPointerUp={e => handlePointerUp(e, page.id)}
                  onPointerCancel={handlePointerCancel}
                  onContextMenu={e => e.preventDefault()}
                  className={cn(
                    'relative group bg-white border-2 rounded-xl overflow-hidden select-none transition-all',
                    isDragged && 'opacity-40 scale-95 border-primary shadow-lg',
                    isTarget  && 'border-primary ring-2 ring-primary/30 scale-[1.03]',
                    !isDragged && !isTarget && 'border-border',
                    isProcessing && 'pointer-events-none opacity-60',
                    draggingId && !isDragged ? 'cursor-default' : 'cursor-grab',
                  )}
                >
                  {/* Thumbnail area — same aspect as original */}
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
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">→ {pages.indexOf(page) + 1}</span>
                    {!isProcessing && (
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); deletePage(page.id) }}
                        disabled={pages.length <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        title="Delete page"
                      >
                        <Trash2 className="w-3 h-3" />
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
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Organizing…</>
              ) : (
                <><Download className="w-5 h-5" /> Download Organized PDF</>
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
            showPercentage
            showMessage
            autoHide={false}
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
          <a
            href={downloadUrl}
            download={`organized-${file?.name ?? 'document.pdf'}`}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      )}
      {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
    </div>
  )
}
