import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomeContent } from '@/components/home-content'
import type { ToolCategory } from '@/lib/tools'

export const SLUG_TO_CATEGORY: Record<string, ToolCategory> = {
  'pdf-tools':      'PDF Tools',
  'security-tools': 'Security Tools',
  'converters':     'Converters',
  'image-tools':    'Image Tools',
  'text-tools':     'Text Tools',
  'calculators':    'Calculators',
}

export const CATEGORY_TO_SLUG: Record<string, string> = {
  'PDF Tools':      'pdf-tools',
  'Security Tools': 'security-tools',
  'Converters':     'converters',
  'Image Tools':    'image-tools',
  'Text Tools':     'text-tools',
  'Calculators':    'calculators',
}

const CATEGORY_TITLES: Record<string, string> = {
  'PDF Tools':      'Free PDF Tools — Merge, Split, Compress & Convert',
  'Security Tools': 'PDF Security Tools — Protect & Unlock PDFs',
  'Converters':     'File Converters — Word, Excel, PowerPoint to PDF & More',
  'Image Tools':    'Free Image Tools — Compress, Resize, Crop & Convert',
  'Text Tools':     'Free Text Tools — Word Count, Case Converter & More',
  'Calculators':    'Free Online Calculators — Age, Percentage & More',
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'PDF Tools':      'Merge, split, compress, rotate, watermark and more — free PDF tools with no registration.',
  'Security Tools': 'Protect PDFs with passwords and unlock encrypted files — 100% free, no registration.',
  'Converters':     'Convert Word, Excel, PowerPoint, HTML and images to PDF or between formats — fast and free.',
  'Image Tools':    'Compress, resize, crop, and convert images between formats — free, no account needed.',
  'Text Tools':     'Count words, convert letter case, clean text and more — all free, no login needed.',
  'Calculators':    'Free online calculators for everyday tasks — age, percentage, and more.',
}

const BASE_URL = 'https://toolifypdf.online'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = SLUG_TO_CATEGORY[slug]
  if (!category) return {}

  const title = CATEGORY_TITLES[category]
  const description = CATEGORY_DESCRIPTIONS[category]
  const url = `${BASE_URL}/category/${slug}`

  return {
    title: { absolute: `${title} | Toolify` },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: `${BASE_URL}/og-image.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/og-image.jpg`],
    },
  }
}

export function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map((slug) => ({ slug }))
}

function CategoryPageSkeleton() {
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
        {Array.from({ length: 10 }).map((_, i) => (
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

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = SLUG_TO_CATEGORY[slug]
  if (!category) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<CategoryPageSkeleton />}>
        <HomeContent initialCategory={category} />
      </Suspense>
    </div>
  )
}
