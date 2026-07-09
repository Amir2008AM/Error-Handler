import type { Metadata } from 'next'
import Link from 'next/link'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { MergePdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/merge-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Merge PDF — Combine Multiple PDFs Online | Toolify' },
  description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
  keywords: ['merge pdf', 'combine pdf', 'join pdf files online', 'pdf merger free', 'merge pdf online'],
  openGraph: {
    title: 'Merge PDF — Combine Multiple PDFs Online | Toolify',
    description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
    url: 'https://www.toolifypdf.online/merge-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Merge PDF — Combine Multiple PDFs Online | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF — Combine Multiple PDFs Online | Toolify',
    description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <MergePdfClient />

      {/* Deep-dive guide — internal link to pillar article */}
      <Link
        href="/blog/merge-pdf-and-pdf-combine-files-for-free-online"
        className="group mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-red-200 hover:shadow-sm transition-all"
        aria-label="Read the ultimate guide to merging PDFs for free"
      >
        <span className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="2" width="11" height="14" rx="1.5" fill="#b91c1c" fillOpacity="0.15" stroke="#b91c1c" strokeWidth="1.2" />
            <path d="M6 6h6M6 9h6M6 12h4" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M13 11l4 4" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Ultimate Guide</span>
            <span className="text-xs text-muted-foreground">9 min read</span>
          </div>
          <p className="font-semibold text-foreground text-sm leading-snug group-hover:underline">
            Merge PDF and PDF: Combine Files for Free Online
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Compare the best free PDF merge tools, learn how to combine files securely, and understand what to watch for with file quality.
          </p>
        </div>
        <span className="text-muted-foreground group-hover:text-red-700 transition-colors text-lg leading-none mt-1" aria-hidden="true">→</span>
      </Link>
    </ToolPageServerLayout>
  )
}
