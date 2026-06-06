/**
 * Tool icons — designed to read at 24–28 px.
 * Pattern: ONE large document shape fills ~70 % of the canvas,
 * with a bold badge or action overlay for instant recognition.
 * No <text> nodes (font rendering is inconsistent at tiny sizes).
 * Stroke width ≥ 2, filled shapes preferred.
 */

type IconProps = { className?: string }

/* ─── Reusable pieces ──────────────────────────────────────────────────────── */

/** Full-bleed document (portrait, folded top-right corner). */
function Page({ fold = 5 }: { fold?: number }) {
  return (
    <>
      <path
        d={`M3 2 h${13 - fold} l${fold} ${fold} V22 H3 Z`}
        fill="currentColor"
        fillOpacity=".18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d={`M${16 - fold} 2 v${fold} h${fold}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  )
}

/** Filled corner badge (bottom-right), max 8×7 px slot. */
function Badge({ children, color = 'currentColor' }: { children: React.ReactNode; color?: string }) {
  return (
    <g>
      <rect x="14" y="14" width="9.5" height="8.5" rx="2" fill={color} />
      {children}
    </g>
  )
}

/* ─── PDF Tools ──────────────────────────────────────────────────────────── */

/** Merge PDF — two pages fanning out + down-merge arrow */
export function MergePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* back page offset */}
      <rect x="6" y="2" width="13" height="17" rx="1.5"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {/* front page */}
      <rect x="2" y="4" width="13" height="17" rx="1.5"
        fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* bold down-merge arrow */}
      <path d="M18 14v6M15.5 17.5l2.5 2.5 2.5-2.5"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Split PDF — single page with bold scissors across the middle */
export function SplitPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* scissor body — two circles + blades */}
      <circle cx="7"  cy="12" r="2.2" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="13" cy="12" r="2.2" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.8" />
      {/* blades opening across the doc */}
      <line x1="8.5"  y1="10.8" x2="19" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8.5"  y1="13.2" x2="19" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14.5" y1="10.8" x2="19" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14.5" y1="13.2" x2="19" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Compress PDF — page with inward arrows */
export function CompressPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* top arrow ↓ */}
      <path d="M10 5v5M7.5 8l2.5 2.5 2.5-2.5"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* bottom arrow ↑ */}
      <path d="M10 19v-5M7.5 16l2.5-2.5 2.5 2.5"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* centre bar */}
      <line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Rotate PDF — page with large circular arrow */
export function RotatePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* large open arc */}
      <path d="M6 16 A6 6 0 1 1 15.5 18"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* arrowhead on arc end */}
      <path d="M13 21l2.5-3-3.5-.5"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Watermark PDF — page with diagonal STAMP overlay */
export function WatermarkPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* three diagonal watermark bars */}
      <line x1="5"  y1="18" x2="15" y2="7"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".55" />
      <line x1="7"  y1="20" x2="17" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".35" />
      <line x1="10" y1="20" x2="17" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity=".2" />
      {/* stamp oval ring */}
      <ellipse cx="10" cy="13" rx="4.5" ry="3.5"
        stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />
    </svg>
  )
}

/** Page Numbers — page with content lines + badge "1" */
export function PageNumbersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* content lines */}
      <line x1="6" y1="9"  x2="14" y2="9"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="17" x2="11" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* badge with "1" (a vertical bar) */}
      <circle cx="19.5" cy="19" r="3.8" fill="currentColor" />
      {/* numeral 1 — vertical line with serif */}
      <line x1="19.5" y1="16.8" x2="19.5" y2="21.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="17.8" x2="19.5" y2="16.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Organize PDF — three pages fanned + up/down sort arrows */
export function OrganizePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="8"  y="1" width="10" height="14" rx="1.2"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="4"  y="4" width="10" height="14" rx="1.2"
        fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="1"  y="7" width="10" height="14" rx="1.2"
        fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* sort arrows */}
      <path d="M19 3v8M17 6l2-3 2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 21v-8M17 18l2 3 2-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Repair PDF — page + bold wrench */
export function RepairPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* bold wrench handle + head */}
      <path d="M13.5 8.5 A3.5 3.5 0 0 0 8 13a3.5 3.5 0 0 0 3.5 3.5c.8 0 1.5-.26 2.1-.7L17 19.5a1.5 1.5 0 0 0 2.1-2.1L15.7 14a3.5 3.5 0 0 0 .8-3.8"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        fill="currentColor" fillOpacity=".12" />
      <path d="M13.5 8.5l-1 1 1.5 1.5 1-1a3.5 3.5 0 0 0-1.5-1.5z"
        fill="currentColor" fillOpacity=".5" />
    </svg>
  )
}

/** Protect PDF — page + bold filled shield with check */
export function ProtectPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* shield */}
      <path d="M10 6 L4.5 8.5v5C4.5 17 7 19.5 10 20.5c3-1 5.5-3.5 5.5-7v-5L10 6z"
        fill="currentColor" fillOpacity=".4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* check mark */}
      <path d="M7.5 13.5l1.8 1.8 3.2-3.2"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Unlock PDF — page + open padlock */
export function UnlockPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* shackle — open (arcs left away from body) */}
      <path d="M14 11 V8 A4 4 0 0 0 6 8"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* lock body */}
      <rect x="5" y="11" width="11" height="8" rx="2"
        fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="2" />
      {/* keyhole dot + slot */}
      <circle cx="10.5" cy="14.5" r="1.5" fill="white" />
      <line x1="10.5" y1="16" x2="10.5" y2="18.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Converter Tools ────────────────────────────────────────────────────── */

