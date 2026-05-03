'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload, Download, Loader2, Copy, Check, ScanText, Search,
  Languages, AlertCircle, ChevronDown,
} from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'
import { OCR_LANGUAGES, type OcrLanguage } from '@/lib/i18n/ocr-languages'
import { useI18n } from '@/lib/i18n/context'

const tool = getToolBySlug('ocr-image')!

interface DetectionResult {
  script: string
  scriptConfidence: number
  detectedLang: string
  detectedLangName: string
}

function LanguageSelector({
  value,
  onChange,
  disabled,
  detectedLang,
  showError,
  placeholder,
  searchPlaceholder,
}: {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  detectedLang?: DetectionResult | null
  showError?: boolean
  placeholder: string
  searchPlaceholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = OCR_LANGUAGES.find((l) => l.code === value)

  const filtered = OCR_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  )

  const detectedLangObj = detectedLang
    ? OCR_LANGUAGES.find((l) => l.code === detectedLang.detectedLang)
    : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border rounded-lg bg-white transition-all ${
          showError && !value
            ? 'border-red-400 ring-1 ring-red-300'
            : open
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-primary/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
          {selected ? (
            <span className="text-foreground">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {detectedLangObj && !search && (
            <div className="px-3 py-2 border-b border-border bg-primary/5">
              <p className="text-xs text-muted-foreground mb-1">Detected in your image:</p>
              <button
                onClick={() => {
                  onChange(detectedLangObj.code)
                  setOpen(false)
                  setSearch('')
                }}
                className="w-full text-left text-sm font-medium text-primary hover:text-primary/80"
              >
                {detectedLangObj.name}
              </button>
            </div>
          )}

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground text-center">
                No languages found
              </li>
            )}
            {filtered.map((lang) => (
              <li key={lang.code}>
                <button
                  onClick={() => {
                    onChange(lang.code)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    lang.code === value
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-foreground'
                  }`}
                >
                  <span>{lang.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      lang.rtl
                        ? 'bg-amber-50 text-amber-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {lang.rtl ? 'RTL' : lang.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function OcrImageClient() {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [language, setLanguage] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLangError, setShowLangError] = useState(false)
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [detecting, setDetecting] = useState(false)
  const progress = useRealProgress()
  const langSetByDetection = useRef(false)

  const runDetection = useCallback(async (f: File) => {
    setDetecting(true)
    langSetByDetection.current = false
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/ocr/detect', { method: 'POST', body: fd })
      if (res.ok) {
        const data: DetectionResult = await res.json()
        setDetection(data)
        if (data.detectedLang && !langSetByDetection.current) {
          setLanguage(data.detectedLang)
          langSetByDetection.current = true
        }
      }
    } catch {
      // Detection is best-effort — silently skip on failure
    } finally {
      setDetecting(false)
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile && selectedFile.type.startsWith('image/')) {
        setFile(selectedFile)
        setExtractedText('')
        setConfidence(null)
        setDetection(null)
        setShowLangError(false)
        langSetByDetection.current = false
        progress.reset()

        const reader = new FileReader()
        reader.onload = (ev) => setPreview(ev.target?.result as string)
        reader.readAsDataURL(selectedFile)

        runDetection(selectedFile)
      }
    },
    [progress, runDetection]
  )

  const handleExtract = async () => {
    if (!file) return

    if (!language) {
      setShowLangError(true)
      return
    }
    setShowLangError(false)
    progress.startProcessing(t('ocr.uploading'))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)
      formData.append('outputType', 'json')

      const response = await xhrUpload({
        url: '/api/ocr/image',
        formData,
        responseType: 'json',
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, t('ocr.uploading'))
        },
      })

      progress.stageValidation(t('ocr.scanning'))

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'OCR failed')
      }

      progress.stageProcessing(undefined, [
        t('ocr.scanning'),
        t('ocr.extracting') ?? 'Extracting text…',
        'Cleaning output…',
      ])

      const data = await response.json()
      setExtractedText(data.text)
      setConfidence(data.confidence)

      progress.stageDone(t('ocr.extracted'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extract text'
      progress.fail(message)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.replace(/\.[^.]+$/, '')}-ocr.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'
  const selectedLang = OCR_LANGUAGES.find((l) => l.code === language)

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-3xl mx-auto">
        <BackButton />

        {!file ? (
          <label className="block">
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t('common.upload')} Image</p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPG, PNG, GIF, WebP, BMP and TIFF · Max 50 MB
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  100+ languages · Arabic, Chinese, Japanese, Korean, Hindi and more
                </p>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Image preview */}
              <Card className="p-4 space-y-3">
                <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                  {preview && (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => {
                      setFile(null)
                      setPreview(null)
                      setExtractedText('')
                      setConfidence(null)
                      setDetection(null)
                      setShowLangError(false)
                      langSetByDetection.current = false
                      progress.reset()
                    }}
                  >
                    {t('common.change')}
                  </Button>
                </div>
              </Card>

              {/* Language + extract controls */}
              <Card className="p-4 space-y-4">
                {/* Detection badge — name only, no percentage */}
                {(detecting || detection) && (
                  <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                    {detecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">Detecting script…</span>
                      </>
                    ) : detection ? (
                      <>
                        <span className="font-medium text-foreground">
                          {detection.detectedLangName}
                        </span>
                        <span className="text-muted-foreground">
                          {t('ocr.detectedLanguage').toLowerCase()}
                        </span>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Language selector */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" />
                    {t('ocr.selectLanguage')}
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <LanguageSelector
                    value={language}
                    onChange={(code) => {
                      setLanguage(code)
                      setShowLangError(false)
                    }}
                    disabled={isProcessing}
                    detectedLang={detection}
                    showError={showLangError}
                    placeholder={t('ocr.selectLanguage')}
                    searchPlaceholder={t('ocr.searchLanguages')}
                  />
                  {showLangError && !language ? (
                    <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {t('ocr.languageRequired')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select the language in your image for accurate results
                    </p>
                  )}
                </div>

                {/* Selected language pill */}
                {selectedLang && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                      {selectedLang.code}
                    </span>
                    <span>{selectedLang.name}</span>
                    {selectedLang.rtl && (
                      <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                        RTL
                      </span>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleExtract}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('ocr.extracting')}
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4 mr-2" />
                      {t('ocr.extractText')}
                    </>
                  )}
                </Button>

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

                {confidence !== null && progress.status === 'completed' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Recognition accuracy</span>
                    <span
                      className={`font-medium ${
                        confidence >= 70
                          ? 'text-green-600'
                          : confidence >= 40
                          ? 'text-amber-600'
                          : 'text-red-500'
                      }`}
                    >
                      {confidence.toFixed(1)}%
                    </span>
                  </div>
                )}
              </Card>
            </div>

            {/* Output */}
            {extractedText && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('ocr.extractedText')}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          {t('common.copy')}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {t('common.download')}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  dir={selectedLang?.rtl ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-muted-foreground">
                  {extractedText.length} characters ·{' '}
                  {extractedText.trim().split(/\s+/).filter(Boolean).length} words
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
