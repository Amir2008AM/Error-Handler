import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { AdBanner } from '@/components/ad-banner'
import { ReadingProgress } from '@/components/reading-progress'
import { RelatedArticles } from '@/components/related-articles'

export const metadata: Metadata = {
  title: 'How to Lock and Unlock PDF Files Online for Free',
  description:
    'Learn how to lock and unlock PDF files online for free. Protect sensitive documents with passwords or remove passwords from PDFs you own using secure online tools.',
  alternates: {
    canonical: 'https://toolifypdf.online/blog/how-to-lock-and-unlock-pdf',
  },
  openGraph: {
    title: 'How to Lock and Unlock PDF Files Online for Free',
    description:
      'Protect sensitive documents with passwords or remove passwords from PDFs you own using secure online tools. No sign-up required.',
    type: 'article',
    publishedTime: '2026-06-04T00:00:00.000Z',
    url: 'https://toolifypdf.online/blog/how-to-lock-and-unlock-pdf',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Lock and Unlock PDF Files Online for Free',
    description:
      'Learn how to password-protect or unlock PDF files for free online. Fast, secure, and no sign-up required.',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Lock and Unlock PDF Files Online for Free',
  image: 'https://toolifypdf.online/og-image.jpg',
  description:
    'Learn how to lock and unlock PDF files online for free. Protect sensitive documents with passwords or remove passwords from PDFs you own using secure online tools.',
  datePublished: '2026-06-04T00:00:00.000Z',
  dateModified: '2026-06-04T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'ToolifyPDF Team', url: 'https://toolifypdf.online/author/toolifypdf-team' },
  publisher: { '@type': 'Organization', name: 'ToolifyPDF', url: 'https://toolifypdf.online', logo: { '@type': 'ImageObject', url: 'https://toolifypdf.online/favicon.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://toolifypdf.online/blog/how-to-lock-and-unlock-pdf' },
  articleSection: 'PDF Security',
  keywords: 'lock pdf, unlock pdf, password protect pdf, remove pdf password, pdf security online free',
}

/* ── Inline SVG illustrations ───────────────────────────────────────────── */

function IllustrationLockUnlock() {
  return (
    <svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Locked PDF */}
      <rect x="20" y="30" width="145" height="170" rx="10" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
      <rect x="20" y="30" width="145" height="42" rx="10" fill="#9333ea" />
      <rect x="20" y="55" width="145" height="17" fill="#9333ea" />
      <text x="92" y="63" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">PDF</text>
      {/* Lock icon on PDF */}
      <rect x="62" y="115" width="60" height="46" rx="8" fill="#9333ea" />
      <path d="M72,115 L72,102 Q72,88 92,88 Q112,88 112,102 L112,115" fill="none" stroke="#9333ea" strokeWidth="8" strokeLinecap="round" />
      <circle cx="92" cy="132" r="7" fill="white" />
      <rect x="89" y="132" width="6" height="12" rx="3" fill="white" />
      <text x="92" y="215" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">Protected</text>

      {/* Arrow right (lock) */}
      <g transform="translate(182,88)">
        <rect x="0" y="15" width="55" height="9" rx="4" fill="#9333ea" />
        <polygon points="55,0 86,19 55,38" fill="#9333ea" />
        <text x="40" y="10" textAnchor="middle" fill="#9333ea" fontSize="10" fontWeight="600" fontFamily="system-ui">Lock</text>
      </g>

      {/* Locked result */}
      <rect x="284" y="45" width="120" height="145" rx="10" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
      <rect x="284" y="45" width="120" height="36" rx="10" fill="#9333ea" />
      <rect x="284" y="65" width="120" height="16" fill="#9333ea" />
      <text x="344" y="77" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="304" y="96" width="80" height="6" rx="3" fill="#e9d5ff" />
      <rect x="304" y="110" width="60" height="6" rx="3" fill="#e9d5ff" />
      <rect x="304" y="124" width="72" height="6" rx="3" fill="#e9d5ff" />
      <rect x="314" y="146" width="60" height="30" rx="6" fill="#9333ea" opacity="0.15" stroke="#9333ea" strokeWidth="1.5" />
      <rect x="322" y="138" width="44" height="20" rx="5" fill="none" stroke="#9333ea" strokeWidth="2" />
      <circle cx="344" cy="158" r="5" fill="#9333ea" />
      <rect x="341" y="158" width="6" height="9" rx="3" fill="#9333ea" />
      <text x="344" y="215" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">🔒 Secured</text>

      {/* Arrow right (unlock) */}
      <g transform="translate(418,88)">
        <rect x="0" y="15" width="55" height="9" rx="4" fill="#16a34a" />
        <polygon points="55,0 86,19 55,38" fill="#16a34a" />
        <text x="40" y="10" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="600" fontFamily="system-ui">Unlock</text>
      </g>

      {/* Unlocked PDF */}
      <rect x="517" y="50" width="68" height="98" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
      <rect x="517" y="50" width="68" height="26" rx="8" fill="#16a34a" />
      <rect x="517" y="66" width="68" height="10" fill="#16a34a" />
      <text x="551" y="74" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <rect x="527" y="86" width="48" height="5" rx="2" fill="#bbf7d0" />
      <rect x="527" y="97" width="36" height="5" rx="2" fill="#bbf7d0" />
      <rect x="527" y="108" width="42" height="5" rx="2" fill="#bbf7d0" />
      <path d="M536,128 Q536,121 551,121 Q566,121 566,128 L566,136 L536,136 Z" fill="none" stroke="#16a34a" strokeWidth="2" />
      <rect x="536" y="130" width="30" height="18" rx="4" fill="#16a34a" opacity="0.2" stroke="#16a34a" strokeWidth="1.5" />
      <text x="551" y="215" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">🔓 Open</text>
    </svg>
  )
}

function IllustrationLockSteps() {
  return (
    <svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Browser chrome */}
      <rect x="40" y="10" width="520" height="220" rx="12" fill="#f8faff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="40" y="10" width="520" height="36" rx="12" fill="#fdf2f8" />
      <rect x="40" y="34" width="520" height="12" fill="#fdf2f8" />
      <circle cx="66" cy="28" r="6" fill="#fc5c5c" />
      <circle cx="86" cy="28" r="6" fill="#fdbc40" />
      <circle cx="106" cy="28" r="6" fill="#34c759" />
      <rect x="130" y="19" width="300" height="18" rx="9" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <text x="280" y="32" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">toolifypdf.online/protect-pdf</text>
      {/* Upload area */}
      <rect x="80" y="58" width="440" height="100" rx="10" fill="white" stroke="#9333ea" strokeWidth="2" strokeDasharray="8 4" />
      <circle cx="200" cy="108" r="22" fill="#fdf2f8" />
      <polyline points="200,118 200,100" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
      <polyline points="190,108 200,98 210,108" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="320" y="98" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="600" fontFamily="system-ui">Drop your PDF here</text>
      <text x="320" y="116" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="system-ui">or click to upload</text>
      <text x="320" y="132" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui">Supports PDF up to 50 MB</text>
      {/* Password field */}
      <rect x="80" y="170" width="280" height="32" rx="8" fill="white" stroke="#9333ea" strokeWidth="1.5" />
      <text x="100" y="190" fill="#9ca3af" fontSize="11" fontFamily="system-ui">Enter password</text>
      <text x="330" y="190" fill="#9333ea" fontSize="16" fontFamily="system-ui">••••••••</text>
      {/* Protect button */}
      <rect x="374" y="170" width="146" height="32" rx="16" fill="#9333ea" />
      <text x="447" y="191" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="system-ui">Protect PDF 🔒</text>
    </svg>
  )
}