/** PDF → Word: page + blue W badge */
export function PdfToWordIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      <line x1="6" y1="9"  x2="13" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* W badge */}
      <Badge color="#2563eb">
        {/* W as path: two V strokes */}
        <path d="M16 16.5l1.5 4 1.5-3 1.5 3 1.5-4"
          stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Badge>
    </svg>
  )
}

/** Word → PDF: W badge + page */
export function WordToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      <line x1="6" y1="9"  x2="13" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Word-to badge with arrow-in */}
      <Badge color="#2563eb">
        <path d="M16 16.5l1.5 4 1.5-3 1.5 3 1.5-4"
          stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* small arrow on badge edge */}
        <path d="M14 18l-2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 18l-.5-2.5 2.5.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </Badge>
    </svg>
  )
}

/** PDF → JPG: page + image-frame badge */
export function PdfToJpgIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      <line x1="6" y1="9"  x2="13" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <Badge color="#d97706">
        {/* sun dot */}
        <circle cx="16.8" cy="16.5" r="1" fill="white" />
        {/* mountain */}
        <path d="M14.5 22 l2.5-3.5 1.5 2 1-1.5 2 3H14.5z" fill="white" fillOpacity=".85" />
      </Badge>
    </svg>
  )
}

/** Image (JPG) → PDF: image badge + page */
export function ImageToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* small image frame on doc body */}
      <rect x="5" y="7" width="9" height="7" rx="1"
        fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7.2" cy="9.2" r="1" fill="currentColor" />
      <path d="M5 13.5l2-2.5 1.8 2 1.5-2 3 3H5z" fill="currentColor" fillOpacity=".5" />
      {/* badge: arrow indicating "to PDF" */}
      <Badge color="#dc2626">
        {/* bold right-pointing arrow */}
        <path d="M16 18h5M18.5 15.5l3 2.5-3 2.5"
          stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Badge>
    </svg>
  )
}

/** Excel → PDF: spreadsheet grid on page + green X badge */
export function ExcelToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* grid on page body */}
      <line x1="5" y1="8"  x2="14" y2="8"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="6"  x2="9"  y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <Badge color="#16a34a">
        {/* X cross */}
        <line x1="15.5" y1="15.5" x2="22" y2="22"   stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="22"   y1="15.5" x2="15.5" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </Badge>
    </svg>
  )
}

/** PDF → Excel: page with content + green grid badge */
export function PdfToExcelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      <line x1="6" y1="9"  x2="13" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <Badge color="#16a34a">
        {/* mini grid */}
        <line x1="14" y1="17.5" x2="23.5" y2="17.5" stroke="white" strokeWidth="1.5" />
        <line x1="14" y1="20.5" x2="23.5" y2="20.5" stroke="white" strokeWidth="1.5" />
        <line x1="17.5" y1="14" x2="17.5" y2="22.5" stroke="white" strokeWidth="1.5" />
      </Badge>
    </svg>
  )
}

/** HTML → PDF: code-bracket badge on page */
export function HtmlToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* big <> on the page itself */}
      <path d="M5.5 9 L3 12 5.5 15"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 9 L13 12 10.5 15"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.5" y1="8.5" x2="7" y2="15.5"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <Badge color="#ea580c">
        {/* tiny PDF lines */}
        <line x1="15.5" y1="17.5" x2="22" y2="17.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="15.5" y1="20.5" x2="20"  y2="20.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </Badge>
    </svg>
  )
}

/** PowerPoint → PDF: slide shape on page + orange P badge */
export function PptToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      {/* presentation monitor shape */}
      <rect x="4" y="7" width="11" height="8" rx="1"
        fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="9.5" y1="15" x2="9.5" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <Badge color="#ea580c">
        {/* P shape: vertical line + half-circle cap */}
        <line x1="16.5" y1="15" x2="16.5" y2="22.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M16.5 15 h2.5 a2 2 0 0 1 0 4 H16.5"
          stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Badge>
    </svg>
  )
}

/** PDF → PowerPoint: page + slide/monitor badge */
export function PdfToPptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <Page />
      <line x1="6" y1="9"  x2="13" y2="9"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <Badge color="#ea580c">
        {/* slide (landscape) miniature */}
        <rect x="14.5" y="15" width="8.5" height="5.5" rx="1"
          fill="none" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        {/* stand */}
        <line x1="18.5" y1="20.5" x2="18.5" y2="22.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16.5" y1="22.5" x2="20.5" y2="22.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </Badge>
    </svg>
  )
}

/* ─── Icon Registry ─────────────────────────────────────────────────────── */
export const customIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MergePdf:    MergePdfIcon,
  SplitPdf:    SplitPdfIcon,
  CompressPdf: CompressPdfIcon,
  RotatePdf:   RotatePdfIcon,
  WatermarkPdf: WatermarkPdfIcon,
  PageNumbers:  PageNumbersIcon,
  OrganizePdf:  OrganizePdfIcon,
  RepairPdf:    RepairPdfIcon,
  ProtectPdf:   ProtectPdfIcon,
  UnlockPdf:    UnlockPdfIcon,
  PdfToWord:    PdfToWordIcon,
  WordToPdf:    WordToPdfIcon,
  PdfToJpg:     PdfToJpgIcon,
  ImageToPdf:   ImageToPdfIcon,
  ExcelToPdf:   ExcelToPdfIcon,
  PdfToExcel:   PdfToExcelIcon,
  HtmlToPdf:    HtmlToPdfIcon,
  PptToPdf:     PptToPdfIcon,
  PdfToPpt:     PdfToPptIcon,
}
