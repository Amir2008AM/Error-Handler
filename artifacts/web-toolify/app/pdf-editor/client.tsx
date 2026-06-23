'use client'

import React, {
  useState, useEffect, useRef, useCallback, DragEvent,
} from 'react'
import {
  MousePointer2, Type, ImageIcon, PenLine, Highlighter, Eraser,
  PenSquare, Trash2, RotateCw, ZoomIn, ZoomOut,
  Undo2, Redo2, Download, ChevronUp, ChevronDown,
  X, Loader2, AlertCircle, FileText,
  Square, Circle, Minus, ArrowRight,
  StickyNote, MessageCircle,
  CheckSquare, List, Minimize2, Spline,
  Sliders, RotateCcw,
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Baseline,
} from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'
import { cn } from '@/lib/utils'
import DrawPanel, {
  type PenType, type HlType, type BrushPreset,
  DEFAULT_PEN_PRESETS, DEFAULT_HL_PRESETS,
  buildBrushColor, getPenLineCap, getPenWidthMult, getDashArray,
} from '@/components/draw-panel'

// ─── Custom Edit Text Icon ──────────────────────────────────────────────────
function EditTextIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Text lines */}
      <line x1="2" y1="3.5" x2="11.5" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="6.5" x2="13"   y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="9.5" x2="8"    y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Pencil body */}
      <path d="M10.5 13.8 L12.2 12.1 L14.9 14.8 L13.2 16.5 Z"
        fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      {/* Pencil tip/nib */}
      <path d="M12.2 12.1 L13.4 10.9 A0.9 0.9 0 0 1 14.7 12.2 L13.5 13.4"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Eraser end */}
      <path d="M10.5 13.8 L9.5 15.8 L11.5 15.1 Z"
        fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type EditorTool =
  | 'select' | 'text' | 'editText' | 'image' | 'draw' | 'highlight' | 'eraser' | 'lasso' | 'signature'
  | 'rect' | 'ellipse' | 'line' | 'arrow'
  | 'sticky' | 'comment'
  | 'form-text' | 'form-check' | 'form-radio' | 'form-dropdown'

type SigTab = 'draw' | 'type' | 'upload'

// ─── Lasso helper ──────────────────────────────────────────────────────────────
function ptInPoly(px: number, py: number, poly: {x:number;y:number}[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

type PdfTextItem = {
  str: string; x: number; y: number; w: number; h: number; fontSize: number
}
type SigResult = { dataURL: string; text?: string; font?: string; tab: SigTab }
type CompressLevel = 'low' | 'medium' | 'high'

const PDFJS_VERSION = '5.7.284'
const MAX_HISTORY = 30
const MAX_FILE_BYTES = 50 * 1024 * 1024

const SHAPE_TOOLS: EditorTool[] = ['rect', 'ellipse', 'line', 'arrow']

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Patches a Fabric PencilBrush instance so the live drawing preview exactly
 * matches the final saved stroke, without causing input lag.
 *
 * Root cause: Fabric v7 PencilBrush._render() draws only the *latest* segment
 * on the upper canvas without clearing it first.  Each new segment is composited
 * on top of the previous ones, so semi-transparent colors stack up and look
 * darker/more opaque during drawing than the finished path object.
 *
 * Performance design:
 * - Fully opaque strokes (alpha ≥ 0.99): no patch — Fabric's original O(1)
 *   per-segment render has no visible accumulation at 100% opacity, so there
 *   is zero overhead and zero lag.
 * - Semi-transparent strokes (highlighter, low-opacity pen): the full-redraw
 *   is needed for WYSIWYG, but we throttle it to one repaint per animation
 *   frame (≤60fps) via requestAnimationFrame.  High-frequency touch events
 *   (120–240Hz on tablets) used to trigger O(n) redraws on every event;
 *   now they trigger at most one O(n) redraw per display frame.
 *   _finalizeAndAddPath is also wrapped to cancel any pending rAF before
 *   Fabric clears contextTop, preventing ghost strokes after mouseup/touchend.
 */
function patchBrushWYSIWYG(brush: any, fc: any): void {
  // Parse the alpha component from the rgba() color string built by buildBrushColor()
  const alphaMatch = brush.color.match(/,\s*([\d.]+)\s*\)/)
  const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1

  // Fully opaque: original Fabric rendering has no accumulation artifact → no patch needed
  if (alpha >= 0.99) return

  let rafId: number | null = null

  // Cancel any pending rAF before Fabric clears contextTop on mouseup/touchend,
  // otherwise the deferred draw fires onto an already-cleared canvas and ghosts.
  const origFinalize = brush._finalizeAndAddPath?.bind(brush)
  brush._finalizeAndAddPath = function (...args: any[]) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    return origFinalize?.(...args)
  }

  brush._render = function (ctx?: CanvasRenderingContext2D) {
    // Already have a frame scheduled — the rAF will pick up the latest _points
    if (rafId !== null) return

    const self    = this
    const context = (ctx ?? fc.contextTop) as CanvasRenderingContext2D

    rafId = requestAnimationFrame(() => {
      rafId = null
      const points: { x: number; y: number }[] = self._points ?? []
      if (points.length < 2) return

      // Clear overlay so accumulated semi-transparent segments don't stack
      fc.clearContext(context)
      self._saveAndTransform(context)

      context.beginPath()
      context.strokeStyle = self.color
      context.lineWidth   = self.width
      context.lineCap     = (self.strokeLineCap  as CanvasLineCap)  ?? 'round'
      context.lineJoin    = (self.strokeLineJoin as CanvasLineJoin) ?? 'round'
      context.setLineDash(self.strokeDashArray ?? [])

      // Quadratic smoothing — same algorithm Fabric uses internally
      let p1 = points[0]
      let p2 = points[1]
      context.moveTo(p1.x, p1.y)
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        context.quadraticCurveTo(p1.x, p1.y, midX, midY)
        p1 = points[i]
        p2 = points[i + 1]
      }
      context.lineTo(p1.x, p1.y)
      context.stroke()
      context.restore()
    })
  }
}

