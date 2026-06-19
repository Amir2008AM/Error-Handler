'use client'
import { TrustpilotReview } from '@/components/trustpilot-review'
import { useState, useCallback, useRef } from 'react'
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
  Globe, Camera, AlertTriangle, FileText,
} from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

type InputMode  = 'paste' | 'file' | 'url'
type MarginSize = 'none' | 'small' | 'big'

const tool = getToolBySlug('html-to-pdf')!

export function HtmlToPdfClient() {
  const [mode, setMode]               = useState<InputMode>('paste')
  const [file, setFile]               = useState<File | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [urlInput, setUrlInput]       = useState('')

  // Preview state
  const [previewSrc, setPreviewSrc]         = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState<string | null>(null)

  // PDF settings
  const [pageSize, setPageSize]       = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [marginSize, setMarginSize]   = useState<MarginSize>('small')
  const [screenWidth, setScreenWidth] = useState<number>(1280)
  const [oneLongPage, setOneLongPage] = useState(false)
  const [blockAds, setBlockAds]       = useState(false)
  const [removePopups, setRemovePopups] = useState(false)

  // Result
  const [downloadUrl, setDownloadUrl]         = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const progress = useRealProgress()

  // ── mode switch ──────────────────────────────────────────────────────────
  const handleModeChange = (v: string) => {
    setMode(v as InputMode)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setPreviewSrc(null)
    setPreviewError(null)
    progress.reset()
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

  // ── URL preview (server-side screenshot) ────────────────────────────────
  const handleLoadPreview = async () => {
    const raw = urlInput.trim()
    if (!raw) return
    const url = raw.startsWith('http') ? raw : `https://${raw}`
    setPreviewSrc(null)
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/html-to-pdf/screenshot?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Preview failed (${res.status})`)
      }
      const blob = await res.blob()
      setPreviewSrc(URL.createObjectURL(blob))
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

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
      fd.append('pageSize',    pageSize)
      fd.append('orientation', orientation)
      fd.append('marginSize',  marginSize)
      fd.append('screenWidth', String(screenWidth))
      fd.append('oneLongPage', String(oneLongPage))
      fd.append('blockAds',    String(blockAds))
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
    if (previewSrc)  URL.revokeObjectURL(previewSrc)
    setDownloadUrl(null)
    setFile(null)
    setHtmlContent('')
    setUrlInput('')
    setPreviewSrc(null)
    setPreviewError(null)
    progress.reset()
  }, [downloadUrl, previewSrc, progress])

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`

  const canConvert =
    mode === 'file' ? !!file :
    mode === 'url'  ? !!urlInput.trim() :
    !!htmlContent.trim()
  const isProcessing = progress.status === 'processing'

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />

        {/* ── Input mode tabs ── */}
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

          {/* Website URL */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url-input">Website URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value)
                        setPreviewSrc(null)
                        setPreviewError(null)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLoadPreview() }}
                      className="pl-9"
                      disabled={isProcessing}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLoadPreview}
                    disabled={!urlInput.trim() || isProcessing || previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The page is rendered by a real browser engine — CSS, images and JS are all preserved.
                </p>
              </div>
            </Card>

            {/* Screenshot preview */}
            {previewLoading && (
              <Card className="overflow-hidden">
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Taking screenshot of the page…</p>
                </div>
              </Card>
            )}

            {previewSrc && !previewLoading && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {urlInput.startsWith('http') ? urlInput : `https://${urlInput}`}
                    </span>
                  </div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded shrink-0 ml-2">Preview</span>
                </div>
                <img
                  src={previewSrc}
                  alt="Page preview"
                  className="w-full object-cover object-top"
                  style={{ maxHeight: 420 }}
                />
              </Card>
            )}

            {previewError && !previewLoading && (
              <Card className="overflow-hidden">
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 bg-muted/20">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-medium text-center">Preview failed</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">{previewError}</p>
                  <p className="text-xs text-muted-foreground text-center">The PDF conversion may still work.</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* ── PDF Settings ── */}
        <Card className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            PDF Settings
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Screen size */}
            <div className="space-y-2">
              <Label htmlFor="screenWidth">Screen Size</Label>
              <Select
                value={String(screenWidth)}
                onValueChange={(v) => setScreenWidth(Number(v))}
                disabled={isProcessing}
              >
                <SelectTrigger id="screenWidth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="980">Mobile (980px)</SelectItem>
                  <SelectItem value="1280">Desktop (1280px)</SelectItem>
                  <SelectItem value="1920">Wide (1920px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page size */}
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size</Label>
              <Select
                value={pageSize}
                onValueChange={(v) => setPageSize(v as typeof pageSize)}
                disabled={isProcessing || oneLongPage}
              >
                <SelectTrigger id="pageSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (297 × 210 mm)</SelectItem>
                  <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                  <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orientation */}
            <div className="space-y-2">
              <Label>Orientation</Label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    disabled={isProcessing || oneLongPage}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${orientation === o && !oneLongPage
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted text-muted-foreground'
                      } disabled:opacity-40`}
                  >
                    <FileText className={`w-4 h-4 ${o === 'landscape' ? 'rotate-90' : ''}`} />
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <Label>Page Margin</Label>
              <div className="flex gap-2">
                {(['none', 'small', 'big'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarginSize(m)}
                    disabled={isProcessing}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${marginSize === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted text-muted-foreground'
                      } disabled:opacity-40`}
                  >
                    {m === 'none' ? 'No Margin' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* One long page */}
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="oneLongPage"
              checked={oneLongPage}
              onCheckedChange={(v) => setOneLongPage(!!v)}
              disabled={isProcessing}
            />
            <div>
              <Label htmlFor="oneLongPage" className="cursor-pointer font-medium">One long page</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Render entire content as a single continuous page instead of splitting across pages.
              </p>
            </div>
          </div>

          {/* HTML Settings */}
          <div className="space-y-3 pt-1 border-t">
            <p className="text-sm font-semibold text-muted-foreground pt-3">HTML Settings</p>
            <div className="flex items-start gap-3">
              <Checkbox
                id="blockAds"
                checked={blockAds}
                onCheckedChange={(v) => setBlockAds(!!v)}
                disabled={isProcessing}
              />
              <div>
                <Label htmlFor="blockAds" className="cursor-pointer font-medium">Try to block ads</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Hide common ad elements before converting.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="removePopups"
                checked={removePopups}
                onCheckedChange={(v) => setRemovePopups(!!v)}
                disabled={isProcessing}
              />
              <div>
                <Label htmlFor="removePopups" className="cursor-pointer font-medium">Remove overlay popups</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Remove cookie banners and modal overlays.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Convert button ── */}
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={handleConvert}
            disabled={isProcessing || !canConvert}
            className="min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'url' ? 'Rendering...' : 'Converting...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Convert to PDF
              </>
            )}
          </Button>

          <RealProgressBar
            status={progress.status}
            progress={progress.progress}
            message={progress.message}
            error={progress.error}
            className="w-[280px]"
            showPercentage
            showMessage
            autoHide={false}
          />
        </div>

        {/* ── Download result ── */}
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
                Download PDF
              </a>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                New Conversion
              </button>
            </div>
          </div>
        )}
        {downloadUrl && progress.status === 'completed' && <TrustpilotReview />}
      </div>
    </>
  )
}
