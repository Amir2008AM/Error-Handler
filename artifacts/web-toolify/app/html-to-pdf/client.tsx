'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Download, Loader2, FileCode, Settings, CheckCircle2, RotateCcw,
  Globe, RefreshCw, FileText, Info,
} from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

type InputMode  = 'paste' | 'file' | 'url'
type MarginSize = 'none' | 'small' | 'big'

const tool = getToolBySlug('html-to-pdf')!

// ─────────────────────────────────────────────────────────────────────────────
// Loading steps shown over the iframe, matching ilovepdf UX
// ─────────────────────────────────────────────────────────────────────────────
const LOADING_STEPS = ['Accessing URL ...', 'Creating preview']

export function HtmlToPdfClient() {
  const [mode, setMode]               = useState<InputMode>('paste')
  const [file, setFile]               = useState<File | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [urlInput, setUrlInput]       = useState('')

  // iframe state (URL mode)
  const [iframeSrc, setIframeSrc]           = useState<string | null>(null)
  const [iframeLoading, setIframeLoading]   = useState(false)
  const [loadingStep, setLoadingStep]       = useState(0)
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  // PDF settings
  const [pageSize, setPageSize]         = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation]   = useState<'portrait' | 'landscape'>('portrait')
  const [marginSize, setMarginSize]     = useState<MarginSize>('none')
  const [screenWidth, setScreenWidth]   = useState<number>(980)
  const [oneLongPage, setOneLongPage]   = useState(true)
  const [blockAds, setBlockAds]         = useState(false)
  const [removePopups, setRemovePopups] = useState(false)

  // Result
  const [downloadUrl, setDownloadUrl]           = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  // ── cleanup timers on unmount ──────────────────────────────────────────────
  useEffect(() => () => { loadingTimers.current.forEach(clearTimeout) }, [])

  // ── mode switch ──────────────────────────────────────────────────────────
  const handleModeChange = (v: string) => {
    setMode(v as InputMode)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.reset()
  }

  // ── load iframe URL ──────────────────────────────────────────────────────
  const loadUrl = useCallback((raw: string) => {
    const url = raw.trim()
    if (!url) return
    const full = url.startsWith('http') ? url : `https://${url}`

    // clear previous timers
    loadingTimers.current.forEach(clearTimeout)
    loadingTimers.current = []

    setIframeLoading(true)
    setLoadingStep(0)
    setIframeSrc(full)

    // advance loading step after 1.4 s
    const t1 = setTimeout(() => setLoadingStep(1), 1400)
    loadingTimers.current.push(t1)
  }, [])

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') loadUrl(urlInput)
  }

  // called when iframe finishes loading (fires even on X-Frame-Options block)
  const handleIframeLoad = () => {
    loadingTimers.current.forEach(clearTimeout)
    loadingTimers.current = []
    // brief delay so the "Creating preview" message is visible
    const t = setTimeout(() => setIframeLoading(false), 600)
    loadingTimers.current.push(t)
  }

  // ── file upload ──────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    if (f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')) {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(null)
      setFile(f)
      progress.reset()
    } else {
      progress.fail('Please upload an HTML file (.html or .htm)')
    }
  }, [downloadUrl, progress])

  // ── convert ──────────────────────────────────────────────────────────────
  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (mode === 'file'  && !file)              return
    if (mode === 'paste' && !htmlContent.trim()) return
    if (mode === 'url'   && !urlInput.trim())    return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Preparing...')

    try {
      const fd = new FormData()
      if (mode === 'file' && file) {
        fd.append('file', file)
      } else if (mode === 'url') {
        const raw = urlInput.trim()
        fd.append('url', raw.startsWith('http') ? raw : `https://${raw}`)
      } else {
        fd.append('html', htmlContent)
      }
      fd.append('pageSize',     pageSize)
      fd.append('orientation',  orientation)
      fd.append('marginSize',   marginSize)
      fd.append('screenWidth',  String(screenWidth))
      fd.append('oneLongPage',  String(oneLongPage))
      fd.append('blockAds',     String(blockAds))
      fd.append('removePopups', String(removePopups))

      const response = await xhrUpload({
        url: '/api/html-to-pdf',
        formData: fd,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, mode === 'url' ? 'Connecting...' : 'Uploading...')
        },
      })

      progress.stageProcessing(undefined,
        mode === 'url'
          ? ['Opening website...', 'Rendering page...', 'Generating PDF...']
          : ['Rendering HTML...', 'Applying styles...', 'Building PDF...']
      )

      if (!response.ok) {
        let msg = 'Conversion failed'
        try { const d = await response.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }

      const blob = await response.blob()
      let filename = 'document.pdf'
      if (mode === 'file' && file) {
        filename = file.name.replace(/\.(html?|htm)$/i, '.pdf')
      } else if (mode === 'url') {
        try {
          const raw = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`
          filename = `${new URL(raw).hostname}.pdf`
        } catch { filename = 'webpage.pdf' }
      }

      const blobUrl = URL.createObjectURL(blob)
      setDownloadUrl(blobUrl)
      setDownloadFilename(filename)
      progress.stageDone('Conversion complete!')
    } catch (err) {
      progress.fail(err instanceof Error ? err.message : 'Failed to convert')
    }
  }

  // ── reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    setHtmlContent('')
    setUrlInput('')
    setIframeSrc(null)
    setIframeLoading(false)
    progress.reset()
  }, [downloadUrl, progress])

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`

  const canConvert =
    mode === 'file' ? !!file :
    mode === 'url'  ? !!urlInput.trim() :
    !!htmlContent.trim()
  const isProcessing = progress.status === 'processing'

  // ── shared settings panel (used by both layouts) ─────────────────────────
  const SettingsPanel = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Screen size */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Screen size</Label>
        <Select
          value={String(screenWidth)}
          onValueChange={(v) => setScreenWidth(Number(v))}
          disabled={isProcessing}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="980">Your screen (980px)</SelectItem>
            <SelectItem value="1280">Desktop (1280px)</SelectItem>
            <SelectItem value="1920">Wide screen (1920px)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page size */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Page size</Label>
        <Select
          value={pageSize}
          onValueChange={(v) => setPageSize(v as typeof pageSize)}
          disabled={isProcessing || oneLongPage}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a4">A4 (297×210 mm)</SelectItem>
            <SelectItem value="letter">Letter (8.5×11 in)</SelectItem>
            <SelectItem value="legal">Legal (8.5×14 in)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* One long page */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="oneLongPage"
          checked={oneLongPage}
          onCheckedChange={(v) => setOneLongPage(!!v)}
          disabled={isProcessing}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label htmlFor="oneLongPage" className="cursor-pointer text-sm font-medium">
          One long page
        </Label>
        <Info className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
      </div>

      {/* Orientation */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Orientation</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['portrait', 'landscape'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              disabled={isProcessing || oneLongPage}
              className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors
                ${orientation === o && !oneLongPage
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-border hover:bg-muted text-muted-foreground'
                } disabled:opacity-40`}
            >
              <FileText className={`w-5 h-5 ${o === 'landscape' ? 'rotate-90' : ''}`} />
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Page margin */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Page margin</Label>
        <div className="grid grid-cols-3 gap-2">
          {(['none', 'small', 'big'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarginSize(m)}
              disabled={isProcessing}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors
                ${marginSize === m
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-border hover:bg-muted text-muted-foreground'
                } disabled:opacity-40`}
            >
              {/* Margin preview icon */}
              <svg viewBox="0 0 20 24" className="w-4 h-5" fill="none">
                <rect x="1" y="1" width="18" height="22" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                {m === 'none'  && <rect x="1" y="1" width="18" height="22" rx="1" fill="currentColor" fillOpacity="0.08"/>}
                {m === 'small' && <rect x="3" y="3" width="14" height="18" rx="0.5" fill="currentColor" fillOpacity="0.12"/>}
                {m === 'big'   && <rect x="5" y="5" width="10" height="14" rx="0.5" fill="currentColor" fillOpacity="0.12"/>}
              </svg>
              {m === 'none' ? 'No margin' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* HTML Settings */}
      <div className="space-y-3 pt-1">
        <Label className="text-sm font-medium text-muted-foreground">HTML Settings</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="blockAds"
            checked={blockAds}
            onCheckedChange={(v) => setBlockAds(!!v)}
            disabled={isProcessing}
          />
          <Label htmlFor="blockAds" className="cursor-pointer text-sm">Try to block ads</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="removePopups"
            checked={removePopups}
            onCheckedChange={(v) => setRemovePopups(!!v)}
            disabled={isProcessing}
          />
          <Label htmlFor="removePopups" className="cursor-pointer text-sm flex items-center gap-1">
            Remove overlay popups
            <Info className="w-3 h-3 text-muted-foreground" />
          </Label>
        </div>
      </div>
    </div>
  )

  // ── URL mode — two-column layout ─────────────────────────────────────────
  if (mode === 'paste' || mode === 'file') {
    return (
      <>
        <div className="max-w-2xl mx-auto space-y-6">
          <BackButton />

          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="paste">Paste HTML</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="url">Website URL</TabsTrigger>
            </TabsList>

            {/* Paste HTML */}
            <TabsContent value="paste" className="mt-4">
              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="html">HTML Content</Label>
                  <Textarea
                    id="html"
                    placeholder={`<html>\n<head><title>My Document</title></head>\n<body>\n  <h1>Hello World</h1>\n  <p>Your content here...</p>\n</body>\n</html>`}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    disabled={isProcessing}
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Upload File */}
            <TabsContent value="file" className="mt-4">
              {!file ? (
                <UploadDropzone
                  accept=".html,.htm,text/html"
                  onFilesSelected={handleFilesSelected}
                  label="Upload HTML File"
                  sublabel="Supports .html and .htm files"
                />
              ) : (
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <FileCode className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setFile(null)} disabled={isProcessing}>
                      Change
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* PDF Settings */}
          <Card className="p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-5">
              <Settings className="w-5 h-5" />
              PDF Settings
            </h3>
            <SettingsPanel />
          </Card>

          {/* Convert button */}
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={handleConvert} disabled={isProcessing || !canConvert} className="min-w-[200px]">
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Converting...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Convert to PDF</>
              )}
            </Button>
            <RealProgressBar
              status={progress.status} progress={progress.progress}
              message={progress.message} error={progress.error}
              className="w-[280px]" showPercentage showMessage autoHide={false}
            />
          </div>

          {/* Download result */}
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
                <a href={downloadUrl} download={downloadFilename}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors">
                  <Download className="w-4 h-4" />Download PDF
                </a>
                <button onClick={handleReset}
                  className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                  <RotateCcw className="w-4 h-4" />New Conversion
                </button>
              </div>
            </div>
          )}
          {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
        </div>
      </>
    )
  }

  // ── URL mode ─────────────────────────────────────────────────────────────
  // Full-width two-column layout: left = iframe, right = settings panel
  return (
    <>
      {/* Tab switcher above the two-column area */}
      <div className="mb-4">
        <BackButton />
        <Tabs value={mode} onValueChange={handleModeChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 max-w-sm">
            <TabsTrigger value="paste">Paste HTML</TabsTrigger>
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">Website URL</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-0 rounded-xl border overflow-hidden shadow-sm bg-white"
        style={{ minHeight: 580 }}>

        {/* ── LEFT: iframe preview ─────────────────────────────────────── */}
        <div className="flex-1 relative bg-gray-50 border-b lg:border-b-0 lg:border-r"
          style={{ minHeight: 340 }}>

          {/* Loading overlay */}
          {iframeLoading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4"/>
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="4"
                    strokeDasharray="175.9" strokeDashoffset="175.9"
                    style={{ animation: 'spin-dash 1.4s ease-in-out infinite' }}
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">{LOADING_STEPS[loadingStep]}</p>
              <p className="text-xs text-gray-400 text-center max-w-[200px]">
                Click &apos;Convert to PDF&apos; to convert without waiting for the preview
              </p>
            </div>
          )}

          {/* Empty state */}
          {!iframeSrc && !iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Globe className="w-10 h-10 opacity-30" />
              <p className="text-sm">Enter a URL and press Enter to preview</p>
            </div>
          )}

          {/* The iframe */}
          {iframeSrc && (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Website preview"
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              style={{ minHeight: 340, height: '100%' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>

        {/* ── RIGHT: settings panel ────────────────────────────────────── */}
        <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 flex flex-col bg-white">
          {/* URL input bar */}
          <div className="p-4 border-b space-y-1.5">
            <Label className="text-sm font-medium">Website URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  className="pl-8 h-9 text-sm"
                  disabled={isProcessing}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 border text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => loadUrl(urlInput)}
                disabled={!urlInput.trim() || isProcessing}
                title="Load preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Scrollable settings */}
          <div className="flex-1 overflow-y-auto p-4">
            <SettingsPanel compact />
          </div>

          {/* Convert button — sticky at bottom */}
          <div className="p-4 border-t space-y-3">
            {/* Progress */}
            {(progress.status !== 'idle') && (
              <RealProgressBar
                status={progress.status} progress={progress.progress}
                message={progress.message} error={progress.error}
                className="w-full" showPercentage showMessage autoHide={false}
              />
            )}

            {/* Download result */}
            {downloadUrl && progress.status === 'completed' ? (
              <div className="space-y-2">
                <a href={downloadUrl} download={downloadFilename}
                  className="flex w-full items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm">
                  <Download className="w-4 h-4" />Download PDF
                </a>
                <button onClick={handleReset}
                  className="flex w-full items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />New Conversion
                </button>
              </div>
            ) : (
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                size="lg"
                onClick={handleConvert}
                disabled={isProcessing || !canConvert}
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rendering...</>
                ) : (
                  <>Convert to PDF →</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {downloadUrl && progress.status === 'completed' && (
        <div className="mt-6"><TrustpilotReview /></div>
      )}

      {/* CSS for the spinner dash animation */}
      <style>{`
        @keyframes spin-dash {
          0%   { stroke-dashoffset: 175.9; transform: rotate(0deg); }
          50%  { stroke-dashoffset: 44;    transform: rotate(135deg); }
          100% { stroke-dashoffset: 175.9; transform: rotate(450deg); }
        }
      `}</style>
    </>
  )
}
