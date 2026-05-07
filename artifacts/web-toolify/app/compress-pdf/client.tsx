'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, FileText, TrendingDown, CheckCircle2 } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { ProcessedFileCard } from '@/components/processed-file-card'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

type CompressionLevel = 'low' | 'medium' | 'high'

const LEVEL_OPTIONS: Array<{
  value: CompressionLevel
  emoji: string
  label: string
  description: string
  detail: string
}> = [
  {
    value: 'low',
    emoji: '🟢',
    label: 'Light',
    description: 'Best quality, minimal reduction',
    detail: '150 DPI · /ebook preset',
  },
  {
    value: 'medium',
    emoji: '🟡',
    label: 'Medium',
    description: 'Good balance of quality and size',
    detail: '100 DPI · font subsetting',
  },
  {
    value: 'high',
    emoji: '🔴',
    label: 'Maximum',
    description: 'Smallest file, aggressive compression',
    detail: '72 DPI · all channels · metadata stripped',
  },
]

const LEVEL_LABEL: Record<CompressionLevel, string> = {
  low:    'Light',
  medium: 'Medium',
  high:   'Maximum',
}

// compressionStatus sent by the server
type CompressionStatus = 'compressed' | 'size_increased' | 'already_optimized'

interface CompressResult {
  fileId:            string
  filename:          string
  originalSize:      number
  compressedSize:    number
  compressionRatio:  number   // positive = smaller, negative = larger
  compressionStatus: CompressionStatus
  alreadyOptimized:  boolean
  level:             CompressionLevel
}

export function CompressPdfClient() {
  const [file, setFile]     = useState<File | null>(null)
  const [level, setLevel]   = useState<CompressionLevel>('medium')
  const [result, setResult] = useState<CompressResult | null>(null)
  const progress            = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      progress.reset()
    }
  }, [progress])

  const handleCompress = async () => {
    if (!file) return

    progress.startProcessing('Uploading file...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('level', level)

      const response = await xhrUpload({
        url: '/api/compress-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading file...')
        },
      })

      progress.stageValidation('Validating file...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Compression failed' }))
        throw new Error(errorData.error || 'Compression failed')
      }

      progress.stageProcessing(undefined, ['Analysing PDF...', 'Compressing images...', 'Optimising fonts...', 'Almost done...'])

      const data = await response.json() as CompressResult
      setResult(data)

      progress.stageDone('Compression complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compress PDF'
      progress.fail(message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce the file size of your PDF documents. Already-optimized PDFs are detected automatically."
    >
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload PDF</p>
                  <p className="text-sm text-muted-foreground">Click or drag and drop your PDF file here</p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            {/* File info */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Original size: {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                    progress.reset()
                  }}
                  disabled={isProcessing}
                >
                  Change
                </Button>
              </div>
            </Card>

            {/* Result card — shown once done */}
            {result && progress.status === 'completed' && (() => {
              const { alreadyOptimized, compressionStatus } = result
              const ratio    = result.compressionRatio
              const gained   = ratio > 0 && compressionStatus === 'compressed'
              const absPct   = Math.abs(Math.round(ratio))
              const savedBytes = result.originalSize - result.compressedSize
              const absDelta = Math.abs(savedBytes)

              // ── Already optimised — neutral informational state ───────────────
              if (alreadyOptimized || compressionStatus === 'already_optimized') {
                return (
                  <ProcessedFileCard fileId={result.fileId} filename={result.filename}>
                    <div className="flex items-start gap-3 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-sm space-y-0.5 text-blue-800">
                        <p className="font-medium">
                          This PDF is already highly optimized
                        </p>
                        <p className="text-blue-700">
                          No further compression is possible without degrading quality.
                          Your original file is available to download below.
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          Size: {formatSize(result.originalSize)} · Level tried: {LEVEL_LABEL[result.level]}
                        </p>
                      </div>
                    </div>
                  </ProcessedFileCard>
                )
              }

              // ── Successful compression ────────────────────────────────────────
              return (
                <ProcessedFileCard fileId={result.fileId} filename={result.filename}>
                  <div className="flex items-start gap-3 mt-2">
                    <TrendingDown className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-0.5 text-green-700">
                      <p className="font-medium">
                        Compressed — reduced by {absPct}% ({formatSize(absDelta)} saved)
                      </p>
                      <p>
                        {formatSize(result.originalSize)}
                        {' → '}
                        {formatSize(result.compressedSize)}
                      </p>
                      <p>Level: {LEVEL_LABEL[result.level]}</p>
                    </div>
                  </div>
                </ProcessedFileCard>
              )
            })()}

            {/* Level picker */}
            <div>
              <p className="text-sm font-medium mb-3">Compression level</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LEVEL_OPTIONS.map((opt) => {
                  const selected = level === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLevel(opt.value)}
                      disabled={isProcessing}
                      className={`text-left rounded-lg border-2 p-4 transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      } ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{opt.emoji}</span>
                        <span className="font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{opt.detail}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action */}
            <div className="flex flex-col items-center">
              <Button
                size="lg"
                onClick={handleCompress}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Compress PDF
                  </>
                )}
              </Button>

              <RealProgressBar
                status={progress.status}
                progress={progress.progress}
                message={progress.message}
                error={progress.error}
                className="w-[280px]"
                showPercentage={true}
                showMessage={true}
                autoHide={false}
              />
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
