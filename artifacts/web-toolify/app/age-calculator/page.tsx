import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { AgeCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/age-calculator' },
  robots: { index: true, follow: true },
  title: 'Age Calculator — Calculate Exact Age from Date of Birth',
  description:
    'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
  keywords: ['age calculator', 'calculate age from date of birth', 'exact age calculator', 'birthday calculator online'],
}

export default function AgeCalculatorPage() {
  const tool = getToolBySlug('age-calculator')!
  return (
    <ToolPageServerLayout tool={tool}>
      <AgeCalculatorClient />
    </ToolPageServerLayout>
  )
}
