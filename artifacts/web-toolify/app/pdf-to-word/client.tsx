'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { formatBytes } from '@/lib/utils/format-bytes'

import { useState, useCallback } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { Download, Loader2, CheckCircle2, RotateCcw, X, FileText } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { useI18n } from '@/lib/i18n/context'
import { t } from '@/lib/i18n/translations'



export function PdfToWordClient() {
  const { lang } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState<string | null>(null)
  const progress = useRealProgress()

  const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

  const handleFileSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (f && f.size > MAX_FILE_BYTES) {
      setError(`الملف كبير جداً (${(f.size / 1024 / 1024).toFixed(1)} MB). الحد الأقصى 25 MB لضمان اكتمال التحويل في أقل من 30 ثانية.`)
      return
    }
    setFile(f)
    setDownloadUrl(null)
    setError(null)
    progress.reset()
  }, [progress])

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (!file) return
    setError(null)
    setDownloadUrl(null)

    const fileMB = file.size / (1024 * 1024)
    const uploadMsg = fileMB > 10
      ? `Uploading PDF… (${fileMB.toFixed(0)} MB — may take a moment)`
      : 'Uploading PDF...'

    progress.startProcessing(uploadMsg)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const res = await xhrUpload({
        url: '/api/pdf-to-word',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, uploadMsg)
        },
      })

      progress.stageValidation('Analysing document structure...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Conversion failed')
      }

      const convMsgs = fileMB > 20
        ? ['Extracting text & layout…', 'Rebuilding pages…', 'Finalising Word document…', 'Almost done…']
        : ['Extracting content...', 'Building document...', 'Almost done...']

      progress.stageProcessing(undefined, convMsgs)

      const blob = await res.blob()

      setDownloadUrl(URL.createObjectURL(blob))
      setFilename(`${file.name.replace(/\.pdf$/i, '')}.docx`)

      progress.stageDone('Conversion complete!')
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong'
      setError(message)
      progress.fail(message)
    }
  }

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFile(null)
    setDownloadUrl(null)
    setError(null)
    setFilename('')
    progress.reset()
  }

  const isProcessing = progress.status === 'processing'

  return (
    <div className="space-y-6">
      <BackButton />
      {!file ? (
        <UploadDropzone
          accept="application/pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          label={t(lang, 'pdfToWord.dropFile')}
          sublabel={t(lang, 'pdfToWord.subLabel')}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button 
              onClick={reset} 
              disabled={isProcessing}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-700">
            <strong>Note:</strong> {t(lang, 'pdfToWord.note')}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t(lang, 'pdfToWord.converting')}</>
                ) : (
                  <><FileText className="w-5 h-5" /> {t(lang, 'pdfToWord.action')}</>
                )}
              </button>
              <button
                onClick={reset}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 border border-border px-5 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> {t(lang, 'pdfToWord.reset')}
              </button>
            </div>

            <RealProgressBar
              status={progress.status}
              progress={progress.progress}
              message={progress.message}
              error={progress.error}
              className="w-full"
              showPercentage={true}
              showMessage={true}
              autoHide={false}
            />
          </div>

          {downloadUrl && progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">{t(lang, 'pdfToWord.successTitle')}</p>
                  <p className="text-sm text-green-700">{filename}</p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={filename}
                className="flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                {t(lang, 'pdfToWord.download')}
              </a>
            </div>
          )}
          {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
        </div>
      )}
    </div>
  )
}
