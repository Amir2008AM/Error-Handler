'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Loader2, FileText, Eye, EyeOff } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { ProcessedFileCard } from '@/components/processed-file-card'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'

interface ProtectResult {
  fileId: string
  filename: string
}

export function ProtectPdfClient() {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ProtectResult | null>(null)
  const progress = useRealProgress()

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      setResult(null)
      progress.reset()
    }
  }, [progress])

  const handleProtect = async () => {
    if (!file) return

    if (password.length < 4) {
      setError(t('protect.errorMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('protect.errorMismatch'))
      return
    }

    setError('')
    progress.startProcessing('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', password)

      const response = await xhrUpload({
        url: '/api/protect-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Protection failed' }))
        throw new Error(errorData.error || 'Protection failed')
      }

      progress.stageProcessing(undefined, ['Encrypting PDF...', 'Almost done...'])

      const data = await response.json() as ProtectResult
      setResult(data)

      progress.stageDone('PDF protected!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to protect PDF'
      setError(message)
      progress.fail(message)
    }
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="protect-pdf"
      title="Protect PDF"
      description="Add password protection to your PDF documents. Keep your sensitive files secure with encryption."
    >
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <UploadDropzone
            accept=".pdf,application/pdf"
            onFilesSelected={handleFilesSelected}
            label={t('protect.uploadTitle')}
            sublabel={t('common.clickOrDragPdf')}
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
                    {(file.size / 1024).toFixed(1)} KB
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

            {result && progress.status === 'completed' && (
              <ProcessedFileCard fileId={result.fileId} filename={result.filename} />
            )}

            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium mb-2 block">
                  {t('protect.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('protect.enterPassword')}
                    className="pr-10"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium mb-2 block">
                  {t('protect.confirmPassword')}
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('protect.confirmPlaceholder')}
                  disabled={isProcessing}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleProtect}
                disabled={isProcessing || !password}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('protect.processing')}</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />{t('protect.action')}</>
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
