'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Download, Loader2, FileText, Settings } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const tool = getToolBySlug('word-to-pdf')!

export function WordToPdfClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase()
      if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
        setFile(selectedFile)
        progress.reset()
      } else {
        progress.fail('Please upload a Word document (.docx or .doc)')
      }
    }
  }, [progress])

  const handleConvert = async () => {
    if (!file) return

    progress.startProcessing('Uploading document...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pageSize', pageSize)
      formData.append('orientation', orientation)

      const response = await xhrUpload({
        url: '/api/word-to-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading document...')
        },
      })

      progress.stageValidation('Validating document...')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      progress.stageProcessing(undefined, ['Converting to PDF...', 'Almost done...'])

      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.(docx?|doc)$/i, '.pdf')
      a.click()
      URL.revokeObjectURL(url)

      progress.stageDone('Conversion complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert document'
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
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t(lang, 'wordToPdf.uploadTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(lang, 'wordToPdf.supportedFormats')}
                  </p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setFile(null); progress.reset() }}
                  disabled={isProcessing}
                >
                  {t(lang, 'common.change')}
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t(lang, 'wordToPdf.pdfSettings')}
              </h3>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pageSize">{t(lang, 'wordToPdf.pageSize')}</Label>
                  <Select 
                    value={pageSize} 
                    onValueChange={(v) => setPageSize(v as typeof pageSize)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger id="pageSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                      <SelectItem value="letter">Letter (8.5 x 11 in)</SelectItem>
                      <SelectItem value="legal">Legal (8.5 x 14 in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orientation">{t(lang, 'wordToPdf.orientation')}</Label>
                  <Select 
                    value={orientation} 
                    onValueChange={(v) => setOrientation(v as typeof orientation)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger id="orientation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{t(lang, 'wordToPdf.portrait')}</SelectItem>
                      <SelectItem value="landscape">{t(lang, 'wordToPdf.landscape')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                    {t(lang, 'wordToPdf.converting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t(lang, 'wordToPdf.action')}
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