function IllustrationWhyProtect() {
  return (
    <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Business doc */}
      <g transform="translate(20,20)">
        <rect x="5" y="0" width="90" height="115" rx="8" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <rect x="5" y="0" width="90" height="28" rx="8" fill="#9333ea" />
        <rect x="5" y="20" width="90" height="8" fill="#9333ea" />
        <text x="50" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">CONTRACT</text>
        <rect x="18" y="38" width="64" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="50" width="48" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="62" width="55" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="74" width="40" height="5" rx="2" fill="#e9d5ff" />
        <text x="50" y="140" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Contracts</text>
      </g>
      {/* Financial */}
      <g transform="translate(160,20)">
        <rect x="5" y="0" width="90" height="115" rx="8" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <rect x="5" y="0" width="90" height="28" rx="8" fill="#9333ea" />
        <rect x="5" y="20" width="90" height="8" fill="#9333ea" />
        <text x="50" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">INVOICE</text>
        <rect x="18" y="38" width="64" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="50" width="48" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="62" width="55" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="74" width="40" height="5" rx="2" fill="#e9d5ff" />
        <text x="50" y="140" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Financial</text>
      </g>
      {/* Legal */}
      <g transform="translate(300,20)">
        <rect x="5" y="0" width="90" height="115" rx="8" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <rect x="5" y="0" width="90" height="28" rx="8" fill="#9333ea" />
        <rect x="5" y="20" width="90" height="8" fill="#9333ea" />
        <text x="50" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">LEGAL</text>
        <rect x="18" y="38" width="64" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="50" width="48" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="62" width="55" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="74" width="40" height="5" rx="2" fill="#e9d5ff" />
        <text x="50" y="140" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Legal</text>
      </g>
      {/* Personal */}
      <g transform="translate(440,20)">
        <rect x="5" y="0" width="90" height="115" rx="8" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <rect x="5" y="0" width="90" height="28" rx="8" fill="#9333ea" />
        <rect x="5" y="20" width="90" height="8" fill="#9333ea" />
        <text x="50" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">PRIVATE</text>
        <rect x="18" y="38" width="64" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="50" width="48" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="62" width="55" height="5" rx="2" fill="#e9d5ff" />
        <rect x="18" y="74" width="40" height="5" rx="2" fill="#e9d5ff" />
        <text x="50" y="140" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Personal</text>
      </g>
      <text x="300" y="180" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Contracts · Financial · Legal · Personal</text>
    </svg>
  )
}

