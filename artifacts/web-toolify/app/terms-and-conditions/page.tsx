import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use | Toolify',
  description: 'Terms of Use for Toolify — the rules and guidelines for using our free online tools.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/terms-and-conditions',
  },
  robots: { index: true, follow: true },
}

const sections_en = [
  {
    title: '1. Service Use',
    body: 'The service is provided free of charge without subscriptions.',
  },
  {
    title: '2. User Responsibility',
    body: 'Users are responsible for the files they upload and must ensure they have legal rights to use them.',
  },
  {
    title: '3. Prohibited Use',
    body: 'It is prohibited to use the website for:',
    list: [
      'Uploading malicious files',
      'Violating copyright or intellectual property rights',
      'Any illegal activity',
    ],
  },
  {
    title: '4. File Processing',
    body: 'All processing is fully automated. Files are deleted within approximately 1 hour after processing.',
  },
  {
    title: '5. Intellectual Property',
    body: 'All website content belongs to ToolifyPDF. Users retain ownership of their uploaded files.',
  },
  {
    title: '6. Disclaimer',
    body: 'The service is provided "as is" without warranties of any kind. We do not guarantee accuracy or results.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'We are not responsible for any damages or data loss resulting from use of the service.',
  },
  {
    title: '8. Changes',
    body: 'We may update these terms at any time.',
  },
]

const sections_ar = [
  {
    title: '1. استخدام الخدمة',
    body: 'يتم تقديم الخدمة مجانًا بدون أي اشتراكات.',
  },
  {
    title: '2. مسؤولية المستخدم',
    body: 'المستخدم مسؤول عن الملفات التي يقوم برفعها، ويجب التأكد من امتلاكه الحقوق القانونية لاستخدامها.',
  },
  {
    title: '3. الاستخدام الممنوع',
    body: 'يُمنع استخدام الموقع في الحالات التالية:',
    list: [
      'رفع ملفات ضارة أو خبيثة',
      'انتهاك حقوق النشر أو الملكية الفكرية',
      'أي نشاط غير قانوني',
    ],
  },
  {
    title: '4. معالجة الملفات',
    body: 'تتم جميع عمليات المعالجة بشكل آلي بالكامل. يتم حذف الملفات خلال حوالي ساعة واحدة بعد المعالجة.',
  },
  {
    title: '5. الملكية الفكرية',
    body: 'جميع محتويات الموقع مملوكة لموقع ToolifyPDF. بينما يحتفظ المستخدم بملكية الملفات التي يقوم برفعها.',
  },
  {
    title: '6. إخلاء المسؤولية',
    body: 'يتم تقديم الخدمة "كما هي" بدون أي ضمانات من أي نوع. نحن لا نضمن الدقة أو النتائج.',
  },
  {
    title: '7. تحديد المسؤولية',
    body: 'نحن غير مسؤولين عن أي أضرار أو فقدان بيانات ينتج عن استخدام الخدمة.',
  },
  {
    title: '8. التعديلات',
    body: 'يجوز لنا تحديث هذه الشروط في أي وقت.',
  },
]

function PolicySection({
  title,
  body,
  list,
  rtl,
}: {
  title: string
  body: string
  list?: string[]
  rtl?: boolean
}) {
  return (
    <section dir={rtl ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {body.split('\n\n').map((para, i) => (
        <p key={i} className="text-muted-foreground leading-relaxed mb-2">
          {para}
        </p>
      ))}
      {list && (
        <ul className="list-disc text-muted-foreground space-y-1 mt-2 ml-5 rtl:mr-5 rtl:ml-0">
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

        {/* ── English ─────────────────────────────────────────────────── */}
        <h1 className="text-3xl font-bold mb-1">Terms of Use</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          ToolifyPDF provides free tools for PDF processing.
        </p>

        <div className="space-y-8 mb-16">
          {sections_en.map((s) => (
            <PolicySection key={s.title} {...s} />
          ))}
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="border-t border-border my-12" />

        {/* ── Arabic ───────────────────────────────────────────────────── */}
        <div dir="rtl">
          <h2 className="text-3xl font-bold mb-1">شروط الاستخدام</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            يوفر موقع ToolifyPDF أدوات مجانية لمعالجة ملفات PDF.
          </p>

          <div className="space-y-8">
            {sections_ar.map((s) => (
              <PolicySection key={s.title} {...s} rtl />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
