import type { Metadata } from 'next'
import Link from 'next/link'
import { PILLAR_ARTICLES, BLOG_ARTICLES } from '@/lib/blog'

export const metadata: Metadata = {
  title: { absolute: 'ToolifyPDF Editorial Team — Authors & Content Standards | Toolify' },
  description:
    'Learn about the ToolifyPDF editorial team — our backgrounds in document processing, image conversion, and software development, and how we create and verify our guides.',
  alternates: {
    canonical: 'https://toolifypdf.online/author/toolifypdf-team',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'ToolifyPDF Editorial Team — Authors & Content Standards',
    description:
      'Meet the ToolifyPDF editorial team — writers and developers behind our free PDF, image, and document guides. Learn how our content is created and verified.',
    url: 'https://toolifypdf.online/author/toolifypdf-team',
    type: 'profile',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'ToolifyPDF Team' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToolifyPDF Editorial Team — Authors & Content Standards',
    description:
      'Meet the ToolifyPDF editorial team and learn how our practical PDF and document guides are created and verified.',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Organization',
    name: 'ToolifyPDF Editorial Team',
    url: 'https://toolifypdf.online/author/toolifypdf-team',
    logo: 'https://toolifypdf.online/favicon.png',
    description:
      'The ToolifyPDF editorial team comprises writers and software developers who build, test, and document free browser-based PDF, image, and document processing tools.',
    sameAs: ['https://toolifypdf.online/about'],
    knowsAbout: [
      'PDF file format and processing',
      'Document conversion (PDF, Word, Excel, PowerPoint)',
      'Image processing and optimization',
      'OCR and text extraction',
      'Document security and encryption',
      'Web-based file processing tools',
    ],
  },
}

const expertiseAreas = [
  {
    title: 'PDF Processing',
    description:
      'Merging, splitting, compressing, rotating, and organizing PDF files. Our guides are written and tested against the actual tools we build and maintain.',
  },
  {
    title: 'Document Conversion',
    description:
      'Converting between PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and image formats. Each conversion guide covers what is preserved, what is not, and how to handle common issues.',
  },
  {
    title: 'Image Editing & Optimization',
    description:
      'Compressing, resizing, cropping, and converting images. Our image processing knowledge comes from building tools that handle formats including JPG, PNG, WebP, and HEIC.',
  },
  {
    title: 'Document Security',
    description:
      'Password protection, encryption standards (AES-128/256), permission settings, and best practices for secure document distribution.',
  },
  {
    title: 'OCR & Text Extraction',
    description:
      'Optical character recognition for scanned documents and image-based PDFs. Guides cover when OCR is needed, its limitations, and how to verify the accuracy of extracted text.',
  },
]

const editorialProcess = [
  {
    step: '1',
    title: 'Tested against real tools',
    body: 'Every guide describes tasks that we have carried out ourselves using our own platform. We do not write theoretical descriptions of how PDF processing works in general — we document how our specific tools behave, including edge cases, limitations, and what to do when things go wrong.',
  },
  {
    step: '2',
    title: 'Structured for practical use',
    body: 'Each article answers a specific practical question a user would have. We include the "why" behind every task — not just steps — so readers understand when to use a tool and what outcome to expect, not just how to click through a process.',
  },
  {
    step: '3',
    title: 'Reviewed for accuracy',
    body: 'Guides are reviewed against the current behavior of the platform. When we update a tool or change how a feature works, we update the relevant documentation to match. Articles display their last modification date so readers can see how current the information is.',
  },
  {
    step: '4',
    title: 'Referenced against authoritative sources',
    body: 'Where relevant, our guides reference the PDF specification (ISO 32000), image format standards, and documentation from Adobe, Microsoft, and other original format maintainers to ensure the underlying technical information is accurate.',
  },
]

export default function AuthorPage() {
  const articles = [...PILLAR_ARTICLES, ...BLOG_ARTICLES]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
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
                <span itemProp="name" className="text-foreground font-medium">ToolifyPDF Team</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Profile header */}
          <header className="flex items-start gap-5 mb-8 p-6 rounded-2xl border border-border bg-card">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
              T
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">ToolifyPDF Editorial Team</h1>
              <p className="text-sm text-muted-foreground mb-3">
                {articles.length} guides published · PDF Processing &amp; Document Conversion Specialists
              </p>
              <div className="flex flex-wrap gap-2">
                {['PDF Tools', 'Document Conversion', 'Image Processing', 'OCR', 'Document Security'].map((tag) => (
                  <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{tag}</span>
                ))}
              </div>
            </div>
          </header>

          {/* About the team */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">About This Team</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The ToolifyPDF editorial team is made up of writers and software developers who build, test, and document
              the PDF, image, and document processing tools on this platform. Every guide we publish describes a task we
              have carried out ourselves using our own tools — we do not write about how PDF processing works in the
              abstract; we write about how our specific tools behave in practice, including their limitations.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our technical background spans document format standards (including the{' '}
              <a href="https://opensource.adobe.com/dc-acrobat-sdk-docs/standards/pdfstandards/pdf/PDF32000_2008.pdf" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                PDF specification ISO 32000
              </a>
              ), image compression and format conversion, optical character recognition, and document security (AES
              encryption, permission settings, and password management). This depth of technical knowledge informs both
              the tools we build and the guides we write.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each article is structured to answer a specific practical question — covering not just the steps to
              complete a task, but the reasons behind each step, what the outcome will be, and what to do if something
              goes wrong. Our goal is to help users solve real document problems with confidence, not to produce
              keyword-optimized content for its own sake. Learn more about the platform on our{' '}
              <Link href="/about" className="text-primary hover:underline">About page</Link>, or{' '}
              <Link href="/contact-us" className="text-primary hover:underline">get in touch</Link>{' '}
              with questions or feedback.
            </p>
          </section>

          {/* Expertise areas */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">Areas of Expertise</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {expertiseAreas.map((area) => (
                <div key={area.title} className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="font-semibold text-foreground text-sm mb-2">{area.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{area.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Editorial process */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">How Our Guides Are Created</h2>
            <div className="space-y-4">
              {editorialProcess.map((step) => (
                <div key={step.step} className="flex gap-4 items-start">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              For a full description of our content standards and review criteria, see our{' '}
              <Link href="/editorial-guidelines" className="text-primary hover:underline">Editorial Guidelines</Link>.
            </p>
          </section>

          {/* Articles list */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-5">
              All Guides by ToolifyPDF Team
              <span className="ml-2 text-sm font-normal text-muted-foreground">({articles.length} articles)</span>
            </h2>
            <ul className="space-y-4">
              {articles.map((article) => (
                <li key={article.slug} className="border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
                  <Link href={`/blog/${article.slug}`} className="block">
                    <h3 className="font-semibold text-foreground mb-1">{article.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{article.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <time dateTime={article.lastModified}>{article.date}</time>
                      <span aria-hidden="true">·</span>
                      <span>{article.readTime}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  )
}
