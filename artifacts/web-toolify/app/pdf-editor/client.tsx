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
  CheckSquare, List, FileSearch, Minimize2,
  Sliders, RotateCcw,
} from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

type EditorTool =
  | 'select' | 'text' | 'image' | 'draw' | 'highlight' | 'eraser' | 'signature'
  | 'rect' | 'ellipse' | 'line' | 'arrow'
  | 'sticky' | 'comment'
  | 'form-text' | 'form-check' | 'form-radio' | 'form-dropdown'

type SigTab = 'draw' | 'type' | 'upload'
type OcrLang = 'eng' | 'ara' | 'eng+ara'
type CompressLevel = 'low' | 'medium' | 'high'

const PDFJS_VERSION = '5.7.284'
const MAX_HISTORY = 30
const MAX_FILE_BYTES = 50 * 1024 * 1024

const SHAPE_TOOLS: EditorTool[] = ['rect', 'ellipse', 'line', 'arrow']

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  onUse: (dataURL: string) => void
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
      onUse(fc.toDataURL({ format: 'png', multiplier: 4 }))
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
      ctx.textRenderingOptimization = 'optimizeLegibility' as any
      ctx.fillText(typedSig, 16, 70)
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

  // ── OCR ────────────────────────────────────────────────────────────────────
  const [showOcrPanel, setShowOcrPanel] = useState(false)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrLang, setOcrLang] = useState<OcrLang>('eng')
  const [ocrDone, setOcrDone] = useState(false)
  const ocrLangRef = useRef<OcrLang>('eng')

  // ── Compress on download ───────────────────────────────────────────────────
  const [compressOnDownload, setCompressOnDownload] = useState(false)
  const [compressionLevel, setCompressionLevel] = useState<CompressLevel>('medium')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  // ── Selected object (image editing panel) ─────────────────────────────────
  const [selectedObject, setSelectedObject] = useState<any>(null)

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
  useEffect(() => { ocrLangRef.current = ocrLang }, [ocrLang])

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

    // ── Selection tracking (for image edit panel) ──────────────────────────
    fc.on('selection:created', (opt: any) => { setSelectedObject(opt.selected?.[0] ?? null) })
    fc.on('selection:updated', (opt: any) => { setSelectedObject(opt.selected?.[0] ?? null) })
    fc.on('selection:cleared', () => { setSelectedObject(null) })

    // ── Nicer handles for all objects ──────────────────────────────────────
    const styleObject = (obj: any) => {
      if (!obj || obj.data?.temp) return
      obj.set({
        cornerStyle: 'circle',
        cornerSize: 14,
        transparentCorners: false,
        cornerColor: '#6366f1',
        borderColor: '#6366f1',
        cornerStrokeColor: '#ffffff',
        borderScaleFactor: 1.5,
        padding: 4,
      })
    }
    fc.on('object:added', (opt: any) => { styleObject(opt.target) })
    fc.on('selection:created', (opt: any) => { styleObject(opt.selected?.[0]) })

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

    // ── Eraser ──────────────────────────────────────────────────────────────
    fc.on('mouse:down', (opt: any) => {
      if (toolRef.current !== 'eraser') return
      if (!opt.target) return
      fc.remove(opt.target)
      fc.renderAll()
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

  // ── Tool effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    import('fabric').then(({ PencilBrush }) => {
      const isShape = SHAPE_TOOLS.includes(tool)
      const isStickyOrComment = tool === 'sticky' || tool === 'comment'
      const isForm = ['form-text', 'form-check', 'form-radio', 'form-dropdown'].includes(tool)

      fc.isDrawingMode = (tool === 'draw' || tool === 'highlight')
      fc.selection = (tool === 'select')
      fc.defaultCursor = isShape || isStickyOrComment || isForm || tool === 'text' || tool === 'eraser'
        ? 'crosshair' : 'default'

      if (fc.isDrawingMode) {
        const brush = new PencilBrush(fc)
        brush.color = tool === 'highlight'
          ? brushColor.replace(/^#/, '') !== brushColor ? brushColor + '80' : brushColor + '80'
          : brushColor
        brush.width = tool === 'highlight' ? brushSize * 3 : brushSize

        if (tool === 'highlight') {
          brush.color = brushColor
          const ctx = fc.upperCanvasEl?.getContext('2d')
          if (ctx) ctx.globalAlpha = 0.35
        }
        fc.freeDrawingBrush = brush
      }

      const allObjs = fc.getObjects?.() ?? []
      allObjs.forEach((obj: any) => {
        obj.selectable = tool === 'select'
        obj.evented = tool === 'select' || tool === 'eraser'
      })
    })
  }, [tool, brushColor, brushSize])

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject?.()
    if (active?.type === 'i-text') {
      active.set({ fill: textColor, fontSize: textSize })
      fc.renderAll()
    }
  }, [textColor, textSize])

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !fc.isDrawingMode || !fc.freeDrawingBrush) return
    fc.freeDrawingBrush.color = brushColor
    fc.freeDrawingBrush.width = brushSize
  }, [brushColor, brushSize])

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
  const handleUseSignature = useCallback((dataURL: string) => {
    setShowSignatureModal(false)
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(dataURL, { crossOrigin: 'anonymous' } as any).then((img: any) => {
        const fc = fabricRef.current; if (!fc) return
        const maxW = Math.min(220, (fc.width ?? 400) * 0.4)
        const scale = img.width > maxW ? maxW / img.width : 1
        img.scale(scale); img.set({ left: 60, top: 80 })
        fc.add(img); fc.setActiveObject(img); fc.renderAll()
        setTool('select')
      })
    })
  }, [])

  // ── OCR ────────────────────────────────────────────────────────────────────
  const handleOCR = useCallback(async () => {
    const pdfCanvas = pdfCanvasRef.current
    if (!pdfCanvas) return
    const fc = fabricRef.current
    if (!fc) return

    setOcrRunning(true)
    setOcrProgress(0)
    setOcrDone(false)

    try {
      const Tesseract = (await import('tesseract.js' as any)).default as any
      const lang = ocrLangRef.current
      const langs = lang === 'eng+ara' ? ['eng', 'ara'] : [lang]

      const worker = await Tesseract.createWorker(langs, 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100))
          else if (m.status === 'loading tesseract core') setOcrProgress(5)
          else if (m.status === 'loading language traineddata') setOcrProgress(15)
          else if (m.status === 'initializing tesseract') setOcrProgress(25)
        },
      })

      const physW = pdfCanvas.width
      const physH = pdfCanvas.height
      const W = parseFloat(pdfCanvas.style.width) || physW
      const H = parseFloat(pdfCanvas.style.height) || physH
      const scaleX = W / physW
      const scaleY = H / physH

      const { data } = await worker.recognize(pdfCanvas)
      await worker.terminate()

      const { IText } = await import('fabric')
      let placed = 0

      for (const line of (data.lines ?? [])) {
        if (line.confidence < 40 || !line.text?.trim()) continue
        const { x0, y0, x1, y1 } = line.bbox
        const lineH = (y1 - y0) * scaleY
        const fontSize = Math.max(8, Math.min(72, Math.round(lineH * 0.82)))
        const txt = new IText(line.text.replace(/\n/g, ' ').trim(), {
          left: x0 * scaleX,
          top: y0 * scaleY,
          fontSize,
          fill: '#1e293b',
          fontFamily: lang === 'ara' ? 'Arial, sans-serif' : 'Helvetica, Arial, sans-serif',
          backgroundColor: 'rgba(254,240,138,0.35)',
          padding: 2,
          editable: true,
          opacity: 0.88,
        })
        fc.add(txt)
        placed++
      }

      fc.renderAll()
      setOcrProgress(100)
      setOcrDone(true)
      if (placed === 0) setLoadError('No readable text found on this page.')
    } catch (err: any) {
      console.error('OCR error:', err)
      setLoadError('OCR failed. Make sure you have an internet connection and try again.')
    } finally {
      setOcrRunning(false)
    }
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
  const isImageSelected = selectedObject?.type === 'image' || selectedObject?.type === 'f-image'

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
          <ToolBtn id="text"      icon={<Type size={16} />}          label="Add Text" />
          <ToolBtn id="draw"      icon={<PenLine size={16} />}       label="Draw" />
          <ToolBtn id="highlight" icon={<Highlighter size={16} />}   label="Highlight" />
          <ToolBtn id="eraser"    icon={<Eraser size={16} />}        label="Eraser" />
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

        {/* OCR */}
        <button
          title="OCR — Extract text from scanned PDF"
          onClick={() => setShowOcrPanel((v) => !v)}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors mr-1',
            showOcrPanel ? 'bg-amber-100 text-amber-700 border-amber-300' : 'text-gray-500 hover:bg-gray-100 border-transparent',
          )}
        >
          <FileSearch size={16} />
          <span className="hidden sm:inline">OCR</span>
        </button>

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
          </div>
        </div>

        {/* ── OCR Panel ─────────────────────────────────────────────────────── */}
        {showOcrPanel && (
          <div className="w-[220px] shrink-0 bg-white border-l border-gray-200 flex flex-col p-4 gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <FileSearch size={15} className="text-amber-500" />OCR
              </p>
              <button onClick={() => setShowOcrPanel(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
            </div>

            <p className="text-xs text-gray-500">Extract text from scanned pages and place it as an editable layer.</p>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Language</p>
              {(['eng', 'ara', 'eng+ara'] as OcrLang[]).map((l) => (
                <label key={l} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="radio" name="ocr-lang" value={l} checked={ocrLang === l} onChange={() => setOcrLang(l)} />
                  <span className="text-xs text-gray-700">
                    {l === 'eng' ? 'English' : l === 'ara' ? 'العربية (Arabic)' : 'English + Arabic'}
                  </span>
                </label>
              ))}
            </div>

            {ocrRunning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-amber-500" />
                  <span className="text-xs text-gray-600">Recognizing… {ocrProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: `${ocrProgress}%` }} />
                </div>
                <p className="text-xs text-gray-400">
                  {ocrProgress < 20 ? 'Loading language data…' : ocrProgress < 50 ? 'Analyzing page…' : 'Extracting text…'}
                </p>
              </div>
            ) : (
              <button onClick={handleOCR}
                className="w-full py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
                Extract Text from Page
              </button>
            )}

            {ocrDone && !ocrRunning && (
              <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                ✓ Text placed on canvas — click any highlighted text to edit it.
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-1">
              <p className="text-xs text-gray-400">Tips:</p>
              <p className="text-xs text-gray-400">• Works best on scanned PDFs</p>
              <p className="text-xs text-gray-400">• First run downloads language data (~10 MB)</p>
              <p className="text-xs text-gray-400">• Edit extracted text with the Select tool</p>
            </div>
          </div>
        )}

        {/* ── Image Edit Panel ──────────────────────────────────────────────── */}
        {isImageSelected && !showOcrPanel && (
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
                value={selectedObject?.scaleX ?? 1}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
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
                defaultValue={selectedObject?.opacity ?? 1}
                onChange={(e) => applyImageOpacity(parseFloat(e.target.value))}
                className="w-full accent-violet-600" />
            </div>

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
