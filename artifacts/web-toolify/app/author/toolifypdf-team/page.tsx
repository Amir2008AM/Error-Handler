import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { PILLAR_ARTICLES, BLOG_ARTICLES } from '@/lib/blog'

export const metadata: Metadata = {
  title: { absolute: 'ToolifyPDF Team — Author Profile | Toolify' },
  description:
    'Meet the ToolifyPDF Team — the writers and developers behind our free PDF, image, and document guides. Browse every article we have published.',
  alternates: {
    canonical: 'https://toolifypdf.online/author/toolifypdf-team',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'ToolifyPDF Team — Author Profile',
    description:
      'Meet the ToolifyPDF Team — the writers and developers behind our free PDF, image, and document guides.',
    url: 'https://toolifypdf.online/author/toolifypdf-team',
    type: 'profile',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'ToolifyPDF Team' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToolifyPDF Team — Author Profile',
    description:
      'Meet the ToolifyPDF Team — the writers and developers behind our free PDF, image, and document guides.',
  },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Organization',
    name: 'ToolifyPDF Team',
    url: 'https://toolifypdf.online/author/toolifypdf-team',
    logo: 'https://toolifypdf.online/favicon.png',
    description:
      'The ToolifyPDF Team builds and writes about free, browser-based PDF, image, and document tools.',
    sameAs: ['https://toolifypdf.online/about'],
  },
}

export default function AuthorPage() {
  const articles = [...PILLAR_ARTICLES, ...BLOG_ARTICLES]

  return (
    <>
      <Script id="author-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

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
          <header className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
              T
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">ToolifyPDF Team</h1>
              <p className="text-sm text-muted-foreground">
                {articles.length} articles published · Document & Image Tools Specialists
              </p>
            </div>
          </header>

          <section className="mb-10">
            <p className="text-muted-foreground leading-relaxed mb-4">
              The ToolifyPDF Team is the group of writers and developers who build and maintain
              ToolifyPDF&apos;s free PDF, image, and document tools. We write practical, step-by-step
              guides based on how our tools actually work — merging, splitting, compressing,
              converting, protecting, and editing files — so readers can solve real document
              problems without guesswork.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every guide is reviewed for accuracy against the current behavior of our tools and
              updated when features change. Learn more about the platform on our{' '}
              <Link href="/about" className="text-primary hover:underline">About page</Link>, or{' '}
              <Link href="/contact-us" className="text-primary hover:underline">get in touch</Link>{' '}
              with feedback or questions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-5">Articles by ToolifyPDF Team</h2>
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
