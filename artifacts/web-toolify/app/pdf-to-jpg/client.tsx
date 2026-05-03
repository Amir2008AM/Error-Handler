'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Upload, Download, Loader2, FileText, Image, Info } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { useLoadingBar } from '@/components/global-loading-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const tool = getToolBySlug('pdf-to-jpg')!

export function PdfToJpgClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg')
  const [quality, setQuality] = useState(90)
  const [dpi, setDpi] = useState(150)
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
    }
  }, [])

  const handleConvert = async () => {
    if (!file) return

    setProcessing(true)
    startLoading()
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
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `${file.name.replace('.pdf', '')}-images.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to convert PDF to images')
    } finally {
      setProcessing(false)
      stopLoading()
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <ToolPageLayout tool={tool}>
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
          <label className="block">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t(lang, 'pdfToJpg.uploadTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t(lang, 'pdfToJpg.clickOrDrag')}</p>
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
                    {formatSize(file.size)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
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
                  <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
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
                  <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))}>
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
                  />
                </div>
              )}
            </Card>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleConvert}
                disabled={processing}
                className="min-w-[200px]"
              >
                {processing ? (
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
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
