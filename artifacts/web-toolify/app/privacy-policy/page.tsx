import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Toolify',
  description: 'Privacy Policy for Toolify — learn how we collect, use, and protect your information.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/privacy-policy',
  },
  robots: { index: true, follow: true },
}

const sections_en = [
  {
    title: '1. Information We Collect',
    body: 'We do not collect personal information except when users voluntarily submit it through the contact form. In that case, we collect only the email address and message content provided, solely to respond to your inquiry.\n\nWe do not collect your name, payment details, or any other personal information.',
  },
  {
    title: '2. Information We Process',
    body: 'When you use our services, we may temporarily process:',
    list: [
      'Uploaded files (PDFs, images, documents)',
      'Technical data such as IP address, browser type, operating system, and usage behavior',
    ],
  },
  {
    title: '3. How We Use Information',
    body: 'We use this information only to:',
    list: [
      'Provide file processing services (merge, convert, compress, etc.)',
      'Maintain security and prevent abuse',
      'Improve website performance and user experience',
    ],
  },
  {
    title: '4. File Handling and Storage',
    body: 'All uploaded files are processed automatically and are deleted within a short period (approximately 1 hour) after processing.\n\nWe do not permanently store user files and we do not access their content manually.',
  },
  {
    title: '5. Cookies',
    body: 'We use cookies to:',
    list: [
      'Maintain session functionality',
      'Store user preferences (such as dark mode)',
      'Analyze website traffic using third-party analytics tools',
    ],
  },
  {
    title: '6. Analytics',
    body: 'We may use analytics services (such as Google Analytics) to collect anonymous usage statistics.',
  },
  {
    title: '7. Data Security',
    body: 'We use HTTPS encryption and secure infrastructure to protect data during transmission and processing.',
  },
  {
    title: '8. Your Rights',
    body: 'Depending on your location (e.g., GDPR or CCPA regions), you may have rights to:',
    list: [
      'Access your data',
      'Request deletion',
      'Request restriction of processing',
    ],
  },
  {
    title: '9. Contact',
    body: 'For privacy-related inquiries, please contact us at: contact@toolifypdf.online',
  },
]

const sections_ar = [
  {
    title: '1. المعلومات التي نجمعها',
    body: 'نحن لا نجمع معلومات شخصية إلا عندما يُقدّمها المستخدم طوعاً من خلال نموذج التواصل. في هذه الحالة، نجمع فقط عنوان البريد الإلكتروني ومحتوى الرسالة المُرسَلة، وذلك بهدف الرد على استفسارك فحسب.\n\nنحن لا نجمع اسمك أو بيانات الدفع أو أي معلومات شخصية أخرى.',
  },
  {
    title: '2. المعلومات التي نقوم بمعالجتها',
    body: 'عند استخدامك لخدماتنا، قد نقوم بمعالجة مؤقتة لما يلي:',
    list: [
      'الملفات التي يتم رفعها (PDF، صور، مستندات)',
      'البيانات التقنية مثل عنوان IP، نوع المتصفح، نظام التشغيل، وسلوك الاستخدام',
    ],
  },
  {
    title: '3. كيفية استخدام المعلومات',
    body: 'نستخدم هذه المعلومات فقط من أجل:',
    list: [
      'تقديم خدمات معالجة الملفات (دمج، تحويل، ضغط، وغيرها)',
      'الحفاظ على الأمان ومنع إساءة الاستخدام',
      'تحسين أداء الموقع وتجربة المستخدم',
    ],
  },
  {
    title: '4. التعامل مع الملفات وتخزينها',
    body: 'يتم معالجة جميع الملفات المرفوعة بشكل تلقائي، ويتم حذفها خلال فترة قصيرة (حوالي ساعة واحدة) بعد المعالجة.\n\nنحن لا نقوم بتخزين ملفات المستخدمين بشكل دائم ولا نقوم بالوصول إلى محتواها يدويًا.',
  },
  {
    title: '5. ملفات تعريف الارتباط (Cookies)',
    body: 'نستخدم ملفات الكوكيز من أجل:',
    list: [
      'الحفاظ على وظائف الجلسة',
      'حفظ تفضيلات المستخدم (مثل الوضع الليلي)',
      'تحليل حركة الموقع باستخدام أدوات تحليل خارجية',
    ],
  },
  {
    title: '6. التحليلات',
    body: 'قد نستخدم خدمات تحليل مثل Google Analytics لجمع إحصائيات استخدام مجهولة الهوية.',
  },
  {
    title: '7. أمان البيانات',
    body: 'نستخدم تشفير HTTPS وبنية تحتية آمنة لحماية البيانات أثناء النقل والمعالجة.',
  },
  {
    title: '8. حقوقك',
    body: 'حسب موقعك الجغرافي (مثل مناطق GDPR أو CCPA)، قد يكون لديك حقوق مثل:',
    list: [
      'الوصول إلى بياناتك',
      'طلب حذف البيانات',
      'طلب تقييد المعالجة',
    ],
  },
  {
    title: '9. التواصل',
    body: 'للاستفسارات المتعلقة بالخصوصية، يرجى التواصل معنا عبر البريد الإلكتروني الرسمي للدعم.',
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

        {/* ── English ─────────────────────────────────────────────────── */}
        <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: June 2026</p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          ToolifyPDF (&quot;we&quot;, &quot;us&quot;) operates the website{' '}
          <span className="text-foreground font-medium">toolifypdf.online</span>.
          We are committed to protecting your privacy and ensuring transparency
          about how data is handled.
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
          <h2 className="text-3xl font-bold mb-1">سياسة الخصوصية</h2>
          <p className="text-muted-foreground text-sm mb-2">آخر تحديث: يونيو 2026</p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            يُدير موقع ToolifyPDF (&quot;نحن&quot;، &quot;لنا&quot;) الموقع الإلكتروني{' '}
            <span className="text-foreground font-medium">toolifypdf.online</span>.
            نحن ملتزمون بحماية خصوصيتك وضمان الشفافية فيما يتعلق بكيفية التعامل مع البيانات.
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
