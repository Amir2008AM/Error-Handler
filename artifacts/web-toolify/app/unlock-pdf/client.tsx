'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Download, Loader2, FileText, Unlock, Eye, EyeOff } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { ProcessedFileCard } from '@/components/processed-file-card'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'

const tool = getToolBySlug('unlock-pdf')!

interface UnlockResult {
  fileId: string
  filename: string
  wasEncrypted: boolean
}

export function UnlockPdfClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [result, setResult] = useState<UnlockResult | null>(null)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setResult(null)
      progress.reset()
    }
  }, [progress])

  const handleUnlock = async () => {
    if (!file) return

    progress.startProcessing('Uploading PDF...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (password) formData.append('password', password)

      const response = await xhrUpload({
        url: '/api/unlock-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unlock PDF')
      }

      progress.stageProcessing(undefined, ['Unlocking PDF...', 'Almost done...'])

      const data = await response.json() as UnlockResult
      setResult(data)

      progress.stageDone('PDF unlocked successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unlock PDF'
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
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Unlock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t(lang, 'unlock.uploadTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t(lang, 'unlock.clickOrDrag')}</p>
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
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setPassword(''); setResult(null); progress.reset() }} disabled={isProcessing}>
                  {t(lang, 'common.change')}
                </Button>
              </div>
            </Card>

            {result && progress.status === 'completed' && (
              <ProcessedFileCard fileId={result.fileId} filename={result.filename} />
            )}

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Unlock className="w-5 h-5" />
                {t(lang, 'unlock.enterPassword')}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="password">{t(lang, 'unlock.pdfPassword')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(lang, 'unlock.enterPasswordPlaceholder')}
                    disabled={isProcessing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(lang, 'unlock.leaveEmpty')}
                </p>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleUnlock}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t(lang, 'unlock.processing')}</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />{t(lang, 'unlock.action')}</>
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
