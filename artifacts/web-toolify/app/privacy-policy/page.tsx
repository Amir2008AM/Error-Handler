import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy | Toolify' },
  description: 'Privacy Policy for ToolifyPDF — learn how we collect, use, and protect your information when using our free online PDF and image tools.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/privacy-policy',
  },
  robots: { index: true, follow: true },
}

const sections = [
  {
    title: '1. Introduction',
    body: 'This Privacy Policy explains how ToolifyPDF ("we", "us", "our") collects, uses, and protects information when you use toolifypdf.online (the "Service"). By using the Service, you agree to the practices described in this policy.',
  },
  {
    title: '2. Information You Provide to Us',
    body: 'We do not require account registration, and we do not collect personal information as a condition of using our tools. The only information you provide directly is through our contact form, where we collect the email address and message content you submit, solely to respond to your inquiry. We do not collect your name, payment details, or any other personal information through the contact form.',
  },
  {
    title: '3. Information We Process Automatically',
    body: 'When you use our tools, we temporarily process the following:',
    list: [
      'Uploaded files (PDFs, images, and documents) — solely for the purpose of performing the requested operation (e.g. merging, converting, compressing)',
      'Technical and usage data, such as IP address, browser type, device type, operating system, referring page, and general usage behavior, used for security, abuse prevention, and service improvement',
    ],
  },
  {
    title: '4. How We Use Information',
    body: 'We use the information described above only to:',
    list: [
      'Provide and operate the requested file-processing service',
      'Maintain the security, stability, and integrity of the Service and prevent abuse',
      'Understand aggregate usage patterns to improve website performance and user experience',
      'Respond to inquiries submitted through our contact form',
    ],
  },
  {
    title: '5. File Handling, Processing, and Automatic Deletion',
    body: 'File processing on ToolifyPDF is fully automated — no member of our team manually views, reviews, or accesses the content of your uploaded files. Files are processed using automated software running on our servers and are not shared with third parties for any purpose other than delivering the requested processing operation.\n\nUploaded and processed files are stored temporarily and are automatically and permanently deleted from our servers within approximately 10 minutes, and typically much sooner. We do not use uploaded files to train artificial intelligence models, and we do not retain copies of your files after the retention period expires.\n\nOur tools currently support files up to 50 MB in size.',
  },
  {
    title: '6. Cookies',
    body: 'We use cookies and similar technologies to:',
    list: [
      'Maintain core website functionality and session state',
      'Remember basic user preferences',
      'Measure and analyze website traffic through third-party analytics tools',
      'Support advertising delivered through Google AdSense (see Section 8 below)',
    ],
  },
  {
    title: '7. Analytics',
    body: 'We use Google Analytics to collect aggregated, anonymized statistics about how visitors use our Service, such as pages visited and time spent on the site. This data helps us understand and improve the Service. Google Analytics may use cookies and similar technologies to collect this information in accordance with Google\'s own privacy practices.',
  },
  {
    title: '8. Advertising (Google AdSense)',
    body: 'We display advertisements served by Google AdSense to support the free operation of our tools. Google and its partners may use cookies, including the DoubleClick cookie, to serve ads based on your prior visits to this website or other websites. This helps show you ads that may be more relevant to your interests.\n\nYou may opt out of personalized advertising by visiting Google\'s Ads Settings at https://adssettings.google.com, or opt out of third-party vendor use of cookies for personalized advertising by visiting www.aboutads.info.',
  },
  {
    title: '9. Third-Party Service Providers',
    body: 'We rely on a limited number of third-party service providers to operate the Service, including hosting infrastructure, Google Analytics for usage statistics, and Google AdSense for advertising. These providers process data under their own respective privacy policies. We do not sell your personal information to any third party.',
  },
  {
    title: '10. Data Security',
    body: 'We use HTTPS encryption and industry-standard security practices to protect data in transit and during processing. While no online service can guarantee absolute security, we take reasonable technical measures to safeguard information handled by the Service.',
  },
  {
    title: '11. Children\'s Privacy',
    body: 'ToolifyPDF is not directed at children under the age of 13, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can address it promptly.',
  },
  {
    title: '12. Your Privacy Rights',
    body: 'Depending on your location (for example, under the GDPR in the European Economic Area or the CCPA in California), you may have the right to:',
    list: [
      'Request access to personal information we hold about you',
      'Request correction or deletion of your personal information',
      'Request restriction of, or object to, certain processing activities',
      'Withdraw consent where processing is based on consent',
    ],
  },
  {
    title: '13. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. Material changes will be reflected by updating the "Last updated" date at the top of this page.',
  },
  {
    title: '14. Contact Us',
    body: 'For any privacy-related questions or requests, please contact us at contact@toolifypdf.online or through our Contact page.',
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

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: July 2026</p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          ToolifyPDF (&quot;we&quot;, &quot;us&quot;) operates the website{' '}
          <span className="text-foreground font-medium">toolifypdf.online</span>.
          We are committed to protecting your privacy and ensuring transparency
          about how data is handled.
        </p>

        <div className="space-y-8 mb-8">
          {sections.map((s) => (
            <PolicySection key={s.title} {...s} />
          ))}
        </div>
      </div>
    </main>
  )
}
