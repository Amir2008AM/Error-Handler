'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { ShareButtons } from '@/components/share-buttons'

import { useState, useCallback, useRef } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { ImageGallery, getIsSizeExceeded } from '@/components/image-gallery'
import type { ImageItem } from '@/components/image-gallery'
import { Download, Loader2, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react'

import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

let idCounter = 0

const POLL_INTERVAL_MS = 200
const POLL_TIMEOUT_MS  = 5 * 60 * 1000
const CLIENT_MAX_PX = 1600
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_TOTAL_SIZE_MB = 50
const THUMBNAIL_MAX_PX = 300

/**
 * Generate a small JPEG thumbnail for gallery display.
 * Keeps GPU memory usage low: a 300px thumbnail decoded bitmap is ~360 KB
 * vs ~46 MB for a full-resolution 4000×3000 photo.
 * Falls back to a temporary object URL (revoked after decode) on canvas failure.
 */
async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, THUMBNAIL_MAX_PX / Math.max(img.width, img.height, 1))
      const w = Math.max(1, Math.round(img.width  * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(URL.createObjectURL(file))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(URL.createObjectURL(file))
    }

    img.src = url
  })
}

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
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

async function pollJobUntilDone(
  jobId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  const pollUrl  = `/api/jobs/${jobId}`

  // First check is immediate (no initial wait) — fast jobs like single-image
  // conversion are often done within ms of the upload response returning.
  // Subsequent checks use a short interval so we catch completion quickly
  // without hammering the server.
  let firstPoll = true

  while (Date.now() < deadline) {
    if (firstPoll) {
      firstPoll = false
    } else {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }

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

    if (typeof data.progress === 'number') {
      onProgress(Math.min(data.progress, 95))
    }
  }

  throw new Error('PDF generation timed out — please try with fewer images or try again.')
}

/**
 * Renumber order badges without creating new object references for items
 * whose order value hasn't changed. This lets React.memo on ImageCard skip
 * re-renders for cards that weren't affected by a remove/toggle operation.
 */
function reorderImages(imgs: ImageItem[]): ImageItem[] {
  let counter = 1
  return imgs.map((img) => {
    if (img.order == null) return img
    const newOrder = counter++
    if (img.order === newOrder) return img
    return { ...img, order: newOrder }
  })
}

