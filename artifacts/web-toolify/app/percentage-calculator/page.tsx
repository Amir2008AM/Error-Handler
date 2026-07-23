import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PercentageCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/percentage-calculator' },
  robots: { index: true, follow: true },
  title: { absolute: 'Percentage Calculator — Calculate % Online | Toolify' },
  description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
  keywords: ['percentage calculator', 'calculate percentage online', 'discount calculator', 'percent change calculator'],
  openGraph: {
    title: 'Percentage Calculator — Calculate % Online | Toolify',
    description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
    url: 'https://toolifypdf.online/percentage-calculator',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Percentage Calculator — Calculate % Online | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Percentage Calculator — Calculate % Online | Toolify',
    description: 'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator tool.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function PercentageCalculatorPage() {
  const tool = getToolBySlug('percentage-calculator')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PercentageCalculatorClient />
      <ToolInfoSection tips={[
              {
                    "icon": "🏷️",
                    "title": "Calculate discounts instantly",
                    "text": "Find the final price after a 20% or 30% sale discount without mental arithmetic."
              },
              {
                    "icon": "🎓",
                    "title": "Convert scores to percentages",
                    "text": "Turn a raw score such as 45 out of 60 into a percentage mark quickly."
              },
              {
                    "icon": "🍽️",
                    "title": "Work out tips",
                    "text": "Calculate a 15% or 20% tip on a restaurant bill in seconds."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
