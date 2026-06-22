'use client'

import React, {
  useState, useEffect, useRef, useCallback, DragEvent,
} from 'react'
import {
  MousePointer2, Type, ImageIcon, PenLine, Highlighter, Eraser,
  PenSquare, Trash2, RotateCw, ZoomIn, ZoomOut,
  Undo2, Redo2, Download, ChevronUp, ChevronDown,
  X, Loader2, AlertCircle, FileText,
} from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorTool = 'select' | 'text' | 'image' | 'draw' | 'highlight' | 'eraser' | 'signature'
type SigTab = 'draw' | 'type' | 'upload'

const PDFJS_VERSION = '5.7.284'
const MAX_HISTORY = 30
const MAX_FILE_BYTES = 50 * 1024 * 1024

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataURLtoBytes(dataURL: string): Uint8Array {
  const b64 = dataURL.split(',')[1]
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

// ─── Signature Modal ──────────────────────────────────────────────────────────

function SignatureModal({
  onUse,
  onClose,
}: {
  onUse: (dataURL: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<SigTab>('draw')
  const [typedSig, setTypedSig] = useState('')
  const [sigFont, setSigFont] = useState<string>('Dancing Script')
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigFabricRef = useRef<any>(null)

  useEffect(() => {
    if (tab !== 'draw') return
    let mounted = true
    let stopBrush: (() => void) | null = null
    import('fabric').then(({ Canvas, PencilBrush }) => {
      if (!mounted || !sigCanvasRef.current) return
      if (sigFabricRef.current) { sigFabricRef.current.dispose(); sigFabricRef.current = null }
      const fc = new Canvas(sigCanvasRef.current, {
        width: 400,
        height: 150,
        isDrawingMode: true,
      })
      const brush = new PencilBrush(fc)
      brush.color = '#1e293b'
      brush.width = 2.5
      fc.freeDrawingBrush = brush
      sigFabricRef.current = fc

      // ── Fix: prevent strokes from connecting when pointer is released
      // outside the canvas. If mouseup fires outside, Fabric never closes the
      // current path, so the next stroke starts with an unwanted straight line.
      stopBrush = () => {
        const fb = fc.freeDrawingBrush as any
        if (!fc.isDrawingMode) return
        if (Array.isArray(fb?._points)) fb._points = []
        ;(fc as any)._isCurrentlyDrawing = false
      }
      // Catch release anywhere on the document
      document.addEventListener('mouseup', stopBrush)
      document.addEventListener('touchend', stopBrush)
      // Also stop when pointer leaves the canvas area
      fc.upperCanvasEl?.addEventListener('mouseleave', stopBrush)
    })
    return () => {
      mounted = false
      if (stopBrush) {
        document.removeEventListener('mouseup', stopBrush)
        document.removeEventListener('touchend', stopBrush)
        sigFabricRef.current?.upperCanvasEl?.removeEventListener('mouseleave', stopBrush)
      }
      sigFabricRef.current?.dispose()
      sigFabricRef.current = null
    }
  }, [tab])

  const handleUse = useCallback(() => {
    if (tab === 'draw') {
      const fc = sigFabricRef.current
      if (!fc) return
      const objects = fc.getObjects()
      if (objects.length === 0) return
      // Export at 2x with transparent background — only the ink is visible
      onUse(fc.toDataURL({ format: 'png', multiplier: 2 }))
    } else if (tab === 'type') {
      if (!typedSig.trim()) return
      const tmp = document.createElement('canvas')
      tmp.width = 500
      tmp.height = 120
      const ctx = tmp.getContext('2d')!
      ctx.clearRect(0, 0, 500, 120)
      ctx.fillStyle = '#1e293b'
      ctx.font = `52px "${sigFont}", cursive`
      ctx.textBaseline = 'middle'
      ctx.fillText(typedSig, 12, 60)
      onUse(tmp.toDataURL('image/png'))
    } else if (tab === 'upload' && uploadPreview) {
      onUse(uploadPreview)
    }
  }, [tab, typedSig, sigFont, uploadPreview, onUse])

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pinyon+Script&family=Satisfy&family=Great+Vibes&family=Sacramento&family=Parisienne&family=Alex+Brush&family=Kaushan+Script&family=Caveat:wght@600&family=Lobster&display=swap"
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {(['draw', 'type', 'upload'] as SigTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setUploadPreview(null) }}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {tab === 'draw' && (
            <>
              <p className="text-xs text-gray-400">Draw your signature below</p>
              {/* No border/background — clean white surface */}
              <div className="rounded-xl overflow-hidden bg-white" style={{ boxShadow: 'inset 0 0 0 1px #e2e8f0' }}>
                <canvas
                  ref={sigCanvasRef}
                  style={{ touchAction: 'none', display: 'block' }}
                />
              </div>
              <button
                onClick={() => sigFabricRef.current?.clear()}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear
              </button>
            </>
          )}

          {tab === 'type' && (
            <>
              <input
                type="text"
                value={typedSig}
                onChange={(e) => setTypedSig(e.target.value)}
                placeholder="Write your signature…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div
                className="rounded-xl px-4 py-3 min-h-[70px] flex items-center bg-white"
                style={{ fontFamily: `"${sigFont}", cursive`, fontSize: 38, boxShadow: 'inset 0 0 0 1px #e2e8f0' }}
              >
                <span className="text-gray-800">{typedSig || <span className="text-gray-300 text-2xl" style={{ fontFamily: 'inherit' }}>Your signature</span>}</span>
              </div>
              {/* 3-column font grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  'Dancing Script',
                  'Great Vibes',
                  'Pinyon Script',
                  'Sacramento',
                  'Parisienne',
                  'Alex Brush',
                  'Satisfy',
                  'Kaushan Script',
                  'Caveat',
                ].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSigFont(f)}
                    className={cn(
                      'py-2 px-1 rounded-lg border text-sm transition-colors truncate',
                      sigFont === f
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white',
                    )}
                    style={{ fontFamily: `"${f}", cursive`, fontSize: 18 }}
                    title={f}
                  >
                    {typedSig || 'Sign'}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'upload' && (
            <>
              {uploadPreview ? (
                <div className="rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4"
                  style={{ boxShadow: 'inset 0 0 0 1px #e2e8f0', minHeight: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadPreview} alt="Signature preview" className="max-h-[120px] max-w-full object-contain" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-blue-400 transition-colors">
                  <ImageIcon size={28} className="text-gray-300" />
                  <span className="text-sm text-gray-500">Upload signature image (PNG, JPG)</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
                </label>
              )}
              {uploadPreview && (
                <label className="text-xs text-blue-600 hover:underline cursor-pointer block text-center">
                  Choose different image
                  <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
                </label>
              )}
            </>
          )}

          <button
            onClick={handleUse}
            disabled={
              (tab === 'draw' && !sigFabricRef.current?.getObjects()?.length) ||
              (tab === 'type' && !typedSig.trim()) ||
              (tab === 'upload' && !uploadPreview)
            }
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            Use Signature
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Editor Component ────────────────────────────────────────────────────

export function PdfEditorClient() {
  // Phase
  const [phase, setPhase] = useState<'upload' | 'editor'>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // PDF data
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('edited.pdf')
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Page management
  const [pageOrder, setPageOrder] = useState<number[]>([]) // original 1-indexed page nums
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})

  // Per-page fabric JSON (saved when leaving a page)
  const pageAnnotationsRef = useRef<Record<number, object>>({})

  // Editor UI
  const [tool, setTool] = useState<EditorTool>('select')
  const [zoom, setZoom] = useState(1.0)
  const [textColor, setTextColor] = useState('#1e293b')
  const [textSize, setTextSize] = useState(16)
  const [brushColor, setBrushColor] = useState('#3b82f6')
  const [brushSize, setBrushSize] = useState(4)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // History (undo/redo per page)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const isRestoringRef = useRef(false)

  // Canvas refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const fabricElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const pdfjsRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const isRenderingRef = useRef(false)
  const currentPageRef = useRef(1)
  const toolRef = useRef<EditorTool>('select')
  const textColorRef = useRef('#1e293b')
  const textSizeRef = useRef(16)

  // Sync refs with state
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { textColorRef.current = textColor }, [textColor])
  useEffect(() => { textSizeRef.current = textSize }, [textSize])
  useEffect(() => { historyIndexRef.current = historyIndex }, [historyIndex])

  // ── Load PDF.js ─────────────────────────────────────────────────────────────

  useEffect(() => {
    import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`
      pdfjsRef.current = lib
    })
  }, [])

  // ── Push annotation history ──────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || isRestoringRef.current) return
    const json = JSON.stringify(fc.toJSON())
    setHistory((prev) => {
      const base = prev.slice(0, historyIndexRef.current + 1)
      const next = [...base, json].slice(-MAX_HISTORY)
      const newIdx = next.length - 1
      historyIndexRef.current = newIdx
      setHistoryIndex(newIdx)
      return next
    })
  }, [])

  // ── Init Fabric.js canvas ────────────────────────────────────────────────────

  const initFabric = useCallback(async () => {
    if (!fabricElRef.current || fabricRef.current) return
    const { Canvas, PencilBrush } = await import('fabric')

    const fc = new Canvas(fabricElRef.current, {
      backgroundColor: undefined as any,
      selection: true,
    })

    // Make Fabric wrapper overlay the PDF canvas exactly
    if (fc.wrapperEl) {
      Object.assign(fc.wrapperEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        pointerEvents: 'all',
        overflow: 'visible',
      })
    }

    // History events
    fc.on('object:added', pushHistory)
    fc.on('object:modified', pushHistory)
    fc.on('object:removed', pushHistory)

    // Text tool — add IText on mouse:down
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'text') return
      if (opt.target) return // clicked an existing object
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      import('fabric').then(({ IText }) => {
        const txt = new IText('Text', {
          left: pointer.x,
          top: pointer.y,
          fontSize: textSizeRef.current,
          fill: textColorRef.current,
          fontFamily: 'Helvetica, Arial, sans-serif',
          editable: true,
        })
        fc.add(txt)
        fc.setActiveObject(txt)
        txt.enterEditing?.()
        txt.selectAll?.()
        fc.renderAll()
        setTool('select')
      })
    })

    // Eraser — click on object to remove it
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'eraser') return
      if (!opt.target) return
      fc.remove(opt.target)
      fc.renderAll()
    })

    // Delete key
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const obj = fc.getActiveObject?.()
      if (!obj || (obj as any).isEditing) return
      fc.remove(obj)
      fc.renderAll()
    }
    window.addEventListener('keydown', handleKey)
    fabricRef.current = fc

    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [pushHistory])

  // ── Render a PDF page ─────────────────────────────────────────────────────────

  const renderPage = useCallback(async (
    pageNum: number,
    doc: any,
    zoomLevel: number,
    skipSaveCurrent = false,
  ) => {
    if (!pdfCanvasRef.current || !doc) return
    if (isRenderingRef.current) return
    isRenderingRef.current = true

    const fc = fabricRef.current

    // Save current page annotations before switching
    if (!skipSaveCurrent && fc) {
      pageAnnotationsRef.current[currentPageRef.current] = fc.toJSON() as object
    }

    // Cancel pending render
    try { renderTaskRef.current?.cancel?.() } catch {}
    renderTaskRef.current = null

    try {
      const page = await doc.getPage(pageNum)
      const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2)
      const viewport = page.getViewport({ scale: zoomLevel * dpr })
      // CSS dimensions (layout pixels)
      const W = Math.round(viewport.width / dpr)
      const H = Math.round(viewport.height / dpr)
      // Physical pixel dimensions for crisp rendering
      const physW = Math.round(viewport.width)
      const physH = Math.round(viewport.height)

      // Size PDF canvas — physical pixels, display at CSS size for crispness
      const pdfCanvas = pdfCanvasRef.current!
      pdfCanvas.width = physW
      pdfCanvas.height = physH
      pdfCanvas.style.width = W + 'px'
      pdfCanvas.style.height = H + 'px'

      // Size Fabric canvas — use CSS pixel dimensions so coordinates align
      if (fc) {
        fc.setDimensions?.({ width: W, height: H })
        if (fc.wrapperEl) {
          Object.assign(fc.wrapperEl.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: W + 'px',
            height: H + 'px',
            pointerEvents: 'all',
          })
        }

        // Clear and load saved annotations
        isRestoringRef.current = true
        fc.clear()
        const saved = pageAnnotationsRef.current[pageNum]
        if (saved) {
          await fc.loadFromJSON(saved)
        }
        fc.renderAll()
        isRestoringRef.current = false
      }

      // Reset history for new page
      setHistory([])
      setHistoryIndex(-1)
      historyIndexRef.current = -1

      // Render PDF
      const ctx = pdfCanvas.getContext('2d')!
      ctx.clearRect(0, 0, W, H)
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error('PDF render:', err)
    } finally {
      isRenderingRef.current = false
    }
  }, [])

  // Re-render when page, zoom, or doc changes
  useEffect(() => {
    if (phase !== 'editor' || !pdfDocProxy) return
    renderPage(currentPage, pdfDocProxy, zoom)
  }, [currentPage, zoom, pdfDocProxy, phase, renderPage])

  // Init Fabric once we enter editor phase
  useEffect(() => {
    if (phase !== 'editor') return
    const timer = setTimeout(initFabric, 60)
    return () => clearTimeout(timer)
  }, [phase, initFabric])

  // Dispose fabric on unmount
  useEffect(() => {
    return () => {
      try { fabricRef.current?.dispose(); fabricRef.current = null } catch {}
    }
  }, [])

  // ── Tool → Fabric mode ────────────────────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    import('fabric').then(({ PencilBrush }) => {
      fc.isDrawingMode = false
      fc.selection = tool === 'select' || tool === 'eraser' || tool === 'text'

      if (tool === 'draw' || tool === 'highlight') {
        fc.isDrawingMode = true
        const brush = new PencilBrush(fc)
        const color = tool === 'highlight'
          ? brushColor + '55'  // semi-transparent
          : brushColor
        brush.color = color
        brush.width = tool === 'highlight' ? Math.max(12, brushSize * 3) : brushSize
        fc.freeDrawingBrush = brush
      }

      fc.renderAll?.()
    })
  }, [tool, brushColor, brushSize])

  // Sync text options to active object if it's an IText
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getActiveObject?.()
    if (!obj || obj.type !== 'i-text') return
    obj.set({ fill: textColor, fontSize: textSize })
    fc.renderAll()
  }, [textColor, textSize])

  // ── Undo / Redo ───────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current <= 0) return
    const idx = historyIndexRef.current - 1
    const state = history[idx]
    if (!state) return
    isRestoringRef.current = true
    await fc.loadFromJSON(JSON.parse(state))
    fc.renderAll()
    isRestoringRef.current = false
    historyIndexRef.current = idx
    setHistoryIndex(idx)
  }, [history])

  const handleRedo = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current >= history.length - 1) return
    const idx = historyIndexRef.current + 1
    const state = history[idx]
    if (!state) return
    isRestoringRef.current = true
    await fc.loadFromJSON(JSON.parse(state))
    fc.renderAll()
    isRestoringRef.current = false
    historyIndexRef.current = idx
    setHistoryIndex(idx)
  }, [history])

  // ── Image upload ──────────────────────────────────────────────────────────────

  const handleImageFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      import('fabric').then(({ FabricImage }) => {
        FabricImage.fromURL(url, { crossOrigin: 'anonymous' } as any).then((img: any) => {
          const fc = fabricRef.current
          if (!fc) return
          const maxW = Math.min(300, (fc.width ?? 400) * 0.5)
          const scale = img.width > maxW ? maxW / img.width : 1
          img.scale(scale)
          img.set({ left: 60, top: 60 })
          fc.add(img)
          fc.setActiveObject(img)
          fc.renderAll()
          setTool('select')
        })
      })
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Signature ─────────────────────────────────────────────────────────────────

  const handleUseSignature = useCallback((dataURL: string) => {
    setShowSignatureModal(false)
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(dataURL, { crossOrigin: 'anonymous' } as any).then((img: any) => {
        const fc = fabricRef.current
        if (!fc) return
        const maxW = Math.min(220, (fc.width ?? 400) * 0.4)
        const scale = img.width > maxW ? maxW / img.width : 1
        img.scale(scale)
        img.set({ left: 60, top: 80 })
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
        setTool('select')
      })
    })
  }, [])

  // ── Page management ───────────────────────────────────────────────────────────

  const saveCurrentAnnotations = useCallback(() => {
    const fc = fabricRef.current
    if (fc) pageAnnotationsRef.current[currentPageRef.current] = fc.toJSON() as object
  }, [])

  const goToPage = useCallback((displayIdx: number) => {
    saveCurrentAnnotations()
    const pageNum = pageOrder[displayIdx]
    setCurrentPage(pageNum)
  }, [pageOrder, saveCurrentAnnotations])

  const deletePage = useCallback((displayIdx: number) => {
    if (pageOrder.length <= 1) return
    const deletedNum = pageOrder[displayIdx]
    const newOrder = pageOrder.filter((_, i) => i !== displayIdx)
    setPageOrder(newOrder)
    if (deletedNum === currentPage) {
      const newIdx = Math.max(0, displayIdx - 1)
      setCurrentPage(newOrder[newIdx])
    }
  }, [pageOrder, currentPage])

  const rotatePage = useCallback((displayIdx: number) => {
    const pageNum = pageOrder[displayIdx]
    setPageRotations((prev) => ({
      ...prev,
      [pageNum]: ((prev[pageNum] ?? 0) + 90) % 360,
    }))
  }, [pageOrder])

  const movePage = useCallback((from: number, to: number) => {
    if (to < 0 || to >= pageOrder.length) return
    const arr = [...pageOrder]
    const [p] = arr.splice(from, 1)
    arr.splice(to, 0, p)
    setPageOrder(arr)
  }, [pageOrder])

  // ── File load ─────────────────────────────────────────────────────────────────

  const loadPdf = useCallback(async (bytes: Uint8Array, name: string) => {
    setLoading(true)
    setLoadError(null)
    pageAnnotationsRef.current = {}

    // Wait for PDF.js
    for (let i = 0; i < 60 && !pdfjsRef.current; i++) {
      await new Promise((r) => setTimeout(r, 100))
    }
    if (!pdfjsRef.current) {
      setLoadError('PDF engine failed to load. Please refresh and try again.')
      setLoading(false)
      return
    }

    try {
      const doc = await pdfjsRef.current.getDocument({ data: bytes.slice() }).promise
      setPdfDocProxy(doc)
      setTotalPages(doc.numPages)
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i + 1))
      setCurrentPage(1)
      currentPageRef.current = 1
      setFileBytes(bytes)
      setFileName(name.replace(/\.pdf$/i, '') + '-edited.pdf')
      setZoom(1.0)
      setPhase('editor')
    } catch {
      setLoadError('Could not open this PDF. The file may be corrupted or encrypted.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLoadError('Please upload a PDF file.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setLoadError('File exceeds the 50 MB limit.')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    await loadPdf(bytes, file.name)
  }, [loadPdf])

  // ── Download / Save ────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (!fileBytes || !pdfDocProxy) return
    setIsSaving(true)

    try {
      // Save current page annotations
      saveCurrentAnnotations()
      const annotations = { ...pageAnnotationsRef.current }

      const origDoc = await PDFDocument.load(fileBytes)
      const outDoc = await PDFDocument.create()

      for (const origPageNum of pageOrder) {
        const [copied] = await outDoc.copyPages(origDoc, [origPageNum - 1])

        // Apply user rotation on top of original
        const extraRot = pageRotations[origPageNum] ?? 0
        if (extraRot !== 0) {
          const existing = copied.getRotation().angle
          copied.setRotation(degrees((existing + extraRot) % 360))
        }

        // Overlay Fabric annotations as PNG
        const pageJSON = annotations[origPageNum] as any
        const hasAnnotations = pageJSON?.objects?.length > 0
        if (hasAnnotations) {
          try {
            // Render fabric JSON on a temp offscreen canvas
            const pdfJsPage = await pdfDocProxy.getPage(origPageNum)
            const vp = pdfJsPage.getViewport({ scale: zoom })
            const W = Math.round(vp.width)
            const H = Math.round(vp.height)

            const tmpEl = document.createElement('canvas')
            tmpEl.width = W
            tmpEl.height = H

            const { Canvas } = await import('fabric')
            const tmpFc = new Canvas(tmpEl, {
              width: W,
              height: H,
              backgroundColor: undefined as any,
            })
            await tmpFc.loadFromJSON(pageJSON)
            tmpFc.renderAll()

            const pngDataURL = tmpFc.toDataURL({ format: 'png', multiplier: 1 })
            tmpFc.dispose()

            const pngBytes = dataURLtoBytes(pngDataURL)
            const embedded = await outDoc.embedPng(pngBytes)

            const pw = copied.getWidth()
            const ph = copied.getHeight()
            copied.drawImage(embedded, {
              x: 0,
              y: 0,
              width: pw,
              height: ph,
              opacity: 1,
            })
          } catch (err) {
            console.warn('Annotation embed error for page', origPageNum, err)
          }
        }

        outDoc.addPage(copied)
      }

      const outBytes = await outDoc.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setLoadError('Failed to generate PDF. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [fileBytes, pdfDocProxy, pageOrder, pageRotations, fileName, zoom, saveCurrentAnnotations])

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    try { fabricRef.current?.dispose(); fabricRef.current = null } catch {}
    pageAnnotationsRef.current = {}
    setPhase('upload')
    setPdfDocProxy(null)
    setFileBytes(null)
    setPageOrder([])
    setPageRotations({})
    setHistory([])
    setHistoryIndex(-1)
    historyIndexRef.current = -1
    setTool('select')
    setLoadError(null)
  }, [])

  // ── Image input ref ───────────────────────────────────────────────────────────

  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Upload phase render ───────────────────────────────────────────────────────

  if (phase === 'upload') {
    return (
      <div className="w-full max-w-xl mx-auto py-6">
        <div
          onDrop={(e: DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            setIsDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => !loading && document.getElementById('pdf-ed-input')?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all select-none',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50',
            loading && 'cursor-wait opacity-70',
          )}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-500" size={44} />
              <p className="text-gray-600 font-medium">Opening PDF…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <PenLine size={30} className="text-violet-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-800">Drop your PDF here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Max 50 MB · Edits stay in your browser</p>
              </div>
              <span className="mt-2 px-5 py-2 rounded-xl bg-violet-600 text-white font-medium text-sm">
                Choose PDF
              </span>
            </div>
          )}
        </div>

        <input
          id="pdf-ed-input"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {loadError && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            {loadError}
          </div>
        )}

        <p className="mt-5 text-xs text-center text-gray-400">
          All editing happens locally in your browser — your file is never uploaded to any server.
        </p>
      </div>
    )
  }

  // ── Editor phase render ───────────────────────────────────────────────────────

  const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select',    icon: <MousePointer2 size={17} />, label: 'Select (V)' },
    { id: 'text',      icon: <Type size={17} />,          label: 'Add Text (T)' },
    { id: 'image',     icon: <ImageIcon size={17} />,     label: 'Insert Image' },
    { id: 'draw',      icon: <PenLine size={17} />,       label: 'Draw' },
    { id: 'highlight', icon: <Highlighter size={17} />,   label: 'Highlight' },
    { id: 'eraser',    icon: <Eraser size={17} />,        label: 'Eraser (click objects)' },
    { id: 'signature', icon: <PenSquare size={17} />,     label: 'Signature' },
  ]

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
      style={{ height: 'calc(100vh - 200px)', minHeight: 580 }}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-200 flex-wrap shrink-0">

        {/* Tool buttons */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => {
                if (t.id === 'image') { imageInputRef.current?.click(); return }
                if (t.id === 'signature') { setShowSignatureModal(true); return }
                setTool(t.id)
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                tool === t.id
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Text options */}
        {tool === 'text' && (
          <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-1">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200"
              title="Text color"
            />
            <select
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 outline-none bg-white"
            >
              {[8,10,12,14,16,18,20,24,28,32,36,48,64].map((s) => (
                <option key={s} value={s}>{s}pt</option>
              ))}
            </select>
          </div>
        )}

        {/* Brush options */}
        {(tool === 'draw' || tool === 'highlight') && (
          <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-1">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200"
              title="Brush color"
            />
            <input
              type="range"
              min={1}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16"
              title={`Size: ${brushSize}`}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Undo / Redo */}
        <div className="flex items-center border-r border-gray-100 pr-2 mr-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <Undo2 size={17} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <Redo2 size={17} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <button onClick={() => setZoom((z) => parseFloat(Math.max(0.4, z - 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-gray-500 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => parseFloat(Math.min(3, z + 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {isSaving ? 'Saving…' : 'Download PDF'}
        </button>

        {/* Open new file */}
        <button
          onClick={handleReset}
          title="Open different file"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Page Sidebar ── */}
        <div className="w-[130px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 shrink-0">
            {pageOrder.length} page{pageOrder.length !== 1 ? 's' : ''}
          </div>
          {pageOrder.map((pageNum, di) => (
            <div
              key={`${pageNum}-${di}`}
              onClick={() => goToPage(di)}
              className={cn(
                'group relative flex flex-col items-center pt-3 pb-2 px-2 cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50',
                currentPage === pageNum && 'bg-violet-50 border-l-2 border-l-violet-500',
              )}
            >
              {/* Thumbnail placeholder */}
              <div className="w-[88px] h-[120px] rounded-md border border-gray-200 bg-white flex items-center justify-center shadow-sm mb-1 overflow-hidden">
                <FileText size={28} className="text-gray-200" />
              </div>
              <span className="text-[11px] text-gray-400">{di + 1}</span>
              {pageRotations[pageNum] ? (
                <span className="text-[10px] text-violet-500">{pageRotations[pageNum]}°</span>
              ) : null}

              {/* Controls on hover */}
              <div className="absolute top-2 right-1 hidden group-hover:flex flex-col gap-0.5 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); rotatePage(di) }}
                  title="Rotate 90°"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600"
                >
                  <RotateCw size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePage(di) }}
                  title="Delete page"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-red-600"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Move up/down */}
              <div className="absolute bottom-6 right-1 hidden group-hover:flex flex-col gap-0.5 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); movePage(di, di - 1) }}
                  disabled={di === 0}
                  title="Move up"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600 disabled:opacity-30"
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); movePage(di, di + 1) }}
                  disabled={di === pageOrder.length - 1}
                  title="Move down"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600 disabled:opacity-30"
                >
                  <ChevronDown size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Canvas area ── */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-8">
          {/* Wrapper with relative positioning so Fabric wrapperEl overlays PDF canvas */}
          <div className="relative shadow-xl" style={{ display: 'inline-block' }}>
            {/* PDF layer (background) */}
            <canvas
              ref={pdfCanvasRef}
              className="block"
              style={{ display: 'block' }}
            />
            {/* Fabric canvas element — Fabric wraps this; pre-position so it doesn't affect layout flow */}
            <canvas
              ref={fabricElRef}
              style={{
                touchAction: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'all',
              }}
            />
          </div>
        </div>
      </div>

      {/* Error toast */}
      {loadError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          <AlertCircle size={15} />
          {loadError}
          <button onClick={() => setLoadError(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
      />

      {showSignatureModal && (
        <SignatureModal onUse={handleUseSignature} onClose={() => setShowSignatureModal(false)} />
      )}
    </div>
  )
}
