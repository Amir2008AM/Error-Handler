'use client'

import { useState } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Download, Loader2, Code, FileCode, Settings } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { useLoadingBar } from '@/components/global-loading-bar'
import { BackButton } from '@/components/back-button'

const tool = getToolBySlug('html-to-pdf')!

export function HtmlToPdfClient() {
  const [mode, setMode] = useState<'file' | 'paste'>('paste')
  const [file, setFile] = useState<File | null>(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [processing, setProcessing] = useState(false)
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const { startLoading, stopLoading } = useLoadingBar()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase()
      if (ext.endsWith('.html') || ext.endsWith('.htm')) {
        setFile(selectedFile)
      } else {
        alert('Please upload an HTML file (.html or .htm)')
      }
    }
  }

  const handleConvert = async () => {
    if (mode === 'file' && !file) return
    if (mode === 'paste' && !htmlContent.trim()) return

    setProcessing(true)
    startLoading()
    try {
      const formData = new FormData()
      
      if (mode === 'file' && file) {
        formData.append('file', file)
      } else {
        formData.append('html', htmlContent)
      }
      
      formData.append('pageSize', pageSize)
      formData.append('orientation', orientation)

      const response = await fetch('/api/html-to-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Conversion failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file ? file.name.replace(/\.(html?|htm)$/i, '.pdf') : 'document.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert HTML')
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

  const canConvert = mode === 'file' ? !!file : !!htmlContent.trim()

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'file' | 'paste')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">Paste HTML</TabsTrigger>
            <TabsTrigger value="file">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="html">HTML Content</Label>
                <Textarea
                  id="html"
                  placeholder="<html>
<head>
  <title>My Document</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>Your content here...</p>
</body>
</html>"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="file" className="mt-4">
            {!file ? (
              <label className="block">
                <input
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Upload HTML File</p>
                      <p className="text-sm text-muted-foreground">
                        Supports .html and .htm files
                      </p>
                    </div>
                  </div>
                </Card>
              </label>
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
                  <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                    Change
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Card className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            PDF Settings
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size</Label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as typeof pageSize)}>
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
              <Select value={orientation} onValueChange={(v) => setOrientation(v as typeof orientation)}>
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

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleConvert}
            disabled={processing || !canConvert}
            className="min-w-[200px]"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Convert to PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </ToolPageLayout>
  )
}
