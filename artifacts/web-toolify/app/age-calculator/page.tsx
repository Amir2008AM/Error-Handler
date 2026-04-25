import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { AgeCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Age Calculator — Calculate Exact Age from Date of Birth',
  description:
    'Calculate your exact age in years, months, and days from your date of birth. Free online age calculator, instant results.',
  keywords: ['age calculator', 'calculate age from date of birth', 'exact age calculator', 'birthday calculator online'],
}

export default function AgeCalculatorPage() {
  const tool = getToolBySlug('age-calculator')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <AgeCalculatorClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
