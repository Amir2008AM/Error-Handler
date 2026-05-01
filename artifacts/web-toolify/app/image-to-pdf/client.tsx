'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { X, Download, Loader2, GripVertical, CheckCircle2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'

interface ImageEntry {
  id: string
  file: File
  preview: string
  order: number | null
}

let idCounter = 0

// How often to poll the job status endpoint (ms)
const POLL_INTERVAL_MS = 600
// Maximum time to wait for the server to finish (ms)
const POLL_TIMEOUT_MS  = 5 * 60 * 1000
// Max dimension before resizing client-side (px) — keeps upload small
const CLIENT_MAX_PX = 1600
// Max total compressed upload size we allow (bytes)
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024 // 80 MB

/**
 * Compress an image file in the browser using the Canvas API.
 *
 * Why: Phone photos can be 4–10 MB each. 29 of them = 120–290 MB, which blows
 * through server body-size limits and causes "Failed to fetch". Canvas resize +
 * JPEG re-encode brings each image to ~300–800 KB so 29 images ≈ 10–20 MB total.
 *
 * The server-side Sharp pipeline still runs afterwards for EXIF correction,
 * final quality control, and metadata stripping.
 */
async function compressForUpload(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, CLIENT_MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.82,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) } // fallback: send original
    img.src = url
  })
}

/** Poll /api/jobs/{id} until status is completed or failed. */
async function pollJobUntilDone(
  jobId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  const pollUrl  = `/api/jobs/${jobId}`

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const res = await fetch(pollUrl)
    if (!res.ok) throw new Error(`Status check failed (${res.status})`)

    const data = await res.json() as {
      status:   string
      progress: number
      result?:  { downloadUrl: string }
      error?:   string
    }

    if (data.status === 'completed' && data.result?.downloadUrl) {
      onProgress(100)
      return data.result.downloadUrl
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'PDF generation failed on the server')
    }

    // Forward server-reported progress (10 → 90 range) to the progress bar
    if (typeof data.progress === 'number') {
      onProgress(Math.min(data.progress, 95))
    }
  }

  throw new Error('PDF generation timed out — please try with fewer images or try again.')
}

