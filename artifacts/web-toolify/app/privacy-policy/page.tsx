import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | ToolifyPDF',
  description: 'Privacy Policy for ToolifyPDF - Learn how we collect, use, and protect your information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: June 2025</p>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground space-y-4">
          <p>Privacy policy content will be added here.</p>
        </div>
      </div>
    </main>
  )
}