function IllustrationSecurity() {
  return (
    <svg viewBox="0 0 600 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-lg mx-auto" role="img">
      {/* Shield */}
      <g transform="translate(60,15)">
        <path d="M60,0 L120,25 L120,80 Q120,130 60,160 Q0,130 0,80 L0,25 Z" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <path d="M60,30 L95,48 L95,82 Q95,112 60,130 Q25,112 25,82 L25,48 Z" fill="#9333ea" opacity="0.15" />
        <path d="M42,80 L55,95 L80,65" stroke="#9333ea" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="60" y="178" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Encrypted</text>
      </g>
      {/* Clock */}
      <g transform="translate(230,20)">
        <circle cx="60" cy="65" r="55" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <path d="M60,65 L60,30" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60,65 L85,50" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="65" r="5" fill="#9333ea" />
        <text x="60" y="178" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Auto-Deleted (1h)</text>
      </g>
      {/* No account */}
      <g transform="translate(400,20)">
        <circle cx="60" cy="38" r="28" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <circle cx="60" cy="32" r="11" fill="#9333ea" opacity="0.3" />
        <path d="M35,66 Q35,50 60,50 Q85,50 85,66" fill="#fdf2f8" stroke="#9333ea" strokeWidth="2" />
        <line x1="40" y1="15" x2="80" y2="61" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
        <text x="60" y="95" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">No Account</text>
        <text x="60" y="108" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="system-ui">Required</text>
      </g>
      <text x="300" y="178" textAnchor="middle" fill="#9ca3af" fontSize="12" fontFamily="system-ui">Encrypted · Auto-delete · No Sign-up</text>
    </svg>
  )
}

/* ── Reusable prose helpers ─────────────────────────────────────────────── */

