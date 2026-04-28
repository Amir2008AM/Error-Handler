'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw, X,
  FilePlus2, GripVertical, FileText, ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PDFDocument } from 'pdf-lib'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'

interface PdfEntry {
  id: string
  file: File
  size: number
}

let idCounter = 0

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function MergePdfClient() {
  const [pdfs, setPdfs] = useState<PdfEntry[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    setDownloadUrl(null)
    setError(null)
    progress.reset()
    const newEntries: PdfEntry[] = files.map((file) => ({
      id: `pdf-${++idCounter}`,
      file,
      size: file.size,
    }))
    setPdfs((prev) => [...prev, ...newEntries])
  }, [progress])

  const remove = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id))
    setDownloadUrl(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setPdfs((prev) => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
    setDownloadUrl(null)
  }

  const moveDown = (idx: number) => {
    setPdfs((prev) => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
    setDownloadUrl(null)
  }

  // Drag to reorder
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
    setDownloadUrl(null)
  }

  const handleMerge = async () => {
    if (pdfs.length < 2) {
      setError('Please add at least 2 PDF files to merge.')
      return
    }
    
    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Reading files...')

    try {
      // Stage: Upload (-> 10%) — local file read for client-side processing
      progress.stageUpload(100, 'Reading files...')

      // Stage: Validation (-> 20%)
      progress.stageValidation('Validating PDFs...')
      const mergedPdf = await PDFDocument.create()

      // Stage: Processing (-> 70%) — sub-progress driven by file index
      const totalFiles = pdfs.length
      for (let i = 0; i < totalFiles; i++) {
        const { file } = pdfs[i]
        const stagePct = (i / totalFiles) * 100
        progress.stageProcessing(stagePct, `Merging file ${i + 1} of ${totalFiles}...`)

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }
      progress.stageProcessing(100, 'Finalizing document...')
      const mergedPdfBytes = await mergedPdf.save()

      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })
      setDownloadUrl(URL.createObjectURL(blob))

      // Stage: Done (-> 100%)
      progress.stageDone('PDFs merged successfully!')
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong during merge'
      setError(message)
      progress.fail(message)
    }
  }

  const totalSize = pdfs.reduce((acc, p) => acc + p.size, 0)
  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      <UploadDropzone
        accept="application/pdf"
        multiple
        onFilesSelected={handleFilesSelected}
        label="Drop PDF files here or click to browse"
        sublabel="Add multiple PDFs — drag to reorder before merging"
        maxSizeMB={50}
        maxTotalSizeMB={100}
        currentTotalSize={totalSize}
      />

      {pdfs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {pdfs.length} file{pdfs.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} total
            </p>
            <button
              onClick={() => { setPdfs([]); setDownloadUrl(null); progress.reset() }}
              className="text-xs text-destructive font-medium hover:underline"
              disabled={isProcessing}
            >
              Clear all
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary">
            Drag rows or use the arrow buttons to reorder PDFs. The final merged document will follow this order.
          </div>

          <div className="space-y-2">
            {pdfs.map((pdf, idx) => (
              <div
                key={pdf.id}
                draggable={!isProcessing}
                onDragStart={() => handleDragStart(pdf.id)}
                onDragOver={(e) => handleDragOver(e, pdf.id)}
                onDrop={(e) => handleDrop(e, pdf.id)}
                onDragEnd={() => { setDraggedId(null); setDragOver(null) }}
                className={cn(
                  'flex items-center gap-3 bg-white border rounded-xl px-4 py-3 transition-all',
                  dragOver === pdf.id ? 'border-primary bg-primary/5' : 'border-border',
                  draggedId === pdf.id && 'opacity-50',
                  isProcessing && 'opacity-60'
                )}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />

                {/* Page number badge */}
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                <FileText className="w-5 h-5 text-red-500 shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pdf.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(pdf.size)}</p>
                </div>

                {/* Reorder arrows */}
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

                <button
                  onClick={() => remove(pdf.id)}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 disabled:opacity-30"
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
              disabled={isProcessing || pdfs.length < 2}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Merging PDFs...</>
              ) : (
                <><FilePlus2 className="w-5 h-5" /> Merge {pdfs.length} PDFs</>
              )}
            </button>
            <button
              onClick={() => { setPdfs([]); setDownloadUrl(null); setError(null); progress.reset() }}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Real Progress Bar */}
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
              <p className="font-semibold text-green-900">PDFs merged successfully!</p>
              <p className="text-sm text-green-700">{pdfs.length} files combined into one PDF</p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download="toolify-merged.pdf"
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
