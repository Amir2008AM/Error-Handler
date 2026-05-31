import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | ToolifyPDF',
  description: 'Terms and Conditions for using ToolifyPDF services.',
}

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: June 2025</p>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground space-y-4">
          <p>Terms and conditions content will be added here.</p>
        </div>
      </div>
    </main>
  )
}
