/**
 * Custom tool icons inspired by the iLovePDF visual style.
 * Each icon shows a document silhouette + action-specific overlay.
 * All icons use `currentColor` so they inherit the tool's color.
 * Optimised: pure inline SVG, zero dependencies, retina-sharp.
 */

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

/* ─── Shared document base ──────────────────────────────────────────────────
   Portrait page with a folded top-right corner (14×17 units, 24 viewBox).
   The "fold" triangle is drawn separately so callers can colour it. */

function DocBase({ stroke = 'currentColor', fill = 'none', ...rest }: SVGProps<SVGPathElement>) {
  return (
    <>
      {/* body */}
      <path
        d="M4 2h10l5 5v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        {...rest}
      />
      {/* fold */}
      <path
        d="M14 2v5h5"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  )
}

/* ─── 1. Merge PDF ──────────────────────────────────────────────────────────
   Two pages converging with arrows pointing inward / a + badge */
export function MergePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* left doc */}
      <path d="M2 4h7l3 3v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 4v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* right doc */}
      <path d="M15 4h5l3 3v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V7z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 4v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* merge arrows */}
      <path d="M8 20l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ─── 2. Split PDF ──────────────────────────────────────────────────────────
   One page with a dashed split line and arrows pointing outward */
export function SplitPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* dashed vertical split */}
      <line x1="12" y1="7" x2="12" y2="19" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.5" strokeLinecap="round" />
      {/* left arrow */}
      <path d="M9 13l-3 3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* right arrow */}
      <path d="M15 13l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── 3. Compress PDF ───────────────────────────────────────────────────────
   Page with top/bottom arrows pushing toward center */
export function CompressPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* down arrow from top */}
      <path d="M12 6v4M10 8l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* up arrow from bottom */}
      <path d="M12 18v-4M10 16l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* center line */}
      <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ─── 4. Rotate PDF ─────────────────────────────────────────────────────────
   Page with a circular rotation arrow overlaid */
export function RotatePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* rotation arc */}
      <path d="M8 14a4 4 0 1 0 4-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* arrowhead */}
      <path d="M8 10l-2 2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── 5. Watermark PDF ──────────────────────────────────────────────────────
   Page with diagonal "MARK" lines stamped on it */
export function WatermarkPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* diagonal watermark text lines */}
      <line x1="7" y1="16" x2="15" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".45" />
      <line x1="9" y1="18" x2="17" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity=".3" />
      {/* stamp ring */}
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.5" />
    </svg>
  )
}

/* ─── 6. Page Numbers ───────────────────────────────────────────────────────
   Page with numbered lines (1, 2, 3) */
export function PageNumbersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* line items with numbers */}
      <rect x="8" y="9" width="7" height="1.5" rx=".75" fill="currentColor" />
      <rect x="8" y="12.5" width="7" height="1.5" rx=".75" fill="currentColor" />
      <rect x="8" y="16" width="5" height="1.5" rx=".75" fill="currentColor" />
      {/* page number badge */}
      <circle cx="18" cy="17" r="3" fill="currentColor" />
      <text x="18" y="20" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold" fontFamily="system-ui">2</text>
    </svg>
  )
}

/* ─── 7. Organize PDF ───────────────────────────────────────────────────────
   Three small pages being sorted with up/down arrows */
export function OrganizePdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* page 1 */}
      <rect x="2" y="3" width="8" height="10" rx="1" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.4" />
      {/* page 2 (offset) */}
      <rect x="7" y="6" width="8" height="10" rx="1" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.4" />
      {/* page 3 (offset) */}
      <rect x="12" y="9" width="8" height="10" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      {/* sort arrows */}
      <path d="M3 19.5l2-2 2 2M5 17.5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 19.5l-2-2-2 2M17.5 17.5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── 8. Repair PDF ─────────────────────────────────────────────────────────
   Page with a wrench overlay */
export function RepairPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* wrench */}
      <path d="M14.5 8.5a3 3 0 0 0-4.1 4.1L7 16l1.5 1.5 3.4-3.4a3 3 0 0 0 4.1-4.1L14.5 11l-1.5-1.5 1.5-1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity=".1" />
    </svg>
  )
}

