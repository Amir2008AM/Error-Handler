import type { Metadata } from 'next'
import Link from 'next/link'
import { HomeContent } from '@/components/home-content'
import { PartnerBadges } from '@/components/partner-badges'

export const metadata: Metadata = {
  title: { absolute: 'Toolify — Free PDF, Image & Document Tools Online' },
  description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
  alternates: { canonical: 'https://toolifypdf.online' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    url: 'https://toolifypdf.online',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Toolify — Free PDF, Image & Document Tools Online' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

/* ─────────────────────────────────────────────────────────────
   SECTION 1 — How It Works
───────────────────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Upload Your File',
      description: 'Select any PDF, image, Word, Excel, or PowerPoint file from your device. No size limits for most tools.',
      svg: (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
          <rect width="80" height="80" rx="20" fill="#EEF2FF"/>
          <rect x="24" y="30" width="32" height="28" rx="4" fill="#C7D2FE"/>
          <rect x="28" y="34" width="24" height="3" rx="1.5" fill="#818CF8"/>
          <rect x="28" y="40" width="16" height="3" rx="1.5" fill="#A5B4FC"/>
          <rect x="28" y="46" width="20" height="3" rx="1.5" fill="#A5B4FC"/>
          <path d="M40 14 L40 26 M34 20 L40 14 L46 20" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Process Instantly',
      description: 'Our servers handle everything in seconds — compress, convert, merge, split, or edit without installing any software.',
      svg: (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
          <rect width="80" height="80" rx="20" fill="#F0FDF4"/>
          <circle cx="40" cy="40" r="18" fill="#BBF7D0"/>
          <path d="M31 40 L37 46 L50 33" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="40" cy="40" r="24" stroke="#86EFAC" strokeWidth="2" strokeDasharray="4 3"/>
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Download Result',
      description: 'Your processed file is ready immediately. Download it instantly. Files are auto-deleted from our servers after processing.',
      svg: (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
          <rect width="80" height="80" rx="20" fill="#FFF7ED"/>
          <rect x="24" y="44" width="32" height="16" rx="4" fill="#FED7AA"/>
          <rect x="28" y="48" width="12" height="3" rx="1.5" fill="#FB923C"/>
          <rect x="28" y="53" width="8" height="3" rx="1.5" fill="#FDBA74"/>
          <path d="M40 16 L40 38 M34 32 L40 38 L46 32" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <section aria-label="How Toolify works" className="bg-white border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Simple &amp; Fast</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How Toolify Works
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Process any PDF or image file in three easy steps — no account, no software, no waiting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-px bg-gradient-to-r from-indigo-200 via-green-200 to-orange-200" />

          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center group">
              <div className="relative mb-5">
                {step.svg}
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                  {step.number.slice(1)}
                </span>
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION 2 — Why Choose Toolify (features)
───────────────────────────────────────────────────────────── */
function WhyToolifySection() {
  const features = [
    {
      title: '100% Free — Always',
      description: 'Every PDF and image tool on Toolify is completely free. No hidden fees, no premium tiers, no credit card required.',
      keywords: 'free PDF tools, free image converter',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#FEF9C3" stroke="#FDE047" strokeWidth="2"/>
          <path d="M24 14v2m0 16v2m-8-10h2m12 0h2" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="24" r="6" fill="#FDE047" stroke="#CA8A04" strokeWidth="2"/>
          <path d="M20 24c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      title: 'No Registration Required',
      description: 'Start working immediately. No email, no account, no password. Just open the tool and go.',
      keywords: 'no sign-up PDF tools, instant file processing',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2"/>
          <rect x="16" y="20" width="16" height="13" rx="3" fill="#BBF7D0" stroke="#22C55E" strokeWidth="1.5"/>
          <path d="M20 20v-3a4 4 0 0 1 8 0v3" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="27" r="2" fill="#16A34A"/>
        </svg>
      ),
    },
    {
      title: 'Secure & Private',
      description: 'All uploads are encrypted with HTTPS. Your files are automatically deleted after processing. We never share your data.',
      keywords: 'secure PDF processing, private file conversion',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#FFF1F2" stroke="#FECDD3" strokeWidth="2"/>
          <path d="M24 14 L32 18 V25 C32 30 28 34 24 35 C20 34 16 30 16 25 V18 Z" fill="#FECDD3" stroke="#F43F5E" strokeWidth="1.5"/>
          <path d="M20 24 L23 27 L28 22" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: 'Works on Any Device',
      description: 'Toolify runs entirely in your browser — desktop, tablet, or mobile. No app to download, no OS restrictions.',
      keywords: 'online PDF editor, browser-based file tools',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
          <rect x="13" y="16" width="22" height="14" rx="2" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5"/>
          <rect x="18" y="32" width="12" height="2.5" rx="1.25" fill="#93C5FD"/>
          <rect x="17" y="34.5" width="14" height="1.5" rx="0.75" fill="#BFDBFE"/>
          <rect x="16" y="19" width="16" height="8" rx="1" fill="#EFF6FF"/>
        </svg>
      ),
    },
    {
      title: 'Lightning Fast Processing',
      description: 'Most operations complete in under 10 seconds. Our optimized servers handle PDF compression, conversion, and merging at speed.',
      keywords: 'fast PDF compression, instant image conversion',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="2"/>
          <path d="M26 14 L18 26 H24 L22 34 L30 22 H24 L26 14Z" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      title: 'All Formats Supported',
      description: 'PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, PNG, WebP, GIF — Toolify handles the most common file formats.',
      keywords: 'convert PDF to Word, convert Word to PDF, image format converter',
      svg: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <circle cx="24" cy="24" r="22" fill="#FAF5FF" stroke="#E9D5FF" strokeWidth="2"/>
          <rect x="13" y="18" width="10" height="13" rx="2" fill="#E9D5FF" stroke="#A855F7" strokeWidth="1.5"/>
          <rect x="25" y="18" width="10" height="13" rx="2" fill="#F3E8FF" stroke="#A855F7" strokeWidth="1.5"/>
          <path d="M18 14 L18 18 M30 14 L30 18" stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="16" y="21" width="6" height="1.5" rx="0.75" fill="#C084FC"/>
          <rect x="16" y="24" width="4" height="1.5" rx="0.75" fill="#C084FC"/>
          <rect x="28" y="21" width="5" height="1.5" rx="0.75" fill="#C084FC"/>
          <rect x="28" y="24" width="6" height="1.5" rx="0.75" fill="#C084FC"/>
        </svg>
      ),
    },
  ]

  return (
    <section aria-label="Why choose Toolify" className="bg-gradient-to-b from-slate-50 to-white border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Built for Everyone</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Why Millions Use Toolify
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            The fastest free online PDF and image toolkit — no strings attached.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div>{f.svg}</div>
              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION 3 — Tool Categories (SEO-rich)
───────────────────────────────────────────────────────────── */
function ToolCategoriesSection() {
  const categories = [
    {
      title: 'PDF Tools',
      description: 'Everything you need to work with PDF files — all free, all instant.',
      color: 'from-blue-50 to-indigo-50',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-100',
      iconColor: '#6366F1',
      svg: (
        <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
          <rect width="56" height="56" rx="14" fill="#EEF2FF"/>
          <rect x="14" y="12" width="22" height="28" rx="3" fill="#C7D2FE" stroke="#818CF8" strokeWidth="1.5"/>
          <path d="M28 12 L36 20 H28 Z" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.5"/>
          <rect x="18" y="24" width="14" height="2" rx="1" fill="#6366F1"/>
          <rect x="18" y="29" width="10" height="2" rx="1" fill="#A5B4FC"/>
          <rect x="18" y="34" width="12" height="2" rx="1" fill="#A5B4FC"/>
          <path d="M30 38 L42 38 M36 32 L42 38 L36 44" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      tools: [
        { label: 'Merge PDF', href: '/merge-pdf', desc: 'Combine multiple PDF files into one' },
        { label: 'Split PDF', href: '/split-pdf', desc: 'Extract pages from a PDF' },
        { label: 'Compress PDF', href: '/compress-pdf', desc: 'Reduce PDF file size' },
        { label: 'Rotate PDF', href: '/rotate-pdf', desc: 'Rotate pages in your PDF' },
        { label: 'Protect PDF', href: '/protect-pdf', desc: 'Add password protection' },
        { label: 'Unlock PDF', href: '/unlock-pdf', desc: 'Remove PDF passwords' },
        { label: 'Watermark PDF', href: '/watermark-pdf', desc: 'Add text or image watermarks' },
        { label: 'Organize PDF', href: '/organize-pdf', desc: 'Reorder PDF pages' },
      ],
    },
    {
      title: 'PDF Converters',
      description: 'Convert between PDF and Word, Excel, PowerPoint, JPG, and more.',
      color: 'from-violet-50 to-purple-50',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100',
      iconColor: '#9333EA',
      svg: (
        <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
          <rect width="56" height="56" rx="14" fill="#FAF5FF"/>
          <rect x="10" y="18" width="16" height="20" rx="3" fill="#E9D5FF" stroke="#A855F7" strokeWidth="1.5"/>
          <rect x="30" y="18" width="16" height="20" rx="3" fill="#F3E8FF" stroke="#A855F7" strokeWidth="1.5"/>
          <path d="M26 28 L30 28 M27 25 L23 28 L27 31" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="13" y="22" width="10" height="1.5" rx="0.75" fill="#C084FC"/>
          <rect x="13" y="25" width="7" height="1.5" rx="0.75" fill="#DDD6FE"/>
          <rect x="13" y="28" width="9" height="1.5" rx="0.75" fill="#DDD6FE"/>
          <rect x="33" y="22" width="10" height="1.5" rx="0.75" fill="#C084FC"/>
          <rect x="33" y="25" width="7" height="1.5" rx="0.75" fill="#DDD6FE"/>
          <rect x="33" y="28" width="9" height="1.5" rx="0.75" fill="#DDD6FE"/>
        </svg>
      ),
      tools: [
        { label: 'PDF to Word', href: '/pdf-to-word', desc: 'Convert PDF to editable .docx' },
        { label: 'Word to PDF', href: '/word-to-pdf', desc: 'Convert .docx to PDF' },
        { label: 'PDF to Excel', href: '/pdf-to-excel', desc: 'Extract tables into .xlsx' },
        { label: 'Excel to PDF', href: '/excel-to-pdf', desc: 'Convert spreadsheets to PDF' },
        { label: 'PDF to PowerPoint', href: '/pdf-to-ppt', desc: 'Convert PDF to .pptx' },
        { label: 'PowerPoint to PDF', href: '/ppt-to-pdf', desc: 'Convert .pptx to PDF' },
        { label: 'PDF to JPG', href: '/pdf-to-jpg', desc: 'Export PDF pages as images' },
        { label: 'Image to PDF', href: '/image-to-pdf', desc: 'Turn photos into a PDF' },
      ],
    },
    {
      title: 'Image Tools',
      description: 'Edit, compress, convert, and resize images in seconds — no Photoshop needed.',
      color: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
      iconColor: '#059669',
      svg: (
        <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
          <rect width="56" height="56" rx="14" fill="#ECFDF5"/>
          <rect x="10" y="16" width="36" height="26" rx="4" fill="#A7F3D0" stroke="#34D399" strokeWidth="1.5"/>
          <circle cx="19" cy="24" r="4" fill="#6EE7B7" stroke="#059669" strokeWidth="1.5"/>
          <path d="M10 34 L18 27 L25 33 L32 25 L46 34" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      tools: [
        { label: 'Compress Image', href: '/compress-image', desc: 'Reduce image file size online' },
        { label: 'Resize Image', href: '/resize-image', desc: 'Change image dimensions' },
        { label: 'Crop Image', href: '/crop-image', desc: 'Crop and trim images' },
        { label: 'Convert Image', href: '/convert-image', desc: 'JPG, PNG, WebP, GIF conversions' },
      ],
    },
  ]

  return (
    <section aria-label="Free PDF and image tool categories" className="bg-white border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">All Tools — All Free</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Free PDF &amp; Image Tools — No Sign-Up Required
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            Toolify is your all-in-one online toolkit for{' '}
            <Link href="/merge-pdf" className="text-primary hover:underline">merging PDFs</Link>,{' '}
            <Link href="/compress-pdf" className="text-primary hover:underline">compressing PDF files</Link>,{' '}
            <Link href="/pdf-to-word" className="text-primary hover:underline">converting PDF to Word</Link>, and{' '}
            <Link href="/compress-image" className="text-primary hover:underline">compressing images</Link> — all free, all instant, no account needed.
          </p>
        </div>

        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat.title} className={`rounded-2xl border ${cat.border} bg-gradient-to-br ${cat.color} p-6 md:p-8`}>
              <div className="flex items-start gap-5 mb-6">
                <div className="shrink-0">{cat.svg}</div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{cat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{cat.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cat.tools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="bg-white/80 hover:bg-white rounded-xl border border-white/60 hover:border-border/60 p-3 transition-all hover:shadow-sm group"
                  >
                    <span className="font-medium text-foreground text-sm group-hover:text-primary transition-colors block mb-0.5">
                      {tool.label}
                    </span>
                    <span className="text-muted-foreground text-xs leading-tight">{tool.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION 4 — FAQ (accordion-style, schema.org markup)
───────────────────────────────────────────────────────────── */
function HomeFAQSection() {
  const faqs = [
    {
      q: 'Are Toolify PDF tools really free?',
      a: 'Yes. Every tool on Toolify is 100% free to use — no hidden fees, no subscriptions, and no registration required.',
    },
    {
      q: 'Do I need to install any software to use Toolify?',
      a: 'No installation needed. Toolify runs entirely in your browser. Just open the tool, upload your file, and download the result.',
    },
    {
      q: 'Is my data safe when I use Toolify?',
      a: 'Yes. All file transfers are encrypted with HTTPS. Your files are automatically deleted from our servers after processing. We never share your files with third parties.',
    },
    {
      q: 'How do I merge PDF files online?',
      a: 'Open the Merge PDF tool, upload two or more PDF files, drag to reorder if needed, then click Merge. Download your combined PDF instantly.',
    },
    {
      q: 'Can I compress a PDF without losing quality?',
      a: 'Yes. Our Compress PDF tool reduces file size while preserving readability. Choose your preferred compression level to balance size and quality.',
    },
    {
      q: 'How do I convert a PDF to Word?',
      a: 'Use the PDF to Word tool. Upload your PDF, click Convert, and download the editable .docx file. Formatting is preserved as closely as possible.',
    },
    {
      q: 'What image formats does Toolify support?',
      a: 'Toolify supports JPG, PNG, WebP, and GIF. You can convert between formats, compress, resize, or crop images directly in your browser.',
    },
    {
      q: 'How do I reduce the size of an image online?',
      a: 'Use the Compress Image tool. Upload your JPG or PNG, choose your quality setting, and download the compressed image — often 60–80% smaller with no visible quality loss.',
    },
  ]

  return (
    <>
      {/* JSON-LD FAQPage schema for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
      <section
        aria-label="Frequently Asked Questions about Toolify"
        className="bg-gradient-to-b from-slate-50 to-white border-t border-border"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
            {/* Left — heading + illustration */}
            <div className="md:w-72 shrink-0 flex flex-col items-center md:items-start text-center md:text-left">
              <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32 mb-6">
                <circle cx="80" cy="80" r="72" fill="#EFF6FF"/>
                <circle cx="80" cy="80" r="52" fill="#DBEAFE"/>
                <circle cx="80" cy="72" r="20" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="3"/>
                <path d="M80 65 C80 65 80 68 80 72 L80 78" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="80" cy="82" r="2.5" fill="#1D4ED8"/>
                <path d="M50 108 Q55 118 80 120 Q105 118 110 108" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="40" cy="50" r="8" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="2"/>
                <path d="M40 46 V54 M36 50 H44" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="120" cy="110" r="10" fill="#EEF2FF" stroke="#A5B4FC" strokeWidth="2"/>
                <path d="M116 110 L119 113 L124 107" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Got Questions?</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Everything you need to know about Toolify&apos;s free PDF and image tools.
              </p>
            </div>

            {/* Right — FAQ list */}
            <div className="flex-1 divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
              {faqs.map(({ q, a }) => (
                <div key={q} className="px-6 py-5 group hover:bg-slate-50/60 transition-colors">
                  <h3 className="font-semibold text-foreground text-sm mb-2 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">?</span>
                    {q}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed pl-7">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default async function HomePage() {
  const preFooterContent = (
    <>
      <HowItWorksSection />
      <WhyToolifySection />
      <ToolCategoriesSection />
      <HomeFAQSection />
    </>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <HomeContent
        badgeSlot={<PartnerBadges />}
        preFooterSlot={preFooterContent}
      />
    </div>
  )
}
