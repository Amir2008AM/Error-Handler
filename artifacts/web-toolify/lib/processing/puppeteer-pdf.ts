/**
 * Puppeteer (headless Chromium 138) engine for HTML-to-PDF and URL-to-PDF.
 *
 * Key behaviours
 * ──────────────
 * • Always calls emulateMediaType('screen') so pages render in screen CSS,
 *   not print CSS, giving the same look as a real browser.
 * • Uses printBackground:true + preferCSSPageSize:true for faithful output.
 * • Waits for networkidle2 + all images decoded before generating the PDF.
 * • Full-page screenshot (no clip) for the preview endpoint.
 * • Never uses iframe — all rendering is server-side.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import { execSync } from 'node:child_process'

// ── Chromium path resolved once at startup ─────────────────────────────────

const CHROMIUM_PATH = (() => {
  try {
    return execSync('which chromium', { encoding: 'utf8', timeout: 5_000 }).trim()
  } catch {
    return '/usr/bin/chromium'
  }
})()

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-dbus',
  '--disable-software-rasterizer',
  '--hide-scrollbars',
]

// ── Public option types ────────────────────────────────────────────────────

export interface PuppeteerPdfOptions {
  pageSize?:     'a4' | 'letter' | 'legal'
  orientation?:  'portrait' | 'landscape'
  marginSize?:   'none' | 'small' | 'big'
  screenWidth?:  number
  oneLongPage?:  boolean
  blockAds?:     boolean
  removePopups?: boolean
}

// ── Internal helpers ───────────────────────────────────────────────────────

function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    args:           LAUNCH_ARGS,
    headless:       true,
    timeout:        30_000,
  })
}

function pdfFormat(pageSize?: string): 'A4' | 'Letter' | 'Legal' {
  if (pageSize === 'letter') return 'Letter'
  if (pageSize === 'legal')  return 'Legal'
  return 'A4'
}

function pdfMargin(marginSize?: string) {
  if (marginSize === 'none')  return { top: '0',    right: '0',    bottom: '0',    left: '0'    }
  if (marginSize === 'small') return { top: '8mm',  right: '8mm',  bottom: '8mm',  left: '8mm'  }
  if (marginSize === 'big')   return { top: '25mm', right: '25mm', bottom: '25mm', left: '25mm' }
  return                             { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
}

/** Wait for all <img> elements to finish decoding (best-effort, max 5 s). */
async function waitForImages(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load',  () => resolve())
            img.addEventListener('error', () => resolve())
            setTimeout(resolve, 5_000)
          })
        )
    )
  ).catch(() => { /* best-effort */ })
}

/** Remove fixed overlays: cookie banners, newsletter popups, GDPR modals. */
async function removeOverlays(page: Page) {
  await page.evaluate(() => {
    const patterns = [
      'modal', 'popup', 'overlay', 'cookie', 'consent', 'gdpr',
      'newsletter', 'lightbox', 'dialog',
    ]
    const all = Array.from(document.querySelectorAll('*'))
    all.forEach((el) => {
      const id  = (el.id  || '').toLowerCase()
      const cls = (el.className || '').toString().toLowerCase()
      if (patterns.some((p) => id.includes(p) || cls.includes(p))) {
        const s = window.getComputedStyle(el)
        if (s.position === 'fixed' || s.position === 'absolute') {
          ;(el as HTMLElement).style.display = 'none'
        }
      }
    })
    // restore scrollability
    document.body.style.overflow        = 'auto'
    document.documentElement.style.overflow = 'auto'
  })
}

/** Hide common ad selectors via injected CSS. */
async function hideAds(page: Page) {
  await page.addStyleTag({
    content: `
      ins.adsbygoogle,
      [class*="ad-"], [id*="ad-"],
      [class*="advert"], [id*="advert"],
      [class*="banner-ad"], .ad-container, .adunit,
      iframe[src*="doubleclick.net"],
      iframe[src*="googlesyndication"],
      iframe[src*="adnxs.com"],
      div[aria-label*="advertisement"] { display:none!important }
    `,
  })
}

/**
 * Apply all enhancement steps that are shared between HTML and URL modes.
 * Must be called AFTER the page has loaded.
 */
async function enhancePage(page: Page, options: PuppeteerPdfOptions) {
  // Render in screen CSS — avoids pages that collapse to a single narrow strip
  // when print media queries hide everything.
  await page.emulateMediaType('screen')

  if (options.blockAds)     await hideAds(page)
  if (options.removePopups) await removeOverlays(page)

  await waitForImages(page)
}

/** Build the page.pdf() call options, shared by both HTML and URL paths. */
async function buildPdfOptions(
  page:    Page,
  width:   number,
  options: PuppeteerPdfOptions
) {
  const margin = pdfMargin(options.marginSize)
  const base   = { printBackground: true, margin } as Parameters<Page['pdf']>[0]

  if (options.oneLongPage) {
    const scrollH = await page.evaluate(
      () => document.documentElement.scrollHeight
    )
    return { ...base, width: `${width}px`, height: `${Math.max(scrollH, 200)}px` }
  }

  return {
    ...base,
    format:             pdfFormat(options.pageSize),
    landscape:          options.orientation === 'landscape',
    preferCSSPageSize:  false,   // honour our explicit format override
  }
}

// ── HTML string → PDF ──────────────────────────────────────────────────────

export async function htmlToPdfPuppeteer(
  html:    string,
  options: PuppeteerPdfOptions = {}
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page  = await browser.newPage()
    const width = options.screenWidth ?? 1280

    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })

    await enhancePage(page, options)

    const pdfOpts = await buildPdfOptions(page, width, options)
    const pdfBuf  = await page.pdf(pdfOpts)
    return Buffer.from(pdfBuf)
  } finally {
    await browser.close()
  }
}

// ── Live URL → PDF ─────────────────────────────────────────────────────────

export async function urlToPdfPuppeteer(
  url:     string,
  options: PuppeteerPdfOptions = {}
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page  = await browser.newPage()
    const width = options.screenWidth ?? 1280

    // Set a realistic UA so sites don't block headless Chrome
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/138.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })

    await enhancePage(page, options)

    const pdfOpts = await buildPdfOptions(page, width, options)
    const pdfBuf  = await page.pdf(pdfOpts)
    return Buffer.from(pdfBuf)
  } finally {
    await browser.close()
  }
}

// ── Live URL → full-page screenshot (for preview UI) ──────────────────────

export async function screenshotUrl(
  url:           string,
  viewportWidth: number = 1280
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/138.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width: viewportWidth, height: 900, deviceScaleFactor: 1 })
    await page.emulateMediaType('screen')

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 })
    await waitForImages(page)

    // Full-page screenshot cropped to the viewport width, max 1200px tall so
    // the preview image isn't enormous.
    const fullH = await page.evaluate(
      () => Math.min(document.documentElement.scrollHeight, 1200)
    )

    const screenshot = await page.screenshot({
      type:    'jpeg',
      quality: 85,
      clip:    { x: 0, y: 0, width: viewportWidth, height: fullH },
    })
    return Buffer.from(screenshot)
  } finally {
    await browser.close()
  }
}
