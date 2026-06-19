import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { AdBanner } from '@/components/ad-banner'

export const metadata: Metadata = {
  title: { absolute: 'How to Convert Word to PDF Online for Free | ToolifyPDF Blog' },
  description:
    'Learn how to convert Word documents to PDF online for free. Follow this simple guide to preserve formatting, improve security, and share documents easily.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/blog/how-to-convert-word-to-pdf',
  },
  openGraph: {
    title: 'How to Convert Word to PDF Online for Free',
    description:
      'Learn how to convert Word documents to PDF online for free. Preserve formatting, improve security, and share documents easily.',
    type: 'article',
    publishedTime: '2026-06-01T00:00:00.000Z',
    url: 'https://www.toolifypdf.online/blog/how-to-convert-word-to-pdf',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Convert Word to PDF Online for Free',
    description:
      'Simple step-by-step guide to converting Word documents to PDF for free — no software required.',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Convert Word to PDF Online for Free',
  image: 'https://www.toolifypdf.online/og-image.jpg',
  description:
    'Learn how to convert Word documents to PDF online for free. Preserve formatting, improve security, and share documents easily.',
  datePublished: '2026-06-01T00:00:00.000Z',
  dateModified: '2026-06-01T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'Toolify', url: 'https://www.toolifypdf.online' },
  publisher: { '@type': 'Organization', name: 'Toolify', url: 'https://www.toolifypdf.online', logo: { '@type': 'ImageObject', url: 'https://www.toolifypdf.online/favicon.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.toolifypdf.online/blog/how-to-convert-word-to-pdf' },
  keywords: 'convert word to pdf, word to pdf online, docx to pdf free, word to pdf converter',
}

const ACCENT = '#0d9488'

/* ── Inline SVG illustrations ───────────────────────────────────────────── */

function IllustrationWordToPdf() {
  return (
    <svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Word file */}
      <rect x="30" y="30" width="140" height="170" rx="10" fill="#f0f4ff" stroke="#2b579a" strokeWidth="2" />
      <rect x="30" y="30" width="140" height="42" rx="10" fill="#2b579a" />
      <rect x="30" y="55" width="140" height="17" fill="#2b579a" />
      <text x="100" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">DOCX</text>
      <rect x="50" y="95" width="100" height="7" rx="3.5" fill="#b8c8e8" />
      <rect x="50" y="111" width="80" height="7" rx="3.5" fill="#b8c8e8" />
      <rect x="50" y="127" width="90" height="7" rx="3.5" fill="#b8c8e8" />
      <rect x="50" y="143" width="60" height="7" rx="3.5" fill="#b8c8e8" />
      <rect x="50" y="159" width="85" height="7" rx="3.5" fill="#b8c8e8" />
      {/* Arrow */}
      <g transform="translate(220,95)">
        <rect x="0" y="15" width="90" height="10" rx="5" fill={ACCENT} />
        <polygon points="90,0 120,20 90,40" fill={ACCENT} />
      </g>
      {/* PDF file */}
      <rect x="430" y="30" width="140" height="170" rx="10" fill="#fff5f2" stroke={ACCENT} strokeWidth="2" />
      <rect x="430" y="30" width="140" height="42" rx="10" fill={ACCENT} />
      <rect x="430" y="55" width="140" height="17" fill={ACCENT} />
      <text x="500" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="450" y="95" width="100" height="7" rx="3.5" fill="#fdbaa7" />
      <rect x="450" y="111" width="80" height="7" rx="3.5" fill="#fdbaa7" />
      <rect x="450" y="127" width="90" height="7" rx="3.5" fill="#fdbaa7" />
      <rect x="450" y="143" width="60" height="7" rx="3.5" fill="#fdbaa7" />
      <rect x="450" y="159" width="85" height="7" rx="3.5" fill="#fdbaa7" />
      <text x="300" y="215" textAnchor="middle" fill="#6b7280" fontSize="13" fontFamily="system-ui">Word document converts to shareable PDF</text>
    </svg>
  )
}

