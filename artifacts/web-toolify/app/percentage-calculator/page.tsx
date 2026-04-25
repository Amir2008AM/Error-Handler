import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { PercentageCalculatorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Percentage Calculator — Calculate % Online Free',
  description:
    'Calculate percentages, discounts, percentage increases, and decreases online for free. Easy and instant percentage calculator.',
  keywords: ['percentage calculator', 'calculate percentage online', 'discount calculator', 'percent change calculator'],
}

export default function PercentageCalculatorPage() {
  const tool = getToolBySlug('percentage-calculator')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <PercentageCalculatorClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
