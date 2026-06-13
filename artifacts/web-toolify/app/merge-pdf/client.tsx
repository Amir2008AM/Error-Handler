'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { formatBytes } from '@/lib/utils/format-bytes'

import { useState, useCallback, useRef } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Loader2, CheckCircle2, RotateCcw, X,
  FilePlus2, GripVertical, FileText, ArrowUp, ArrowDown,
  Lock, AlertTriangle, Download, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PDFDocument } from 'pdf-lib'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { useI18n } from '@/lib/i18n/context'
import { PdfPreviewModal } from '@/components/pdf-preview-modal'

interface PdfEntry {
  id: string
  file: File
  size: number
  encrypted: boolean
  checking: boolean
}

interface MergeResult {
  fileId: string
  filename: string
  pageCount: number
  fileCount: number
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

const MAX_TOTAL_BYTES = 50 * 1024 * 1024

export function MergePdfClient() {
  const { t } = useI18n()
  const [pdfs, setPdfs] = useState<PdfEntry[]>([])
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const progress = useRealProgress()
  const uploadRef = useRef<{ cancel: () => void } | null>(null)
  const [previewEntry, setPreviewEntry] = useState<PdfEntry | null>(null)

  const handleFilesSelected = useCallback((files: File[]) => {
    setResult(null)
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
    setResult(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setPdfs((prev) => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
    setResult(null)
  }

  const moveDown = (idx: number) => {
    setPdfs((prev) => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
    setResult(null)
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
    setResult(null)
  }

  const handleMerge = async () => {
    if (progress.status === 'processing') return
    if (pdfs.length < 2) {
      setError(t('merge.minFilesError'))
      return
    }

    setError(null)
    setResult(null)
    progress.startProcessing(`Uploading ${pdfs.length} files…`)

    try {
      const formData = new FormData()
      pdfs.forEach((p, i) => formData.append(`pdf_${i}`, p.file))

      // Build cumulative sizes to estimate file number from bytes uploaded
      const cumulative = pdfs.map(((acc => p => (acc += p.size))(0)))

      const upload = xhrUpload({
        url: '/api/merge-pdf',
        formData,
        responseType: 'blob',
        timeoutMs: 600_000, // 10 minutes — allows slow connections with large files
        onUploadProgress: (pct) => {
          const bytesUploaded = (pct / 100) * totalSize
          const fileNum = Math.min(
            pdfs.length,
            (cumulative.findIndex(c => c >= bytesUploaded) + 1) || pdfs.length
          )
          progress.stageUpload(pct, `Uploading… ${fileNum} / ${pdfs.length} files`)
        },
      })

      uploadRef.current = { cancel: upload.cancel }
      const response = await upload

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Merge failed' }))
        throw new Error(data.error || 'Merge failed')
      }

      progress.stageProcessing(undefined, 'Merging PDFs…')
      const data = await response.json() as MergeResult
      setResult(data)
      progress.stageDone(t('merge.successTitle'))
    } catch (err: any) {
      if (err?.message === 'Upload aborted') return
      const message = err?.message ?? 'Something went wrong'
      setError(message)
      progress.fail(message)
    } finally {
      uploadRef.current = null
    }
  }

  const reset = () => {
    uploadRef.current?.cancel()
    setPdfs([])
    setResult(null)
    setError(null)
    progress.reset()
  }

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
        maxTotalSizeMB={50}
        currentTotalSize={totalSize}
      />

      {pdfs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {pdfs.length} file{pdfs.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} {t('merge.total')}
            </p>
            <button
              onClick={() => { setPdfs([]); setResult(null); progress.reset() }}
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
                <p className="font-semibold">Total size exceeds the 50 MB limit</p>
                <p className="text-red-700 mt-0.5 text-xs">
                  Please remove some files until the total size is under 50 MB, then try again.
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
                    <button
                      onClick={() => setPreviewEntry(pdf)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label="Preview PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
        <div className="bg-red-50 border-2 border-red-400 text-red-900 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-base">
              {error.includes('timed out') ? 'Request timed out — upload took too long' : 'Something went wrong'}
            </p>
            <p className="text-sm text-red-700 mt-1">
              {error.includes('timed out')
                ? 'Your connection may be slow or the files are too large. Try merging fewer files at a time, or use a faster connection.'
                : error}
            </p>
          </div>
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
                <><AlertTriangle className="w-5 h-5" /> Total exceeds 50 MB</>                
              ) : hasEncrypted ? (
                <><Lock className="w-5 h-5" /> Remove protected files first</>
              ) : (
                <><FilePlus2 className="w-5 h-5" /> {t('merge.action')} ({pdfs.length})</>
              )}
            </button>
            <button
              onClick={reset}
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

      {result && progress.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">{t('merge.successTitle')}</p>
              <p className="text-sm text-green-700">{result.fileCount} files combined into one PDF</p>
            </div>
          </div>
          <a
            href={`/api/files/${result.fileId}`}
            download={result.filename}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            {t('merge.downloadPdf')}
          </a>
        </div>
      )}
      {result && progress.status === 'completed' && <TrustpilotReview />}

      {previewEntry && (
        <PdfPreviewModal
          file={previewEntry.file}
          filename={previewEntry.file.name}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  )
}
