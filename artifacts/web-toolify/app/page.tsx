import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomeContent } from '@/components/home-content'

const CATEGORY_TITLES: Record<string, string> = {
  'PDF Tools':      'Free PDF Tools — Merge, Split, Compress & Convert',
  'Security Tools': 'PDF Security Tools — Protect, Unlock & Sign PDFs',
  'Converters':     'File Converters — Word, Excel, PowerPoint to PDF & More',
  'OCR Tools':      'OCR Tools — Extract Text from PDF & Images',
  'Image Tools':    'Free Image Tools — Compress, Resize, Crop & Convert',
  'Text Tools':     'Free Text Tools — Word Count, Case Converter & More',
  'Calculators':    'Free Online Calculators',
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'PDF Tools':      'Merge, split, compress, rotate, watermark and more — free PDF tools with no registration.',
  'Security Tools': 'Protect PDFs with passwords, unlock encrypted files, and add digital signatures — 100% free.',
  'Converters':     'Convert Word, Excel, PowerPoint, HTML and images to PDF or between formats — fast and free.',
  'OCR Tools':      'Extract text from scanned PDFs and images using AI-powered OCR technology.',
  'Image Tools':    'Compress, resize, crop, rotate, and convert images between formats — no upload limit.',
  'Text Tools':     'Count words, convert letter case, clean text and more — all free, no login needed.',
  'Calculators':    'Free online calculators for everyday tasks.',
}

type Props = {
  searchParams: Promise<{ category?: string; search?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category } = await searchParams
  const title = category && CATEGORY_TITLES[category]
    ? CATEGORY_TITLES[category]
    : 'Toolify — All Tools in One Place'
  const description = category && CATEGORY_DESCRIPTIONS[category]
    ? CATEGORY_DESCRIPTIONS[category]
    : 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.'

  return {
    title,
    description,
    alternates: {
      canonical: category
        ? `https://www.toolifypdf.online/?category=${encodeURIComponent(category)}`
        : 'https://www.toolifypdf.online',
    },
    robots: { index: true, follow: true },
  }
}

function HomePageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen animate-pulse">
      <div className="h-14 border-b border-border bg-white" />
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 w-full space-y-6">
        <div className="h-10 w-3/4 rounded-xl bg-muted mx-auto" />
        <div className="h-5 w-1/2 rounded bg-muted mx-auto" />
        <div className="h-12 w-full rounded-xl bg-muted mt-8" />
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 w-28 rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-16 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  )
}