/* ─── 9. Protect PDF ────────────────────────────────────────────────────────
   Page with a shield overlay */
export function ProtectPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* shield */}
      <path d="M12 7l-4 1.5v4c0 2.5 1.8 4.5 4 5 2.2-.5 4-2.5 4-5v-4L12 7z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* check mark inside shield */}
      <path d="M10.2 12.3l1.2 1.2 2.4-2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── 10. Unlock PDF ────────────────────────────────────────────────────────
   Page with an open padlock */
export function UnlockPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <DocBase fill="currentColor" fillOpacity=".12" />
      {/* open shackle */}
      <path d="M9 10V8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* lock body */}
      <rect x="7.5" y="10" width="9" height="7" rx="1.2" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.4" />
      {/* keyhole */}
      <circle cx="12" cy="13" r="1" fill="currentColor" />
      <line x1="12" y1="14" x2="12" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/* ─── 11. PDF to Word ───────────────────────────────────────────────────────
   PDF document → "W" badge */
export function PdfToWordIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* source PDF page */}
      <path d="M3 3h7l3 3v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
      {/* arrow */}
      <path d="M13.5 12l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* W badge */}
      <rect x="16" y="8" width="7" height="9" rx="1.2" fill="currentColor" />
      <text x="19.5" y="15" textAnchor="middle" fontSize="6" fill="white" fontWeight="800" fontFamily="system-ui">W</text>
    </svg>
  )
}

/* ─── 12. Word to PDF ───────────────────────────────────────────────────────
   "W" source → PDF page */
export function WordToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* W source badge */}
      <rect x="1" y="8" width="7" height="9" rx="1.2" fill="currentColor" />
      <text x="4.5" y="15" textAnchor="middle" fontSize="6" fill="white" fontWeight="800" fontFamily="system-ui">W</text>
      {/* arrow */}
      <path d="M9.5 12l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* PDF page */}
      <path d="M12.5 3h7l3 3v11a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M19.5 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="15" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

/* ─── 13. PDF to JPG ────────────────────────────────────────────────────────
   PDF page → image frame with mountain icon */
export function PdfToJpgIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* source PDF page */}
      <path d="M2 3h7l3 3v11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="3.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
      {/* arrow */}
      <path d="M13 12l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* image frame */}
      <rect x="15.5" y="7" width="8" height="10" rx="1.2" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      {/* mountain + sun in image */}
      <circle cx="18" cy="10.5" r="1" fill="currentColor" />
      <path d="M16.5 16l2.5-3.5 2 2.5 1-1.5 1.5 2.5H16.5z" fill="currentColor" fillOpacity=".5" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── 14. Image (JPG) to PDF ────────────────────────────────────────────────
   Image frame → PDF page */
export function ImageToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* image frame */}
      <rect x="0.5" y="7" width="8" height="10" rx="1.2" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3" cy="10.5" r="1" fill="currentColor" />
      <path d="M1.5 16l2.5-3.5 2 2.5 1-1.5 1.5 2.5H1.5z" fill="currentColor" fillOpacity=".5" stroke="currentColor" strokeWidth=".8" strokeLinejoin="round" />
      {/* arrow */}
      <path d="M10.5 12l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* PDF page */}
      <path d="M13 3h7l3 3v11a1 1 0 0 1-1 1H13a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="14.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

/* ─── 15. Excel to PDF ──────────────────────────────────────────────────────
   Spreadsheet grid → PDF page */
export function ExcelToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* spreadsheet source */}
      <rect x="0.5" y="4" width="10" height="13" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="0.5" y1="8" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1" />
      <line x1="0.5" y1="11.5" x2="10.5" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="0.5" y1="15" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1" />
      <line x1="4.5" y1="4" x2="4.5" y2="17" stroke="currentColor" strokeWidth="1" />
      <text x="5.5" y="4.5" fontSize="4.5" fill="currentColor" fontWeight="800" fontFamily="system-ui" dominantBaseline="hanging">X</text>
      {/* arrow */}
      <path d="M12.5 11.5l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* PDF page */}
      <path d="M15 3h6l3 3v11a1 1 0 0 1-1 1H15a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M21 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="16.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

