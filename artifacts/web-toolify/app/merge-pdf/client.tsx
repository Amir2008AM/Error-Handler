'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { formatBytes } from '@/lib/utils/format-bytes'

import { useState, useCallback, useRef } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw, X,
  FilePlus2, GripVertical, FileText, ArrowUp, ArrowDown,
  Lock, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PDFDocument } from 'pdf-lib'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'

interface PdfEntry {
  id: string
  file: File
  size: number
  encrypted: boolean
  checking: boolean
}

let idCounter = 0

async function checkEncryption(file: File): Promise<boolean> {
  try {
    const buf = await file.arrayBuffer()
    await PDFDocument.load(buf)
    return false
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('encrypt')) return true
    return false
  }
}

export function MergePdfClient() {
  const { t } = useI18n()
  const [pdfs, setPdfs] = useState<PdfEntry[]>([])
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const progress = useRealProgress()
  const downloadInProgress = useRef(false)

  const handleFilesSelected = useCallback((files: File[]) => {
    setMergedBlob(null)
    setError(null)
    progress.reset()
    const newEntries: PdfEntry[] = files.map((file) => ({
      id: `pdf-${++idCounter}`,
      file,
      size: file.size,
      encrypted: false,
      checking: true,
    }))
    setPdfs((prev) => [...prev, ...newEntries])

    for (const entry of newEntries) {
      checkEncryption(entry.file).then((encrypted) => {
        setPdfs((prev) =>
          prev.map((p) => p.id === entry.id ? { ...p, encrypted, checking: false } : p)
        )
      })
    }
  }, [progress])

  const remove = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id))
    setMergedBlob(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setPdfs((prev) => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
    setMergedBlob(null)
  }

  const moveDown = (idx: number) => {
    setPdfs((prev) => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
    setMergedBlob(null)
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOver(id)
  }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    setPdfs((prev) => {
      const arr = [...prev]
      const fromIdx = arr.findIndex((i) => i.id === draggedId)
      const toIdx = arr.findIndex((i) => i.id === targetId)
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
    setDraggedId(null)
    setDragOver(null)
    setMergedBlob(null)
  }

  const handleMerge = async () => {
    if (progress.status === 'processing') return
    if (pdfs.length < 2) {
      setError(t('merge.minFilesError'))
      return
    }

    setError(null)
    setMergedBlob(null)
    progress.startProcessing('Preparing files...')

    try {
      // ── Build FormData ────────────────────────────────────────────────────
      // We upload all files to the server so the merge + download happen as a
      // normal HTTP response — this avoids the "Network error" Chrome on Android
      // throws when downloading large blob:// URLs from device memory.
      const form = new FormData()
      const totalFiles = pdfs.length
      for (let i = 0; i < totalFiles; i++) {
        form.append(`pdf_${i}`, pdfs[i].file, pdfs[i].file.name)
      }

      // ── Upload & merge on server ──────────────────────────────────────────
      progress.stageUpload(0, `Uploading ${totalFiles} files…`)

      const xhr = new XMLHttpRequest()
      const blob: Blob = await new Promise((resolve, reject) => {
        xhr.open('POST', '/api/merge-pdf')
        xhr.responseType = 'blob'

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            progress.stageUpload(pct, `Uploading… ${pct}%`)
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            progress.stageProcessing(100, 'Finalizing…')
            resolve(xhr.response as Blob)
          } else {
            // Try to read JSON error body from blob
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const json = JSON.parse(reader.result as string)
                reject(new Error(json.error ?? `Server error ${xhr.status}`))
              } catch {
                reject(new Error(`Server error ${xhr.status}`))
              }
            }
            reader.readAsText(xhr.response)
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again'))
        xhr.ontimeout = () => reject(new Error('Request timed out — try with fewer files'))
        xhr.timeout = 300_000 // 5 min

        xhr.send(form)
      })

      // ── Store blob & mark done ────────────────────────────────────────────
      setMergedBlob(blob)
      progress.stageDone(t('merge.successTitle'))
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong during merge'
      setError(message)
      progress.fail(message)
    }
  }

  const handleDownload = () => {
    if (!mergedBlob || downloadInProgress.current) return
    downloadInProgress.current = true

    // Create a fresh object URL right at click time so it is always valid.
    const url = URL.createObjectURL(mergedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'toolify-merged.pdf'
    // Must be in the DOM for Firefox/mobile to honour the download attribute.
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Revoke after 60 s — long enough for any mobile browser to finish
    // reading the blob before we release the memory.
    setTimeout(() => {
      URL.revokeObjectURL(url)
      downloadInProgress.current = false
    }, 60_000)
  }

  const MAX_TOTAL_BYTES = 100 * 1024 * 1024
  const totalSize = pdfs.reduce((acc, p) => acc + p.size, 0)
  const isOverLimit = totalSize > MAX_TOTAL_BYTES
  const isProcessing = progress.status === 'processing'
  const encryptedCount = pdfs.filter((p) => p.encrypted).length
  const hasEncrypted = encryptedCount > 0
  const isChecking = pdfs.some((p) => p.checking)

  return (
    <div className="space-y-6">
      <BackButton />
      <UploadDropzone
        accept="application/pdf"
        multiple
        onFilesSelected={handleFilesSelected}
        label={t('merge.dropFiles')}
        sublabel={t('merge.subLabel')}
        maxSizeMB={50}
        maxTotalSizeMB={100}
        currentTotalSize={totalSize}
      />

      {pdfs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {pdfs.length} file{pdfs.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} {t('merge.total')}
            </p>
            <button
              onClick={() => { setPdfs([]); setMergedBlob(null); progress.reset() }}
              className="text-xs text-destructive font-medium hover:underline"
              disabled={isProcessing}
            >
              {t('merge.clearAll')}
            </button>
          </div>

          {isOverLimit && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold">الحجم الإجمالي تجاوز الحد المسموح (100 MB)</p>
                <p className="text-red-700 mt-0.5 text-xs">
                  يرجى حذف بعض الملفات حتى يصبح الحجم الإجمالي أقل من 100 MB، ثم حاول مجدداً.
                </p>
              </div>
            </div>
          )}

          {hasEncrypted && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold">
                  {encryptedCount} password-protected file{encryptedCount !== 1 ? 's' : ''} — cannot be merged
                </p>
                <p className="text-red-700 mt-0.5 text-xs">
                  Remove the protected files highlighted in red, then try again.
                </p>
              </div>
            </div>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary">
            {t('merge.reorderHint')}
          </div>

          <div className="space-y-2">
            {pdfs.map((pdf, idx) => (
              <div
                key={pdf.id}
                draggable={!isProcessing && !pdf.encrypted}
                onDragStart={() => handleDragStart(pdf.id)}
                onDragOver={(e) => handleDragOver(e, pdf.id)}
                onDrop={(e) => handleDrop(e, pdf.id)}
                onDragEnd={() => { setDraggedId(null); setDragOver(null) }}
                className={cn(
                  'flex items-center gap-3 border rounded-xl px-4 py-3 transition-all',
                  pdf.encrypted
                    ? 'bg-red-50 border-red-300'
                    : dragOver === pdf.id
                      ? 'bg-primary/5 border-primary'
                      : 'bg-white border-border',
                  draggedId === pdf.id && 'opacity-50',
                  isProcessing && 'opacity-60'
                )}
              >
                <GripVertical className={cn('w-4 h-4 shrink-0', pdf.encrypted ? 'text-red-300 cursor-not-allowed' : 'text-muted-foreground cursor-grab')} />
                <div className={cn(
                  'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0',
                  pdf.encrypted ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                )}>
                  {idx + 1}
                </div>

                {pdf.encrypted ? (
                  <Lock className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn('text-sm font-medium truncate', pdf.encrypted ? 'text-red-700' : 'text-foreground')}>
                      {pdf.file.name}
                    </p>
                    {pdf.checking && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking...
                      </span>
                    )}
                    {pdf.encrypted && !pdf.checking && (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200 shrink-0">
                        <Lock className="w-3 h-3" />
                        Protected — cannot merge
                      </span>
                    )}
                  </div>
                  <p className={cn('text-xs', pdf.encrypted ? 'text-red-500' : 'text-muted-foreground')}>
                    {formatBytes(pdf.size)}
                  </p>
                </div>

                {!pdf.encrypted && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0 || isProcessing}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === pdfs.length - 1 || isProcessing}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => remove(pdf.id)}
                  disabled={isProcessing}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-30',
                    pdf.encrypted
                      ? 'text-red-500 hover:bg-red-100 hover:text-red-700'
                      : 'hover:bg-destructive/10 hover:text-destructive'
                  )}
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {pdfs.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleMerge}
              disabled={isProcessing || pdfs.length < 2 || hasEncrypted || isChecking || isOverLimit}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('merge.processing')}</>
              ) : isChecking ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Checking files...</>
              ) : isOverLimit ? (
                <><AlertTriangle className="w-5 h-5" /> الحجم تجاوز 100 MB</>
              ) : hasEncrypted ? (
                <><Lock className="w-5 h-5" /> Remove protected files first</>
              ) : (
                <><FilePlus2 className="w-5 h-5" /> {t('merge.action')} ({pdfs.length})</>
              )}
            </button>
            <button
              onClick={() => { setPdfs([]); setMergedBlob(null); setError(null); progress.reset() }}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> {t('merge.reset')}
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

      {mergedBlob && progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">{t('merge.successTitle')}</p>
              <p className="text-sm text-green-700">{pdfs.length} files combined into one PDF</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            {t('merge.downloadPdf')}
          </button>
        </div>
      )}
      {mergedBlob && progress.status === 'completed' && <TrustpilotReview />}
    </div>
  )
}
