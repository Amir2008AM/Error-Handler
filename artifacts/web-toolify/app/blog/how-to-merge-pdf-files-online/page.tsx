import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { AdBanner } from '@/components/ad-banner'
import { ReadingProgress } from '@/components/reading-progress'
import { RelatedArticles } from '@/components/related-articles'

export const metadata: Metadata = {
  title: 'How to Merge PDF Files Online for Free | Toolify Blog',
  description:
    'Learn how to merge PDF files online for free. Combine multiple PDF documents into one organized file quickly, securely, and without installing software.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/blog/how-to-merge-pdf-files-online',
  },
  openGraph: {
    title: 'How to Merge PDF Files Online for Free',
    description:
      'Learn how to merge PDF files online for free. Combine multiple PDF documents into one organized file quickly, securely, and without installing software.',
    type: 'article',
    publishedTime: '2026-06-05T00:00:00.000Z',
    url: 'https://www.toolifypdf.online/blog/how-to-merge-pdf-files-online',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Merge PDF Files Online for Free',
    description:
      'Learn how to merge PDF files online for free. Combine multiple PDFs into one — fast, secure, no sign-up required.',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Merge PDF Files Online for Free',
  image: 'https://www.toolifypdf.online/og-image.jpg',
  description:
    'Learn how to merge PDF files online for free. Combine multiple PDF documents into one organized file quickly, securely, and without installing software.',
  datePublished: '2026-06-05T00:00:00.000Z',
  dateModified: '2026-06-05T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'ToolifyPDF Team', url: 'https://www.toolifypdf.online/author/toolifypdf-team' },
  publisher: { '@type': 'Organization', name: 'ToolifyPDF', url: 'https://www.toolifypdf.online', logo: { '@type': 'ImageObject', url: 'https://www.toolifypdf.online/favicon.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.toolifypdf.online/blog/how-to-merge-pdf-files-online' },
  articleSection: 'PDF Guide',
  keywords: 'merge pdf, combine pdf files, pdf merger online, merge pdf free, join pdf files online',
}

/* ── Inline SVG illustrations ───────────────────────────────────────────── */

function IllustrationMerge() {
  return (
    <svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* PDF 1 */}
      <rect x="20" y="35" width="100" height="130" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
      <rect x="20" y="35" width="100" height="30" rx="8" fill="#2563eb" />
      <rect x="20" y="52" width="100" height="13" fill="#2563eb" />
      <text x="70" y="60" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="34" y="80" width="72" height="6" rx="3" fill="#bfdbfe" />
      <rect x="34" y="94" width="55" height="6" rx="3" fill="#bfdbfe" />
      <rect x="34" y="108" width="64" height="6" rx="3" fill="#bfdbfe" />
      <rect x="34" y="122" width="44" height="6" rx="3" fill="#bfdbfe" />
      <rect x="34" y="136" width="58" height="6" rx="3" fill="#bfdbfe" />
      <text x="70" y="185" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">Doc 1</text>

      {/* PDF 2 */}
      <rect x="135" y="55" width="100" height="130" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
      <rect x="135" y="55" width="100" height="30" rx="8" fill="#2563eb" />
      <rect x="135" y="72" width="100" height="13" fill="#2563eb" />
      <text x="185" y="80" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="149" y="100" width="72" height="6" rx="3" fill="#bfdbfe" />
      <rect x="149" y="114" width="55" height="6" rx="3" fill="#bfdbfe" />
      <rect x="149" y="128" width="64" height="6" rx="3" fill="#bfdbfe" />
      <rect x="149" y="142" width="44" height="6" rx="3" fill="#bfdbfe" />
      <rect x="149" y="156" width="58" height="6" rx="3" fill="#bfdbfe" />
      <text x="185" y="205" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">Doc 2</text>

      {/* Merge arrow */}
      <g transform="translate(252,88)">
        <rect x="0" y="14" width="60" height="10" rx="5" fill="#2563eb" />
        <polygon points="60,0 92,19 60,38" fill="#2563eb" />
        <text x="44" y="10" textAnchor="middle" fill="#2563eb" fontSize="11" fontWeight="600" fontFamily="system-ui">Merge</text>
      </g>

      {/* Merged result PDF */}
      <rect x="364" y="28" width="120" height="160" rx="10" fill="#eff6ff" stroke="#2563eb" strokeWidth="2.5" />
      <rect x="364" y="28" width="120" height="36" rx="10" fill="#2563eb" />
      <rect x="364" y="50" width="120" height="14" fill="#2563eb" />
      <text x="424" y="62" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="380" y="80" width="88" height="6" rx="3" fill="#bfdbfe" />
      <rect x="380" y="94" width="68" height="6" rx="3" fill="#bfdbfe" />
      <rect x="380" y="108" width="78" height="6" rx="3" fill="#bfdbfe" />
      <line x1="380" y1="122" x2="468" y2="122" stroke="#dbeafe" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="380" y="132" width="88" height="6" rx="3" fill="#bfdbfe" />
      <rect x="380" y="146" width="68" height="6" rx="3" fill="#bfdbfe" />
      <rect x="380" y="160" width="78" height="6" rx="3" fill="#bfdbfe" />
      <text x="424" y="210" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">Combined</text>

      {/* Badge */}
      <rect x="494" y="42" width="82" height="34" rx="17" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
      <text x="535" y="56" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="700" fontFamily="system-ui">1 File</text>
      <text x="535" y="70" textAnchor="middle" fill="#16a34a" fontSize="9" fontFamily="system-ui">Organized</text>
    </svg>
  )
}

