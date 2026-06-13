'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react'

interface PdfPreviewModalProps {
  file: File
  filename: string
  onClose: () => void
}

export function PdfPreviewModal({ file, filename, onClose }: PdfPreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef    = useRef<any>(null)
  const objectUrlRef = useRef<string | null>(null)
  const renderGenRef = useRef(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null)

  const [totalPages,   setTotalPages]   = useState(0)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [scale,        setScale]        = useState(1.2)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).href

        const url = URL.createObjectURL(file)
        objectUrlRef.current = url

        const loadingTask = pdfjsLib.getDocument(url)
        const doc = await loadingTask.promise
        if (cancelled) return

        pdfDocRef.current = doc
        setTotalPages(doc.numPages)
        setLoading(false)
      } catch {
        if (!cancelled) setError('Could not load PDF preview.')
      }
    }

    load()

    return () => {
      cancelled = true
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      pdfDocRef.current?.destroy?.()
    }
  }, [file])

  const renderPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current) return

    // Stamp this render — any older in-flight render will bail out
    const gen = ++renderGenRef.current

    // Cancel whatever was rendering before
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch { /* ignore */ }
      await renderTaskRef.current.promise.catch(() => {})
      renderTaskRef.current = null
    }

    // Bail if a newer render has already superseded us
    if (gen !== renderGenRef.current) return

    try {
      const page     = await pdfDocRef.current.getPage(currentPage)
      if (gen !== renderGenRef.current) return

      const viewport = page.getViewport({ scale })
      const canvas   = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width  = viewport.width
      canvas.height = viewport.height

      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task

      await task.promise
      renderTaskRef.current = null
    } catch (err: unknown) {
      const name = (err as { name?: string }).name
      if (name !== 'RenderingCancelledException') {
        if (gen === renderGenRef.current) setError('Render error.')
      }
    }
  }, [currentPage, scale])

  useEffect(() => {
    if (!loading) renderPage()
  }, [loading, renderPage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrentPage((p) => Math.min(p + 1, totalPages))
      if (e.key === 'ArrowLeft')  setCurrentPage((p) => Math.max(p - 1, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, totalPages])

  const zoomOut = useCallback(() => setScale((s) => Math.max(0.5, parseFloat((s - 0.2).toFixed(1)))), [])
  const zoomIn  = useCallback(() => setScale((s) => Math.min(3,   parseFloat((s + 0.2).toFixed(1)))), [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground truncate max-w-[60%]">{filename}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-muted/40 flex items-center justify-center p-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading PDF…</span>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && (
            <canvas
              ref={canvasRef}
              className="shadow-md rounded"
              style={{ display: 'block', maxWidth: '100%' }}
            />
          )}
        </div>

        {/* Footer navigation */}
        {!loading && !error && totalPages > 0 && (
          <div className="flex items-center justify-center gap-4 px-5 py-3 border-t border-border shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-medium text-foreground">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