export function ImageToPdfClient() {
  const { lang } = useI18n()
  const [images,      setImages]      = useState<ImageItem[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const progress = useRealProgress()

  // Pre-compressed blobs keyed by image ID.
  // Compression starts immediately when images are added so it's ready
  // by the time the user clicks Convert.
  const precompressedRef = useRef<Map<string, Promise<Blob>>>(new Map())

  // Stable references from the progress hook so callbacks below don't
  // re-create every render (avoids UploadDropzone re-renders).
  const { reset: progressReset } = progress

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setDownloadUrl(null)
    setError(null)
    progressReset()

    // Step 1: add entries immediately with empty preview so the grid
    // appears at once — no waiting for any Canvas work.
    const newEntries: ImageItem[] = files.map((file) => ({
      id:      `img-${++idCounter}`,
      file,
      preview: '',   // skeleton shown while thumbnail generates
      order:   null,
    }))
    setImages((prev) => [...prev, ...newEntries])

    // Step 2: kick off background pre-compression for every new image
    // immediately — silently, without affecting the UI.  By the time the
    // user clicks Convert the blobs are already ready, so that step is
    // effectively instant.
    newEntries.forEach((entry) => {
      precompressedRef.current.set(entry.id, compressForUpload(entry.file))
    })

    // Step 3: generate each thumbnail independently in the background.
    // Each one updates only its own card as soon as it's ready, so
    // thumbnails pop in progressively instead of all-at-once after a delay.
    newEntries.forEach(async (entry) => {
      const thumbnail = await generateThumbnail(entry.file)
      setImages((prev) =>
        prev.map((img) => img.id === entry.id ? { ...img, preview: thumbnail } : img),
      )
    })
  }, [progressReset])

  const removeImage = useCallback((id: string) => {
    precompressedRef.current.delete(id)
    setImages((prev) => reorderImages(prev.filter((img) => img.id !== id)))
    setDownloadUrl(null)
  }, [])

  const toggleOrder = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (!img) return prev
      if (img.order != null) {
        return reorderImages(prev.map((i) => (i.id === id ? { ...i, order: null } : i)))
      }
      const maxOrder = Math.max(0, ...prev.filter((i) => i.order != null).map((i) => i.order ?? 0))
      return prev.map((i) => (i.id === id ? { ...i, order: maxOrder + 1 } : i))
    })
    setDownloadUrl(null)
  }, [])

  const selectAll = useCallback(() => {
    setImages((prev) => prev.map((img, idx) => ({ ...img, order: idx + 1 })))
  }, [])

  const deselectAll = useCallback(() => {
    setImages((prev) => prev.map((img) => ({ ...img, order: null })))
  }, [])

  const clearAll = useCallback(() => {
    precompressedRef.current.clear()
    setImages((prev) => {
      prev.forEach((img) => {
        // Only revoke if it's a blob/object URL, not a data URL
        if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview)
      })
      return []
    })
    setDownloadUrl(null)
    setError(null)
    progressReset()
  }, [progressReset])

  const isSizeExceeded = getIsSizeExceeded(images, MAX_TOTAL_SIZE_MB)
  const selectedImages = images
    .filter((i) => i.order != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const selectedCount  = selectedImages.length
  const isProcessing   = progress.status === 'processing'

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (selectedImages.length === 0) {
      setError(t(lang, 'imageToPdf.selectImages'))
      return
    }

    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Uploading images…')

    try {
      const total = selectedImages.length

      // ── Use pre-compressed blobs (already running since images were added) ──
      // Compression started in the background as soon as the user selected
      // images, so by now it's usually already done.  We just await the cached
      // promises — if they're resolved this is instant; if not, we wait for the
      // remaining work.  Falls back to fresh compression for any image whose
      // promise is missing (e.g. added via a code path that skipped pre-compress).
      progress.stageUpload(5, `Preparing ${total} image${total !== 1 ? 's' : ''}…`)
      const blobs: Blob[] = await Promise.all(
        selectedImages.map((img) =>
          precompressedRef.current.get(img.id) ?? compressForUpload(img.file),
        ),
      )

      const totalBytes = blobs.reduce((s, b) => s + b.size, 0)
      if (totalBytes > MAX_UPLOAD_BYTES) {
        throw new Error(
          `Compressed upload is ${Math.round(totalBytes / 1024 / 1024)} MB — ` +
          `please select fewer images or use smaller files.`,
        )
      }

      const formData = new FormData()
      formData.append('type', 'image-to-pdf')
      formData.append('options', JSON.stringify({
        pageSize:     'a4',
        margin:       20,
        imageQuality: 78,
        maxWidthPx:   1600,
      }))
      blobs.forEach((blob, idx) => {
        const name = selectedImages[idx].file.name.replace(/\.[^.]+$/, '.jpg')
        formData.append(`file${idx}`, blob, name)
      })

      // ── Real upload progress via XHR ───────────────────────────────────────
      // Plain fetch() gives no upload progress — bar would freeze until server
      // responds. xhrUpload() fires onUploadProgress as bytes are sent so the
      // bar moves smoothly from ~10 % to 50 % during the network transfer.
      const res = await xhrUpload({
        url:      '/api/jobs/create',
        formData,
        responseType: 'json',
        onUploadProgress: (pct) => {
          // Map XHR upload 0→100 % into the stageUpload 10→50 % band.
          const overall = 10 + Math.round((pct / 100) * 40)
          progress.stageUpload(overall, `Uploading images… ${pct}%`)
        },
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error || `Upload failed (${res.status})`)
      }

      const createData = await res.json() as {
        id:      string
        status:  string
        result?: { downloadUrl: string }
        error?:  string
      }

      progress.stageValidation('Optimizing images…')

      let downloadPath: string

      if (createData.status === 'completed' && createData.result?.downloadUrl) {
        downloadPath = createData.result.downloadUrl
      } else if (createData.status === 'failed') {
        throw new Error(createData.error || 'PDF generation failed')
      } else {
        downloadPath = await pollJobUntilDone(createData.id, (pct) => {
          progress.stageProcessing(pct, `Generating PDF… ${pct < 90 ? `${pct}%` : 'finishing…'}`)
        })
      }

      setDownloadUrl(downloadPath)
      progress.stageDone('PDF generated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong during conversion'
      setError(message)
      progress.fail(message)
    }
  }

  const canProcess = !isProcessing && !isSizeExceeded && selectedCount > 0

  return (
    <div className="space-y-6">
      <BackButton />
      <UploadDropzone
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onFilesSelected={handleFilesSelected}
        label={t(lang, 'imageToPdf.label')}
        sublabel={t(lang, 'imageToPdf.sublabel')}
        maxSizeMB={50}
        maxTotalSizeMB={MAX_TOTAL_SIZE_MB}
        currentTotalSize={images.reduce((acc, img) => acc + img.file.size, 0)}
      />

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {images.length} image{images.length !== 1 ? 's' : ''} added
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                disabled={isProcessing}
                className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
              >
                {t(lang, 'imageToPdf.selectAll')}
              </button>
              <span className="text-muted-foreground text-xs">|</span>
              <button
                onClick={deselectAll}
                disabled={isProcessing}
                className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
              >
                {t(lang, 'imageToPdf.clearAll')}
              </button>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary">
            {t(lang, 'imageToPdf.howItWorks')}
          </div>

          <ImageGallery
            images={images}
            onRemove={removeImage}
            onToggleOrder={toggleOrder}
            isProcessing={isProcessing}
            maxTotalSizeMB={MAX_TOTAL_SIZE_MB}
            showOrderBadges
            clickToToggleLabel={t(lang, 'imageToPdf.clickToAdd')}
          />

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
          {isSizeExceeded && !isProcessing && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Processing is unavailable because the selected files exceed the maximum allowed size. Remove some images to continue.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConvert}
              disabled={!canProcess}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t(lang, 'imageToPdf.generating')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {t(lang, 'imageToPdf.action')} ({selectedCount})
                </>
              )}
            </button>

            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              {t(lang, 'imageToPdf.reset')}
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
              <p className="font-semibold text-green-900">{t(lang, 'imageToPdf.successTitle')}</p>
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
            {t(lang, 'imageToPdf.downloadPdf')}
          </a>
        <ShareButtons downloadUrl={downloadUrl} filename={"toolify-images.pdf"} />
        </div>
      )}
      {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
    </div>
  )
}
