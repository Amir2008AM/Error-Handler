import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookies Policy | ToolifyPDF',
  description: 'Cookies Policy for ToolifyPDF - Learn how we use cookies on our platform.',
}

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Cookies Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: June 2025</p>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground space-y-4">
          <p>Cookies policy content will be added here.</p>
        </div>
      </div>
    </main>
  )
}
