'use client'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import {
  Download, Loader2, CheckCircle2, RotateCcw,
  Trash2, Copy, GripVertical, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PDFDocument } from 'pdf-lib'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { BackButton } from '@/components/back-button'

interface PageItem {
  /** position in the reordered list (0-based) */
  listIndex: number
  /** which page from the original PDF (0-based) */
  originalIndex: number
}

let idCounter = 0

export function OrganizePdfClient() {
  const [file,        setFile]        = useState<File | null>(null)
  const [pages,       setPages]       = useState<PageItem[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState<number | null>(null)
  const [draggedIdx,  setDraggedIdx]  = useState<number | null>(null)
  const progress = useRealProgress()

  /** Load a PDF with pdf-lib to read its page count, then populate the grid. */
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const selected = files[0]
    if (!selected) return

    setDownloadUrl(null)
    setError(null)
    progress.reset()
    setFile(selected)

    try {
      const buf  = await selected.arrayBuffer()
      const doc  = await PDFDocument.load(buf, { ignoreEncryption: true })
      const count = doc.getPageCount()
      setPages(
        Array.from({ length: count }, (_, i) => ({
          listIndex:     i,
          originalIndex: i,
        })),
      )
    } catch {
      setError('Could not read this PDF — it may be password-protected or corrupted.')
      setFile(null)
      setPages([])
    }
  }, [progress])

  // ── Page operations ──────────────────────────────────────────────────────

  const deletePage = (listIdx: number) => {
    if (pages.length <= 1) return
    setPages((prev) => prev.filter((_, i) => i !== listIdx).map((p, i) => ({ ...p, listIndex: i })))
    setDownloadUrl(null)
  }

  const duplicatePage = (listIdx: number) => {
    setPages((prev) => {
      const next = [...prev]
      next.splice(listIdx + 1, 0, { ...prev[listIdx], listIndex: 0 })
      return next.map((p, i) => ({ ...p, listIndex: i }))
    })
    setDownloadUrl(null)
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => setDraggedIdx(idx)
  const handleDragOver  = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOver(idx)
  }
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === targetIdx) return
    setPages((prev) => {
      const arr = [...prev]
      const [moved] = arr.splice(draggedIdx, 1)
      arr.splice(targetIdx, 0, moved)
      return arr.map((p, i) => ({ ...p, listIndex: i }))
    })
    setDraggedIdx(null)
    setDragOver(null)
    setDownloadUrl(null)
  }

  // ── Generate PDF ─────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!file || pages.length === 0) return

    setError(null)
    setDownloadUrl(null)
    progress.startProcessing('Reading PDF…')

    try {
      progress.stageUpload(100, 'Reading PDF…')
      const buf     = await file.arrayBuffer()
      const srcDoc  = await PDFDocument.load(buf)
      const outDoc  = await PDFDocument.create()

      progress.stageProcessing(20, 'Reordering pages…')

      // Copy pages in the user-defined order (supports duplicates & deletions)
      const indices  = pages.map((p) => p.originalIndex)
      const copied   = await outDoc.copyPages(srcDoc, indices)
      copied.forEach((page) => outDoc.addPage(page))

      progress.stageProcessing(80, 'Saving document…')
      const bytes = await outDoc.save()
      const blob  = new Blob([bytes], { type: 'application/pdf' })

      setDownloadUrl(URL.createObjectURL(blob))
      progress.stageDone(`Done — ${pages.length} page${pages.length !== 1 ? 's' : ''} in new order`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to organize PDF'
      setError(msg)
      progress.fail(msg)
    }
  }

  const reset = () => {
    setFile(null)
    setPages([])
    setDownloadUrl(null)
    setError(null)
    progress.reset()
  }

  const isProcessing  = progress.status === 'processing'
  const originalCount = file ? Math.max(...pages.map((p) => p.originalIndex), 0) + 1 : 0

  return (
    <div className="space-y-6">
      <BackButton />

      <UploadDropzone
        accept="application/pdf"
        multiple={false}
        onFilesSelected={handleFilesSelected}
        label="Drop a PDF here or click to browse"
        sublabel="Drag pages in the grid below to reorder · click to duplicate or delete"
        maxSizeMB={50}
        maxTotalSizeMB={50}
        currentTotalSize={file?.size ?? 0}
      />

      {file && pages.length > 0 && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate max-w-xs">{file.name}</span>
              <span className="text-muted-foreground shrink-0">
                — {originalCount} original page{originalCount !== 1 ? 's' : ''},&nbsp;
                {pages.length} in output
              </span>
            </div>
            <button
              onClick={reset}
              disabled={isProcessing}
              className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary">
            <strong>Drag</strong> cards to reorder.&nbsp;
            <strong>Blue</strong> = duplicate page.&nbsp;
            <strong>Red</strong> = delete page.
            Only pages shown here will appear in the downloaded PDF.
          </div>

          {/* Page grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {pages.map((page, idx) => (
              <div
                key={`${page.originalIndex}-${++idCounter}`}
                draggable={!isProcessing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => { setDraggedIdx(null); setDragOver(null) }}
                className={cn(
                  'relative group bg-white border-2 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all select-none',
                  dragOver   === idx ? 'border-primary scale-105 shadow-md' : 'border-border',
                  draggedIdx === idx ? 'opacity-50' : '',
                  isProcessing && 'pointer-events-none opacity-60',
                )}
              >
                {/* Page thumbnail placeholder */}
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {page.originalIndex + 1}
                  </span>
                </div>

                {/* Position badge */}
                <div className="flex items-center justify-between">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">→ page {idx + 1}</span>
                </div>

                {/* Action buttons (visible on hover) */}
                {!isProcessing && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => duplicatePage(idx)}
                      className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow"
                      title="Duplicate page"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deletePage(idx)}
                      disabled={pages.length <= 1}
                      className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow disabled:opacity-40"
                      title="Delete page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
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
    </div>
  )
}
