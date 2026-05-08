'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, FileSpreadsheet, ScanSearch, FileText, CheckCircle2 } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { useLoadingBar } from '@/components/global-loading-bar'
import { BackButton } from '@/components/back-button'

const tool = getToolBySlug('pdf-to-excel')!

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function PdfToExcelClient() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setFile(selected)
    setError(null)
    setDone(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    if (!dropped.name.toLowerCase().endsWith('.pdf')) {
      setError('Please drop a PDF file.')
      return
    }
    setFile(dropped)
    setError(null)
    setDone(false)
  }, [])

  const handleExtract = async () => {
    if (!file) return
    setProcessing(true)
    setError(null)
    setDone(false)
    startLoading()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/pdf-to-excel', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || 'Extraction failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.pdf$/i, '.xlsx')
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract tables')
    } finally {
      setProcessing(false)
      stopLoading()
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />

        {!file ? (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="block cursor-pointer"
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload a PDF</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag &amp; drop or click to browse — up to 100 MB
                  </p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setDone(false); setError(null) }}>
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-5 bg-muted/40">
              <p className="text-sm font-medium text-foreground mb-3">How it works</p>
              <div className="space-y-2">
                {[
                  { icon: FileText, label: 'Checks for embedded text (text-based PDF)' },
                  { icon: ScanSearch, label: 'Falls back to Tesseract OCR for scanned pages' },
                  { icon: FileSpreadsheet, label: 'Each table becomes a separate Excel sheet' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {done && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Excel file downloaded successfully!
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={handleExtract}
                disabled={processing}
                className="min-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting tables…
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download again
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Extract to Excel
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Scanned PDFs are processed with OCR — results may vary based on scan quality.
            </p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
