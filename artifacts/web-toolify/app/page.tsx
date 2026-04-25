import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomeContent } from '@/components/home-content'

export const metadata: Metadata = {
  title: 'Toolify — All Tools in One Place',
  description:
    'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense>
        <HomeContent />
      </Suspense>
    </div>
  )
}
