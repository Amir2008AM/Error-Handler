'use client'

import { Check, Circle, FileText, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProgressStatus } from '@/components/real-progress-bar'

interface ProcessingWorkspaceProps {
  fileName?: string
  status: ProgressStatus
  error?: string
  onRetry?: () => void
  onChangeFile?: () => void
  children: React.ReactNode
}

const steps = ['Upload', 'Process', 'Download']

export function ProcessingWorkspace({
  fileName,
  status,
  error,
  onRetry,
  onChangeFile,
  children,
}: ProcessingWorkspaceProps) {
  const activeStep = !fileName ? 0 : status === 'completed' ? 2 : 1
  const hasError = status === 'error'

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Processing workspace</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a file, start processing, then download the finished result.
            </p>
          </div>
          {fileName && onChangeFile && (
            <Button variant="outline" size="sm" onClick={onChangeFile} disabled={status === 'processing'}>
              Change file
            </Button>
          )}
        </div>

        <ol className="grid grid-cols-3 gap-2 pt-2" aria-label="Processing steps">
          {steps.map((step, index) => {
            const complete = index < activeStep && !hasError
            const current = index === activeStep
            return (
              <li key={step} className="flex items-center gap-2 text-xs font-medium">
                <span className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border',
                  complete && 'border-primary bg-primary text-primary-foreground',
                  current && !hasError && 'border-primary text-primary',
                  current && hasError && 'border-destructive text-destructive',
                  !complete && !current && 'border-border text-muted-foreground',
                )}>
                  {complete ? <Check data-icon="inline-start" /> : current && status === 'processing' ? <Loader2 className="animate-spin" /> : current && hasError ? <TriangleAlert /> : <Circle />}
                </span>
                <span className={cn(current ? 'text-foreground' : 'text-muted-foreground')}>{step}</span>
              </li>
            )
          })}
        </ol>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        {fileName && (
          <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
            <FileText className="size-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</span>
            {status === 'completed' && <Check className="size-4 shrink-0 text-primary" />}
          </div>
        )}
        {children}
        {hasError && error && (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
            <div className="flex items-start gap-2 text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
            {onRetry && <Button variant="outline" size="sm" className="self-start" onClick={onRetry}><RotateCcw data-icon="inline-start" />Retry processing</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { ProcessingWorkspaceProps }
