'use client'

import { useState, useCallback } from 'react'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Download, Loader2, FileText, Unlock, Eye, EyeOff } from 'lucide-react'
import { getToolBySlug } from '@/lib/tools'
import { RealProgressBar, useRealProgress } from '@/components/real-progress-bar'

const tool = getToolBySlug('unlock-pdf')!

export function UnlockPdfClient() {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const progress = useRealProgress()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      progress.reset()
    }
  }, [progress])

  const handleUnlock = async () => {
    if (!file) return

    progress.startProcessing('Uploading PDF...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (password) formData.append('password', password)

      progress.updateProgress(20, 'Removing password...')

      const response = await fetch('/api/unlock-pdf', {
        method: 'POST',
        body: formData,
      })

      progress.updateProgress(60, 'Processing...')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unlock PDF')
      }

      progress.updateProgress(85, 'Saving...')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `unlocked-${file.name}`
      a.click()
      URL.revokeObjectURL(url)

      progress.complete('PDF unlocked successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unlock PDF'
      progress.fail(message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const isProcessing = progress.status === 'processing'

  return (
    <ToolPageLayout tool={tool}>
      <div className="max-w-2xl mx-auto">
        {!file ? (
          <label className="block">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Card className="p-12 border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Unlock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Upload Protected PDF</p>
                  <p className="text-sm text-muted-foreground">Click or drag and drop your password-protected PDF</p>
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
                  <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setPassword(''); progress.reset() }} disabled={isProcessing}>
                  Change
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Unlock className="w-5 h-5" />
                Enter Password
              </h3>
              <div className="space-y-2">
                <Label htmlFor="password">PDF Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the document password"
                    disabled={isProcessing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty if only an owner password is set.
                </p>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleUnlock}
                disabled={isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Unlocking...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Unlock & Download</>
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
