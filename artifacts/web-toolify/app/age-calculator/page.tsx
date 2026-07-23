import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { AgeCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/age-calculator' },
  robots: { index: true, follow: true },
  title: { absolute: 'Age Calculator — Exact Age from Date of Birth | Toolify' },
  description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
  keywords: ['age calculator', 'calculate age from date of birth', 'exact age calculator', 'birthday calculator online'],
  openGraph: {
    title: 'Age Calculator — Exact Age from Date of Birth | Toolify',
    description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
    url: 'https://toolifypdf.online/age-calculator',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Age Calculator — Exact Age from Date of Birth | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Age Calculator — Exact Age from Date of Birth | Toolify',
    description: 'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function AgeCalculatorPage() {
  const tool = getToolBySlug('age-calculator')!
  return (
    <ToolPageServerLayout tool={tool}>
      <AgeCalculatorClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📋",
                    "title": "Fill official forms accurately",
                    "text": "Calculate exact age in years, months, and days for documents that require a precise figure."
              },
              {
                    "icon": "✅",
                    "title": "Check age eligibility",
                    "text": "Verify instantly whether someone meets an age requirement such as 18+ or 65+ for a service."
              },
              {
                    "icon": "🎂",
                    "title": "Find days until a date",
                    "text": "Calculate how many days remain until a birthday, anniversary, or any future event."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
