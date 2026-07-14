import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'About Toolify — Free Online PDF & Image Tools' },
  description: 'Learn about Toolify — a free, fast platform for PDF processing, image conversion, and document tools. No account required, instant results.',
  alternates: {
    canonical: 'https://toolifypdf.online/about',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'About Toolify — Free Online PDF & Image Tools',
    description: 'Learn about Toolify — a free, fast platform for PDF processing, image conversion, and document tools. No account required, instant results.',
    url: 'https://toolifypdf.online/about',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'About Toolify — Free Online PDF & Image Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Toolify — Free Online PDF & Image Tools',
    description: 'Learn about Toolify — a free, fast platform for PDF processing, image conversion, and document tools. No account required, instant results.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

const features = [
  {
    title: 'Free and Accessible',
    body: 'Our tools are available online and can be used without creating an account.',
  },
  {
    title: 'Browser-Based Processing',
    body: 'Most tasks can be completed directly through your web browser without installing additional software.',
  },
  {
    title: 'Multiple Tools in One Place',
    body: 'Instead of using several different websites, users can access a wide range of document and image tools from a single platform.',
  },
  {
    title: 'Simple User Experience',
    body: 'We focus on providing a clean and straightforward interface that works across desktop and mobile devices.',
  },
]

const tools = [
  'PDF merging and splitting',
  'PDF compression',
  'PDF conversion to and from popular formats (Word, Excel, PowerPoint, JPG)',
  'Image to PDF and PDF to image conversion',
  'OCR text extraction from images',
  'Image optimization and editing tools (compress, resize, crop, convert)',
  'Text utilities and calculators',
]

const faqs = [
  {
    question: 'What is ToolifyPDF?',
    answer:
      'ToolifyPDF is a free, browser-based platform that provides online tools for working with PDF documents and images, including merging, splitting, compression, format conversion, OCR text extraction, and image editing. It requires no account registration and no software installation — every tool runs directly in the browser.',
  },
  {
    question: 'Why choose ToolifyPDF?',
    answer:
      "ToolifyPDF brings a wide range of document and image tools together in one place, so users don't need to visit several different websites to complete common tasks. The tools are free to use, work without an account, and are designed with a simple interface that works across desktop and mobile devices.",
  },
  {
    question: 'How does ToolifyPDF protect user files?',
    answer:
      'Uploaded files are processed only for the requested task and are automatically removed after a limited period, as described in our Privacy Policy. Account registration is not required to use any tool, which limits the personal information collected from users.',
  },
  {
    question: 'Do I need to create an account to use ToolifyPDF?',
    answer:
      'No. All tools on ToolifyPDF can be used without creating an account or signing in. You can open a tool, upload a file, and download the result directly.',
  },
  {
    question: 'What kind of tools does ToolifyPDF offer?',
    answer:
      'ToolifyPDF offers PDF merging and splitting, PDF compression, PDF conversion to and from formats like Word, Excel, PowerPoint, and JPG, image-to-PDF and PDF-to-image conversion, OCR text extraction from images, image optimization and editing tools, and text utilities and calculators.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-4">About ToolifyPDF</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          ToolifyPDF is a free, browser-based platform for working with PDF documents and
          images. It offers a collection of online tools — including merging, splitting,
          compression, format conversion, OCR text extraction, and image editing — that run
          directly in your browser without requiring an account or software installation.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Our goal is to provide a collection of practical tools that help users complete
          everyday document tasks directly from their browser without installing software
          or creating an account. Whether you need to merge PDFs, convert files, compress
          documents, extract text from images, or perform other common tasks, ToolifyPDF
          offers a fast and straightforward solution.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What Is ToolifyPDF?</h2>
          <p className="text-muted-foreground leading-relaxed">
            ToolifyPDF is an online platform that brings together document and image tools
            in a single place, so users don&apos;t need to search for separate websites for
            each task. It was built around a simple idea: document tools should be easy to
            access and simple to use, without accounts, downloads, or unnecessary steps.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            We believe that document tools should be easy to access and simple to use.
            Our mission is to help students, professionals, businesses, and everyday users
            save time by providing reliable online tools that work across devices and platforms.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What We Offer</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            ToolifyPDF provides a growing collection of tools, including:
          </p>
          <ul className="list-disc text-muted-foreground space-y-1 ml-5">
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            All tools are designed to be easy to use, allowing users to complete tasks in just a few steps.
            You can browse the full collection on our{' '}
            <Link href="/" className="text-primary hover:underline">
              homepage
            </Link>{' '}
            or check our{' '}
            <Link href="/faq" className="text-primary hover:underline">
              FAQ page
            </Link>{' '}
            for tool-specific questions.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-5">Why Choose ToolifyPDF?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-5 bg-card">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">How Does ToolifyPDF Protect User Files?</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We understand the importance of privacy when working with personal or business documents.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Uploaded files are processed only for the requested task and are automatically
            removed after a limited period, as described in our{' '}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . We do not require account registration to use our tools, and we strive to
            handle user data responsibly and securely.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We are committed to improving ToolifyPDF by expanding our collection of tools,
            enhancing performance, and providing a better experience for our users.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            User feedback helps us continue improving the platform and developing features
            that make document processing easier and more efficient. You can read more about
            our approach to content and accuracy in our{' '}
            <Link href="/editorial-guidelines" className="text-primary hover:underline">
              Editorial Guidelines
            </Link>
            .
          </p>
        </section>

        <section className="mb-10 rounded-xl border border-border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">Key Takeaways</h2>
          <ul className="list-disc text-muted-foreground space-y-2 ml-5 text-sm leading-relaxed">
            <li>ToolifyPDF is a free, browser-based platform for PDF, image, and document tools — no account or software installation required.</li>
            <li>It offers a single place for tasks like merging, splitting, compressing, and converting PDFs, plus image editing and OCR text extraction.</li>
            <li>Uploaded files are processed only for the requested task and automatically removed after a limited period, as described in the Privacy Policy.</li>
            <li>No registration is required to use any tool, and results are available for immediate download.</li>
            <li>The platform is designed to work consistently across desktop and mobile browsers.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-5">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="border border-border rounded-xl p-5 bg-card">
                <h3 className="font-semibold mb-2 text-foreground">{faq.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 rounded-xl border border-border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            If you have questions, suggestions, or need assistance, please visit our{' '}
            <Link href="/contact-us" className="text-primary hover:underline">
              Contact Us
            </Link>{' '}
            page.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We appreciate your feedback and thank you for using ToolifyPDF.
          </p>
        </section>

        <p className="text-sm text-muted-foreground text-center">
          © 2026 ToolifyPDF. All Rights Reserved.
        </p>
      </div>
    </main>
  )
}
