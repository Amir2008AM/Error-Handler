import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Editorial Guidelines | ToolifyPDF' },
  description: 'Learn how ToolifyPDF creates, reviews, and maintains its guides and educational content — our standards for accuracy, transparency, and user trust.',
  alternates: {
    canonical: 'https://toolifypdf.online/editorial-guidelines',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Editorial Guidelines | ToolifyPDF',
    description: 'Learn how ToolifyPDF creates, reviews, and maintains its guides and educational content — our standards for accuracy, transparency, and user trust.',
    url: 'https://toolifypdf.online/editorial-guidelines',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Editorial Guidelines | ToolifyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Editorial Guidelines | ToolifyPDF',
    description: 'Learn how ToolifyPDF creates, reviews, and maintains its guides and educational content — our standards for accuracy, transparency, and user trust.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function EditorialGuidelinesPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Editorial Guidelines</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <div className="space-y-8 mb-8">

          <section>
            <p className="text-muted-foreground leading-relaxed">
              At ToolifyPDF, we publish guides, how-to articles, and tool documentation to help users get the most out of our free online PDF, image, and document processing tools. This page explains the standards and process we follow when creating, reviewing, updating, and maintaining that content — so you know exactly what to expect and why you can trust what you read here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Our Content Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every article and guide published on ToolifyPDF exists to serve one purpose: to give users clear, accurate, and actionable information about working with PDF files, images, and documents. We do not publish content to inflate page counts or chase search rankings with low-quality material. Every piece of content we produce must answer a genuine question or solve a real problem that our users face — such as how to{' '}
              <Link href="/compress-pdf" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">compress a PDF</Link>,{' '}
              <Link href="/merge-pdf" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">merge multiple PDF files</Link>,{' '}
              or{' '}
              <Link href="/pdf-to-word" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">convert a PDF to a Word document</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Create Content</h2>

            <h3 className="text-base font-semibold mb-2 mt-4">Hands-On Research</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All guides and how-to articles are written based on direct, hands-on experience with ToolifyPDF&apos;s own tools and features. We do not copy or paraphrase content from other websites. Writers test the tools they write about — including upload flows, processing behavior, output quality, and error handling — before a single word is drafted.
            </p>

            <h3 className="text-base font-semibold mb-2">Practical Focus</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our content is written for real users, not for algorithms. That means plain language, concrete step-by-step instructions, and specific examples wherever they help. We avoid vague advice, unnecessary padding, and technical jargon that does not add value. If a topic can be explained in three sentences, we use three sentences.
            </p>

            <h3 className="text-base font-semibold mb-2">Review Before Publication</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every article is reviewed for accuracy, completeness, and clarity before it is published. This review checks that instructions match the actual current behavior of the tool, that any claims made are verifiable, and that the content clearly addresses the user&apos;s likely question without unnecessary detours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Keeping Content Up to Date</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PDF standards, browser capabilities, file format specifications, and best practices evolve. When ToolifyPDF updates a tool, adds a new feature, changes a processing behavior, or when industry best practices shift, we revisit and update the relevant content to reflect those changes. Published articles display the date they were last reviewed so readers always know how current the information is.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Outdated content that cannot be updated accurately is either revised or removed entirely. We do not leave stale, incorrect instructions live simply to preserve existing content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Handling Errors and User Feedback</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We take factual accuracy seriously. If a reader identifies an error — whether a step that no longer matches the tool&apos;s interface, a claim that is incorrect, or a technical detail that has changed — we treat that report as a priority. Verified factual errors are corrected promptly, and the article&apos;s &quot;last updated&quot; date is revised accordingly.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Feedback can be submitted via our{' '}
              <Link href="/contact-us" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">Contact page</Link>.
              We read every message. While we may not reply to every submission individually, all reported errors are reviewed and acted on when confirmed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Accuracy Standards and Limitations</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We make every reasonable effort to ensure the accuracy of our content. However, ToolifyPDF is a free tool that relies on open-source processing engines. Real-world results can vary based on file complexity, formatting, fonts, and other factors outside our control. Where relevant, our guides explain these limitations honestly rather than overpromising results.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We do not claim that our tools are infallible, and our content reflects that honestly. For example, guides covering{' '}
              <Link href="/ocr-pdf" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">OCR text extraction</Link>{' '}
              note that accuracy depends on source image quality, and guides for document conversion explain that complex formatting may not be perfectly preserved. This transparency is a deliberate editorial choice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Editorial Independence from Advertising</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ToolifyPDF displays advertisements served by Google AdSense. Advertising revenue helps us keep all of our tools free to use. However, advertising has no influence on our editorial content. Advertisers do not determine which topics we cover, how we describe our tools, or what recommendations we make.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Advertising units displayed on this site are clearly distinguishable from editorial content. We do not publish sponsored articles, paid reviews, or any content whose conclusions are influenced by commercial relationships. If that ever changes, any sponsored content will be clearly and prominently labeled as such.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              ToolifyPDF does not currently have any paid partnerships, affiliate arrangements, or sponsored content agreements that influence editorial output.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Linking Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Internal links within our content point to relevant ToolifyPDF tools and related guides that genuinely add value for the reader. External links, where used, point to authoritative sources such as official file format specifications or standards documentation. We do not accept payment for outbound links, and all external links are evaluated for relevance and reliability before inclusion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Scope of Our Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our editorial content is limited to topics directly relevant to ToolifyPDF&apos;s tools and the broader subject of working with PDF files, images, and documents. We cover topics such as PDF compression, file conversion, document security, image optimization, and OCR. We do not publish content outside this scope, and we do not produce general-interest articles unrelated to our tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact and Corrections</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you believe any content on ToolifyPDF is inaccurate, outdated, or misleading, please reach out via our{' '}
              <Link href="/contact-us" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">Contact page</Link>{' '}
              or email us at{' '}
              <a href="mailto:contact@toolifypdf.online" className="text-foreground underline underline-offset-4 hover:opacity-75 transition-opacity">contact@toolifypdf.online</a>.
              We take all correction requests seriously and will respond accordingly.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
