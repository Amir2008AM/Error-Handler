import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | ToolifyPDF',
  description:
    'Learn about ToolifyPDF — a free online platform for PDF and image tools. No account required.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/about',
  },
  robots: { index: true, follow: true },
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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-4">About ToolifyPDF</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Welcome to ToolifyPDF, a free online platform designed to make working with PDF
          documents and images simple and accessible for everyone.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Our goal is to provide a collection of practical tools that help users complete
          everyday document tasks directly from their browser without installing software
          or creating an account. Whether you need to merge PDFs, convert files, compress
          documents, extract text from images, or perform other common tasks, ToolifyPDF
          offers a fast and straightforward solution.
        </p>

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
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-5">Why Choose ToolifyPDF</h2>
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
          <h2 className="text-xl font-semibold mb-3">Privacy and Security</h2>
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
            that make document processing easier and more efficient.
          </p>
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