function IllustrationUploadSteps() {
  return (
    <svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      <rect x="40" y="10" width="520" height="220" rx="12" fill="#fff5f2" stroke="#fbd0c4" strokeWidth="2" />
      <rect x="40" y="10" width="520" height="36" rx="12" fill="#fde8e0" />
      <rect x="40" y="34" width="520" height="12" fill="#fde8e0" />
      <circle cx="66" cy="28" r="6" fill="#fc5c5c" />
      <circle cx="86" cy="28" r="6" fill="#fdbc40" />
      <circle cx="106" cy="28" r="6" fill="#34c759" />
      <rect x="130" y="19" width="300" height="18" rx="9" fill="white" stroke="#fbd0c4" strokeWidth="1.5" />
      <text x="280" y="32" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">toolifypdf.online/word-to-pdf</text>
      {/* Upload area */}
      <rect x="80" y="60" width="440" height="150" rx="10" fill="white" stroke={ACCENT} strokeWidth="2" strokeDasharray="8 4" />
      <circle cx="300" cy="108" r="26" fill="#fff0eb" />
      <polyline points="300,122 300,100" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
      <polyline points="288,110 300,98 312,110" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="300" y="152" textAnchor="middle" fill="#374151" fontSize="13" fontWeight="600" fontFamily="system-ui">Drop your Word file here or click to upload</text>
      <text x="300" y="170" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">DOC and DOCX supported · up to 50 MB</text>
      <rect x="230" y="183" width="140" height="32" rx="16" fill={ACCENT} />
      <text x="300" y="204" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="system-ui">Convert to PDF</text>
    </svg>
  )
}

function IllustrationDevices() {
  return (
    <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Desktop */}
      <g transform="translate(30,15)">
        <rect x="0" y="0" width="110" height="78" rx="6" fill="#f8faff" stroke="#3b6ef5" strokeWidth="2" />
        <rect x="0" y="0" width="110" height="52" rx="6" fill="#eff3ff" />
        <rect x="8" y="8" width="94" height="36" rx="4" fill="#dbe4ff" />
        <rect x="45" y="78" width="20" height="14" rx="2" fill="#dbe4ff" />
        <rect x="30" y="92" width="50" height="6" rx="3" fill="#dbe4ff" />
        <text x="55" y="123" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">Windows</text>
      </g>
      {/* Mac */}
      <g transform="translate(170,10)">
        <rect x="0" y="0" width="110" height="78" rx="6" fill="#f8faff" stroke="#374151" strokeWidth="2" />
        <rect x="0" y="0" width="110" height="52" rx="6" fill="#f3f4f6" />
        <rect x="8" y="8" width="94" height="36" rx="4" fill="#e5e7eb" />
        <ellipse cx="55" cy="85" rx="30" ry="5" fill="#e5e7eb" />
        <rect x="40" y="78" width="30" height="8" rx="2" fill="#d1d5db" />
        <text x="55" y="120" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">Mac</text>
      </g>
      {/* Android */}
      <g transform="translate(310,10)">
        <rect x="15" y="0" width="70" height="118" rx="12" fill="#f8faff" stroke="#34a853" strokeWidth="2" />
        <rect x="22" y="12" width="56" height="82" rx="4" fill="#e6f4ea" />
        <circle cx="50" cy="106" r="5" fill="#34a853" opacity="0.5" />
        <text x="50" y="145" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">Android</text>
      </g>
      {/* iPhone */}
      <g transform="translate(420,10)">
        <rect x="15" y="0" width="70" height="118" rx="14" fill="#f8faff" stroke="#374151" strokeWidth="2" />
        <rect x="22" y="14" width="56" height="82" rx="4" fill="#f3f4f6" />
        <rect x="38" y="6" width="24" height="5" rx="2.5" fill="#d1d5db" />
        <rect x="22" y="102" width="56" height="6" rx="3" fill="#e5e7eb" />
        <text x="50" y="145" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">iPhone</text>
      </g>
      <text x="300" y="190" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Works on any device — no software needed</text>
    </svg>
  )
}

function IllustrationSecurity() {
  return (
    <svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* HTTPS / Lock */}
      <g transform="translate(45,15)">
        <circle cx="60" cy="60" r="52" fill="#fff0eb" stroke={ACCENT} strokeWidth="2" />
        <rect x="35" y="58" width="50" height="38" rx="7" fill={ACCENT} opacity="0.9" />
        <path d="M42,58 V44 a18,18 0 0,1 36,0 V58" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="72" r="7" fill="white" />
        <rect x="56.5" y="76" width="7" height="10" rx="3.5" fill="white" />
        <text x="60" y="135" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">HTTPS</text>
      </g>
      {/* Shield */}
      <g transform="translate(215,15)">
        <circle cx="60" cy="60" r="52" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
        <path d="M60,28 L82,38 L82,60 C82,74 70,84 60,88 C50,84 38,74 38,60 L38,38 Z" fill="#16a34a" opacity="0.15" stroke="#16a34a" strokeWidth="2" />
        <polyline points="48,60 57,70 73,50" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="60" y="135" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">Protected</text>
      </g>
      {/* Timer / Auto-delete */}
      <g transform="translate(385,15)">
        <circle cx="60" cy="60" r="52" fill="#eff3ff" stroke="#3b6ef5" strokeWidth="2" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="#3b6ef5" strokeWidth="2.5" />
        <line x1="60" y1="60" x2="60" y2="38" stroke="#3b6ef5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="60" x2="77" y2="66" stroke="#3b6ef5" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="60" r="3" fill="#3b6ef5" />
        <text x="60" y="135" textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="system-ui">Auto-Delete 1h</text>
      </g>
      <text x="300" y="172" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Secure transfer · Privacy protected · No data retention</text>
    </svg>
  )
}

