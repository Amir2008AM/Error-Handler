import type { Metadata } from 'next'
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
    <ToolPageLayout tool={tool}>
      <PercentageCalculatorClient />
    </ToolPageLayout>
  )
}