function IllustrationUploadMerge() {
  return (
    <svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Browser chrome */}
      <rect x="40" y="10" width="520" height="220" rx="12" fill="#f8faff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="40" y="10" width="520" height="36" rx="12" fill="#eff6ff" />
      <rect x="40" y="34" width="520" height="12" fill="#eff6ff" />
      <circle cx="66" cy="28" r="6" fill="#fc5c5c" />
      <circle cx="86" cy="28" r="6" fill="#fdbc40" />
      <circle cx="106" cy="28" r="6" fill="#34c759" />
      <rect x="130" y="19" width="300" height="18" rx="9" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <text x="280" y="32" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">toolifypdf.online/merge-pdf</text>
      {/* Upload area */}
      <rect x="80" y="60" width="440" height="90" rx="10" fill="white" stroke="#2563eb" strokeWidth="2" strokeDasharray="8 4" />
      <circle cx="200" cy="105" r="22" fill="#eff6ff" />
      <polyline points="200,118 200,98" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <polyline points="189,107 200,96 211,107" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="310" y="99" fill="#374151" fontSize="12" fontWeight="600" fontFamily="system-ui">Drop PDF files here</text>
      <text x="310" y="116" fill="#9ca3af" fontSize="11" fontFamily="system-ui">or click to select multiple files</text>
      {/* File list */}
      <rect x="80" y="164" width="200" height="30" rx="8" fill="white" stroke="#bfdbfe" strokeWidth="1.5" />
      <text x="110" y="183" fill="#374151" fontSize="11" fontFamily="system-ui">📄 contract.pdf</text>
      <rect x="295" y="164" width="225" height="30" rx="8" fill="white" stroke="#bfdbfe" strokeWidth="1.5" />
      <text x="325" y="183" fill="#374151" fontSize="11" fontFamily="system-ui">📄 invoice_march.pdf</text>
      {/* Merge button */}
      <rect x="210" y="205" width="180" height="32" rx="16" fill="#2563eb" />
      <text x="300" y="226" textAnchor="middle" fill="white" fontSize="13" fontWeight="600" fontFamily="system-ui">Merge PDF</text>
    </svg>
  )
}

