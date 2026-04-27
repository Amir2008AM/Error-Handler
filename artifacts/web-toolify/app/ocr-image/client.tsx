'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Download, Loader2, Copy, Check, ScanText } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'
import { xhrUpload } from '@/lib/utils/xhr-upload'

const tool = getToolBySlug('ocr-image')!

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'ara', name: 'Arabic' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'spa', name: 'Spanish' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'hin', name: 'Hindi' },
  { code: 'tur', name: 'Turkish' },
]

export function OcrImageClient() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [language, setLanguage] = useState('eng')
  const [extractedText, setExtractedText] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile)
      setExtractedText('')
      setConfidence(null)
      progress.reset()
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    }
  }, [progress])

  const handleExtract = async () => {
    if (!file) return

    progress.startProcessing('Uploading image...')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)
      formData.append('outputType', 'json')

      progress.updateProgress(0, 'Uploading image...')

      const response = await xhrUpload({
        url: '/api/ocr/image',
        formData,
        responseType: 'json',
        onUploadProgress: (pct) => {
          progress.updateProgress(Math.round(pct * 0.3), 'Uploading image...')
        },
      })

      progress.updateProgress(50, 'Recognizing text...')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'OCR failed')
      }

      progress.updateProgress(80, 'Processing results...')

      const data = await response.json()
      setExtractedText(data.text)
      setConfidence(data.confidence)
      
      progress.complete('Text extracted!')
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

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-3xl mx-auto">
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload Image</p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPG, PNG, GIF, WebP, BMP, and TIFF
                  </p>
                </div>
              </div>
            </Card>
          </label>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-4">
                <div className="aspect-video relative bg-muted rounded-lg overflow-hidden mb-4">
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
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
                      progress.reset()
                    }}
                  >
                    Change
                  </Button>
                </div>
              </Card>

              <Card className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Text Language</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={isProcessing}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the primary language of the text in your image for better accuracy
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleExtract}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting Text...
                      </>
                    ) : (
                      <>
                        <ScanText className="w-4 h-4 mr-2" />
                        Extract Text
                      </>
                    )}
                  </Button>

                  {/* Real Progress Bar */}
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

                {confidence !== null && progress.status === 'completed' && (
                  <div className="text-sm text-muted-foreground text-center">
                    Recognition confidence: {confidence.toFixed(1)}%
                  </div>
                )}
              </Card>
            </div>

            {extractedText && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Extracted Text</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </ToolPageLayout>
  )
}