/* ─── 16. PDF to Excel ──────────────────────────────────────────────────────
   PDF page → spreadsheet grid */
export function PdfToExcelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* PDF page */}
      <path d="M2 3h7l3 3v11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="3.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
      {/* arrow */}
      <path d="M13 12l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* spreadsheet target */}
      <rect x="15.5" y="4" width="8" height="13" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="15.5" y1="8" x2="23.5" y2="8" stroke="currentColor" strokeWidth="1" />
      <line x1="15.5" y1="11.5" x2="23.5" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="15.5" y1="15" x2="23.5" y2="15" stroke="currentColor" strokeWidth="1" />
      <line x1="19" y1="4" x2="19" y2="17" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/* ─── 17. HTML to PDF ───────────────────────────────────────────────────────
   HTML brackets → PDF page */
export function HtmlToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* HTML source box */}
      <rect x="0.5" y="5" width="10" height="12" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      {/* <> brackets */}
      <path d="M3.5 9l-1.5 2 1.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9l1.5 2-1.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* slash between */}
      <line x1="6" y1="9" x2="4.8" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* arrow */}
      <path d="M12.5 11l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* PDF page */}
      <path d="M15 3h6l3 3v11a1 1 0 0 1-1 1H15a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M21 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="16.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

/* ─── 18. PowerPoint to PDF ─────────────────────────────────────────────────
   Slide frame with "P" → PDF page */
export function PptToPdfIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* slide frame (wider than tall) */}
      <rect x="0.5" y="5" width="11" height="8.5" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      {/* slide podium stand */}
      <line x1="6" y1="13.5" x2="6" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="3.5" y1="16" x2="8.5" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* P on slide */}
      <text x="3" y="12" fontSize="7" fill="currentColor" fontWeight="800" fontFamily="system-ui">P</text>
      {/* arrow */}
      <path d="M13 11l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* PDF page */}
      <path d="M15.5 3h6l3 3v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M21.5 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="17" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

/* ─── 19. PDF to PowerPoint ─────────────────────────────────────────────────
   PDF page → slide frame */
export function PdfToPptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* PDF page */}
      <path d="M2 3h7l3 3v11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 3v3h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="3.5" y="13" fontSize="5" fill="currentColor" fontWeight="700" fontFamily="system-ui">PDF</text>
      {/* arrow */}
      <path d="M13 11l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* slide frame */}
      <rect x="15.5" y="5" width="8" height="8.5" rx="1" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="19.5" y1="13.5" x2="19.5" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="17" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* P on slide */}
      <text x="17" y="12" fontSize="7" fill="currentColor" fontWeight="800" fontFamily="system-ui">P</text>
    </svg>
  )
}

/* ─── Icon Registry ─────────────────────────────────────────────────────────
   Maps tool.icon string → custom SVG component.
   Only covers tools that exist in both this project and the reference.
   All other tools continue to use Lucide icons (see tool-card.tsx). */

export const customIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MergePdf: MergePdfIcon,
  SplitPdf: SplitPdfIcon,
  CompressPdf: CompressPdfIcon,
  RotatePdf: RotatePdfIcon,
  WatermarkPdf: WatermarkPdfIcon,
  PageNumbers: PageNumbersIcon,
  OrganizePdf: OrganizePdfIcon,
  RepairPdf: RepairPdfIcon,
  ProtectPdf: ProtectPdfIcon,
  UnlockPdf: UnlockPdfIcon,
  PdfToWord: PdfToWordIcon,
  WordToPdf: WordToPdfIcon,
  PdfToJpg: PdfToJpgIcon,
  ImageToPdf: ImageToPdfIcon,
  ExcelToPdf: ExcelToPdfIcon,
  PdfToExcel: PdfToExcelIcon,
  HtmlToPdf: HtmlToPdfIcon,
  PptToPdf: PptToPdfIcon,
  PdfToPpt: PdfToPptIcon,
}