function IllustrationWhyMerge() {
  return (
    <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Organization */}
      <g transform="translate(20,25)">
        <rect x="0" y="0" width="100" height="72" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <rect x="8" y="10" width="84" height="8" rx="4" fill="#bfdbfe" />
        <rect x="8" y="24" width="64" height="8" rx="4" fill="#bfdbfe" />
        <rect x="8" y="38" width="74" height="8" rx="4" fill="#bfdbfe" />
        <rect x="8" y="52" width="50" height="8" rx="4" fill="#bfdbfe" />
        <text x="50" y="92" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Organized</text>
      </g>
      {/* Email / sharing */}
      <g transform="translate(158,25)">
        <rect x="0" y="0" width="100" height="72" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <polyline points="0,0 50,40 100,0" stroke="#2563eb" strokeWidth="2" fill="none" />
        <text x="50" y="92" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Easy Sharing</text>
      </g>
      {/* Archive */}
      <g transform="translate(296,25)">
        <rect x="0" y="10" width="100" height="62" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <rect x="0" y="0" width="100" height="20" rx="6" fill="#2563eb" />
        <text x="50" y="14" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="system-ui">ARCHIVE</text>
        <rect x="12" y="30" width="76" height="6" rx="3" fill="#bfdbfe" />
        <rect x="12" y="44" width="55" height="6" rx="3" fill="#bfdbfe" />
        <rect x="12" y="58" width="64" height="6" rx="3" fill="#bfdbfe" />
        <text x="50" y="92" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Archiving</text>
      </g>
      {/* Print */}
      <g transform="translate(432,25)">
        <rect x="10" y="18" width="80" height="50" rx="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <rect x="20" y="0" width="60" height="30" rx="4" fill="white" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="26" y="6" width="48" height="5" rx="2" fill="#bfdbfe" />
        <rect x="26" y="16" width="36" height="5" rx="2" fill="#bfdbfe" />
        <rect x="15" y="50" width="70" height="24" rx="4" fill="white" stroke="#bfdbfe" strokeWidth="1.5" />
        <text x="50" y="92" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Print Once</text>
      </g>
      <text x="300" y="175" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Organize · Share · Archive · Print</text>
    </svg>
  )
}

function IllustrationSecurity() {
  return (
    <svg viewBox="0 0 600 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Shield */}
      <g transform="translate(60,15)">
        <path d="M60,0 L120,25 L120,80 Q120,130 60,160 Q0,130 0,80 L0,25 Z" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <path d="M60,30 L95,48 L95,82 Q95,112 60,130 Q25,112 25,82 L25,48 Z" fill="#2563eb" opacity="0.15" />
        <path d="M42,80 L55,95 L80,65" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="60" y="178" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Secure Transfer</text>
      </g>
      {/* Clock / Auto-delete */}
      <g transform="translate(230,20)">
        <circle cx="60" cy="65" r="55" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <path d="M60,65 L60,30" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60,65 L85,50" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="65" r="5" fill="#2563eb" />
        <text x="60" y="150" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Auto-Deleted (1h)</text>
      </g>
      {/* No account */}
      <g transform="translate(400,20)">
        <circle cx="60" cy="38" r="28" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <circle cx="60" cy="32" r="11" fill="#2563eb" opacity="0.3" />
        <path d="M35,66 Q35,50 60,50 Q85,50 85,66" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
        <line x1="40" y1="15" x2="80" y2="61" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        <text x="60" y="95" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">No Account</text>
        <text x="60" y="108" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Required</text>
      </g>
      <text x="300" y="178" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Private · Secure · No Sign-up · Auto-delete</text>
    </svg>
  )
}

/* ── Reusable prose helpers ─────────────────────────────────────────────── */

const ACCENT = '#2563eb'

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 space-y-2">
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

