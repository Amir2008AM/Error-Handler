import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog | Toolify',
  description:
    'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools — from the Toolify team.',
  openGraph: {
    title: 'Blog | Toolify',
    description:
      'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools.',
    type: 'website',
  },
}

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="hover:text-foreground transition-colors">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="text-border">›</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-foreground font-medium">Blog</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-3">Blog</h1>
          <p className="text-muted-foreground leading-relaxed">
            Tips, guides, and tutorials on PDF processing, image conversion, and getting the most out of Toolify&apos;s free online tools.
          </p>
        </header>

        {/* Coming soon state */}
        <div className="border border-border rounded-xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Articles coming soon</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            We&apos;re working on helpful guides and tips. Check back soon for articles on PDF tools, image processing, and productivity.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Explore Tools
          </Link>
        </div>
      </div>
    </main>
  )
}