const ACCENT = '#9333ea'

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
      <ReadingProgress color={ACCENT} />
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
                <span itemProp="name" className="text-foreground font-medium">How to Lock and Unlock PDF Files Online for Free</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: '#fdf2f8', color: ACCENT }}
            >
              PDF Security
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Lock and Unlock PDF Files Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Learn how to lock and unlock PDF files online for free. Protect sensitive documents with passwords or remove passwords from PDFs you own using secure online tools.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-04" itemProp="datePublished">June 4, 2026</time>
              <span>·</span>
              <span>8 min read</span>
              <span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization"><Link href="/author/toolifypdf-team" itemProp="name" className="hover:text-foreground hover:underline">ToolifyPDF</Link></span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-foreground leading-relaxed mb-4">
              PDF files are one of the most popular formats for sharing documents online. Whether you&apos;re sending contracts, invoices, reports, forms, or personal records, protecting sensitive information is often essential.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Adding a password to a PDF helps prevent unauthorized access, while removing a password from a PDF you own can make it easier to view, edit, or share. Thanks to modern online PDF tools, both tasks can be completed in just a few clicks without installing any software.
            </p>
          </section>

          {/* Illustration 1 */}
          <div className="hidden sm:block mb-12 p-6 bg-muted/40 rounded-2xl border border-border">
            <IllustrationLockUnlock />
          </div>

          {/* What Is PDF Protection */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">What Is PDF Protection?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PDF protection is a security feature that restricts access to a PDF document using a password. When a PDF is protected:
            </p>
            <BulletList items={[
              'Users must enter the correct password before opening the file.',
              'Sensitive information remains secure.',
              'Unauthorized access becomes more difficult.',
              'Documents can be shared more safely.',
            ]} />
            <p className="text-muted-foreground leading-relaxed mt-4">
              PDF protection is commonly used for business documents, legal contracts, financial records, educational materials, and personal files.
            </p>
          </section>

          {/* Why Lock */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Why Lock a PDF File?</h2>

            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationWhyProtect />
            </div>

            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Protect Sensitive Information</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Password protection helps keep confidential information away from unauthorized viewers.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Secure Business Documents</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Organizations often protect reports, contracts, proposals, and internal documents before sharing them.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Share Files More Safely</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A password adds an extra layer of security when sending files through email or cloud storage.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Maintain Privacy</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Personal records, identification documents, and financial information can remain private and secure.
                </p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Control Access</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Only people who know the password can open the document, helping you control who can view the file.
                </p>
              </div>
            </div>
          </section>

          {/* Lock steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Lock a PDF Online (Step-by-Step Guide)</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Using an online PDF protection tool such as ToolifyPDF is simple and requires no software installation.
            </p>

            <StepList steps={[
              'Open the Lock PDF tool — Visit ToolifyPDF\'s Protect PDF page in any web browser.',
              'Upload your PDF file — Click the upload area or drag and drop your file. Supports PDFs up to 50 MB.',
              'Enter a strong password — Choose a secure password and confirm it in the second field.',
              'Click Protect PDF — The tool encrypts your document using AES-256 encryption.',
              'Wait for processing — Protection is applied within seconds.',
              'Download your protected PDF — Save the secured file to your device. It now requires your password to open.',
            ]} />

            <div className="hidden sm:block my-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationLockSteps />
            </div>

            {/* Password tips callout */}
            <div
              className="rounded-xl p-5 border mb-6"
              style={{ backgroundColor: '#fdf2f8', borderColor: '#e9d5ff' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: ACCENT }}>Tips for Creating a Strong Password</h3>
              <BulletList items={[
                'Use at least 12 characters.',
                'Include uppercase and lowercase letters.',
                'Add numbers and symbols.',
                'Avoid common words or personal information.',
                'Use a unique password for important documents.',
              ]} />
            </div>

            <div className="mt-2 text-center">
              <Link
                href="/protect-pdf"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: ACCENT }}
              >
                Lock PDF Now →
              </Link>
            </div>
          </section>

          {/* Unlock steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Unlock a PDF Online (Step-by-Step Guide)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you own a password-protected PDF or have permission to access it, you can remove the password for easier use.
            </p>
            <div
              className="rounded-xl p-4 mb-6 border"
              style={{ backgroundColor: '#fefce8', borderColor: '#fde68a' }}
            >
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ Only remove passwords from PDF files that you own or are authorized to access.
              </p>
            </div>

            <StepList steps={[
              'Open the Unlock PDF tool — Visit ToolifyPDF\'s Unlock PDF page in any web browser.',
              'Upload the protected PDF file — Click to upload or drag and drop the file.',
              'Enter the correct password — Type the existing password for the document.',
              'Click Unlock PDF — The tool removes the password protection.',
              'Wait for processing — Unlocking usually completes within seconds.',
              'Download the unlocked PDF — The file can now be opened without entering a password.',
            ]} />

            <div className="mt-6 text-center">
              <Link
                href="/unlock-pdf"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: '#16a34a' }}
              >
                Unlock PDF Now →
              </Link>
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Benefits of Using Online PDF Security Tools</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Online PDF security tools offer several advantages over desktop software.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Software Installation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Everything works directly in your web browser without downloading additional applications.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">No Registration Required</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">ToolifyPDF allows you to protect and unlock PDF files without creating an account.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Works on Any Device</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Fully compatible with Windows, macOS, Linux, Android, iPhone, and tablets.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Fast Processing</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Most PDF protection and unlocking tasks are completed within seconds.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Supports Large Files</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">ToolifyPDF supports PDF files up to 50 MB, suitable for large reports and documents.</p>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-2">Beginner-Friendly</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">The process is straightforward and requires only a few clicks — no technical knowledge needed.</p>
              </div>
            </div>
          </section>

          {/* Problems */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Common Problems and Solutions</h2>
            <div className="space-y-4">
              <ProblemItem
                problem="Forgotten PDF Password"
                solution="If you forget the password used to protect a PDF, you may not be able to access the document. Store passwords securely using a trusted password manager."
              />
              <ProblemItem
                problem="Incorrect Password"
                solution="Double-check spelling, capitalization, and special characters when entering a password. Passwords are case-sensitive."
              />
              <ProblemItem
                problem="File Too Large"
                solution="If your PDF exceeds upload limits, reduce the file size using a PDF compressor before protecting or unlocking it."
              />
              <ProblemItem
                problem="Upload Errors"
                solution="A slow or unstable internet connection can interrupt uploads. Refresh the page and try again with a stable connection."
              />
              <ProblemItem
                problem="Password Sharing Issues"
                solution="When sending protected PDFs, share the password separately from the document whenever possible — for example, via a different communication channel."
              />
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Security and Privacy Considerations</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              When using online PDF tools, security should always be a priority. ToolifyPDF is designed with your privacy in mind:
            </p>

            <div className="hidden sm:block mb-8 p-6 bg-muted/40 rounded-2xl border border-border">
              <IllustrationSecurity />
            </div>

            <BulletList items={[
              'Secure HTTPS encryption for all file transfers',
              'Automatic file deletion after 10 minutes',
              'No registration requirements — no unnecessary personal data collected',
              'AES-256 encryption applied to protected PDF files',
            ]} />

            <p className="text-muted-foreground leading-relaxed mt-4">
              Because files are not stored permanently, your documents remain private. For highly sensitive information, always use trusted devices and secure internet connections.
            </p>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Tips for Better PDF Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Follow these best practices to improve document security:
            </p>
            <BulletList items={[
              'Use strong and unique passwords for each important document.',
              'Share passwords through a separate communication channel from the document.',
              'Protect all documents that contain sensitive, financial, or personal information.',
              'Verify recipients before sending protected files.',
              'Remove passwords only when necessary and from documents you are authorized to access.',
              'Store important PDF files securely in encrypted storage.',
              'Review access permissions for shared documents regularly.',
            ]} />
          </section>

          {/* Conclusion */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Conclusion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Locking and unlocking PDF files is an important part of managing digital documents securely. Password protection helps safeguard sensitive information, while password removal can make authorized documents easier to access and share.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              With ToolifyPDF, you can protect or unlock PDF files quickly and securely from any device. The process is simple, requires no registration, supports files up to 50 MB, and includes automatic file deletion after 10 minutes for added privacy.
            </p>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────────── */}
          <section aria-label="Call to action" className="mb-12">
            <div
              className="rounded-2xl p-8 md:p-12 text-center"
              style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 60%, #c084fc 100%)' }}
            >
              {/* Animated arrow */}
              <div className="text-white/70 text-3xl mb-3 animate-bounce" aria-hidden="true">↓</div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Ready to Secure or Unlock Your PDF?
              </h2>
              <p className="text-purple-100 leading-relaxed mb-8 max-w-md mx-auto">
                Protect sensitive PDF files or remove passwords from documents you own with ToolifyPDF.
              </p>

              <ul className="inline-flex flex-col items-start gap-2 mb-8 text-sm text-purple-100">
                {[
                  'Supports files up to 50 MB',
                  'No sign-up required',
                  'Mobile-friendly',
                  'Fast processing',
                  'Secure file handling',
                  'Automatic file deletion after 10 minutes',
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="text-green-300 font-bold">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/protect-pdf"
                  className="inline-block px-8 py-4 rounded-full font-bold text-base md:text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
                  style={{ backgroundColor: 'white', color: '#6b21a8' }}
                >
                  🔒 Lock PDF Now
                </Link>
                <Link
                  href="/unlock-pdf"
                  className="inline-block px-8 py-4 rounded-full font-bold text-base md:text-lg shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 border-2 border-white text-white hover:bg-white/15"
                >
                  🔓 Unlock PDF Now
                </Link>
              </div>
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-8" />

          {/* Back to blog */}
          <div className="mt-10 pt-8 border-t border-border">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              ← Back to Blog
            </Link>
          </div>

          <RelatedArticles slugs={['how-to-protect-pdf-documents', 'how-to-watermark-pdf-documents', 'understanding-pdf-your-ultimate-guide-to-pdf-files']} />
        </article>
      </main>
    </>
  )
}
