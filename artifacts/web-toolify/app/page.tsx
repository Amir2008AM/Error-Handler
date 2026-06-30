import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomeContent } from '@/components/home-content'
import { PartnerBadges } from '@/components/partner-badges'

export const metadata: Metadata = {
  title: { absolute: 'Toolify — Free PDF, Image & Document Tools Online' },
  description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
  alternates: { canonical: 'https://www.toolifypdf.online' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    url: 'https://www.toolifypdf.online',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Toolify — Free PDF, Image & Document Tools Online' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
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
        <HomeContent badgeSlot={<PartnerBadges />} />
      </Suspense>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href="https://buildvoyage.com/products/toolifypdf?ref=badge">
        <img src="https://buildvoyage.com/images/featured_badge.png" alt="Featured on BuildVoyage" width="250" />
      </a>
    </div>
  )
}