function IllustrationFaq() {
  return (
    <svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      <g transform="translate(30,20)">
        <rect x="0" y="0" width="90" height="110" rx="8" fill="#f0f4ff" stroke="#2b579a" strokeWidth="2" />
        <rect x="0" y="0" width="90" height="28" rx="8" fill="#2b579a" />
        <rect x="0" y="20" width="90" height="8" fill="#2b579a" />
        <text x="45" y="19" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">DOCX</text>
        <rect x="12" y="38" width="66" height="5" rx="2.5" fill="#b8c8e8" />
        <rect x="12" y="50" width="50" height="5" rx="2.5" fill="#b8c8e8" />
        <rect x="12" y="62" width="58" height="5" rx="2.5" fill="#b8c8e8" />
        <text x="45" y="128" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Word File</text>
      </g>
      <g transform="translate(160,20)">
        <rect x="0" y="0" width="90" height="110" rx="8" fill="#fff5f2" stroke={ACCENT} strokeWidth="2" />
        <rect x="0" y="0" width="90" height="28" rx="8" fill={ACCENT} />
        <rect x="0" y="20" width="90" height="8" fill={ACCENT} />
        <text x="45" y="19" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">PDF</text>
        <rect x="12" y="38" width="66" height="5" rx="2.5" fill="#fdbaa7" />
        <rect x="12" y="50" width="50" height="5" rx="2.5" fill="#fdbaa7" />
        <rect x="12" y="62" width="58" height="5" rx="2.5" fill="#fdbaa7" />
        <text x="45" y="128" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">PDF File</text>
      </g>
      <g transform="translate(295,30)">
        <ellipse cx="55" cy="50" rx="52" ry="36" fill="#eff3ff" stroke="#3b6ef5" strokeWidth="2" />
        <ellipse cx="30" cy="55" rx="25" ry="20" fill="#eff3ff" stroke="#3b6ef5" strokeWidth="2" />
        <ellipse cx="78" cy="57" rx="21" ry="17" fill="#eff3ff" stroke="#3b6ef5" strokeWidth="2" />
        <rect x="25" y="50" width="58" height="20" fill="#eff3ff" />
        <polyline points="55,70 55,46" stroke="#3b6ef5" strokeWidth="2.5" strokeLinecap="round" />
        <polyline points="44,57 55,45 66,57" stroke="#3b6ef5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="55" y="120" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Online</text>
      </g>
      <g transform="translate(460,25)">
        <rect x="15" y="40" width="66" height="56" rx="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
        <path d="M24,40 V30 a24,24 0 0,1 48,0 V40" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="48" cy="62" r="9" fill="#16a34a" />
        <rect x="44.5" y="67" width="7" height="11" rx="3.5" fill="#16a34a" />
        <text x="48" y="120" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Secure</text>
      </g>
      <text x="300" y="165" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Free · Fast · No Registration · Any Device</text>
    </svg>
  )
}

