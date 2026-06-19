/**
 * Puppeteer (headless Chrome) engine for HTML-to-PDF and URL-to-PDF.
 * Primary engine — renders exactly like a real browser.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import { execSync } from 'node:child_process'

// Resolve Chromium path once at module load
const CHROMIUM_PATH = (() => {
  try {
    return execSync('which chromium', { encoding: 'utf8', timeout: 5000 }).trim()
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
  '--font-render-hinting=none',
]

export interface PuppeteerPdfOptions {
  pageSize?:    'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
  marginSize?:  'none' | 'small' | 'big'
  screenWidth?: number
  oneLongPage?: boolean
  blockAds?:    boolean
  removePopups?: boolean
}

// ── helpers ────────────────────────────────────────────────────────────────

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    args: LAUNCH_ARGS,
    headless: true,
    timeout: 30_000,
  })
}

function getPageFormat(pageSize?: string): 'A4' | 'Letter' | 'Legal' {
  if (pageSize === 'letter') return 'Letter'
  if (pageSize === 'legal')  return 'Legal'
  return 'A4'
}

function getMargins(marginSize?: string) {
  if (marginSize === 'none')  return { top: '0', right: '0', bottom: '0', left: '0' }
  if (marginSize === 'small') return { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
  if (marginSize === 'big')   return { top: '25mm', right: '25mm', bottom: '25mm', left: '25mm' }
  return { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
}

async function applyAdBlock(page: Page) {
  await page.addStyleTag({
    content: `
      [class*="ad-"], [id*="ad-"], [class*="-ad"], [id*="-ad"],
      [class^="ads"], [id^="ads"], [class*="advert"], [id*="advert"],
      [class*="banner-ad"], ins.adsbygoogle, .ad-container, .adunit,
      iframe[src*="doubleclick.net"], iframe[src*="googlesyndication"],
      iframe[src*="adnxs.com"], div[aria-label*="advertisement"] {
        display: none !important;
      }
    `,
  })
}

async function applyPopupRemoval(page: Page) {
  await page.evaluate(() => {
    const selectors = [
      '[class*="modal"]', '[id*="modal"]',
      '[class*="popup"]', '[id*="popup"]',
      '[class*="overlay"]', '[id*="overlay"]',
      '[class*="cookie"]', '[id*="cookie"]',
      '[class*="consent"]', '[id*="consent"]',
      '[class*="gdpr"]', '[id*="gdpr"]',
      '[class*="newsletter"]',
    ]
    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      const s = window.getComputedStyle(el)
      if (s.position === 'fixed' || s.position === 'absolute') {
        ;(el as HTMLElement).style.display = 'none'
      }
    })
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
  })
}

// ── HTML content → PDF ─────────────────────────────────────────────────────

export async function htmlToPdfPuppeteer(
  html: string,
  options: PuppeteerPdfOptions = {}
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    const width = options.screenWidth ?? 1280
    await page.setViewport({ width, height: 900 })
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })

    if (options.blockAds)    await applyAdBlock(page)
    if (options.removePopups) await applyPopupRemoval(page)

    const margin = getMargins(options.marginSize)

    let pdfBuffer: Uint8Array
    if (options.oneLongPage) {
      const scrollH = await page.evaluate(() => document.documentElement.scrollHeight)
      pdfBuffer = await page.pdf({
        width:           `${width}px`,
        height:          `${scrollH}px`,
        printBackground: true,
        margin:          margin,
      })
    } else {
      pdfBuffer = await page.pdf({
        format:          getPageFormat(options.pageSize),
        landscape:       options.orientation === 'landscape',
        printBackground: true,
        margin:          margin,
      })
    }

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// ── URL → PDF ──────────────────────────────────────────────────────────────

export async function urlToPdfPuppeteer(
  url: string,
  options: PuppeteerPdfOptions = {}
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    const width = options.screenWidth ?? 1280
    await page.setViewport({ width, height: 900 })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })

    if (options.blockAds)    await applyAdBlock(page)
    if (options.removePopups) await applyPopupRemoval(page)

    const margin = getMargins(options.marginSize)

    let pdfBuffer: Uint8Array
    if (options.oneLongPage) {
      const scrollH = await page.evaluate(() => document.documentElement.scrollHeight)
      pdfBuffer = await page.pdf({
        width:           `${width}px`,
        height:          `${scrollH}px`,
        printBackground: true,
        margin:          margin,
      })
    } else {
      pdfBuffer = await page.pdf({
        format:          getPageFormat(options.pageSize),
        landscape:       options.orientation === 'landscape',
        printBackground: true,
        margin:          margin,
      })
    }

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// ── URL screenshot (for preview) ───────────────────────────────────────────

export async function screenshotUrl(url: string, viewportWidth = 1280): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: viewportWidth, height: 800 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 })

    const screenshot = await page.screenshot({
      type:     'jpeg',
      quality:  82,
      clip:     { x: 0, y: 0, width: viewportWidth, height: 800 },
    })
    return Buffer.from(screenshot)
  } finally {
    await browser.close()
  }
}
