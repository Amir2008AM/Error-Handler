'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, Download, Loader2, FileText } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'
import { BackButton } from '@/components/back-button'

const positions = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

const formats = [
  { value: 'numeric', label: '1, 2, 3...' },
  { value: 'roman', label: 'I, II, III...' },
  { value: 'page-of-total', label: 'Page 1 of 10' },
]

export function PageNumbersClient() {
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState('bottom-center')
  const [format, setFormat] = useState('numeric')
  const [startFrom, setStartFrom] = useState(1)
  const [fontSize, setFontSize] = useState(12)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      progress.reset()
    }
  }, [progress])

  const handleProcess = async () => {
    if (!file) return

    progress.startProcessing('Uploading PDF...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('position', position)
      formData.append('format', format)
      formData.append('startFrom', String(startFrom))
      formData.append('fontSize', String(fontSize))

      const response = await xhrUpload({
        url: '/api/page-numbers',
        formData,
        onUploadProgress: (pct) => {
          progress.stageUpload(pct, 'Uploading PDF...')
        },
      })

      progress.stageValidation('Validating PDF...')

      if (!response.ok) throw new Error('Processing failed')

      progress.stageProcessing(undefined, ['Adding page numbers...', 'Almost done...'])

      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'numbered.pdf'
      a.click()
      URL.revokeObjectURL(url)

      progress.stageDone('Page numbers added!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add page numbers'
      progress.fail(message)
    }
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="page-numbers"
      title="Add Page Numbers"
      description="Add professional page numbers to your PDF documents. Choose position, format, and starting number."
    >
      <div className="max-w-2xl mx-auto">
        <BackButton />
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload PDF</p>
                  <p className="text-sm text-muted-foreground">Click or drag and drop your PDF file here</p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setFile(null); progress.reset() }}
                  disabled={isProcessing}
                >
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Position</Label>
                <div className="grid grid-cols-3 gap-2">
                  {positions.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => setPosition(pos.value)}
                      disabled={isProcessing}
                      className={`p-3 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                        position === pos.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setFormat(fmt.value)}
                      disabled={isProcessing}
                      className={`p-3 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                        format === fmt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startFrom" className="text-sm font-medium mb-2 block">
                    Start From
                  </Label>
                  <Input
                    id="startFrom"
                    type="number"
                    min={1}
                    value={startFrom}
                    onChange={(e) => setStartFrom(parseInt(e.target.value) || 1)}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="fontSize" className="text-sm font-medium mb-2 block">
                    Font Size (pt)
                  </Label>
                  <Input
                    id="fontSize"
                    type="number"
                    min={8}
                    max={24}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleProcess}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Add Page Numbers
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