/* ── Shared prose helpers ───────────────────────────────────────────────── */

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span
            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: ACCENT }}
          >
            {i + 1}
          </span>
          <span className="text-muted-foreground leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start text-muted-foreground">
          <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-2">{q}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{a}</p>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ArticlePage() {
  return (
    <>
      <Script id="blog-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/BlogPosting">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" itemProp="item" className="hover:text-foreground transition-colors"><span itemProp="name">Home</span></Link>
                <meta itemProp="position" content="1" />
              </li>
              <li aria-hidden="true">›</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/blog" itemProp="item" className="hover:text-foreground transition-colors"><span itemProp="name">Blog</span></Link>
                <meta itemProp="position" content="2" />
              </li>
              <li aria-hidden="true">›</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span itemProp="name" className="text-foreground font-medium">How to Convert Word to PDF Online for Free</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: '#fff0eb', color: ACCENT }}
            >
              Word Guide
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Convert Word to PDF Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Learn how to convert Word documents to PDF online for free. Follow this simple guide to preserve formatting, improve security, and share documents easily.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-01" itemProp="datePublished">June 1, 2026</time>
              <span>·</span>
              <span>7 min read</span>
              <span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                <span itemProp="name">ToolifyPDF</span>
              </span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Converting a Word document to PDF is one of the easiest ways to share files while keeping their original formatting intact. Whether you&apos;re sending a resume, business proposal, report, or school assignment, PDF files ensure that your document looks the same on every device.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              In this guide, you&apos;ll learn how to convert Word to PDF online for free, the benefits of using PDF files, common issues you may encounter, and how to keep your documents secure throughout the process.
            </p>
          </section>

          {/* Feature table */}
          <div className="mb-12 overflow-x-auto">
            <table className="w-full border border-border rounded-xl overflow-hidden text-sm">
              <thead>
                <tr style={{ backgroundColor: ACCENT }}>
                  <th className="px-5 py-3 text-left text-white font-semibold">Feature</th>
                  <th className="px-5 py-3 text-left text-white font-semibold">ToolifyPDF</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Maximum File Size', '50 MB'],
                  ['Registration Required', 'No'],
                  ['Mobile Support', 'Yes'],
                  ['Secure Processing', 'Yes'],
                  ['Automatic File Deletion', 'After 1 Hour'],
                ].map(([feature, value], i) => (
                  <tr key={feature} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                    <td className="px-5 py-3 text-muted-foreground">{feature}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Illustration 1 */}
          <div className="hidden sm:block mb-12 p-6 bg-muted/40 rounded-2xl border border-border">
            <IllustrationWordToPdf />
          </div>

          {/* Why Convert */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Why Convert Word to PDF?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              PDF has become the standard format for sharing documents because it offers several advantages over Word files.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Preserve Formatting',
                  body: 'A PDF file maintains your document\'s layout, fonts, images, tables, and spacing exactly as intended. Recipients see the document exactly as you created it.',
                },
                {
                  title: 'Better Compatibility',
                  body: 'PDF files can be opened on virtually any device — Windows, Mac, Linux, Android, and iPhone — without requiring Microsoft Word.',
                },
                {
                  title: 'Improved Security',
                  body: 'PDF documents help protect important information from accidental editing and provide a professional way to share finalized documents.',
                },
                {
                  title: 'Easier Sharing',
                  body: 'PDF files are commonly used for resumes, contracts, invoices, and reports because they provide a consistent viewing experience.',
                },
              ].map(({ title, body }) => (
                <div key={title} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Step-by-step */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Convert Word to PDF Online (Step-by-Step)</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Converting a Word document to PDF online only takes a few moments.
            </p>
            <StepList steps={[
              'Open ToolifyPDF\'s Word to PDF converter in any web browser on desktop or mobile.',
              'Select your DOC or DOCX file from your device, or drag and drop it into the upload area.',
              'Click the conversion button and wait while the system processes your document.',
              'Once conversion is complete, download the newly created PDF file directly to your device.',
            ]} />
            <p className="text-muted-foreground text-sm mt-5">
              The entire process typically takes only a few seconds depending on file size and internet speed.
            </p>

            {/* Illustration 2 */}
            <div className="hidden sm:block mt-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationUploadSteps />
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Benefits of Using an Online Word to PDF Converter</h2>

            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Software Installation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Everything works directly from your browser. There&apos;s no need to install additional software or plugins.
                </p>
              </div>

              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-3">Works on Any Device</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">You can convert files from:</p>
                <BulletList items={['Windows PCs', 'Mac computers', 'Android phones', 'iPhones and iPads', 'Linux devices', 'Tablets']} />
              </div>

              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Supports Large Files</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ToolifyPDF supports files up to 50 MB, making it suitable for lengthy reports, presentations, and image-rich documents.
                </p>
              </div>

              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Registration Required</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can start converting files immediately without creating an account or providing personal information.
                </p>
              </div>
            </div>

            {/* Illustration 3 */}
            <div className="hidden sm:block mt-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationDevices />
            </div>
          </section>

          {/* Common Problems */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Common Problems and Solutions</h2>
            <div className="space-y-4">
              {[
                {
                  title: 'Formatting Looks Different',
                  body: 'Complex documents with custom fonts, advanced tables, or unusual layouts may display slight differences after conversion.',
                  solution: 'Use standard fonts and review the PDF before sharing.',
                },
                {
                  title: 'Large File Uploads',
                  body: 'Some converters restrict file sizes.',
                  solution: 'Use a converter that supports larger uploads such as ToolifyPDF\'s 50 MB limit.',
                },
                {
                  title: 'Password-Protected Files',
                  body: 'Protected Word documents may not convert properly.',
                  solution: 'Remove password protection before uploading the file.',
                },
                {
                  title: 'Slow Upload Speeds',
                  body: 'Large documents may take longer to upload depending on your internet connection.',
                  solution: 'Ensure you have a stable connection and avoid uploading unnecessary high-resolution content.',
                },
              ].map(({ title, body, solution }) => (
                <div key={title} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{body}</p>
                  <p className="text-sm font-medium" style={{ color: ACCENT }}>
                    Solution: <span className="font-normal text-muted-foreground">{solution}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Security and Privacy Considerations</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              When uploading documents online, security should always be a priority.
            </p>

            {/* Illustration 4 */}
            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationSecurity />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Secure File Processing', body: 'ToolifyPDF processes files through secure connections to help protect your data during upload and conversion.' },
                { title: 'Automatic File Deletion', body: 'All uploaded files are automatically deleted after 1 hour, reducing the risk of unauthorized access.' },
                { title: 'No Registration Required', body: 'Since no account is needed, you can convert files without sharing unnecessary personal information.' },
                { title: 'Use Trusted Services', body: 'Always choose reputable PDF tools with clear privacy policies and secure processing practices.' },
              ].map(({ title, body }) => (
                <div key={title} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>

            {/* Illustration 5 */}
            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationFaq />
            </div>

            <div className="space-y-4">
              <FaqItem
                q="Is it safe to convert Word files online?"
                a="Yes. Trusted conversion tools use secure file processing and automatically remove uploaded documents after a limited period. ToolifyPDF deletes files after 1 hour."
              />
              <FaqItem
                q="Will my formatting stay the same?"
                a="In most cases, yes. Fonts, images, tables, and layouts are usually preserved during conversion. Complex custom formatting may occasionally need minor corrections."
              />
              <FaqItem
                q="Do I need to install software?"
                a="No. Online converters work directly in your browser without downloads or installation."
              />
              <FaqItem
                q="Can I convert files on my phone?"
                a="Yes. ToolifyPDF works on both desktop and mobile devices including Android and iPhone."
              />
              <FaqItem
                q="What file types are supported?"
                a="Most Word to PDF converters support DOC and DOCX files, which are the most common Microsoft Word formats."
              />
            </div>
          </section>

          {/* Conclusion */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">Conclusion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Converting a Word document to PDF online is fast, convenient, and completely free with the right tool. Whether you&apos;re sharing a resume, report, contract, or presentation, PDF files help preserve formatting and ensure compatibility across all devices.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using a reliable online converter, you can quickly create professional PDF documents without installing software or creating an account.
            </p>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────────── */}
          <section aria-label="Call to action" className="mb-12">
            <div
              className="rounded-2xl p-8 md:p-12 text-center"
              style={{ background: `linear-gradient(135deg, #0f766e 0%, ${ACCENT} 60%, #5eead4 100%)` }}
            >
              <div className="text-white/70 text-3xl mb-3 animate-bounce" aria-hidden="true">↓</div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Ready to Convert Your Word File?
              </h2>
              <p className="text-teal-100 leading-relaxed mb-8 max-w-md mx-auto">
                Convert your Word document to PDF in seconds with ToolifyPDF.
              </p>

              <ul className="inline-flex flex-col items-start gap-2 mb-8 text-sm text-teal-100">
                {[
                  'Supports files up to 50 MB',
                  'No sign-up required',
                  'Mobile-friendly conversion',
                  'Secure file processing',
                  'Automatic file deletion after 1 hour',
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="text-green-300 font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <div>
                <Link
                  href="/word-to-pdf"
                  className="inline-block px-8 py-4 rounded-full font-bold text-base md:text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
                  style={{ backgroundColor: 'white', color: '#0f766e' }}
                >
                  Convert Word to PDF Now
                </Link>
              </div>
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-8" />

          {/* Back to blog */}
          <div className="text-center">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Blog
            </Link>
          </div>

        </article>
      </main>
    </>
  )
}
