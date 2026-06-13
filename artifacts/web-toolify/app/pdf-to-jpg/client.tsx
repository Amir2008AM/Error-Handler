'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Download, Loader2, FileText, Image, Info, CheckCircle2, RotateCcw } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const tool = getToolBySlug('pdf-to-jpg')!


export function PdfToJpgClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg')
  const [quality, setQuality] = useState(90)
  const [dpi, setDpi] = useState(150)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
      setFile(selectedFile)
      progress.reset()
    }
  }, [downloadUrl, progress])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)
      formData.append('quality', quality.toString())
      formData.append('dpi', dpi.toString())
      formData.append('pages', 'all')

      const response = await xhrUpload({
        url: '/api/pdf-to-jpg',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageProcessing(undefined, ['Converting pages...', 'Packaging images...', 'Almost done...'])

      if (!response.ok) {
        let message = 'Conversion failed'
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch {
          message = `Conversion failed (HTTP ${response.status})`
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `${file.name.replace('.pdf', '')}-images.zip`

      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('Conversion complete!')
    } catch (error) {
      progress.fail(error instanceof Error ? error.message : 'Failed to convert PDF to images')
    }
  }

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    progress.reset()
  }, [downloadUrl, progress])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-4">
        <BackButton />
        <Card className="p-4 bg-muted/40 border-muted-foreground/20">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{t(lang, 'pdfToJpg.headsUp')}</p>
              <p>{t(lang, 'pdfToJpg.qualityNote')}</p>
            </div>
          </div>
        </Card>
        {!file ? (
          <UploadDropzone
            accept=".pdf,application/pdf"
            onFilesSelected={handleFilesSelected}
            label={t(lang, 'pdfToJpg.uploadTitle')}
            sublabel={t(lang, 'pdfToJpg.clickOrDrag')}
          />
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
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isProcessing}>
                  {t(lang, 'common.change')}
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                {t(lang, 'pdfToJpg.outputSettings')}
              </h3>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="format">{t(lang, 'pdfToJpg.outputFormat')}</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as typeof format)} disabled={isProcessing}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpg">JPG (smaller file size)</SelectItem>
                      <SelectItem value="png">PNG (lossless quality)</SelectItem>
                      <SelectItem value="webp">WebP (best compression)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dpi">{t(lang, 'pdfToJpg.resolution')}</Label>
                  <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))} disabled={isProcessing}>
                    <SelectTrigger id="dpi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="72">72 DPI (screen)</SelectItem>
                      <SelectItem value="150">150 DPI (standard)</SelectItem>
                      <SelectItem value="300">300 DPI (high quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {format !== 'png' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{t(lang, 'pdfToJpg.quality')}</Label>
                    <span className="text-sm text-muted-foreground">{quality}%</span>
                  </div>
                  <Slider
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                    min={10}
                    max={100}
                    step={5}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t(lang, 'pdfToJpg.converting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t(lang, 'convert.convertTo')} {format.toUpperCase()}
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

            {downloadUrl && progress.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Conversion complete!</p>
                    <p className="text-sm text-green-700">{downloadFilename}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Images
                  </a>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New File
                  </button>
                </div>
              </div>
            )}
            {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
          </div>
        )}
      </div>
    </>
  )
}
