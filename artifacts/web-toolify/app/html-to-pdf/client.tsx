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
import { Download, Loader2, FileCode, Settings, CheckCircle2, RotateCcw, Globe, Eye, AlertTriangle } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

type InputMode = 'paste' | 'file' | 'url'

const tool = getToolBySlug('html-to-pdf')!

export function HtmlToPdfClient() {
  const [mode, setMode] = useState<InputMode>('paste')
  const [file, setFile] = useState<File | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlocked, setPreviewBlocked] = useState(false)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const progress = useRealProgress()

  const handleModeChange = (v: string) => {
    setMode(v as InputMode)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.reset()
  }

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0]
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase()
      if (ext.endsWith('.html') || ext.endsWith('.htm')) {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl)
        setDownloadUrl(null)
        setFile(selectedFile)
        progress.reset()
      } else {
        progress.fail('Please upload an HTML file (.html or .htm)')
      }
    }
  }, [downloadUrl, progress])

  const handleLoadPreview = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    setPreviewBlocked(false)
    setPreviewUrl(url)
  }

  const handleConvert = async () => {
    if (progress.status === 'processing') return
    if (mode === 'file' && !file) return
    if (mode === 'paste' && !htmlContent.trim()) return
    if (mode === 'url' && !urlInput.trim()) return

    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    progress.startProcessing('Preparing...')

    try {
      const formData = new FormData()

      if (mode === 'file' && file) {
        formData.append('file', file)
      } else if (mode === 'url') {
        const trimmed = urlInput.trim()
        const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
        formData.append('url', url)
      } else {
        formData.append('html', htmlContent)
      }

      formData.append('pageSize', pageSize)
      formData.append('orientation', orientation)

      const response = await xhrUpload({
        url: '/api/html-to-pdf',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, mode === 'url' ? 'Connecting to website...' : 'Uploading HTML...')
        },
      })

      progress.stageProcessing(undefined,
        mode === 'url'
          ? ['Fetching website...', 'Rendering page...', 'Building PDF...']
          : ['Rendering HTML...', 'Building PDF...', 'Almost done...']
      )

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
      let filename = 'document.pdf'
      if (mode === 'file' && file) {
        filename = file.name.replace(/\.(html?|htm)$/i, '.pdf')
      } else if (mode === 'url') {
        try {
          const raw = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`
          filename = `${new URL(raw).hostname}.pdf`
        } catch { filename = 'webpage.pdf' }
      }

      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setDownloadFilename(filename)
      progress.stageDone('Conversion complete!')
    } catch (error) {
      progress.fail(error instanceof Error ? error.message : 'Failed to convert')
    }
  }

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFile(null)
    setHtmlContent('')
    setUrlInput('')
    setPreviewUrl(null)
    setPreviewBlocked(false)
    progress.reset()
  }, [downloadUrl, progress])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const canConvert =
    mode === 'file' ? !!file :
    mode === 'url'  ? !!urlInput.trim() :
    !!htmlContent.trim()
  const isProcessing = progress.status === 'processing'

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

          {/* ── Paste HTML ── */}
          <TabsContent value="paste" className="mt-4">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="html">HTML Content</Label>
                <Textarea
                  id="html"
                  placeholder={`<html>\n<head>\n  <title>My Document</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n  <p>Your content here...</p>\n</body>\n</html>`}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  disabled={isProcessing}
                />
              </div>
            </Card>
          </TabsContent>

          {/* ── Upload File ── */}
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

          {/* ── Website URL ── */}
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
                        setPreviewUrl(null)
                        setPreviewBlocked(false)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLoadPreview() }}
                      className="pl-9"
                      disabled={isProcessing}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLoadPreview}
                    disabled={!urlInput.trim() || isProcessing}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a website URL. The page will be rendered with full CSS and images preserved.
                </p>
              </div>
            </Card>

            {previewUrl && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{previewUrl}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2 bg-muted px-2 py-0.5 rounded">Preview</span>
                </div>
                {!previewBlocked ? (
                  <div className="relative w-full" style={{ height: '420px' }}>
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      onError={() => setPreviewBlocked(true)}
                      title="Page preview"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 bg-muted/20">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                    <p className="text-sm font-medium text-center">Preview blocked by this site&apos;s security policy</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      This site prevents embedding in iframes. The PDF conversion will still work correctly.
                    </p>
                  </div>
                )}
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
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size</Label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as typeof pageSize)} disabled={isProcessing}>
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
              <Label htmlFor="orientation">Orientation</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as typeof orientation)} disabled={isProcessing}>
                <SelectTrigger id="orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
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
