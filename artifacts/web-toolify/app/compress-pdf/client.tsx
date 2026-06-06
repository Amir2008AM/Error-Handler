'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Loader2, FileText, TrendingDown, CheckCircle2 } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { ProcessedFileCard } from '@/components/processed-file-card'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'

type CompressionLevel = 'low' | 'medium' | 'high'

const LEVEL_EMOJI: Record<CompressionLevel, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
}
const LEVEL_DETAIL: Record<CompressionLevel, string> = {
  low: '150 DPI · /ebook preset',
  medium: '100 DPI · font subsetting',
  high: '72 DPI · all channels · metadata stripped',
}

type CompressionStatus = 'compressed' | 'size_increased' | 'already_optimized'

interface CompressResult {
  fileId:            string
  filename:          string
  originalSize:      number
  compressedSize:    number
  compressionRatio:  number
  compressionStatus: CompressionStatus
  alreadyOptimized:  boolean
  level:             CompressionLevel
}

export function CompressPdfClient() {
  const { t } = useI18n()
  const [file, setFile]     = useState<File | null>(null)
  const [level, setLevel]   = useState<CompressionLevel>('medium')
  const [result, setResult] = useState<CompressResult | null>(null)
  const progress            = useRealProgress()

  const levelLabel = (lv: CompressionLevel) => {
    if (lv === 'low') return t('compress.light')
    if (lv === 'medium') return t('compress.medium')
    return t('compress.maximum')
  }

  const levelDesc = (lv: CompressionLevel) => {
    if (lv === 'low') return t('compress.lightDesc')
    if (lv === 'medium') return t('compress.mediumDesc')
    return t('compress.maximumDesc')
  }

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      progress.reset()
    }
  }, [progress])

  const handleCompress = async () => {
    if (progress.status === 'processing') return
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

      progress.stageDone(t('compress.successPdf'))
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
    <>
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <UploadDropzone
            accept=".pdf,application/pdf"
            onFilesSelected={handleFilesSelected}
            label={t('common.uploadPdf')}
            sublabel={t('common.clickOrDragPdf')}
          />
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('common.originalSize')}: {formatSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFile(null); setResult(null); progress.reset() }}
                  disabled={isProcessing}
                >
                  {t('common.change')}
                </Button>
              </div>
            </Card>

            {result && progress.status === 'completed' && (() => {
              const { alreadyOptimized, compressionStatus } = result
              const absPct   = Math.abs(Math.round(result.compressionRatio))
              const savedBytes = result.originalSize - result.compressedSize
              const absDelta = Math.abs(savedBytes)

              if (alreadyOptimized || compressionStatus === 'already_optimized') {
                return (
                  <ProcessedFileCard fileId={result.fileId} filename={result.filename}>
                    <div className="flex items-start gap-3 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-sm space-y-0.5 text-blue-800">
                        <p className="font-medium">This PDF is already highly optimized</p>
                        <p className="text-blue-700">
                          No further compression is possible without degrading quality.
                          Your original file is available to download below.
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          Size: {formatSize(result.originalSize)} · {t('compress.levelLabel')} {levelLabel(result.level)}
                        </p>
                      </div>
                    </div>
                  </ProcessedFileCard>
                )
              }

              return (
                <ProcessedFileCard fileId={result.fileId} filename={result.filename}>
                  <div className="flex items-start gap-3 mt-2">
                    <TrendingDown className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-0.5 text-green-700">
                      <p className="font-medium">
                        {t('compress.reducedBy')} {absPct}% ({formatSize(absDelta)} {t('compress.saved')})
                      </p>
                      <p>{formatSize(result.originalSize)} → {formatSize(result.compressedSize)}</p>
                      <p>{t('compress.levelLabel')} {levelLabel(result.level)}</p>
                    </div>
                  </div>
                </ProcessedFileCard>
              )
            })()}

            <div>
              <p className="text-sm font-medium mb-3">{t('compress.level')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as CompressionLevel[]).map((lv) => {
                  const selected = level === lv
                  return (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevel(lv)}
                      disabled={isProcessing}
                      className={`text-left rounded-lg border-2 p-4 transition-colors ${
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      } ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      aria-pressed={selected}
                    >
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{LEVEL_EMOJI[lv]}</span>
                        <span className="font-semibold">{levelLabel(lv)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{levelDesc(lv)}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{LEVEL_DETAIL[lv]}</p>
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('compress.processing')}</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />{t('compress.actionPdf')}</>
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
    </>
  )
}
