import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer | ToolifyPDF',
  description: 'Disclaimer for ToolifyPDF - Important information about the use of our services.',
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Disclaimer</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: June 2025</p>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground space-y-4">
          <p>Disclaimer content will be added here.</p>
        </div>
      </div>
    </main>
  )
}
