'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Download, Loader2, FileText, TrendingDown } from 'lucide-react'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'

export function CompressPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      progress.reset()
    }
  }, [progress])

  const handleCompress = async () => {
    if (!file) return

    progress.startProcessing('Uploading file...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate stages based on file size for realistic progress
      const fileSize = file.size
      const estimatedTime = Math.max(1000, Math.min(fileSize / 50000, 10000))
      
      // Stage 1: Uploading (0-20%)
      progress.updateProgress(10, 'Uploading file...')
      
      const response = await fetch('/api/compress-pdf', {
        method: 'POST',
        body: formData,
      })

      // Stage 2: Processing (20-80%)
      progress.updateProgress(30, 'Loading document...')
      
      await new Promise(r => setTimeout(r, 200))
      progress.updateProgress(50, 'Compressing PDF...')
      
      await new Promise(r => setTimeout(r, 200))
      progress.updateProgress(70, 'Optimizing...')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Compression failed' }))
        throw new Error(errorData.error || 'Compression failed')
      }

      // Stage 3: Finalizing (80-100%)
      progress.updateProgress(90, 'Preparing download...')

      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0')
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0')

      setResult({ original: originalSize, compressed: compressedSize })

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed-${file.name}`
      a.click()
      URL.revokeObjectURL(url)

      progress.complete('Compression complete!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compress PDF'
      progress.fail(message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getReduction = () => {
    if (!result) return 0
    return Math.round((1 - result.compressed / result.original) * 100)
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout
      toolId="compress-pdf"
      title="Compress PDF"
      description="Reduce the file size of your PDF documents while maintaining quality. Perfect for email attachments and web uploads."
    >
      <div className="max-w-2xl mx-auto">
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
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Original size: {formatSize(file.size)}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                    progress.reset()
                  }}
                  disabled={isProcessing}
                >
                  Change
                </Button>
              </div>
            </Card>

            {result && progress.status === 'completed' && (
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      Reduced by {getReduction()}%
                    </p>
                    <p className="text-sm text-green-700">
                      {formatSize(result.original)} → {formatSize(result.compressed)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex flex-col items-center">
              <Button
                size="lg"
                onClick={handleCompress}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Compress PDF
                  </>
                )}
              </Button>
              
              {/* Real Progress Bar */}
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
