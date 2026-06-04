export function ToolLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar placeholder */}
      <div className="h-14 border-b border-border bg-white/80" />

      {/* Tool header banner */}
      <div className="border-b border-border bg-primary/5 py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-44 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-4 flex gap-3 animate-pulse">
          <div className="h-5 w-36 rounded-full bg-muted" />
          <div className="h-5 w-32 rounded-full bg-muted" />
          <div className="h-5 w-36 rounded-full bg-muted" />
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-4 animate-pulse">
        {/* Back button */}
        <div className="h-5 w-16 rounded bg-muted" />

        {/* Upload zone skeleton */}
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted" />
          <div className="space-y-2 text-center">
            <div className="h-5 w-40 rounded bg-muted mx-auto" />
            <div className="h-4 w-56 rounded bg-muted mx-auto" />
            <div className="h-3 w-32 rounded bg-muted mx-auto" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>

        {/* Source buttons skeleton */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-lg bg-muted" />
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}
