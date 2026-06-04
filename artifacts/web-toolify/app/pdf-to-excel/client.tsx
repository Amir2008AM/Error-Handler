'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Download, Loader2, FileSpreadsheet, ScanSearch,
  FileText, CheckCircle2, Layers, AlignCenter, Globe, Shield,
} from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { useLoadingBar } from '@/components/global-loading-bar'
import { BackButton } from '@/components/back-button'

const tool = getToolBySlug('pdf-to-excel')!

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const PIPELINE_STEPS = [
  {
    icon: FileText,
    label: 'Document classification',
    desc: 'Detects text-based, scanned, or hybrid PDFs and Arabic / LTR direction',
  },
  {
    icon: AlignCenter,
    label: 'Global column stabilization',
    desc: 'Builds a single column schema from all pages — no shifting columns across pages',
  },
  {
    icon: Layers,
    label: 'Multi-page table reconstruction',
    desc: 'Merges fragmented tables across pages and removes repeated headers automatically',
  },
  {
    icon: ScanSearch,
    label: 'Smart engine routing',
    desc: 'Camelot → pdfplumber → spatial clustering → Tesseract OCR with automatic fallback',
  },
  {
    icon: Globe,
    label: 'Arabic & RTL support',
    desc: 'Full reshaping and bidi correction — Arabic tables appear right-to-left in Excel',
  },
  {
    icon: Shield,
    label: 'Validation & repair',
    desc: 'Drops ghost columns, repairs broken rows, validates structure before export',
  },
]


export function PdfToExcelClient() {
  const [file, setFile]           = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selected = files[0]
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setFile(selected)
    setError(null)
    setDone(false)
  }, [])

  const handleExtract = async () => {
    if (processing) return
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
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
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
          <UploadDropzone
            accept=".pdf,application/pdf"
            onFilesSelected={handleFilesSelected}
            label="Upload a PDF"
            sublabel="Drag & drop or click to browse — up to 50 MB"
          />
        ) : (
          <div className="space-y-4">
            {/* File card */}
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFile(null); setDone(false); setError(null) }}
                >
                  Change
                </Button>
              </div>
            </Card>

            {/* Pipeline overview */}
            <Card className="p-5 bg-muted/40">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                10-Phase Reconstruction Pipeline
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {PIPELINE_STEPS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                    </div>
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
              <>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Excel file downloaded successfully!
                </div>
                <TrustpilotReview />
              </>
            )}

            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={handleExtract}
                disabled={processing}
                className="min-w-[220px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reconstructing…
                  </>
                ) : done ? (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download again
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Convert to Excel
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Produces professionally structured Excel files — stable columns, merged multi-page tables, Arabic RTL support.
            </p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
