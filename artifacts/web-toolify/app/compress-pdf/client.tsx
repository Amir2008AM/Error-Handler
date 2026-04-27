'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, FileText, TrendingDown } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'

type CompressionLevel = 'low' | 'medium' | 'high'

const LEVEL_OPTIONS: Array<{
  value: CompressionLevel
  emoji: string
  label: string
  description: string
}> = [
  { value: 'low', emoji: '🟢', label: 'Light', description: 'Best quality, smaller reduction' },
  { value: 'medium', emoji: '🟡', label: 'Medium', description: 'Good balance of quality and size' },
  { value: 'high', emoji: '🔴', label: 'Maximum', description: 'Smallest file, lower quality' },
]

const LEVEL_LABEL: Record<CompressionLevel, string> = {
  low: 'Light',
  medium: 'Medium',
  high: 'Maximum',
}

export function CompressPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressionLevel>('medium')
  const [result, setResult] = useState<{
    original: number
    compressed: number
    level: CompressionLevel
  } | null>(null)
  const progress = useRealProgress()

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

      // Stage 1: Uploading (0-30%) — driven by real upload bytes
      progress.updateProgress(0, 'Uploading file...')

      const response = await xhrUpload({
        url: '/api/compress-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.updateProgress(Math.round(pct * 0.3), 'Uploading file...')
        },
      })

      // Stage 2: Processing (30-80%)
      progress.updateProgress(50, 'Compressing PDF...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Compression failed' }))
        throw new Error(errorData.error || 'Compression failed')
      }

      // Stage 3: Finalizing (80-100%)
      progress.updateProgress(90, 'Preparing download...')

      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0')
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0')
      const usedLevel = (response.headers.get('X-Compression-Level') as CompressionLevel) || level

      setResult({ original: originalSize, compressed: compressedSize, level: usedLevel })

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed-${file.name}`
      a.click()
      URL.revokeObjectURL(url)

      progress.complete('Compression complete!')
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

  const getReduction = () => {
    if (!result) return 0
    return Math.round((1 - result.compressed / result.original) * 100)
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce the file size of your PDF documents while maintaining quality. Perfect for email attachments and web uploads."
    >
      <div className="max-w-2xl mx-auto">
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
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
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

            {result && progress.status === 'completed' && (
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-green-800">
                      Reduced by {getReduction()}%
                    </p>
                    <div className="text-sm text-green-700 space-y-0.5">
                      <p>Original size: {formatSize(result.original)}</p>
                      <p>New size: {formatSize(result.compressed)}</p>
                      <p>Compression level: {LEVEL_LABEL[result.level]}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

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
                      <p className="text-xs text-muted-foreground mt-1">
                        {opt.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

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

              {/* Real Progress Bar */}
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
