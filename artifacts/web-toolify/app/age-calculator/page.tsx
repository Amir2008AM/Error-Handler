import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { AgeCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/age-calculator' },
  robots: { index: true, follow: true },
  title: { absolute: 'Age Calculator — Exact Age from Date of Birth | Toolify' },
  description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
  keywords: ['age calculator', 'calculate age from date of birth', 'exact age calculator', 'birthday calculator online'],
  openGraph: {
    title: 'Age Calculator — Exact Age from Date of Birth | Toolify',
    description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
    url: 'https://www.toolifypdf.online/age-calculator',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Age Calculator — Exact Age from Date of Birth | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Age Calculator — Exact Age from Date of Birth | Toolify',
    description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function AgeCalculatorPage() {
  const tool = getToolBySlug('age-calculator')!
  return (
    <ToolPageServerLayout tool={tool}>
      <AgeCalculatorClient />
    </ToolPageServerLayout>
  )
}
