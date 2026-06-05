import type { Metadata } from 'next'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { getToolBySlug } from '@/lib/tools'
import { CropImageClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Crop Image Online — Toolify',
  description: 'Crop images to any size with precision controls. Free online image cropping tool with instant download.',
}

export default function CropImagePage() {
  const tool = getToolBySlug('crop-image')
  if (!tool) notFound()

  return (
    <ToolPageLayout tool={tool}>
      <CropImageClient />
    </ToolPageLayout>
  )
}
