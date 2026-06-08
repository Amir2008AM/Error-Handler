import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions | Toolify',
  description:
    'Find precise answers about every tool on Toolify — file limits, compression levels, encryption, conversion accuracy, supported formats, and privacy. No fluff.',
  alternates: { canonical: 'https://www.toolifypdf.online/faq' },
  keywords: [
    'toolify faq', 'pdf tools faq', 'compress pdf questions', 'merge pdf help',
    'pdf to word questions', 'protect pdf faq', 'free pdf tools faq',
  ],
  openGraph: {
    title: 'FAQ — Frequently Asked Questions | Toolify',
    description: 'Precise answers about every Toolify tool — limits, formats, security, and accuracy.',
    url: 'https://www.toolifypdf.online/faq',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

type QA = { q: string; a: string; tool?: string; toolSlug?: string }

const SECTIONS: { id: string; label: string; icon: string; items: QA[] }[] = [
  {
    id: 'general',
    label: 'General Questions',
    icon: '💡',
    items: [
      {
        q: 'Is Toolify completely free to use?',
        a: 'Yes. Every tool on Toolify is 100% free — no subscription, no registration, and no hidden fees. You can use any tool as many times as you need without creating an account.',
      },
      {
        q: 'Do I need to install anything to use Toolify?',
        a: 'No. All tools run directly in your web browser. There is nothing to download or install. Toolify works on any modern browser on desktop, tablet, or mobile.',
      },
      {
        q: 'What is the maximum file size I can upload on Toolify?',
        a: 'The upload limit is 50 MB per file across all tools — PDF, image, Word, Excel, and PowerPoint files included. For very large PDFs, you can use the Split PDF tool first to reduce the file to a manageable size, then process each part.',
        tool: 'Split PDF',
        toolSlug: 'split-pdf',
      },
      {
        q: 'What happens to my files after processing?',
        a: 'Your files are automatically deleted from Toolify servers within 20 minutes of processing. We do not store, view, or share your files. All transfers are protected by HTTPS encryption.',
      },
      {
        q: 'Can I use Toolify on my phone or tablet?',
        a: 'Yes. Toolify is fully responsive and works on smartphones and tablets. The file picker, upload interface, and results work on iOS and Android browsers without any app installation.',
      },
      {
        q: 'How long does processing take?',
        a: 'Most operations — compressing, merging, splitting, rotating, protecting — complete within seconds. Conversion tools (PDF to Word, PPT to PDF, Excel to PDF) may take 5–20 seconds for longer documents as they use server-side processing.',
      },
      {
        q: 'Do I need to create an account to download my processed files?',
        a: 'No. After processing, your file is available to download immediately with no login required. The download link is displayed on the same page.',
      },
    ],
  },

  {
    id: 'compress-pdf',
    label: 'Compress PDF',
    icon: '⚡',
    items: [
      {
        q: 'What compression levels does the Compress PDF tool offer?',
        a: 'Toolify\'s Compress PDF tool offers three levels: Light (highest quality, smallest reduction), Medium (balanced quality and size), and Strong (smallest file size, may reduce image resolution). Choose Light for documents you will print, and Strong for email attachments or web uploads.',
        tool: 'Compress PDF',
        toolSlug: 'compress-pdf',
      },
      {
        q: 'How much smaller will my PDF be after compression?',
        a: 'Typical reduction is between 20% and 80% depending on the original content and the level you choose. PDFs that contain many high-resolution images see the most reduction. Text-only PDFs may see less than 20% reduction since they are already compact.',
        tool: 'Compress PDF',
        toolSlug: 'compress-pdf',
      },
      {
        q: 'Does compression affect the text in my PDF?',
        a: 'No. Text content is never degraded by compression — only image resolution may be slightly reduced at the Strong level. All text remains fully readable and searchable after compression.',
        tool: 'Compress PDF',
        toolSlug: 'compress-pdf',
      },
      {
        q: 'Can I compress a scanned PDF on Toolify?',
        a: 'Yes. Scanned PDFs consist entirely of images, so they typically see the highest compression ratios — often 50–80% reduction. Use the Strong level for maximum size reduction on scanned documents.',
        tool: 'Compress PDF',
        toolSlug: 'compress-pdf',
      },
      {
        q: 'Why is my PDF barely reduced after compression?',
        a: 'This usually means the PDF is already well-optimised, or is mostly text with very few images. Some PDFs created by modern software are already close to their theoretical minimum size. In this case, the Strong level will produce the most noticeable reduction.',
        tool: 'Compress PDF',
        toolSlug: 'compress-pdf',
      },
    ],
  },

  {
    id: 'merge-split',
    label: 'Merge & Split PDF',
    icon: '🔀',
    items: [
      {
        q: 'How many PDF files can I merge at once on Toolify?',
        a: 'There is no set limit on the number of files. Upload as many PDFs as you need, drag them to set the order, and click Merge. Each individual file must be under 50 MB.',
        tool: 'Merge PDF',
        toolSlug: 'merge-pdf',
      },
      {
        q: 'Can I reorder files before merging?',
        a: 'Yes. After uploading your PDFs, you can drag and drop them to arrange the order before merging. The final PDF will follow the sequence you set.',
        tool: 'Merge PDF',
        toolSlug: 'merge-pdf',
      },
      {
        q: 'Can I merge password-protected PDFs?',
        a: 'Password-protected PDFs must be unlocked first. Use the Unlock PDF tool to remove the password, then merge the unlocked files.',
        tool: 'Unlock PDF',
        toolSlug: 'unlock-pdf',
      },
      {
        q: 'How do I extract specific pages from a PDF using Toolify?',
        a: 'Use the Split PDF tool. Upload your PDF and specify the page ranges you want to extract — for example, pages 1–5 or pages 10–15. Each range is saved as a separate PDF file.',
        tool: 'Split PDF',
        toolSlug: 'split-pdf',
      },
      {
        q: 'Can I split every page into a separate file?',
        a: 'Yes. The Split PDF tool has a "split every page" option that creates one PDF per page. All files are packaged into a single ZIP archive for convenient downloading.',
        tool: 'Split PDF',
        toolSlug: 'split-pdf',
      },
      {
        q: 'How do I extract just one page from a PDF?',
        a: 'In the Split PDF tool, enter the same page number for both the start and end of a range — for example, entering "3" to "3" extracts only page 3 as a standalone PDF.',
        tool: 'Split PDF',
        toolSlug: 'split-pdf',
      },
    ],
  },

  {
    id: 'security',
    label: 'PDF Security — Protect & Unlock',
    icon: '🔒',
    items: [
      {
        q: 'What encryption does the Protect PDF tool use?',
        a: 'Toolify\'s Protect PDF tool encrypts your file using AES-128 or AES-256 encryption depending on your settings. AES-256 is the same encryption standard used in banking and government applications and is considered unbreakable with current technology when a strong password is used.',
        tool: 'Protect PDF',
        toolSlug: 'protect-pdf',
      },
      {
        q: 'Can I set separate passwords for opening and for editing/printing?',
        a: 'Yes. The Protect PDF tool lets you set an Open Password (required to view the file) and a separate Owner Password that controls permissions — restricting printing, copying text, or editing independently.',
        tool: 'Protect PDF',
        toolSlug: 'protect-pdf',
      },
      {
        q: 'What if I forget the password after protecting a PDF with Toolify?',
        a: 'There is no recovery option. If the password is lost, the file cannot be unlocked. Always store your password in a secure location before protecting the file.',
        tool: 'Protect PDF',
        toolSlug: 'protect-pdf',
      },
      {
        q: 'Does adding a password change the visual content of my PDF?',
        a: 'No. Password protection only adds an encryption layer to the file. The text, images, layout, and quality of your PDF remain completely unchanged.',
        tool: 'Protect PDF',
        toolSlug: 'protect-pdf',
      },
      {
        q: 'Can I unlock a PDF without knowing the password?',
        a: 'No. You must enter the correct password to unlock a PDF. The Unlock PDF tool is intended for files you own or have been authorised to access — not for bypassing security on files you do not own.',
        tool: 'Unlock PDF',
        toolSlug: 'unlock-pdf',
      },
      {
        q: 'What happens if I enter the wrong password in the Unlock PDF tool?',
        a: 'The tool will immediately show an error message indicating the password is incorrect. No changes are made to your file. Double-check the password and try again.',
        tool: 'Unlock PDF',
        toolSlug: 'unlock-pdf',
      },
      {
        q: 'Does unlocking a PDF on Toolify remove printing and copying restrictions too?',
        a: 'Yes. The Unlock PDF tool removes both the open password and any permission restrictions such as printing, copying text, and editing. The output PDF opens freely in any PDF viewer.',
        tool: 'Unlock PDF',
        toolSlug: 'unlock-pdf',
      },
    ],
  },

  {
    id: 'edit',
    label: 'Edit, Organize & Watermark',
    icon: '✏️',
    items: [
      {
        q: 'Does the Rotate PDF tool rotate all pages or can I choose specific pages?',
        a: 'The Rotate PDF tool applies the selected angle — 90°, 180°, or 270° clockwise — to all pages in the document at once. If you need to rotate only specific pages, use the Organize PDF tool which gives you per-page control.',
        tool: 'Organize PDF',
        toolSlug: 'organize-pdf',
      },
      {
        q: 'Can I delete, reorder, and duplicate pages in the same operation?',
        a: 'Yes. The Organize PDF tool shows thumbnail previews of all pages. You can drag to reorder, click to delete, and duplicate any page — all before committing. Changes are only applied when you click Save.',
        tool: 'Organize PDF',
        toolSlug: 'organize-pdf',
      },
      {
        q: 'What watermark options does Toolify support?',
        a: 'The Watermark PDF tool supports custom text watermarks. You can set the text content (e.g. CONFIDENTIAL, your company name), adjust font size, opacity, and position (center, diagonal, corner). The watermark is permanently embedded on every page. Image watermarks are not yet supported.',
        tool: 'Watermark PDF',
        toolSlug: 'watermark-pdf',
      },
      {
        q: 'Can I start page numbering from a specific number — for example to skip the cover page?',
        a: 'Yes. The Add Page Numbers tool lets you set any starting number. To skip a cover page, start numbering from page 2 with starting number 1, so the first numbered page shows "1" and the cover page has no number.',
        tool: 'Add Page Numbers',
        toolSlug: 'page-numbers',
      },
      {
        q: 'Can the Repair PDF tool fix any corrupted file?',
        a: 'Not always. The tool rebuilds the internal PDF structure and recovers what is readable. Severely corrupted files — for example those truncated mid-download or damaged by storage failure — may only be partially recovered or not at all. Minor formatting differences may appear in the repaired output.',
        tool: 'Repair PDF',
        toolSlug: 'repair-pdf',
      },
    ],
  },

  {
    id: 'convert-pdf',
    label: 'PDF Conversion',
    icon: '🔄',
    items: [
      {
        q: 'Will the formatting be perfectly preserved when converting PDF to Word?',
        a: 'Most standard formatting — paragraphs, headings, tables, and embedded images — is preserved in the .docx output. Complex layouts such as multi-column designs, custom fonts, or intricate table structures may differ slightly because PDF and Word use fundamentally different layout engines. The output is intended to be editable, not a pixel-perfect replica.',
        tool: 'PDF to Word',
        toolSlug: 'pdf-to-word',
      },
      {
        q: 'Can I convert a scanned PDF to Word?',
        a: 'Yes. The PDF to Word tool uses OCR to extract text from scanned pages. Accuracy depends on scan quality — images scanned at 150 DPI or above give the best results. Handwritten content has lower accuracy than printed text.',
        tool: 'PDF to Word',
        toolSlug: 'pdf-to-word',
      },
      {
        q: 'Does Word to PDF support both .doc and .docx formats?',
        a: 'Yes. Both the older .doc format and the modern .docx format are fully supported. All fonts, images, tables, and formatting are preserved in the PDF output.',
        tool: 'Word to PDF',
        toolSlug: 'word-to-pdf',
      },
      {
        q: 'Does Word to PDF include tracked changes in the output?',
        a: 'Yes, but tracked changes appear in their final accepted or rejected state — the PDF shows the document as it looks, not the revision markup itself.',
        tool: 'Word to PDF',
        toolSlug: 'word-to-pdf',
      },
      {
        q: 'Are all worksheets included when I convert an Excel file to PDF?',
        a: 'Yes. Every worksheet in the workbook is converted and included as pages in the PDF. Charts and graphs embedded in the spreadsheet are also rendered in the output.',
        tool: 'Excel to PDF',
        toolSlug: 'excel-to-pdf',
      },
      {
        q: 'Does PPT to PDF preserve slide animations?',
        a: 'No. PDF is a static format — animations, transitions, and slide effects are not preserved. Each slide is exported in its final resting state as a single PDF page. Speaker notes are also not included in the output.',
        tool: 'PowerPoint to PDF',
        toolSlug: 'ppt-to-pdf',
      },
      {
        q: 'Can I convert a scanned PDF to PowerPoint using PDF to PPT?',
        a: 'Yes, but scanned PDFs are converted as image slides — the page image is placed on each slide without extractable text. For selectable text in the slides, the PDF must contain machine-readable (non-scanned) text.',
        tool: 'PDF to PPT',
        toolSlug: 'pdf-to-ppt',
      },
      {
        q: 'What DPI resolution are the JPG images when converting PDF to JPG?',
        a: 'You can choose between 150 DPI (good quality, smaller file) and 300 DPI (high quality, suitable for print). Every page in the PDF is converted to a separate JPG. You can download pages individually or download all as a ZIP archive.',
        tool: 'PDF to JPG',
        toolSlug: 'pdf-to-jpg',
      },
      {
        q: 'Which image formats can I use to create a PDF with Image to PDF?',
        a: 'JPG, PNG, WebP, BMP, GIF, and TIFF are all supported. Upload multiple images and each one becomes a separate page in the PDF. Drag to arrange the page order before converting.',
        tool: 'Image to PDF',
        toolSlug: 'image-to-pdf',
      },
      {
        q: 'Can I convert a live website URL to PDF using HTML to PDF?',
        a: 'Yes. Enter any publicly accessible URL and the HTML to PDF tool will render the page and generate a PDF. Basic JavaScript is executed during rendering. The default output page size is A4.',
        tool: 'HTML to PDF',
        toolSlug: 'html-to-pdf',
      },
      {
        q: 'Is the PDF to Excel tool suitable for all PDFs or only those with tables?',
        a: 'The tool is specifically designed for PDFs containing structured data — tables with rows and columns. It works best on reports, invoices, and data sheets. PDFs that are mainly text or scanned images will produce less structured results since there is no machine-readable table structure to detect.',
        tool: 'PDF to Excel',
        toolSlug: 'pdf-to-excel',
      },
    ],
  },

  {
    id: 'image',
    label: 'Image Tools',
    icon: '🖼️',
    items: [
      {
        q: 'How does Toolify\'s Compress Image tool decide the output quality?',
        a: 'The tool uses a smart binary-search algorithm that automatically finds the highest quality setting that still produces a file smaller than the original. This guarantees the output is always smaller while preserving maximum visual quality. The quality floor is set at 35% to prevent unusable results.',
        tool: 'Compress Image',
        toolSlug: 'compress-image',
      },
      {
        q: 'What image formats does Compress Image support?',
        a: 'JPG, PNG, WebP, and AVIF are supported for both input and output. Converting to WebP or AVIF typically produces the smallest file sizes while retaining excellent visual quality.',
        tool: 'Compress Image',
        toolSlug: 'compress-image',
      },
      {
        q: 'Does Resize Image distort the image if I only enter the width?',
        a: 'No. Aspect ratio lock is enabled by default — if you enter only one dimension, the other is calculated automatically to maintain the original proportions. You can disable aspect ratio lock to set both dimensions independently.',
        tool: 'Resize Image',
        toolSlug: 'resize-image',
      },
      {
        q: 'What happens to the transparent background when I convert a PNG to JPG?',
        a: 'JPG does not support transparency. When converting a PNG with a transparent background to JPG, the transparent areas are filled with a white background. If you need to preserve transparency, export to PNG or WebP instead.',
        tool: 'Convert Image',
        toolSlug: 'convert-image',
      },
      {
        q: 'Can I crop to a specific aspect ratio such as 1:1 or 16:9?',
        a: 'Yes. The Crop Image tool includes preset aspect ratio options including 1:1 (square), 4:3, and 16:9. You can also set custom dimensions. The selection can be adjusted freely before clicking Crop to apply.',
        tool: 'Crop Image',
        toolSlug: 'crop-image',
      },
    ],
  },

  {
    id: 'ocr-text',
    label: 'OCR & Text Tools',
    icon: '🔍',
    items: [
      {
        q: 'Which languages does Toolify\'s OCR tool recognise?',
        a: 'The Image to Text tool supports many languages including Arabic, English, French, Spanish, German, Chinese, Japanese, and more. Select the language that matches your document in the language selector before processing for the best accuracy.',
        tool: 'Image to Text (OCR)',
        toolSlug: 'ocr-image',
      },
      {
        q: 'What image quality gives the best OCR results?',
        a: 'Images scanned or photographed at 150 DPI or higher give the most accurate results. Blurry, low-light, or heavily skewed images reduce accuracy. Printed text is recognised reliably; handwritten text accuracy varies depending on legibility.',
        tool: 'Image to Text (OCR)',
        toolSlug: 'ocr-image',
      },
      {
        q: 'What does the Word Counter tool measure beyond word count?',
        a: 'In addition to word count, the tool shows character count (with and without spaces), sentence count, paragraph count, and an estimated reading time. All counts update in real time as you type or paste text — no button press required.',
        tool: 'Word Counter',
        toolSlug: 'word-counter',
      },
      {
        q: 'How is reading time estimated in the Word Counter?',
        a: 'Reading time is calculated based on an average reading speed of 200–250 words per minute, which is the widely accepted standard for adult readers.',
        tool: 'Word Counter',
        toolSlug: 'word-counter',
      },
      {
        q: 'What case conversion options are available in the Text Case Converter?',
        a: 'The tool supports five case styles: UPPERCASE, lowercase, Title Case (capitalises every word), Sentence case (capitalises only the first word), and camelCase. The conversion is instant and results can be copied to the clipboard with one click. Numbers and symbols are never affected.',
        tool: 'Text Case Converter',
        toolSlug: 'text-case',
      },
      {
        q: 'Can I use the Percentage Calculator for tax or discount calculations?',
        a: 'Yes. The tool supports multiple calculation modes: percentage of a number (e.g. 20% of 350), what percentage one number is of another, and percentage increase or decrease. It is suitable for VAT, discounts, tips, and any other percentage-based calculation. Results are displayed to two decimal places.',
        tool: 'Percentage Calculator',
        toolSlug: 'percentage-calculator',
      },
      {
        q: 'Does the Age Calculator account for leap years?',
        a: 'Yes. The calculation is fully accurate including leap years. The result shows a precise breakdown of years, months, and remaining days — not just the number of years. You can also set any target date (past or future) to calculate age at that specific point in time, and the tool shows the number of days until the next birthday.',
        tool: 'Age Calculator',
        toolSlug: 'age-calculator',
      },
    ],
  },
]

function buildFaqSchema() {
  const allItems: QA[] = SECTIONS.flatMap((s) => s.items)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

function SectionBlock({ section }: { section: (typeof SECTIONS)[number] }) {
  return (
    <section id={section.id} className="scroll-mt-8">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 pb-2 border-b border-border">
        <span className="text-xl">{section.icon}</span>
        {section.label}
      </h2>
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <details key={i} className="group border border-border rounded-xl overflow-hidden bg-white">
            <summary className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none hover:bg-muted/30 transition-colors">
              <h3 className="font-semibold text-foreground text-sm leading-snug pr-2">{item.q}</h3>
              <svg
                className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-open:rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-border bg-muted/10">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              {item.tool && item.toolSlug && (
                <Link
                  href={`/${item.toolSlug}`}
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Open {item.tool} →
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export default function FaqPage() {
  const totalQuestions = SECTIONS.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema()) }}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
            <span className="text-foreground font-medium">FAQ</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-50 to-background border-b border-border py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-4">
            {totalQuestions} questions — all specific to Toolify
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Precise answers about every tool on Toolify — real limits, real formats, and honest
            notes about what each tool can and cannot do.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="lg:w-52 shrink-0">
            <div className="sticky top-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                Jump to
              </p>
              <nav className="flex flex-col gap-0.5">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>{s.icon}</span>
                    <span className="leading-snug">{s.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground/50 shrink-0">{s.items.length}</span>
                  </a>
                ))}
              </nav>

              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-semibold text-foreground mb-1">Need a tool?</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Browse all 25+ free PDF and image tools.
                </p>
                <Link
                  href="/"
                  className="block text-center text-xs font-semibold text-white bg-primary rounded-lg py-2 px-3 hover:bg-primary/90 transition-colors"
                >
                  All Tools →
                </Link>
              </div>
            </div>
          </aside>

          {/* Main FAQ content */}
          <div className="flex-1 space-y-10 min-w-0">
            {SECTIONS.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}

            {/* Bottom CTA */}
            <section className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-white text-center">
              <h2 className="text-xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-white/80 text-sm mb-5 max-w-md mx-auto">
                Over 25 free tools — compress, merge, split, convert, protect PDF files and more.
                No account needed. Works on any device.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-white text-primary font-semibold text-sm rounded-xl px-6 py-2.5 hover:bg-white/90 transition-colors"
              >
                Browse All Free Tools →
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
