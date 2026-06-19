import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PercentageCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/percentage-calculator' },
  robots: { index: true, follow: true },
  title: { absolute: 'Percentage Calculator — Calculate % Online | Toolify' },
  description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
  keywords: ['percentage calculator', 'calculate percentage online', 'discount calculator', 'percent change calculator'],
  openGraph: {
    title: 'Percentage Calculator — Calculate % Online | Toolify',
    description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
    url: 'https://www.toolifypdf.online/percentage-calculator',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Percentage Calculator — Calculate % Online | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Percentage Calculator — Calculate % Online | Toolify',
    description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function PercentageCalculatorPage() {
  const tool = getToolBySlug('percentage-calculator')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PercentageCalculatorClient />
    </ToolPageServerLayout>
  )
}