export function ImageToPdfClient() {
  const [images,      setImages]      = useState<ImageEntry[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState<string | null>(null)
  const [draggedId,   setDraggedId]   = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    setDownloadUrl(null)
    setError(null)
    progress.reset()
    const newEntries: ImageEntry[] = files.map((file) => ({
      id:      `img-${++idCounter}`,
      file,
      preview: URL.createObjectURL(file),
      order:   null,
    }))
    setImages((prev) => [...prev, ...newEntries])
  }, [progress])

  const removeImage = (id: string) => {
    setImages((prev) => reorderImages(prev.filter((img) => img.id !== id)))
    setDownloadUrl(null)
  }

  const reorderImages = (imgs: ImageEntry[]): ImageEntry[] => {
    let counter = 1
    return imgs.map((img) =>
      img.order !== null ? { ...img, order: counter++ } : img,
    )
  }

  const toggleOrder = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (!img) return prev
      if (img.order !== null) {
        return reorderImages(prev.map((i) => (i.id === id ? { ...i, order: null } : i)))
      }
      const maxOrder = Math.max(0, ...prev.filter((i) => i.order !== null).map((i) => i.order ?? 0))
      return prev.map((i) => (i.id === id ? { ...i, order: maxOrder + 1 } : i))
    })
    setDownloadUrl(null)
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver  = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOver(id) }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    setImages((prev) => {
      const arr     = [...prev]
      const fromIdx = arr.findIndex((i) => i.id === draggedId)
      const toIdx   = arr.findIndex((i) => i.id === targetId)
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
    setDraggedId(null)
    setDragOver(null)
  }

  const selectAll = () => setImages((prev) => prev.map((img, idx) => ({ ...img, order: idx + 1 })))

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([])
    setDownloadUrl(null)
    setError(null)
    progress.reset()
  }

  /**
   * Upload selected images to the server and let Sharp preprocess them
   * before embedding into a PDF.
   *
   * Why server-side instead of client-side pdf-lib?
   *   Browser pdf-lib embeds images raw — a 6 MB PNG stays 6 MB in the PDF.
   *   The server runs Sharp which:
   *     1. Resizes images to ≤ 1600 px (no reason to embed 4K pixels on A4)
   *     2. Re-encodes as JPEG at quality 78 (PNG → JPEG is often 20–50× smaller)
   *     3. Auto-corrects EXIF rotation (phone photos)
   *     4. Strips all metadata
   *   Result: 50 images that would produce a ~100 MB PDF now produce ~3 MB.
   */
  const handleConvert = async () => {
    const selectedImages = images
      .filter((i) => i.order !== null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    if (selectedImages.length === 0) {
      setError('Please click on images to select and order them before converting.')
      return
    }

    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Uploading images…')

    try {
      // ── Stage 1: upload ──────────────────────────────────────────────────
      progress.stageUpload(30, `Uploading ${selectedImages.length} image${selectedImages.length !== 1 ? 's' : ''}…`)

      const formData = new FormData()
      formData.append('type', 'image-to-pdf')
      formData.append('options', JSON.stringify({
        pageSize:     'a4',
        margin:       20,
        imageQuality: 78,   // JPEG quality 1-100 (separate from PDF quality 'low'|'medium'|'high')
        maxWidthPx:   1600, // max image dimension before resize
      }))

      // File order must match the user-assigned page order
      selectedImages.forEach((img, idx) => {
        formData.append(`file${idx}`, img.file, img.file.name)
      })

      progress.stageUpload(80, 'Sending to server…')

      const createResp = await fetch('/api/jobs/create', {
        method: 'POST',
        body:   formData,
      })

      if (!createResp.ok) {
        const errData = await createResp.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error || `Upload failed (${createResp.status})`)
      }

      const createData = await createResp.json() as {
        id:      string
        status:  string
        result?: { downloadUrl: string }
        error?:  string
      }

      // ── Stage 2: wait for processing ────────────────────────────────────
      progress.stageValidation('Optimizing images…')

      let downloadPath: string

      if (createData.status === 'completed' && createData.result?.downloadUrl) {
        // Processed synchronously (processNow=true path, if ever used)
        downloadPath = createData.result.downloadUrl
      } else if (createData.status === 'failed') {
        throw new Error(createData.error || 'PDF generation failed')
      } else {
        // Processing happens asynchronously — poll until done
        downloadPath = await pollJobUntilDone(createData.id, (pct) => {
          progress.stageProcessing(pct, `Generating PDF… ${pct < 90 ? `${pct}%` : 'finishing…'}`)
        })
      }

      // ── Stage 3: done ────────────────────────────────────────────────────
      setDownloadUrl(downloadPath)
      progress.stageDone('PDF generated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong during conversion'
      setError(message)
      progress.fail(message)
    }
  }

  const selectedCount = images.filter((i) => i.order !== null).length
  const isProcessing  = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      <UploadDropzone
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onFilesSelected={handleFilesSelected}
        label="Drop images here or click to browse"
        sublabel="Supports JPG, PNG, WebP — click images below to set page order"
        maxSizeMB={50}
        maxTotalSizeMB={100}
        currentTotalSize={images.reduce((acc, img) => acc + img.file.size, 0)}
      />

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {images.length} image{images.length !== 1 ? 's' : ''} added
              </p>
              <span className="text-xs text-muted-foreground">— click to assign page order</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                disabled={isProcessing}
                className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
              >
                Select All
              </button>
              <span className="text-muted-foreground text-xs">|</span>
              <button
                onClick={clearAll}
                disabled={isProcessing}
                className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary">
            <strong>How it works:</strong> Click any image to assign it a page number (1, 2, 3…).
            Click again to remove it from the selection. Drag to reorder. Only selected images
            will be included in the PDF.
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                draggable={!isProcessing}
                onDragStart={() => handleDragStart(img.id)}
                onDragOver={(e) => handleDragOver(e, img.id)}
                onDrop={(e) => handleDrop(e, img.id)}
                onDragEnd={() => { setDraggedId(null); setDragOver(null) }}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all select-none',
                  img.order !== null
                    ? 'border-primary shadow-md ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40',
                  dragOver  === img.id && 'border-primary scale-105',
                  draggedId === img.id && 'opacity-50',
                  isProcessing && 'pointer-events-none opacity-60',
                )}
                onClick={() => !isProcessing && toggleOrder(img.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="w-full aspect-square object-cover"
                  draggable={false}
                />

                {img.order !== null && (
                  <div className="absolute top-2 left-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
                    {img.order}
                  </div>
                )}

                <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                  disabled={isProcessing}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-30"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                  <p className="text-xs text-white truncate">{img.file.name}</p>
                </div>

                {img.order === null && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-lg">
                      Click to add
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedCount}</span> of {images.length} images selected
            </p>
            <p className="text-xs text-muted-foreground">
              PDF will have {selectedCount} page{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConvert}
              disabled={isProcessing || selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Convert to PDF ({selectedCount} {selectedCount === 1 ? 'image' : 'images'})
                </>
              )}
            </button>

            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
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
      )}

      {downloadUrl && progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">PDF generated successfully!</p>
              <p className="text-sm text-green-700">
                {selectedCount} page{selectedCount !== 1 ? 's' : ''} · images optimized with Sharp
              </p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download="toolify-images.pdf"
            className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      )}
    </div>
  )
}
