import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Terms of Use — ToolifyPDF Service Agreement' },
  description: 'Terms of Use for ToolifyPDF — the rules and guidelines for using our free online PDF, image, and document processing tools.',
  alternates: {
    canonical: 'https://toolifypdf.online/terms-and-conditions',
  },
  robots: { index: true, follow: true },
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using toolifypdf.online (the "Service"), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use the Service.',
  },
  {
    title: '2. Description of Service',
    body: 'ToolifyPDF provides free, automated online tools for PDF, image, and document processing, including merging, splitting, converting, compressing, and protecting files. The Service is provided free of charge, without subscriptions or account registration.',
  },
  {
    title: '3. Eligibility',
    body: 'The Service is intended for general audiences and is not directed at children under the age of 13. By using the Service, you confirm that you are legally permitted to use it under the laws applicable to you.',
  },
  {
    title: '4. User Responsibility',
    body: 'You are solely responsible for the files you upload and must ensure you have the legal right to use, process, and share them. You agree to use the Service only for lawful purposes.',
  },
  {
    title: '5. Prohibited Use',
    body: 'You may not use the Service to:',
    list: [
      'Upload malicious files, malware, or content designed to disrupt the Service',
      'Violate copyright, trademark, or other intellectual property rights',
      'Upload or process content that is illegal, harmful, or infringes on the rights of others',
      'Attempt to interfere with, disrupt, or gain unauthorized access to the Service or its infrastructure',
    ],
  },
  {
    title: '6. File Processing and Limits',
    body: 'All file processing is fully automated and is not manually reviewed. Our tools currently support files up to 50 MB in size. Uploaded and processed files are automatically deleted from our servers within approximately 10 minutes after processing, and we do not retain copies of your files afterward.',
  },
  {
    title: '7. Intellectual Property',
    body: 'All website content, branding, design, and underlying technology belong to ToolifyPDF. You retain full ownership of the files you upload; we claim no ownership rights over your content.',
  },
  {
    title: '8. Third-Party Advertising and Links',
    body: 'The Service may display advertisements served by third parties, such as Google AdSense, and may include links to external websites. We do not control and are not responsible for the content or practices of third-party advertisers or linked sites.',
  },
  {
    title: '9. Disclaimer of Warranties',
    body: 'The Service is provided "as is" and "as available," without warranties of any kind, whether express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that processing results will meet your specific requirements.',
  },
  {
    title: '10. Limitation of Liability',
    body: 'To the fullest extent permitted by law, ToolifyPDF is not liable for any direct, indirect, incidental, or consequential damages, including loss of data or files, arising from your use of, or inability to use, the Service. You are responsible for keeping backup copies of any important files before uploading them.',
  },
  {
    title: '11. Termination',
    body: 'We reserve the right to restrict or terminate access to the Service, without notice, for any user found to be violating these Terms or engaging in abusive or unlawful conduct.',
  },
  {
    title: '12. Changes to These Terms',
    body: 'We may update these Terms of Use from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated terms. Material changes will be reflected by updating the "Last updated" date at the top of this page.',
  },
]

function PolicySection({
  title,
  body,
  list,
}: {
  title: string
  body: string
  list?: string[]
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {body.split('\n\n').map((para, i) => (
        <p key={i} className="text-muted-foreground leading-relaxed mb-2">
          {para}
        </p>
      ))}
      {list && (
        <ul className="list-disc text-muted-foreground space-y-1 mt-2 ml-5">
          {list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Terms of Use</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: July 2026</p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          ToolifyPDF provides free tools for PDF, image, and document processing. Please read these Terms of Use carefully before using the Service.
        </p>

        <div className="space-y-8 mb-8">
          {sections.map((s) => (
            <PolicySection key={s.title} {...s} />
          ))}
          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Use, please contact us at contact@toolifypdf.online or through our{' '}
              <Link href="/contact-us" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>

        <div className="border-t border-border pt-6 mt-2">
          <p className="text-sm font-medium text-foreground mb-3">Explore our free tools:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/merge-pdf" className="hover:text-foreground transition-colors">Merge PDF</Link>
            <Link href="/compress-pdf" className="hover:text-foreground transition-colors">Compress PDF</Link>
            <Link href="/pdf-to-word" className="hover:text-foreground transition-colors">PDF to Word</Link>
            <Link href="/image-to-pdf" className="hover:text-foreground transition-colors">Image to PDF</Link>
            <Link href="/split-pdf" className="hover:text-foreground transition-colors">Split PDF</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