function ProblemItem({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-1">{problem}</h3>
      <p className="text-sm font-medium mb-1" style={{ color: ACCENT }}>Solution</p>
      <p className="text-muted-foreground leading-relaxed text-sm">{solution}</p>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ArticlePage() {
  return (
    <>
      <ReadingProgress />
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
                <span itemProp="name" className="text-foreground font-medium">How to Merge PDF Files Online for Free</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: '#eff6ff', color: ACCENT }}
            >
              PDF Guide
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Merge PDF Files Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Learn how to merge PDF files online for free. Combine multiple PDF documents into one organized file quickly, securely, and without installing software.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-05" itemProp="datePublished">June 5, 2026</time>
              <span>·</span>
              <span>7 min read</span>
              <span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization"><Link href="/author/toolifypdf-team" itemProp="name" className="hover:text-foreground hover:underline">ToolifyPDF</Link></span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Managing multiple PDF files can quickly become inconvenient, especially when you need to share related documents, organize reports, combine contracts, or create a single file for printing. Instead of sending several separate PDFs, merging them into one document creates a cleaner and more professional experience.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you&apos;re wondering how to merge PDF files online for free, modern web-based tools make the process fast and simple. You can combine PDF files directly from your browser without installing software or creating an account. In this guide, you&apos;ll learn how to merge PDF files online, why PDF merging is useful, and how to achieve the best results using a reliable online PDF merger.
            </p>
          </section>

          {/* Illustration 1 */}
          <div className="hidden sm:block mb-12 p-6 bg-muted/40 rounded-2xl border border-border">
            <IllustrationMerge />
          </div>

          {/* What Is PDF Merging */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">What Is PDF Merging?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PDF merging is the process of combining two or more PDF documents into a single PDF file. Instead of managing multiple files separately, a PDF merger joins all pages into one organized document. This makes sharing, storing, printing, and archiving files much easier.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">Common examples include:</p>
            <BulletList items={[
              'Combining invoices into one file',
              'Merging contracts and supporting documents',
              'Creating project reports from multiple sections',
              'Joining scanned pages into a complete document',
              'Organizing educational materials',
              'Combining application forms and attachments',
            ]} />
            <p className="text-muted-foreground leading-relaxed mt-4">
              PDF merging helps keep related information together and reduces file clutter.
            </p>
          </section>

          {/* Why Merge */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Why Merge PDF Files?</h2>

            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationWhyMerge />
            </div>

            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Improve Organization</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Combining multiple documents into one file makes it easier to manage and locate information.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Simplify File Sharing</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sending one PDF is more convenient than attaching multiple files to an email or uploading several documents separately.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Create Professional Documents</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Merged PDFs appear more organized and professional, especially when sharing reports, proposals, portfolios, or business documents.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Reduce File Management Complexity</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Instead of tracking several documents, you only need to manage a single PDF file.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Improve Printing Efficiency</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Printing one combined document is faster and more convenient than opening and printing multiple files separately.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Archive Related Documents</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Many businesses and individuals merge PDFs to store records, contracts, receipts, and reports in a single organized location.
                </p>
              </div>
            </div>
          </section>

          {/* Step-by-step guide */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Merge PDF Files Online (Step-by-Step Guide)</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Using ToolifyPDF to merge PDF files is simple and beginner-friendly.
            </p>

            <StepList steps={[
              'Open the Merge PDF Tool — Visit the ToolifyPDF Merge PDF tool from any web browser on desktop or mobile.',
              'Upload Your PDF Files — Select the PDF files you want to combine. ToolifyPDF supports files up to 50 MB, allowing you to merge large documents without hassle.',
              'Arrange the Files — Place the PDFs in the desired order. Drag and drop files to rearrange them before merging.',
              'Start the Merge Process — Click the Merge PDF button. The system will combine your files into a single PDF document.',
              'Download Your Merged PDF — Once processing is complete, download the new PDF file to your device. Your combined document is ready to share, print, store, or edit.',
            ]} />

            <div className="hidden sm:block my-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationUploadMerge />
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/merge-pdf"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: ACCENT }}
              >
                Merge PDF Now →
              </Link>
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Benefits of Using an Online PDF Merger</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Online PDF merging tools offer several advantages over traditional desktop software.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Installation Required</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Everything works directly in your browser. There is no need to download software or perform complex installations.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Registration Required</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">ToolifyPDF allows users to merge PDFs instantly without creating an account.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Works on Any Device</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">The tool is compatible with Windows, macOS, Linux, Android, iPhone, and tablets.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Fast Processing</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Most PDF merging tasks are completed within seconds.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Supports Large Files</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">ToolifyPDF supports files up to 50 MB — suitable for reports, manuals, presentations, and large document collections.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Mobile-Friendly Experience</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Merge PDFs directly from your smartphone or tablet while on the go.</p>
              </div>
            </div>
          </section>

          {/* Problems & Solutions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Common PDF Merging Problems and Solutions</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Although PDF merging is usually straightforward, users may occasionally encounter issues.
            </p>
            <div className="space-y-4">
              <ProblemItem
                problem="Files Appear in the Wrong Order"
                solution="Arrange the files carefully before starting the merge process. Most tools allow drag-and-drop reordering."
              />
              <ProblemItem
                problem="File Size Is Too Large"
                solution="Compress oversized files before merging if necessary. ToolifyPDF's compress tool can reduce file sizes significantly."
              />
              <ProblemItem
                problem="Upload Fails"
                solution="A weak internet connection can interrupt uploads. Refresh the page and try again using a stable connection."
              />
              <ProblemItem
                problem="Duplicate Pages in the Result"
                solution="Review the file list before merging to ensure the same file hasn't been uploaded more than once."
              />
              <ProblemItem
                problem="Corrupted PDF Files"
                solution="Open the original PDF first to verify it works correctly before uploading. Damaged PDFs may fail during processing."
              />
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Security and Privacy Considerations</h2>

            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationSecurity />
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">
              Security is an important factor when working with online documents.
            </p>
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Secure Processing</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">ToolifyPDF uses secure file handling procedures during uploads and processing.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Automatic File Deletion</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">All uploaded files are automatically deleted after 1 hour, protecting your privacy and reducing the risk of unauthorized access.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Account Required</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Since registration is not required, you can use the service without providing unnecessary personal information.</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Tips for Better PDF Merging Results</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Follow these best practices to create cleaner and more organized merged PDFs.
            </p>
            <BulletList items={[
              'Organize files before uploading — review your files and place them in the correct order beforehand.',
              'Use clear file names — descriptive names make it easier to identify documents during the merge process.',
              'Remove unnecessary pages — delete unwanted pages before merging to keep the final PDF clean.',
              'Verify the final document — after downloading, quickly review all pages to ensure everything appears correctly.',
              'Keep related documents together — merge only files that belong to the same project, report, or topic.',
              'Compress large PDFs if needed — if your files are unusually large, compression can improve upload speed.',
            ]} />
          </section>

          {/* Conclusion */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Conclusion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Merging PDF files is one of the easiest ways to organize documents, simplify sharing, and create professional-looking files. Whether you&apos;re combining reports, contracts, presentations, or scanned documents, an online PDF merger can save time and reduce file management headaches.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              ToolifyPDF makes the process fast and straightforward. With support for files up to 50 MB, secure processing, mobile compatibility, and automatic file deletion after one hour, it&apos;s an efficient solution for combining PDFs from any device.
            </p>
          </section>

          {/* CTA */}
          <section
            className="rounded-2xl p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }}
          >
            <div className="text-4xl mb-3 animate-bounce">↓</div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Merge Your PDF Files?</h2>
            <p className="text-blue-100 mb-6 leading-relaxed">
              Combine multiple PDF documents into a single organized file with ToolifyPDF.
            </p>
            <ul className="text-blue-100 text-sm space-y-1 mb-7 inline-block text-left">
              {[
                'Supports files up to 50 MB',
                'No sign-up required',
                'Mobile-friendly',
                'Fast processing',
                'Secure file handling',
                'Automatic file deletion after 1 hour',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-300 font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div>
              <Link
                href="/merge-pdf"
                className="inline-flex items-center gap-2 bg-white font-semibold px-7 py-3 rounded-full text-sm transition-all hover:scale-105 hover:shadow-lg"
                style={{ color: ACCENT }}
              >
                Merge PDF Now →
              </Link>
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-8" />

          <RelatedArticles slugs={['how-to-split-pdf-online', 'how-to-compress-pdf-online', 'understanding-pdf-your-ultimate-guide-to-pdf-files']} />
        </article>
      </main>
    </>
  )
}