function dataURLtoBytes(dataURL: string): Uint8Array {
  const b64 = dataURL.split(',')[1]
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

// ─── Signature Modal ────────────────────────────────────────────────────────────

function SignatureModal({
  onUse,
  onClose,
}: {
  onUse: (result: SigResult) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<SigTab>('draw')
  const [typedSig, setTypedSig] = useState('')
  const [sigFont, setSigFont] = useState<string>('Dancing Script')
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [hasDrawing, setHasDrawing] = useState(false)
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
        enableRetinaScaling: true,
      })
      const brush = new PencilBrush(fc)
      brush.color = '#1e293b'
      brush.width = 2
      ;(brush as any).decimate = 2
      fc.freeDrawingBrush = brush
      sigFabricRef.current = fc

      const syncHasDrawing = () => setHasDrawing(fc.getObjects().length > 0)
      fc.on('path:created', syncHasDrawing)
      fc.on('object:removed', syncHasDrawing)

      let pointerInsideCanvas = false
      const onMouseEnter = () => { pointerInsideCanvas = true }
      const onMouseLeave = () => { pointerInsideCanvas = false }
      fc.upperCanvasEl?.addEventListener('mouseenter', onMouseEnter)
      fc.upperCanvasEl?.addEventListener('mouseleave', onMouseLeave)

      stopBrush = () => {
        if (pointerInsideCanvas) return
        const fb = fc.freeDrawingBrush as any
        if (!fc.isDrawingMode) return
        if (Array.isArray(fb?._points)) fb._points = []
        ;(fc as any)._isCurrentlyDrawing = false
      }
      document.addEventListener('mouseup', stopBrush)
    })
    return () => {
      mounted = false
      if (stopBrush) document.removeEventListener('mouseup', stopBrush)
      sigFabricRef.current?.dispose()
      sigFabricRef.current = null
    }
  }, [tab])

  const handleUse = useCallback(() => {
    if (tab === 'draw') {
      const fc = sigFabricRef.current
      if (!fc) return
      if (fc.getObjects().length === 0) return
      onUse({ dataURL: fc.toDataURL({ format: 'png', multiplier: 4 }), tab: 'draw' })
    } else if (tab === 'type') {
      if (!typedSig.trim()) return
      const dpr = window.devicePixelRatio || 2
      const tmp = document.createElement('canvas')
      tmp.width = 700 * dpr; tmp.height = 140 * dpr
      const ctx = tmp.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, 700, 140)
      ctx.fillStyle = '#1e293b'
      ctx.font = `62px "${sigFont}", cursive`
      ctx.textBaseline = 'middle'
      ctx.fillText(typedSig, 16, 70)
      onUse({ dataURL: tmp.toDataURL('image/png'), text: typedSig, font: sigFont, tab: 'type' })
    } else if (tab === 'upload' && uploadPreview) {
      onUse({ dataURL: uploadPreview, tab: 'upload' })
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
      <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pinyon+Script&family=Satisfy&family=Great+Vibes&family=Sacramento&family=Parisienne&family=Alex+Brush&family=Kaushan+Script&family=Caveat:wght@600&family=Lobster&display=swap"
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex border-b border-gray-100">
          {(['draw', 'type', 'upload'] as SigTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setUploadPreview(null); setHasDrawing(false) }}
              className={cn('flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
                tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >{t}</button>
          ))}
        </div>
        <div className="p-5 space-y-3">
          {tab === 'draw' && (
            <>
              <p className="text-xs text-gray-400">Draw your signature below</p>
              <div className="rounded-xl overflow-hidden bg-white" style={{ boxShadow: 'inset 0 0 0 1px #e2e8f0' }}>
                <canvas ref={sigCanvasRef} style={{ touchAction: 'none', display: 'block' }} />
              </div>
              <button onClick={() => { sigFabricRef.current?.clear(); setHasDrawing(false) }}
                className="text-xs text-blue-600 hover:underline">Clear</button>
            </>
          )}
          {tab === 'type' && (
            <>
              <input type="text" value={typedSig} onChange={(e) => setTypedSig(e.target.value)}
                placeholder="Write your signature…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="rounded-xl px-4 py-3 min-h-[70px] flex items-center bg-white"
                style={{ fontFamily: `"${sigFont}", cursive`, fontSize: 38, boxShadow: 'inset 0 0 0 1px #e2e8f0' }}>
                <span className="text-gray-800">{typedSig || <span className="text-gray-300 text-2xl" style={{ fontFamily: 'inherit' }}>Your signature</span>}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Dancing Script','Great Vibes','Pinyon Script','Sacramento','Parisienne','Alex Brush','Satisfy','Kaushan Script','Caveat'].map((f) => (
                  <button key={f} onClick={() => setSigFont(f)}
                    className={cn('py-2 px-1 rounded-lg border text-sm transition-colors truncate',
                      sigFont === f ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    )}
                    style={{ fontFamily: `"${f}", cursive`, fontSize: 18 }} title={f}
                  >{typedSig || 'Sign'}</button>
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
          <button onClick={handleUse}
            disabled={(tab === 'draw' && !hasDrawing) || (tab === 'type' && !typedSig.trim()) || (tab === 'upload' && !uploadPreview)}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
          >Use Signature</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Editor Component ──────────────────────────────────────────────────────

export function PdfEditorClient() {
  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'upload' | 'editor'>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── PDF data ───────────────────────────────────────────────────────────────
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('edited.pdf')
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageOrder, setPageOrder] = useState<number[]>([])
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})
  const pageAnnotationsRef = useRef<Record<number, object>>({})

  // ── Editor UI ──────────────────────────────────────────────────────────────
  const [tool, setTool] = useState<EditorTool>('select')
  const [zoom, setZoom] = useState(1.0)
  const [textColor, setTextColor] = useState('#1e293b')
  const [textSize, setTextSize] = useState(16)
  const [brushColor, setBrushColor] = useState('#3b82f6')
  const [brushSize, setBrushSize] = useState(4)
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  // ── Drawing presets (per pen/hl type) ─────────────────────────────────────
  const [activePenType,  setActivePenType]  = useState<PenType>('pen')
  const [activeHlType,   setActiveHlType]   = useState<HlType>('standard')
  const [penPresets,     setPenPresets]     = useState<Record<PenType, BrushPreset>>(() => ({ ...DEFAULT_PEN_PRESETS }))
  const [hlPresets,      setHlPresets]      = useState<Record<HlType,  BrushPreset>>(() => ({ ...DEFAULT_HL_PRESETS  }))
  const [showDrawPanel,  setShowDrawPanel]  = useState(false)
  const [showHlPanel,    setShowHlPanel]    = useState(false)

  // ── Lasso selection ───────────────────────────────────────────────────────
  const lassoPointsRef  = useRef<{x:number;y:number}[]>([])
  const [lassoAction,   setLassoAction]    = useState<{ objs: any[] } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Shape style ────────────────────────────────────────────────────────────
  const [shapeStroke, setShapeStroke] = useState('#1e293b')
  const [shapeFill, setShapeFill] = useState('transparent')
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)

  // ── History ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const isRestoringRef = useRef(false)

  // ── Compress on download ───────────────────────────────────────────────────
  const [compressOnDownload, setCompressOnDownload] = useState(false)
  const [compressionLevel, setCompressionLevel] = useState<CompressLevel>('medium')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  // ── OCR panel ─────────────────────────────────────────────────────────────
  const [ocrDone,        setOcrDone]        = useState(false)
  const [ocrRunning,     setOcrRunning]     = useState(false)
  const [showOcrPanel,   setShowOcrPanel]   = useState(false)

  // ── Selected object (image editing panel) ─────────────────────────────────
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [sliderScale, setSliderScale]     = useState(1)
  const [sliderOpacity, setSliderOpacity] = useState(1)

  // ── Text formatting (side panel) ───────────────────────────────────────────
  const [fmtBold,          setFmtBold]          = useState(false)
  const [fmtItalic,        setFmtItalic]        = useState(false)
  const [fmtUnderline,     setFmtUnderline]     = useState(false)
  const [fmtAlign,         setFmtAlign]         = useState('left')
  const [fmtFontFamily,    setFmtFontFamily]    = useState('Helvetica, Arial, sans-serif')
  const [fmtFontSize,      setFmtFontSize]      = useState(16)
  const [fmtColor,         setFmtColor]         = useState('#1e293b')
  const [fmtLetterSpacing, setFmtLetterSpacing] = useState(0)
  const [fmtLineHeight,    setFmtLineHeight]    = useState(1.16)
  const [fmtTextOpacity,   setFmtTextOpacity]   = useState(1)
  const [fmtAngle,         setFmtAngle]         = useState(0)
  const [fmtBgColor,       setFmtBgColor]       = useState('')

  // ── PDF text items (edit-text overlay) ────────────────────────────────────
  const [pdfTextItems,  setPdfTextItems]  = useState<PdfTextItem[]>([])
  const pdfTextItemsRef = useRef<PdfTextItem[]>([])

  // ── Page thumbnails ────────────────────────────────────────────────────────
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  // ── Fabric ready flag (fixes page-1 not rendering) ────────────────────────
  const [fabricReady, setFabricReady] = useState(false)

  // ── Canvas refs ────────────────────────────────────────────────────────────
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
  const shapeStrokeRef = useRef('#1e293b')
  const shapeFillRef = useRef('transparent')
  const shapeStrokeWidthRef = useRef(2)

  // Shape drawing state
  const shapeDrawingRef = useRef(false)
  const shapeStartRef = useRef({ x: 0, y: 0 })
  const inProgressShapeRef = useRef<any>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Sync refs with state ───────────────────────────────────────────────────
  useEffect(() => { currentPageRef.current = currentPage }, [currentPage])
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { textColorRef.current = textColor }, [textColor])
  useEffect(() => { textSizeRef.current = textSize }, [textSize])
  useEffect(() => { historyIndexRef.current = historyIndex }, [historyIndex])
  useEffect(() => { shapeStrokeRef.current = shapeStroke }, [shapeStroke])
  useEffect(() => { shapeFillRef.current = shapeFill }, [shapeFill])
  useEffect(() => { shapeStrokeWidthRef.current = shapeStrokeWidth }, [shapeStrokeWidth])
  // ── Load PDF.js ────────────────────────────────────────────────────────────
  useEffect(() => {
    import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`
      pdfjsRef.current = lib
    })
  }, [])

  // ── Push annotation history ────────────────────────────────────────────────
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

  // ── Init Fabric.js canvas ──────────────────────────────────────────────────
  const initFabric = useCallback(async () => {
    if (!fabricElRef.current || fabricRef.current) return
    const { Canvas, PencilBrush } = await import('fabric')

    const fc = new Canvas(fabricElRef.current, {
      backgroundColor: undefined as any,
      selection: true,
    })

    if (fc.wrapperEl) {
      Object.assign(fc.wrapperEl.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        pointerEvents: 'all',
        overflow: 'visible',
      })
    }

    // ── History events ──────────────────────────────────────────────────────
    fc.on('object:added', (opt: any) => {
      if (opt.target?.data?.temp) return
      pushHistory()
    })
    fc.on('object:modified', pushHistory)
    fc.on('object:removed', pushHistory)

    // ── Selection tracking (for image/text edit panels) ───────────────────
    const syncTextFmt = (obj: any) => {
      if (obj?.type === 'i-text' || obj?.type === 'textbox') {
        setFmtBold(obj.fontWeight === 'bold')
        setFmtItalic(obj.fontStyle === 'italic')
        setFmtUnderline(!!obj.underline)
        setFmtAlign(obj.textAlign || 'left')
        setFmtFontFamily(obj.fontFamily || 'Helvetica, Arial, sans-serif')
        setFmtFontSize(obj.fontSize || 16)
        setFmtColor(typeof obj.fill === 'string' ? obj.fill : '#1e293b')
        setFmtLetterSpacing(obj.charSpacing || 0)
        setFmtLineHeight(obj.lineHeight || 1.16)
        setFmtTextOpacity(obj.opacity ?? 1)
        setFmtAngle(obj.angle || 0)
        setFmtBgColor(obj.backgroundColor || '')
      }
    }
    const onSel = (obj: any) => {
      setSelectedObject(obj ?? null)
      setSliderScale(obj?.scaleX ?? 1)
      setSliderOpacity(obj?.opacity ?? 1)
      syncTextFmt(obj)
    }
    fc.on('selection:created', (opt: any) => { onSel(opt.selected?.[0]) })
    fc.on('selection:updated', (opt: any) => { onSel(opt.selected?.[0]) })
    fc.on('selection:cleared', () => { onSel(null) })
    // Re-sync text fmt when object is modified (e.g. after format applies)
    fc.on('object:modified', (opt: any) => { syncTextFmt(opt.target) })

    // ── No corner handles — drag the whole object to move it ───────────────
    // Textboxes get resize handles so users can widen/narrow them.
    const styleObject = (obj: any) => {
      if (!obj || obj.data?.temp) return
      const isTextbox = obj.type === 'textbox'
      obj.set({
        hasControls: isTextbox,
        hasBorders: true,
        borderColor: '#6366f1',
        borderScaleFactor: 2,
        padding: 8,
      })
      if (isTextbox) {
        obj.setControlsVisibility?.({
          mt: false, mb: false,
          tl: false, tr: false, bl: false, br: false,
          mtr: false,
          ml: true, mr: true,
        })
      }
    }
    fc.on('object:added', (opt: any) => { styleObject(opt.target) })
    fc.on('selection:created', (opt: any) => { opt.selected?.forEach((o: any) => styleObject(o)) })
    fc.on('selection:updated', (opt: any) => { opt.selected?.forEach((o: any) => styleObject(o)) })

    // ── Text tool ───────────────────────────────────────────────────────────
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'text') return
      if (opt.target) return
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      import('fabric').then(({ IText }) => {
        const txt = new IText('Text', {
          left: pointer.x, top: pointer.y,
          fontSize: textSizeRef.current, fill: textColorRef.current,
          fontFamily: 'Helvetica, Arial, sans-serif', editable: true,
        })
        fc.add(txt)
        fc.setActiveObject(txt)
        txt.enterEditing?.()
        txt.selectAll?.()
        fc.renderAll()
        setTool('select')
      })
    })

    // ── Edit Text tool: click existing PDF text or add new textbox ──────────
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'editText') return
      if (opt.target) return   // let Fabric handle clicking on existing objects
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      const px = pointer.x; const py = pointer.y

      // Check if we hit any extracted PDF text item
      const hit = pdfTextItemsRef.current.find((item) =>
        px >= item.x - 6 && px <= item.x + item.w + 6 &&
        py >= item.y - 6 && py <= item.y + item.h + 6
      )

      if (hit) {
        // Cover the original rendered text with a white rect, then place editable textbox
        import('fabric').then(({ Rect, Textbox }) => {
          const cover = new Rect({
            left: hit.x - 2, top: hit.y - 2,
            width: hit.w + 4, height: hit.h + 4,
            fill: '#ffffff', stroke: 'none',
            selectable: false, evented: false,
            data: { temp: false, isCover: true },
          } as any)
          const txt = new Textbox(hit.str, {
            left: hit.x - 2, top: hit.y - 2,
            width: Math.max(hit.w + 4, 80),
            fontSize: Math.max(Math.round(hit.fontSize), 8),
            fill: '#1e293b',
            fontFamily: 'Helvetica, Arial, sans-serif',
            editable: true,
            data: { isEditText: true },
          } as any)
          fc.add(cover); fc.add(txt)
          fc.setActiveObject(txt)
          txt.enterEditing?.()
          txt.selectAll?.()
          fc.renderAll()
        })
      } else {
        // Empty area → create a new multi-line text box
        import('fabric').then(({ Textbox }) => {
          const txt = new Textbox('', {
            left: px, top: py,
            width: 220,
            fontSize: textSizeRef.current,
            fill: textColorRef.current,
            fontFamily: 'Helvetica, Arial, sans-serif',
            editable: true,
            data: { isEditText: true },
          } as any)
          fc.add(txt)
          fc.setActiveObject(txt)
          txt.enterEditing?.()
          fc.renderAll()
        })
      }
    })

    // ── Eraser — continuous: removes any object under the pointer while held ─
    let eraserActive = false
    const eraseAt = (opt: any) => {
      const target = opt.target ?? fc.findTarget?.(opt.e)
      if (!target || (target as any).data?.temp) return
      fc.remove(target)
      fc.discardActiveObject()
      fc.renderAll()
    }
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'eraser') return
      eraserActive = true
      eraseAt(opt)
    })
    fc.on('mouse:move', (opt: any) => {
      if (toolRef.current !== 'eraser' || !eraserActive) return
      eraseAt(opt)
    })
    fc.on('mouse:up', () => { eraserActive = false })

    // ── Lasso selection ─────────────────────────────────────────────────────
    let lassoActive = false
    const drawLasso = (pts: {x:number;y:number}[]) => {
      const uc  = (fc as any).upperCanvasEl as HTMLCanvasElement | undefined
      if (!uc) return
      const ctx = uc.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, uc.width, uc.height)
      if (pts.length < 2) return
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = '#6366f1'
      ctx.fillStyle   = 'rgba(99,102,241,0.07)'
      ctx.lineWidth   = 1.5
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'lasso') return
      fc.discardActiveObject(); fc.renderAll()
      setLassoAction(null)
      const p = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      lassoPointsRef.current = [{ x: p.x, y: p.y }]
      lassoActive = true
    })

    fc.on('mouse:move', (opt: any) => {
      if (toolRef.current !== 'lasso' || !lassoActive) return
      const p = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      lassoPointsRef.current.push({ x: p.x, y: p.y })
      drawLasso(lassoPointsRef.current)
    })

    fc.on('mouse:up', () => {
      if (toolRef.current !== 'lasso' || !lassoActive) return
      lassoActive = false
      const pts = lassoPointsRef.current
      // Clear lasso overlay
      const uc = (fc as any).upperCanvasEl as HTMLCanvasElement | undefined
      if (uc) { const ctx = uc.getContext('2d'); ctx?.clearRect(0, 0, uc.width, uc.height) }

      if (pts.length < 6) { lassoPointsRef.current = []; return }

      // Find enclosed objects
      const enclosed = (fc.getObjects?.() ?? []).filter((obj: any) => {
        if (obj.data?.temp) return false
        const br = obj.getBoundingRect?.()
        if (!br) return false
        const cx = br.left + br.width  / 2
        const cy = br.top  + br.height / 2
        return ptInPoly(cx, cy, pts)
      })

      lassoPointsRef.current = []
      if (enclosed.length === 0) return

      import('fabric').then(({ ActiveSelection }) => {
        const sel = new (ActiveSelection as any)(enclosed, { canvas: fc })
        fc.setActiveObject(sel)
        fc.renderAll()
        setLassoAction({ objs: enclosed })
      })
    })

    // ── Shape drawing: start ────────────────────────────────────────────────
    fc.on('mouse:down', (opt: any) => {
      const t = toolRef.current
      if (!SHAPE_TOOLS.includes(t)) return
      if (opt.target) return
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      shapeStartRef.current = { x: pointer.x, y: pointer.y }
      shapeDrawingRef.current = true
      fc.selection = false

      import('fabric').then(({ Rect, Ellipse, Line }) => {
        let shape: any = null
        const x = shapeStartRef.current.x
        const y = shapeStartRef.current.y
        const stroke = shapeStrokeRef.current
        const fill = shapeFillRef.current
        const sw = shapeStrokeWidthRef.current

        if (t === 'rect') {
          shape = new Rect({ left: x, top: y, width: 0, height: 0, stroke, fill, strokeWidth: sw, selectable: false, data: { temp: true } })
        } else if (t === 'ellipse') {
          shape = new Ellipse({ left: x, top: y, rx: 0, ry: 0, stroke, fill, strokeWidth: sw, selectable: false, data: { temp: true } })
        } else if (t === 'line' || t === 'arrow') {
          shape = new Line([x, y, x, y], { stroke, strokeWidth: sw, selectable: false, data: { temp: true, isArrowLine: t === 'arrow' } })
        }
        if (shape) {
          fc.add(shape)
          inProgressShapeRef.current = shape
        }
      })
    })

    // ── Shape drawing: update ───────────────────────────────────────────────
    fc.on('mouse:move', (opt: any) => {
      if (!shapeDrawingRef.current || !inProgressShapeRef.current) return
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      const shape = inProgressShapeRef.current
      const start = shapeStartRef.current

      switch (toolRef.current) {
        case 'rect': {
          const w = pointer.x - start.x
          const h = pointer.y - start.y
          shape.set({ left: w >= 0 ? start.x : pointer.x, top: h >= 0 ? start.y : pointer.y, width: Math.abs(w), height: Math.abs(h) })
          break
        }
        case 'ellipse': {
          const rx = Math.abs(pointer.x - start.x) / 2
          const ry = Math.abs(pointer.y - start.y) / 2
          shape.set({ left: Math.min(start.x, pointer.x), top: Math.min(start.y, pointer.y), rx, ry })
          break
        }
        case 'line':
        case 'arrow':
          shape.set({ x2: pointer.x, y2: pointer.y })
          break
      }
      fc.renderAll()
    })

    // ── Shape drawing: finalize ─────────────────────────────────────────────
    const finalizeShape = async () => {
      if (!shapeDrawingRef.current) return
      shapeDrawingRef.current = false
      fc.selection = true
      const shape = inProgressShapeRef.current
      inProgressShapeRef.current = null
      if (!shape) return

      if (toolRef.current === 'arrow') {
        const x1 = shape.x1 ?? shape.get?.('x1') ?? 0
        const y1 = shape.y1 ?? shape.get?.('y1') ?? 0
        const x2 = shape.x2 ?? shape.get?.('x2') ?? 0
        const y2 = shape.y2 ?? shape.get?.('y2') ?? 0
        const dx = x2 - x1; const dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 5) {
          const angle = Math.atan2(dy, dx)
          const headLen = Math.min(22, len * 0.25)
          const ha = 0.42
          const tip = { x: x2, y: y2 }
          const p1 = { x: x2 - headLen * Math.cos(angle - ha), y: y2 - headLen * Math.sin(angle - ha) }
          const p2 = { x: x2 - headLen * Math.cos(angle + ha), y: y2 - headLen * Math.sin(angle + ha) }
          const { Polygon } = await import('fabric')
          const head = new Polygon([tip, p1, p2], {
            fill: shapeStrokeRef.current, stroke: shapeStrokeRef.current, strokeWidth: 1,
            data: { temp: false },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          shape.set({ data: { temp: false }, selectable: true })
          fc.add(head)
        } else {
          fc.remove(shape)
          return
        }
      } else {
        shape.set({ data: { temp: false }, selectable: true })
      }
      fc.renderAll()
      pushHistory()
    }

    fc.on('mouse:up', finalizeShape)

    const handleDocUp = () => {
      if (shapeDrawingRef.current) finalizeShape()
    }
    document.addEventListener('mouseup', handleDocUp)
    document.addEventListener('touchend', handleDocUp as any)

    // ── Sticky note / comment ───────────────────────────────────────────────
    fc.on('mouse:down', (opt: any) => {
      const t = toolRef.current
      if (t !== 'sticky' && t !== 'comment') return
      if (opt.target) return
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      import('fabric').then(({ Rect, IText }) => {
        if (t === 'sticky') {
          const bg = new Rect({ left: pointer.x, top: pointer.y, width: 170, height: 125, fill: '#fef9c3', stroke: '#fde047', strokeWidth: 1.5, rx: 5, ry: 5 })
          const txt = new IText('Note…', { left: pointer.x + 9, top: pointer.y + 9, width: 152, fontSize: 13, fill: '#713f12', fontFamily: 'Helvetica, Arial, sans-serif', editable: true })
          fc.add(bg); fc.add(txt)
          fc.setActiveObject(txt); txt.enterEditing?.(); txt.selectAll?.()
        } else {
          const bg = new Rect({ left: pointer.x, top: pointer.y, width: 160, height: 85, fill: '#eff6ff', stroke: '#3b82f6', strokeWidth: 1.5, rx: 9, ry: 9 })
          const txt = new IText('Comment…', { left: pointer.x + 9, top: pointer.y + 10, width: 142, fontSize: 12, fill: '#1e40af', fontFamily: 'Helvetica, Arial, sans-serif', editable: true })
          fc.add(bg); fc.add(txt)
          fc.setActiveObject(txt); txt.enterEditing?.(); txt.selectAll?.()
        }
        fc.renderAll()
        setTool('select')
      })
    })

    // ── Form fields ─────────────────────────────────────────────────────────
    fc.on('mouse:down', (opt: any) => {
      const t = toolRef.current
      if (!['form-text', 'form-check', 'form-radio', 'form-dropdown'].includes(t)) return
      if (opt.target) return
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e) ?? { x: opt.pointer?.x ?? 0, y: opt.pointer?.y ?? 0 }
      const x = pointer.x; const y = pointer.y
      import('fabric').then(({ Rect, IText, Circle: FabCircle }) => {
        if (t === 'form-text') {
          const box = new Rect({ left: x, top: y, width: 200, height: 28, fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, rx: 3, ry: 3 })
          const lbl = new IText('Text field', { left: x + 6, top: y + 6, fontSize: 12, fill: '#94a3b8', fontFamily: 'Helvetica, Arial, sans-serif', editable: true })
          fc.add(box); fc.add(lbl)
          fc.setActiveObject(lbl); lbl.enterEditing?.(); lbl.selectAll?.()
        } else if (t === 'form-check') {
          const box = new Rect({ left: x, top: y, width: 18, height: 18, fill: '#ffffff', stroke: '#475569', strokeWidth: 1.5, rx: 2, ry: 2 })
          fc.add(box); fc.setActiveObject(box)
        } else if (t === 'form-radio') {
          const circ = new FabCircle({ left: x, top: y, radius: 10, fill: '#ffffff', stroke: '#475569', strokeWidth: 1.5 })
          fc.add(circ); fc.setActiveObject(circ)
        } else if (t === 'form-dropdown') {
          const box = new Rect({ left: x, top: y, width: 170, height: 28, fill: '#ffffff', stroke: '#94a3b8', strokeWidth: 1, rx: 3, ry: 3 })
          const lbl = new IText('Select…  ▼', { left: x + 6, top: y + 6, fontSize: 12, fill: '#64748b', fontFamily: 'Helvetica, Arial, sans-serif', editable: true })
          fc.add(box); fc.add(lbl)
          fc.setActiveObject(lbl); lbl.enterEditing?.(); lbl.selectAll?.()
        }
        fc.renderAll()
        setTool('select')
      })
    })

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const obj = fc.getActiveObject?.()
      if (!obj || (obj as any).isEditing) return
      fc.remove(obj); fc.renderAll()
    }
    window.addEventListener('keydown', handleKey)
    // Re-calculate offset on window resize so touch coordinates stay accurate
    const handleResize = () => { fc.calcOffset?.() }
    window.addEventListener('resize', handleResize)

    fabricRef.current = fc
    setFabricReady(true)

    return () => {
      setFabricReady(false)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mouseup', handleDocUp)
      document.removeEventListener('touchend', handleDocUp as any)
    }
  }, [pushHistory])

  // ── Render a PDF page ──────────────────────────────────────────────────────
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
    if (!skipSaveCurrent && fc) {
      pageAnnotationsRef.current[currentPageRef.current] = fc.toJSON() as object
    }

    try { renderTaskRef.current?.cancel?.() } catch {}
    renderTaskRef.current = null

    try {
      const page = await doc.getPage(pageNum)
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1
      const viewport = page.getViewport({ scale: zoomLevel * dpr })
      const W = Math.round(viewport.width / dpr)
      const H = Math.round(viewport.height / dpr)
      const physW = Math.round(viewport.width)
      const physH = Math.round(viewport.height)

      const pdfCanvas = pdfCanvasRef.current!
      pdfCanvas.width = physW
      pdfCanvas.height = physH
      pdfCanvas.style.width = W + 'px'
      pdfCanvas.style.height = H + 'px'

      if (fc) {
        // Use Fabric's official resize API — this properly updates the internal
        // offset cache that drives pointer/touch coordinate mapping.
        if (typeof fc.setDimensions === 'function') {
          fc.setDimensions({ width: W, height: H })
        } else {
          // Fallback: manual resize for older Fabric builds
          fc.width = W; fc.height = H
          if (fc.lowerCanvasEl) {
            fc.lowerCanvasEl.width = W; fc.lowerCanvasEl.height = H
            fc.lowerCanvasEl.style.width = W + 'px'; fc.lowerCanvasEl.style.height = H + 'px'
          }
          if (fc.upperCanvasEl) {
            fc.upperCanvasEl.width = W; fc.upperCanvasEl.height = H
            fc.upperCanvasEl.style.width = W + 'px'; fc.upperCanvasEl.style.height = H + 'px'
          }
        }
        if (fc.wrapperEl) {
          Object.assign(fc.wrapperEl.style, {
            position: 'absolute', top: '0', left: '0',
            width: W + 'px', height: H + 'px', pointerEvents: 'all',
          })
        }
        isRestoringRef.current = true
        fc.clear()
        const saved = pageAnnotationsRef.current[pageNum]
        if (saved) await fc.loadFromJSON(saved)
        fc.renderAll()
        isRestoringRef.current = false
      }

      setHistory([]); setHistoryIndex(-1); historyIndexRef.current = -1

      const ctx = pdfCanvas.getContext('2d')!
      ctx.clearRect(0, 0, physW, physH)
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
      // Refresh Fabric's cached canvas offset after every render so that
      // pointer/touch coordinates map correctly to the drawn position.
      fabricRef.current?.calcOffset?.()
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error('PDF render:', err)
    } finally {
      isRenderingRef.current = false
    }
  }, [])

  // ── Apply brush settings from active preset ────────────────────────────────
  const applyBrushFromPreset = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || !fc.isDrawingMode) return
    import('fabric').then(({ PencilBrush }) => {
      const isPen = fc.isDrawingMode && toolRef.current === 'draw'
      const preset = isPen ? penPresets[activePenType] : hlPresets[activeHlType]
      const brush  = new PencilBrush(fc)

      if (isPen) {
        brush.color    = buildBrushColor(preset.color, preset.opacity)
        brush.width    = preset.size * getPenWidthMult(activePenType)
        ;(brush as any).strokeLineCap   = getPenLineCap(activePenType)
        ;(brush as any).strokeDashArray = getDashArray(preset.style, preset.size)
      } else {
        brush.color    = buildBrushColor(preset.color, preset.opacity)
        brush.width    = preset.size
        ;(brush as any).strokeLineCap   = 'round'
        ;(brush as any).strokeDashArray = getDashArray(preset.style, preset.size)
      }

      patchBrushWYSIWYG(brush, fc)
      fc.freeDrawingBrush = brush
    })
  }, [activePenType, activeHlType, penPresets, hlPresets])

  // ── Tool effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    import('fabric').then(({ PencilBrush }) => {
      const isShape = SHAPE_TOOLS.includes(tool)
      const isStickyOrComment = tool === 'sticky' || tool === 'comment'
      const isForm = ['form-text', 'form-check', 'form-radio', 'form-dropdown'].includes(tool)

      fc.isDrawingMode = (tool === 'draw' || tool === 'highlight')
      fc.selection     = (tool === 'select')
      fc.defaultCursor = isShape || isStickyOrComment || isForm
        || tool === 'text' || tool === 'editText' || tool === 'eraser' || tool === 'lasso'
        ? 'crosshair' : 'default'

      if (fc.isDrawingMode) {
        const preset = tool === 'draw' ? penPresets[activePenType] : hlPresets[activeHlType]
        const brush  = new PencilBrush(fc)
        if (tool === 'draw') {
          brush.color    = buildBrushColor(preset.color, preset.opacity)
          brush.width    = preset.size * getPenWidthMult(activePenType)
          ;(brush as any).strokeLineCap   = getPenLineCap(activePenType)
          ;(brush as any).strokeDashArray = getDashArray(preset.style, preset.size)
        } else {
          brush.color    = buildBrushColor(preset.color, preset.opacity)
          brush.width    = preset.size
          ;(brush as any).strokeLineCap   = 'round'
          ;(brush as any).strokeDashArray = getDashArray(preset.style, preset.size)
        }
        patchBrushWYSIWYG(brush, fc)
        fc.freeDrawingBrush = brush
      }

      const allObjs = fc.getObjects?.() ?? []
      allObjs.forEach((obj: any) => {
        obj.selectable = tool === 'select'
        obj.evented    = tool === 'select' || tool === 'eraser'
      })
    })
  }, [tool, activePenType, activeHlType, penPresets, hlPresets])

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject?.()
    if (active?.type === 'i-text') {
      active.set({ fill: textColor, fontSize: textSize })
      fc.renderAll()
    }
  }, [textColor, textSize])

  // Re-apply brush when preset changes while already in drawing mode
  useEffect(() => { applyBrushFromPreset() }, [applyBrushFromPreset])

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getActiveObject?.()
    if (!obj) return
    fc.renderAll()
  }, [shapeStroke, shapeFill, shapeStrokeWidth])

  // ── Render page when dependencies change ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'editor' || !pdfDocProxy || !fabricReady) return
    const timer = setTimeout(() => {
      renderPage(currentPage, pdfDocProxy, zoom)
    }, 30)
    return () => clearTimeout(timer)
  }, [currentPage, pdfDocProxy, zoom, phase, renderPage, fabricReady])

  // ── Generate page thumbnails ────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDocProxy) return
    let cancelled = false
    setThumbnails({})
    ;(async () => {
      for (let i = 1; i <= pdfDocProxy.numPages; i++) {
        if (cancelled) break
        try {
          const page = await pdfDocProxy.getPage(i)
          const viewport = page.getViewport({ scale: 0.22 })
          const tmp = document.createElement('canvas')
          tmp.width = Math.round(viewport.width)
          tmp.height = Math.round(viewport.height)
          const ctx = tmp.getContext('2d')!
          await page.render({ canvasContext: ctx, viewport }).promise
          if (!cancelled) setThumbnails((prev) => ({ ...prev, [i]: tmp.toDataURL('image/jpeg', 0.75) }))
        } catch { /* skip failed thumb */ }
      }
    })()
    return () => { cancelled = true }
  }, [pdfDocProxy])

  useEffect(() => {
    if (phase !== 'editor') return
    const cleanup = initFabric()
    return () => { cleanup?.then?.((fn: any) => fn?.()) }
  }, [phase, initFabric])

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current <= 0) return
    const idx = historyIndexRef.current - 1
    const state = history[idx]; if (!state) return
    isRestoringRef.current = true
    await fc.loadFromJSON(JSON.parse(state))
    fc.renderAll()
    isRestoringRef.current = false
    historyIndexRef.current = idx; setHistoryIndex(idx)
  }, [history])

  const handleRedo = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current >= history.length - 1) return
    const idx = historyIndexRef.current + 1
    const state = history[idx]; if (!state) return
    isRestoringRef.current = true
    await fc.loadFromJSON(JSON.parse(state))
    fc.renderAll()
    isRestoringRef.current = false
    historyIndexRef.current = idx; setHistoryIndex(idx)
  }, [history])

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      import('fabric').then(({ FabricImage }) => {
        FabricImage.fromURL(url, { crossOrigin: 'anonymous' } as any).then((img: any) => {
          const fc = fabricRef.current; if (!fc) return
          const maxW = Math.min(300, (fc.width ?? 400) * 0.5)
          const scale = img.width > maxW ? maxW / img.width : 1
          img.scale(scale); img.set({ left: 60, top: 60 })
          fc.add(img); fc.setActiveObject(img); fc.renderAll()
          setTool('select')
        })
      })
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Signature ──────────────────────────────────────────────────────────────
  const handleUseSignature = useCallback((result: SigResult) => {
    setShowSignatureModal(false)
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(result.dataURL, { crossOrigin: 'anonymous' } as any).then((img: any) => {
        const fc = fabricRef.current; if (!fc) return
        const maxW = Math.min(220, (fc.width ?? 400) * 0.4)
        const scale = img.width > maxW ? maxW / img.width : 1
        img.scale(scale)
        img.set({
          left: 60, top: 80,
          data: { isSignature: true, text: result.text ?? '', font: result.font ?? '', tab: result.tab },
        })
        fc.add(img); fc.setActiveObject(img); fc.renderAll()
        setTool('select')
      })
    })
  }, [])

  // ── Regenerate typed signature with a different font ───────────────────────
  const regenerateSig = useCallback((text: string, newFont: string) => {
    const fc = fabricRef.current
    const obj = fc?.getActiveObject?.()
    if (!obj || !obj.data?.isSignature) return

    const dpr = window.devicePixelRatio || 2
    const tmp = document.createElement('canvas')
    tmp.width = 700 * dpr; tmp.height = 140 * dpr
    const ctx = tmp.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, 700, 140)
    ctx.fillStyle = '#1e293b'
    ctx.font = `62px "${newFont}", cursive`
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 16, 70)
    const newDataURL = tmp.toDataURL('image/png')

    const prevScale   = obj.scaleX ?? 1
    const prevLeft    = obj.left  ?? 60
    const prevTop     = obj.top   ?? 80
    const prevAngle   = obj.angle ?? 0
    const prevOpacity = obj.opacity ?? 1

    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(newDataURL, { crossOrigin: 'anonymous' } as any).then((newImg: any) => {
        newImg.scale(prevScale)
        newImg.set({
          left: prevLeft, top: prevTop, angle: prevAngle, opacity: prevOpacity,
          data: { isSignature: true, text, font: newFont, tab: 'type' },
        })
        fc!.remove(obj)
        fc!.add(newImg)
        fc!.setActiveObject(newImg)
        fc!.renderAll()
        setSelectedObject(newImg)
      })
    })
  }, [])

  // ── Page management ────────────────────────────────────────────────────────
  const saveCurrentAnnotations = useCallback(() => {
    const fc = fabricRef.current
    if (fc) pageAnnotationsRef.current[currentPageRef.current] = fc.toJSON() as object
  }, [])

  const goToPage = useCallback((displayIdx: number) => {
    saveCurrentAnnotations()
    setCurrentPage(pageOrder[displayIdx])
  }, [pageOrder, saveCurrentAnnotations])

  const deletePage = useCallback((displayIdx: number) => {
    if (pageOrder.length <= 1) return
    const deletedNum = pageOrder[displayIdx]
    const newOrder = pageOrder.filter((_, i) => i !== displayIdx)
    setPageOrder(newOrder)
    if (deletedNum === currentPage) setCurrentPage(newOrder[Math.max(0, displayIdx - 1)])
  }, [pageOrder, currentPage])

  const rotatePage = useCallback((displayIdx: number) => {
    const pageNum = pageOrder[displayIdx]
    setPageRotations((prev) => ({ ...prev, [pageNum]: ((prev[pageNum] ?? 0) + 90) % 360 }))
  }, [pageOrder])

  const movePage = useCallback((from: number, to: number) => {
    if (to < 0 || to >= pageOrder.length) return
    const arr = [...pageOrder]; const [p] = arr.splice(from, 1); arr.splice(to, 0, p)
    setPageOrder(arr)
  }, [pageOrder])

  // ── File load ──────────────────────────────────────────────────────────────
  const loadPdf = useCallback(async (bytes: Uint8Array, name: string) => {
    setLoading(true); setLoadError(null); pageAnnotationsRef.current = {}
    for (let i = 0; i < 60 && !pdfjsRef.current; i++) await new Promise((r) => setTimeout(r, 100))
    if (!pdfjsRef.current) {
      setLoadError('PDF engine failed to load. Please refresh and try again.'); setLoading(false); return
    }
    try {
      const doc = await pdfjsRef.current.getDocument({ data: bytes.slice() }).promise
      setPdfDocProxy(doc); setTotalPages(doc.numPages)
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i + 1))
      setCurrentPage(1); currentPageRef.current = 1; setFileBytes(bytes)
      setFileName(name.replace(/\.pdf$/i, '') + '-edited.pdf'); setZoom(1.0); setPhase('editor')
    } catch {
      setLoadError('Could not open this PDF. The file may be corrupted or encrypted.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLoadError('Please upload a PDF file.'); return
    }
    if (file.size > MAX_FILE_BYTES) { setLoadError('File exceeds the 50 MB limit.'); return }
    await loadPdf(new Uint8Array(await file.arrayBuffer()), file.name)
  }, [loadPdf])

  // ── Download / Save ────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!fileBytes || !pdfDocProxy) return
    setIsSaving(true); setShowDownloadMenu(false)
    try {
      saveCurrentAnnotations()
      const annotations = { ...pageAnnotationsRef.current }
      const origDoc = await PDFDocument.load(fileBytes)
      const outDoc = await PDFDocument.create()

      for (const origPageNum of pageOrder) {
        const [copied] = await outDoc.copyPages(origDoc, [origPageNum - 1])
        const extraRot = pageRotations[origPageNum] ?? 0
        if (extraRot !== 0) copied.setRotation(degrees((copied.getRotation().angle + extraRot) % 360))

        const pageJSON = annotations[origPageNum] as any
        if (pageJSON?.objects?.length > 0) {
          try {
            const pdfJsPage = await pdfDocProxy.getPage(origPageNum)
            const vp = pdfJsPage.getViewport({ scale: zoom })
            const W = Math.round(vp.width); const H = Math.round(vp.height)
            const tmpEl = document.createElement('canvas')
            tmpEl.width = W; tmpEl.height = H
            const { Canvas } = await import('fabric')
            const tmpFc = new Canvas(tmpEl, { width: W, height: H, backgroundColor: undefined as any })
            await tmpFc.loadFromJSON(pageJSON)
            tmpFc.renderAll()
            const quality = compressOnDownload
              ? (compressionLevel === 'high' ? 0.5 : compressionLevel === 'medium' ? 0.72 : 0.88)
              : 1
            const pngDataURL = tmpFc.toDataURL({ format: 'png', multiplier: quality })
            tmpFc.dispose()
            const pngBytes = dataURLtoBytes(pngDataURL)
            const embedded = await outDoc.embedPng(pngBytes)
            const pw = copied.getWidth(); const ph = copied.getHeight()
            copied.drawImage(embedded, { x: 0, y: 0, width: pw, height: ph, opacity: 1 })
          } catch (err) { console.warn('Annotation embed error:', err) }
        }
        outDoc.addPage(copied)
      }

      const outBytes = await outDoc.save()
      let blob = new Blob([outBytes], { type: 'application/pdf' })

      if (compressOnDownload) {
        try {
          const fd = new FormData()
          fd.append('file', blob, fileName)
          fd.append('level', compressionLevel)
          const resp = await fetch('/api/compress-pdf', { method: 'POST', body: fd })
          if (resp.ok) blob = await resp.blob()
        } catch (e) { console.warn('Server compression failed, using client-side reduction') }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = fileName
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setLoadError('Failed to generate PDF. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [fileBytes, pdfDocProxy, pageOrder, pageRotations, fileName, zoom, saveCurrentAnnotations, compressOnDownload, compressionLevel])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    try { fabricRef.current?.dispose(); fabricRef.current = null } catch {}
    pageAnnotationsRef.current = {}
    setPhase('upload'); setPdfDocProxy(null); setFileBytes(null)
    setPageOrder([]); setPageRotations({}); setHistory([]); setHistoryIndex(-1)
    historyIndexRef.current = -1; setTool('select'); setLoadError(null)
    setOcrDone(false); setOcrRunning(false); setShowOcrPanel(false)
  }, [])

  // ── Keep pdfTextItemsRef in sync ──────────────────────────────────────────
  useEffect(() => { pdfTextItemsRef.current = pdfTextItems }, [pdfTextItems])

  // ── Extract PDF text items for Edit Text overlay ───────────────────────────
  const extractTextItems = useCallback(async () => {
    const doc = pdfDocProxy
    const pdfCanvas = pdfCanvasRef.current
    if (!doc || !pdfCanvas || !pdfjsRef.current) return
    try {
      const page = await doc.getPage(currentPage)
      const dpr  = Math.min(window.devicePixelRatio || 1, 3)
      const viewport = page.getViewport({ scale: zoom * dpr })
      const content  = await page.getTextContent()

      const items: PdfTextItem[] = []
      for (const raw of (content.items as any[])) {
        if (!raw.str?.trim()) continue
        const tx = pdfjsRef.current.Util?.transform?.(viewport.transform, raw.transform)
        if (!tx) continue
        // tx[4], tx[5] = physical-pixel position (top-left origin, Y already flipped by viewport)
        const x   = tx[4] / dpr
        const yBL = tx[5] / dpr
        // Font size from the x-scale component
        const fsz = Math.max(Math.abs(tx[0]) / dpr, Math.abs(tx[3]) / dpr, 8)
        const w   = (raw.width ?? 40) * viewport.scale / dpr
        items.push({ str: raw.str, x, y: yBL - fsz, w: Math.max(w, 20), h: Math.max(fsz * 1.3, 12), fontSize: fsz })
      }
      setPdfTextItems(items)
    } catch (err) {
      console.warn('[EditText] text extraction failed:', err)
    }
  }, [pdfDocProxy, currentPage, zoom])

  // Extract text items whenever we enter editText mode or change page/zoom
  useEffect(() => {
    if (tool === 'editText') extractTextItems()
    else setPdfTextItems([])
  }, [tool, extractTextItems])

  // ── Apply text formatting to selected IText / Textbox ─────────────────────
  const applyTextFmt = useCallback((props: Record<string, unknown>) => {
    const fc  = fabricRef.current
    const obj = fc?.getActiveObject?.()
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'textbox')) return
    obj.set(props as any)
    fc!.renderAll()
    pushHistory()
  }, [pushHistory])

  // ── Image edit helpers (for selected object) ───────────────────────────────
  const applyImageScale = useCallback((delta: number) => {
    const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
    if (!obj) return
    const cur = obj.scaleX ?? 1
    obj.set({ scaleX: Math.max(0.05, cur + delta), scaleY: Math.max(0.05, (obj.scaleY ?? 1) + delta) })
    fc.renderAll()
  }, [])

  const applyImageRotate = useCallback((deg: number) => {
    const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
    if (!obj) return
    obj.set({ angle: ((obj.angle ?? 0) + deg + 360) % 360 })
    fc.renderAll()
  }, [])

  const applyImageOpacity = useCallback((val: number) => {
    const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
    if (!obj) return
    obj.set({ opacity: val }); fc.renderAll()
  }, [])

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
    if (!obj) return
    fc.remove(obj); fc.renderAll()
  }, [])

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── Upload phase ───────────────────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div className="w-full max-w-xl mx-auto py-6">
        <div
          onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
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
              <span className="mt-2 px-5 py-2 rounded-xl bg-violet-600 text-white font-medium text-sm">Choose PDF</span>
            </div>
          )}
        </div>
        <input id="pdf-ed-input" type="file" accept="application/pdf,.pdf" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {loadError && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />{loadError}
          </div>
        )}
        <p className="mt-5 text-xs text-center text-gray-400">
          All editing happens locally in your browser — your file is never uploaded to any server.
        </p>
      </div>
    )
  }

  // ── Editor phase ───────────────────────────────────────────────────────────

  const isShapeTool = SHAPE_TOOLS.includes(tool)
  const isAnnotationTool = tool === 'sticky' || tool === 'comment'
  const isFormTool = ['form-text', 'form-check', 'form-radio', 'form-dropdown'].includes(tool)
  const isSignatureSelected = !!(selectedObject?.data?.isSignature)
  const isImageSelected = (selectedObject?.type === 'image' || selectedObject?.type === 'f-image') && !isSignatureSelected
  const isTextSelected = selectedObject?.type === 'i-text' || selectedObject?.type === 'textbox'

  const FONT_FAMILIES = [
    'Helvetica, Arial, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Verdana, sans-serif',
    'Trebuchet MS, sans-serif',
  ]

  const ToolBtn = ({ id, icon, label, onClick }: { id: EditorTool; icon: React.ReactNode; label: string; onClick?: () => void }) => (
    <button title={label}
      onClick={onClick ?? (() => setTool(id))}
      className={cn(
        'p-2 rounded-lg transition-colors',
        tool === id ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      )}
    >{icon}</button>
  )

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
      style={{ height: 'calc(100vh - 200px)', minHeight: 580 }}>

      {/* ══ Toolbar ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white border-b border-gray-200 flex-wrap shrink-0 text-xs">

        {/* Basic tools */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <ToolBtn id="select"    icon={<MousePointer2 size={16} />} label="Select (V)" />

          {/* Edit Text — featured button: icon + visible label */}
          <button
            title="Edit Text — click existing text to edit, click empty area to add new text"
            onClick={() => setTool('editText')}
            className={cn(
              'flex flex-col items-center justify-center gap-[3px] px-2 py-1 rounded-lg transition-colors min-w-[44px]',
              tool === 'editText'
                ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            <EditTextIcon size={16} />
            <span className="text-[9px] font-semibold leading-none tracking-tight">Edit Text</span>
          </button>

          {/* Pen — click once to activate, click again to open settings */}
          <div className="relative">
            <button title={tool === 'draw' ? 'Pen settings' : 'Pen'}
              onClick={() => {
                if (tool === 'draw') { setShowDrawPanel((v) => !v); setShowHlPanel(false) }
                else { setTool('draw'); setShowDrawPanel(false); setShowHlPanel(false) }
              }}
              className={cn(
                'p-2 rounded-lg transition-colors relative',
                tool === 'draw' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}>
              <PenLine size={16} />
              {tool === 'draw' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                  style={{ background: penPresets[activePenType].color }} />
              )}
            </button>
            {showDrawPanel && tool === 'draw' && (
              <DrawPanel
                mode="pen"
                activePenType={activePenType} activeHlType={activeHlType}
                penPresets={penPresets} hlPresets={hlPresets}
                onChangePenType={(t) => { setActivePenType(t) }}
                onChangeHlType={(t) => { setActiveHlType(t) }}
                onUpdatePreset={(p) => setPenPresets((prev) => ({ ...prev, [activePenType]: p }))}
                onClose={() => setShowDrawPanel(false)}
              />
            )}
          </div>

          {/* Highlighter — click once to activate, click again to open settings */}
          <div className="relative">
            <button title={tool === 'highlight' ? 'Highlighter settings' : 'Highlight'}
              onClick={() => {
                if (tool === 'highlight') { setShowHlPanel((v) => !v); setShowDrawPanel(false) }
                else { setTool('highlight'); setShowHlPanel(false); setShowDrawPanel(false) }
              }}
              className={cn(
                'p-2 rounded-lg transition-colors relative',
                tool === 'highlight' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}>
              <Highlighter size={16} />
              {tool === 'highlight' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                  style={{ background: hlPresets[activeHlType].color }} />
              )}
            </button>
            {showHlPanel && tool === 'highlight' && (
              <DrawPanel
                mode="highlight"
                activePenType={activePenType} activeHlType={activeHlType}
                penPresets={penPresets} hlPresets={hlPresets}
                onChangePenType={(t) => { setActivePenType(t) }}
                onChangeHlType={(t) => { setActiveHlType(t) }}
                onUpdatePreset={(p) => setHlPresets((prev) => ({ ...prev, [activeHlType]: p }))}
                onClose={() => setShowHlPanel(false)}
              />
            )}
          </div>

          <ToolBtn id="eraser"    icon={<Eraser size={16} />}        label="Eraser" />
          <ToolBtn id="lasso"     icon={<Spline size={16} />}        label="Lasso Select" />
          <ToolBtn id="signature" icon={<PenSquare size={16} />}     label="Signature"
            onClick={() => setShowSignatureModal(true)} />
          <ToolBtn id="image"     icon={<ImageIcon size={16} />}     label="Insert Image"
            onClick={() => imageInputRef.current?.click()} />
        </div>

        {/* Shapes */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <ToolBtn id="rect"    icon={<Square size={16} />}      label="Rectangle" />
          <ToolBtn id="ellipse" icon={<Circle size={16} />}      label="Ellipse" />
          <ToolBtn id="line"    icon={<Minus size={16} />}       label="Line" />
          <ToolBtn id="arrow"   icon={<ArrowRight size={16} />}  label="Arrow" />
        </div>

        {/* Annotations */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <ToolBtn id="sticky"  icon={<StickyNote size={16} />}     label="Sticky Note" />
          <ToolBtn id="comment" icon={<MessageCircle size={16} />}  label="Comment" />
        </div>

        {/* Forms */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <ToolBtn id="form-text"     icon={<Type size={15} />}        label="Text Field" />
          <ToolBtn id="form-check"    icon={<CheckSquare size={16} />} label="Checkbox" />
          <ToolBtn id="form-radio"    icon={<Circle size={14} />}      label="Radio Button" />
          <ToolBtn id="form-dropdown" icon={<List size={16} />}        label="Dropdown" />
        </div>

        {/* Tool-specific options */}
        {tool === 'text' && (
          <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-1">
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="Text color" />
            <select value={textSize} onChange={(e) => setTextSize(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 outline-none bg-white">
              {[8,10,12,14,16,18,20,24,28,32,36,48,64].map((s) => <option key={s} value={s}>{s}pt</option>)}
            </select>
          </div>
        )}

        {(tool === 'draw' || tool === 'highlight') && (
          <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-1">
            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="Brush color" />
            <input type="range" min={1} max={20} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16" title={`Size: ${brushSize}`} />
          </div>
        )}

        {isShapeTool && (
          <div className="flex items-center gap-2 border-r border-gray-100 pr-2 mr-1">
            <input type="color" value={shapeStroke} onChange={(e) => setShapeStroke(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="Stroke color" />
            <input type="color" value={shapeFill === 'transparent' ? '#ffffff' : shapeFill}
              onChange={(e) => setShapeFill(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="Fill color" />
            <button onClick={() => setShapeFill('transparent')}
              className={cn('text-xs px-1.5 py-0.5 rounded border transition-colors',
                shapeFill === 'transparent' ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-gray-200 text-gray-500')}
              title="No fill">∅</button>
            <select value={shapeStrokeWidth} onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white w-14">
              {[1,2,3,4,6,8].map((w) => <option key={w} value={w}>{w}px</option>)}
            </select>
          </div>
        )}

        <div className="flex-1" />

        {/* Undo / Redo */}
        <div className="flex items-center border-r border-gray-100 pr-2 mr-1">
          <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"><Undo2 size={16} /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"><Redo2 size={16} /></button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 border-r border-gray-100 pr-2 mr-1">
          <button onClick={() => setZoom((z) => parseFloat(Math.max(0.4, z - 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ZoomOut size={15} /></button>
          <span className="text-xs text-gray-500 w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => parseFloat(Math.min(3, z + 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ZoomIn size={15} /></button>
        </div>

        {/* Download */}
        <div className="relative">
          <div className="flex">
            <button onClick={handleDownload} disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isSaving ? 'Saving…' : 'Download'}
            </button>
            <button onClick={() => setShowDownloadMenu((v) => !v)}
              className="px-1.5 rounded-r-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors border-l border-violet-500">
              <ChevronDown size={13} />
            </button>
          </div>
          {showDownloadMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-40 space-y-2">
              <p className="text-xs font-semibold text-gray-700 mb-1">PDF Optimization</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={compressOnDownload}
                  onChange={(e) => setCompressOnDownload(e.target.checked)} className="rounded" />
                <span className="text-xs text-gray-700">Compress output</span>
              </label>
              {compressOnDownload && (
                <div className="pl-5">
                  <p className="text-xs text-gray-500 mb-1">Compression level</p>
                  {(['low','medium','high'] as CompressLevel[]).map((lv) => (
                    <label key={lv} className="flex items-center gap-1.5 cursor-pointer mb-0.5">
                      <input type="radio" name="compress-level" value={lv}
                        checked={compressionLevel === lv} onChange={() => setCompressionLevel(lv)} />
                      <span className="text-xs capitalize text-gray-600">{lv}</span>
                    </label>
                  ))}
                </div>
              )}
              <button onClick={handleDownload} disabled={isSaving}
                className="w-full mt-1 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">
                {isSaving ? 'Processing…' : 'Download PDF'}
              </button>
            </div>
          )}
        </div>

        {/* Open new file */}
        <button onClick={handleReset} title="Open different file"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={16} /></button>
      </div>

      {/* ══ Body ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Page Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-[120px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 shrink-0">
            {pageOrder.length} page{pageOrder.length !== 1 ? 's' : ''}
          </div>
          {pageOrder.map((pageNum, di) => (
            <div key={`${pageNum}-${di}`} onClick={() => goToPage(di)}
              className={cn(
                'group relative flex flex-col items-center pt-3 pb-2 px-2 cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50',
                currentPage === pageNum && 'bg-violet-50 border-l-2 border-l-violet-500',
              )}>
              <div className="w-[80px] h-[110px] rounded-md border border-gray-200 bg-white flex items-center justify-center shadow-sm mb-1 overflow-hidden">
                {thumbnails[pageNum] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnails[pageNum]} alt={`Page ${di + 1}`} className="w-full h-full object-contain" />
                ) : (
                  <FileText size={26} className="text-gray-200" />
                )}
              </div>
              <span className="text-[11px] text-gray-400">{di + 1}</span>
              {pageRotations[pageNum] ? <span className="text-[10px] text-violet-500">{pageRotations[pageNum]}°</span> : null}
              <div className="absolute top-2 right-1 hidden group-hover:flex flex-col gap-0.5 z-10">
                <button onClick={(e) => { e.stopPropagation(); rotatePage(di) }} title="Rotate 90°"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600"><RotateCw size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); deletePage(di) }} title="Delete page"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-red-600"><Trash2 size={10} /></button>
              </div>
              <div className="absolute bottom-6 right-1 hidden group-hover:flex flex-col gap-0.5 z-10">
                <button onClick={(e) => { e.stopPropagation(); movePage(di, di - 1) }} disabled={di === 0} title="Move up"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600 disabled:opacity-30"><ChevronUp size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); movePage(di, di + 1) }} disabled={di === pageOrder.length - 1} title="Move down"
                  className="p-0.5 rounded bg-white shadow-sm text-gray-500 hover:text-violet-600 disabled:opacity-30"><ChevronDown size={10} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Canvas area ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6"
          onScroll={() => fabricRef.current?.calcOffset?.()}
          onClick={() => showDownloadMenu && setShowDownloadMenu(false)}>
          <div className="relative shadow-xl" style={{ display: 'inline-block' }}>
            <canvas ref={pdfCanvasRef} className="block" style={{ display: 'block' }} />
            <canvas ref={fabricElRef} style={{ touchAction: 'none', position: 'absolute', top: 0, left: 0, pointerEvents: 'all' }} />
            {tool === 'editText' && pdfTextItems.length === 0 && fabricReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 border border-gray-200 rounded-xl px-5 py-4 shadow-sm max-w-xs text-center">
                  <AlertCircle size={20} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">This PDF contains no editable text.</p>
                  <p className="text-xs text-gray-400 mt-1">OCR is not supported in the PDF Edit tool.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Image Edit Panel ──────────────────────────────────────────────── */}
        {isImageSelected && (
          <div className="w-[200px] shrink-0 bg-white border-l border-gray-200 flex flex-col p-4 gap-3 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Sliders size={14} className="text-violet-500" />Image
            </p>

            <p className="text-xs text-gray-400 bg-violet-50 rounded-lg px-2 py-1.5">
              ✦ اسحب لتحريك · زوايا الدائرة للتحجيم
            </p>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">الحجم</p>
              <input type="range" min={0.05} max={3} step={0.05}
                value={sliderScale}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setSliderScale(v)
                  const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
                  if (!obj) return
                  obj.set({ scaleX: v, scaleY: v }); fc.renderAll()
                }}
                className="w-full accent-violet-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>صغير</span><span>كبير</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">تدوير</p>
              <div className="flex gap-1.5">
                <button onClick={() => applyImageRotate(-90)}
                  className="flex-1 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1 text-gray-700">
                  <RotateCcw size={13} />−90°
                </button>
                <button onClick={() => applyImageRotate(90)}
                  className="flex-1 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1 text-gray-700">
                  <RotateCw size={13} />+90°
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">الشفافية</p>
              <input type="range" min={0.1} max={1} step={0.05}
                value={sliderOpacity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setSliderOpacity(v)
                  applyImageOpacity(v)
                }}
                className="w-full accent-violet-600" />
            </div>

            <button onClick={deleteSelected}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors mt-1">
              <Trash2 size={13} />حذف
            </button>
          </div>
        )}

        {/* ── Text Formatting Panel ─────────────────────────────────────── */}
        {isTextSelected && !isImageSelected && !isSignatureSelected && (
          <div className="w-[220px] shrink-0 bg-white border-l border-gray-200 flex flex-col p-3 gap-3 overflow-y-auto text-xs">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Type size={14} className="text-violet-500" />Text
            </p>

            {/* Font family */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Font</p>
              <select value={fmtFontFamily}
                onChange={(e) => { setFmtFontFamily(e.target.value); applyTextFmt({ fontFamily: e.target.value }) }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white">
                {FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0]}</option>)}
              </select>
            </div>

            {/* Font size + color */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="font-medium text-gray-600 mb-1">Size</p>
                <input type="number" min={6} max={200} value={fmtFontSize}
                  onChange={(e) => { const v = Math.max(6, Number(e.target.value)); setFmtFontSize(v); applyTextFmt({ fontSize: v }) }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none" />
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-1">Color</p>
                <input type="color" value={fmtColor}
                  onChange={(e) => { setFmtColor(e.target.value); applyTextFmt({ fill: e.target.value }) }}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200" title="Text color" />
              </div>
            </div>

            {/* Bold / Italic / Underline */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Style</p>
              <div className="flex gap-1">
                <button title="Bold"
                  onClick={() => { const v = !fmtBold; setFmtBold(v); applyTextFmt({ fontWeight: v ? 'bold' : 'normal' }) }}
                  className={cn('flex-1 py-1.5 rounded-lg border font-bold text-sm transition-colors',
                    fmtBold ? 'bg-violet-100 border-violet-400 text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                  B
                </button>
                <button title="Italic"
                  onClick={() => { const v = !fmtItalic; setFmtItalic(v); applyTextFmt({ fontStyle: v ? 'italic' : 'normal' }) }}
                  className={cn('flex-1 py-1.5 rounded-lg border italic text-sm transition-colors',
                    fmtItalic ? 'bg-violet-100 border-violet-400 text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                  I
                </button>
                <button title="Underline"
                  onClick={() => { const v = !fmtUnderline; setFmtUnderline(v); applyTextFmt({ underline: v }) }}
                  className={cn('flex-1 py-1.5 rounded-lg border underline text-sm transition-colors',
                    fmtUnderline ? 'bg-violet-100 border-violet-400 text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                  U
                </button>
              </div>
            </div>

            {/* Alignment */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Align</p>
              <div className="flex gap-1">
                {(['left','center','right','justify'] as const).map((a) => (
                  <button key={a} title={a}
                    onClick={() => { setFmtAlign(a); applyTextFmt({ textAlign: a }) }}
                    className={cn('flex-1 py-1.5 rounded-lg border text-xs transition-colors flex items-center justify-center',
                      fmtAlign === a ? 'bg-violet-100 border-violet-400 text-violet-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                    {a === 'left' ? '⬛ L' : a === 'center' ? 'C' : a === 'right' ? 'R' : '≡'}
                  </button>
                ))}
              </div>
            </div>

            {/* Line height */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Line height — {fmtLineHeight.toFixed(2)}</p>
              <input type="range" min={0.8} max={3} step={0.05} value={fmtLineHeight}
                onChange={(e) => { const v = parseFloat(e.target.value); setFmtLineHeight(v); applyTextFmt({ lineHeight: v }) }}
                className="w-full accent-violet-600" />
            </div>

            {/* Letter spacing */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Letter spacing — {fmtLetterSpacing}</p>
              <input type="range" min={-200} max={800} step={10} value={fmtLetterSpacing}
                onChange={(e) => { const v = Number(e.target.value); setFmtLetterSpacing(v); applyTextFmt({ charSpacing: v }) }}
                className="w-full accent-violet-600" />
            </div>

            {/* Opacity */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Opacity — {Math.round(fmtTextOpacity * 100)}%</p>
              <input type="range" min={0.1} max={1} step={0.05} value={fmtTextOpacity}
                onChange={(e) => { const v = parseFloat(e.target.value); setFmtTextOpacity(v); applyTextFmt({ opacity: v }) }}
                className="w-full accent-violet-600" />
            </div>

            {/* Angle */}
            <div>
              <p className="font-medium text-gray-600 mb-1">Angle</p>
              <input type="number" min={-180} max={180} value={fmtAngle}
                onChange={(e) => { const v = Number(e.target.value); setFmtAngle(v); applyTextFmt({ angle: v }) }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none" />
            </div>

            {/* Background color */}
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-600">Background</p>
              <input type="color" value={fmtBgColor || '#ffffff'}
                onChange={(e) => { setFmtBgColor(e.target.value); applyTextFmt({ backgroundColor: e.target.value }) }}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200" title="Background color" />
              {fmtBgColor && (
                <button onClick={() => { setFmtBgColor(''); applyTextFmt({ backgroundColor: '' }) }}
                  className="text-gray-400 hover:text-gray-600 text-xs">✕ none</button>
              )}
            </div>

            <button onClick={deleteSelected}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors mt-1">
              <Trash2 size={13} />Delete
            </button>
          </div>
        )}

        {/* ── Signature Edit Panel ───────────────────────────────────────── */}
        {isSignatureSelected && (
          <div className="w-[200px] shrink-0 bg-white border-l border-gray-200 flex flex-col p-4 gap-3 overflow-y-auto">
            <link rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pinyon+Script&family=Satisfy&family=Great+Vibes&family=Sacramento&family=Parisienne&family=Alex+Brush&family=Kaushan+Script&family=Caveat:wght@600&display=swap"
            />
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <PenLine size={14} className="text-violet-500" />التوقيع
            </p>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">الحجم</p>
              <input type="range" min={0.05} max={3} step={0.05}
                value={sliderScale}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setSliderScale(v)
                  const fc = fabricRef.current; const obj = fc?.getActiveObject?.()
                  if (!obj) return
                  obj.set({ scaleX: v, scaleY: v }); fc.renderAll()
                }}
                className="w-full accent-violet-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>صغير</span><span>كبير</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">الشفافية</p>
              <input type="range" min={0.1} max={1} step={0.05}
                value={sliderOpacity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setSliderOpacity(v)
                  applyImageOpacity(v)
                }}
                className="w-full accent-violet-600" />
            </div>

            {selectedObject?.data?.tab === 'type' && selectedObject?.data?.text && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">نوع الخط</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Dancing Script','Great Vibes','Pinyon Script','Sacramento','Parisienne','Alex Brush','Satisfy','Kaushan Script','Caveat'].map((f) => (
                    <button key={f}
                      onClick={() => regenerateSig(selectedObject.data.text, f)}
                      className={cn(
                        'py-2 px-1 rounded-lg border text-sm transition-colors truncate',
                        selectedObject?.data?.font === f
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      )}
                      style={{ fontFamily: `"${f}", cursive`, fontSize: 16 }}
                      title={f}
                    >{selectedObject.data.text}</button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={deleteSelected}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors mt-1">
              <Trash2 size={13} />حذف
            </button>
          </div>
        )}
      </div>

      {/* Error toast */}
      {loadError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          <AlertCircle size={15} />{loadError}
          <button onClick={() => setLoadError(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />

      {showSignatureModal && <SignatureModal onUse={handleUseSignature} onClose={() => setShowSignatureModal(false)} />}
    </div>
  )
}
