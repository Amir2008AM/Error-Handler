import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer, readFileHeader } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 300

const FONT_FAMILIES = new Set([
  'Helvetica',
  'HelveticaBold',
  'TimesRoman',
  'TimesRomanBold',
  'Courier',
  'CourierBold',
] as const)

function parseHexColor(value: string | undefined): { r: number; g: number; b: number } | undefined {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return undefined
  return {
    r: parseInt(value.slice(1, 3), 16) / 255,
    g: parseInt(value.slice(3, 5), 16) / 255,
    b: parseInt(value.slice(5, 7), 16) / 255,
  }
}

type WatermarkAnalyticsOptions = {
  tool: string
  fileSizeB?: number
  format?: string
  success: boolean
  durationMs: number
  errorMsg?: string
}

function trackWatermarkRequest(req: NextRequest, options: WatermarkAnalyticsOptions): void {
  // Analytics is optional for processing. Keep node:sqlite compatibility failures
  // from preventing the tool route from loading on older Node runtimes.
  void import('@/lib/route-analytics')
    .then(({ trackRouteRequest }) => trackRouteRequest(req, options))
    .catch(() => {})
}

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('watermark-pdf')
  if (guard) return guard

  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const text     = fields['text'] ?? ''
    const position = fields['position'] ?? 'diagonal'
    const imageFile = files.find((f) => f.fieldname === 'image')
    const type = fields['type'] ?? (imageFile ? 'image' : 'text')

    const rawOpacity  = parseFloat(fields['opacity']  ?? '0.3')
    const rawFontSize = parseInt(fields['fontSize']    ?? '50', 10)
    const rawRotation = parseFloat(fields['rotation'] ?? '0')
    const rawImageScale = parseFloat(fields['imageScale'] ?? '32')

    const opacity  = Math.min(1, Math.max(0.01, isNaN(rawOpacity)  ? 0.3  : rawOpacity))
    const fontSize = Math.min(200, Math.max(8,  isNaN(rawFontSize) ? 50   : rawFontSize))
    const rotation = Math.min(360, Math.max(-360, isNaN(rawRotation) ? 0 : rawRotation))
    const imageScale = Math.min(80, Math.max(10, isNaN(rawImageScale) ? 32 : rawImageScale))

    if (type === 'text' && !text.trim()) {
      return NextResponse.json({ error: 'Watermark text is required' }, { status: 400 })
    }
    if (type === 'image' && !imageFile) {
      return NextResponse.json({ error: 'Watermark image is required' }, { status: 400 })
    }

    if (imageFile) {
      const isSvg = imageFile.mimeType === 'image/svg+xml' || /\.svg$/i.test(imageFile.filename)
      if (isSvg) {
        const header = (await readFileHeader(imageFile.path, 512)).toString('utf8').replace(/^\uFEFF/, '').trimStart()
        if (!header.startsWith('<svg') && !header.startsWith('<?xml')) {
          return NextResponse.json({ error: 'Invalid SVG watermark image.' }, { status: 400 })
        }
      } else {
        const imageValidationError = await validateStreamedFile(imageFile, 'image', 10 * 1024 * 1024)
        if (imageValidationError) return NextResponse.json({ error: imageValidationError }, { status: 400 })
      }
    }

    const buffer = await readFileAsArrayBuffer(file.path)
    const image = imageFile ? await readFileAsArrayBuffer(imageFile.path) : undefined

    const fontFamily = FONT_FAMILIES.has(fields['fontFamily'] as never)
      ? fields['fontFamily'] as 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold' | 'Courier' | 'CourierBold'
      : undefined

    const result = await pdf.watermark({
      file: buffer,
      text: text.trim() || undefined,
      image,
      opacity,
      position: position as 'center' | 'diagonal' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
      fontSize,
      fontFamily,
      color: parseHexColor(fields['color']),
      backgroundColor: parseHexColor(fields['backgroundColor']),
      rotation,
      pageRange: fields['pageRange'] ?? 'all',
      imageScale,
    })

    if (!result.success || !result.data) {
      trackWatermarkRequest(req, { tool: 'watermark-pdf', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'watermark failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to add watermark' },
        { status: result.error?.toLowerCase().includes('page range') ? 400 : 500 }
      )
    }

    const originalName = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    trackWatermarkRequest(req, { tool: 'watermark-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}-watermarked.pdf"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[watermark-pdf]', err)
    trackWatermarkRequest(req, { tool: 'watermark-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to add watermark' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
