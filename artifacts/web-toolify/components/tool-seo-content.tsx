import {
  ChevronDown,
  UploadCloud, Eye, Wand2, CheckCheck, Download,
  GripVertical, Trash2, LayoutGrid, ShieldCheck, Monitor,
  Gift, Lock, Zap, UserX, Star, Minimize2, FileOutput,
  MoveHorizontal, Copy, Type, RotateCw, ScanText, Merge,
  Scissors, FilePlus2, RefreshCw, Image, FileText,
} from 'lucide-react'

type Step  = { title: string; desc: string }
type Feat  = { title: string; desc: string }
type QA    = { q: string; a: string }

type ToolSeoData = {
  about:    string
  steps:    Step[]
  features: Feat[]
  faqs:     QA[]
}

// ── Icon resolver — picks a Lucide icon based on feature keywords ─────────────
const FEAT_ICONS: Array<{ kw: string[]; Icon: React.ComponentType<{ className?: string }> }> = [
  { kw: ['drag', 'reorder', 'move'],        Icon: GripVertical   },
  { kw: ['delete', 'remove', 'trash'],      Icon: Trash2         },
  { kw: ['preview', 'visual', 'thumbnail'], Icon: Eye            },
  { kw: ['quality', 'loss', 'sharp'],       Icon: Star           },
  { kw: ['device', 'mobile', 'phone'],      Icon: Monitor        },
  { kw: ['free', 'watermark', 'cost'],      Icon: Gift           },
  { kw: ['delet', 'secur', 'process'],      Icon: ShieldCheck    },
  { kw: ['registr', 'account', 'sign'],     Icon: UserX          },
  { kw: ['compress', 'reduc', 'size'],      Icon: Minimize2      },
  { kw: ['convert', 'output', 'format'],    Icon: FileOutput     },
  { kw: ['merge', 'combin', 'join'],        Icon: Merge          },
  { kw: ['split', 'extract', 'separar'],    Icon: Scissors       },
  { kw: ['rotat'],                          Icon: RotateCw       },
  { kw: ['scan', 'ocr', 'text'],            Icon: ScanText       },
  { kw: ['copy', 'duplicat'],               Icon: Copy           },
  { kw: ['font', 'type', 'case'],           Icon: Type           },
  { kw: ['fast', 'instant', 'speed'],       Icon: Zap            },
  { kw: ['privacy', 'private', 'safe'],     Icon: Lock           },
  { kw: ['upload', 'add', 'insert'],        Icon: UploadCloud    },
  { kw: ['image', 'photo', 'picture'],      Icon: Image          },
  { kw: ['page', 'number', 'count'],        Icon: FileText       },
  { kw: ['horizontal', 'range', 'custom'],  Icon: MoveHorizontal },
  { kw: ['unlock', 'password', 'protect'],  Icon: Lock           },
  { kw: ['repair', 'recover', 'fix'],       Icon: RefreshCw      },
  { kw: ['multiple', 'batch', 'unlimit'],   Icon: FilePlus2      },
]

function resolveIcon(title: string): React.ComponentType<{ className?: string }> {
  const lower = title.toLowerCase()
  for (const { kw, Icon } of FEAT_ICONS) {
    if (kw.some(k => lower.includes(k))) return Icon
  }
  return CheckCheck
}

// ── Step icons — first 6 steps get semantic icons ────────────────────────────
const STEP_ICONS = [UploadCloud, Eye, Wand2, CheckCheck, Download, Zap]

// ── Trust strip items ─────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { Icon: Gift,        label: '100% Free',          sub: 'No hidden charges' },
  { Icon: Lock,        label: 'Files Auto-Deleted',  sub: 'After processing' },
  { Icon: UserX,       label: 'No Sign-Up',          sub: 'Just upload & go' },
  { Icon: Monitor,     label: 'Any Device',          sub: 'Mobile & desktop' },
]

// ── Accent colours cycling through features ───────────────────────────────────
const FEAT_COLORS = [
  { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100'   },
  { bg: 'bg-violet-50', icon: 'text-violet-600',  border: 'border-violet-100' },
  { bg: 'bg-emerald-50',icon: 'text-emerald-600', border: 'border-emerald-100'},
  { bg: 'bg-amber-50',  icon: 'text-amber-600',   border: 'border-amber-100'  },
  { bg: 'bg-rose-50',   icon: 'text-rose-600',    border: 'border-rose-100'   },
  { bg: 'bg-cyan-50',   icon: 'text-cyan-600',    border: 'border-cyan-100'   },
  { bg: 'bg-indigo-50', icon: 'text-indigo-600',  border: 'border-indigo-100' },
  { bg: 'bg-teal-50',   icon: 'text-teal-600',    border: 'border-teal-100'   },
]

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════
const DATA: Record<string, ToolSeoData> = {
  'merge-pdf': {
    about: 'Toolify\'s free Merge PDF tool lets you combine multiple PDF files into one document instantly in your browser — no software to install, no account required. Whether you need to join reports, contracts, invoices, or any PDF files, ToolifyPDF makes it simple and secure. Just upload your PDF files, drag to reorder them, and download a single merged PDF in seconds.',
    steps: [
      { title: 'Upload Your PDF Files',    desc: 'Click "Choose Files" or drag and drop multiple PDF files into the upload area.' },
      { title: 'Reorder Pages',            desc: 'Drag the uploaded files to set the order you want in the final merged document.' },
      { title: 'Merge and Download',       desc: 'Click "Merge PDF" and download the combined file instantly — no sign-up required.' },
    ],
    features: [
      { title: 'Merge Multiple Files at Once', desc: 'Upload several PDF files and combine them into one single document in one click.' },
      { title: 'Drag-and-Drop Reordering', desc: 'Easily reorder files before merging to get the exact output you want.' },
      { title: 'No Quality Loss',          desc: 'Your PDF content and formatting remain intact after merging.' },
      { title: 'Fast & Free on Toolify',   desc: 'Merging happens instantly — completely free on ToolifyPDF with no hidden fees.' },
    ],
    faqs: [
      { q: 'How many PDF files can I merge at once?',    a: 'You can upload multiple PDF files at once and combine them into one document. Simply select all the files, reorder them if needed, then click Merge.' },
      { q: 'Will merging affect the quality of my PDF?', a: 'No. The text, images, and formatting in each file are preserved exactly as-is.' },
      { q: 'Is it safe to upload my files?',             a: 'Yes. Files are processed securely on ToolifyPDF servers and deleted automatically after processing.' },
      { q: 'Can I merge password-protected PDFs?',       a: 'You will need to unlock password-protected PDFs first using our Unlock PDF tool before merging.' },
    ],
  },

  'split-pdf': {
    about: 'Split PDF files online for free with Toolify. ToolifyPDF\'s Split PDF tool allows you to extract specific pages or page ranges from any PDF document without installing any software. Perfect for separating chapters, extracting a single page, or dividing a large PDF into smaller files. Upload your PDF, choose your split options, and download the result instantly.',
    steps: [
      { title: 'Upload Your PDF',        desc: 'Upload the PDF file you want to split using the file picker or drag and drop.' },
      { title: 'Choose Split Options',   desc: 'Select page ranges, specific pages, or split every page into a separate file.' },
      { title: 'Download Split Files',   desc: 'Click "Split PDF" and download each resulting file individually or as a ZIP.' },
    ],
    features: [
      { title: 'Custom Page Ranges',     desc: 'Extract any range of pages — e.g. pages 1-5, 10-15 — into separate files.' },
      { title: 'Split Every Page',       desc: 'Automatically split each page into its own PDF file with one click.' },
      { title: 'Preserves Formatting',   desc: 'All text, images, and layout are preserved in each split file.' },
      { title: 'Instant Processing',     desc: 'Split large PDFs in seconds on Toolify without installing any software.' },
    ],
    faqs: [
      { q: 'Can I extract a single page from a PDF?',   a: 'Yes. Enter that page number as both the start and end of a range (e.g. 3–3) to extract just that page.' },
      { q: 'What is the maximum file size I can split?', a: 'The tool supports PDF files up to 50 MB.' },
      { q: 'Will the split files be compressed?',       a: 'No. The content of each split file is identical to the original pages.' },
      { q: 'Can I split a password-protected PDF?',     a: 'You need to unlock it first with our Unlock PDF tool on ToolifyPDF, then split it.' },
    ],
  },

  'compress-pdf': {
    about: 'Reduce PDF file size online for free with ToolifyPDF\'s Compress PDF tool. Whether you need to email a large PDF, upload it to a form, or free up storage space, Toolify\'s PDF compressor shrinks your file while keeping text and images readable. No registration required — just upload your PDF, choose a compression level, and download the smaller file instantly.',
    steps: [
      { title: 'Upload Your PDF',             desc: 'Drag and drop your PDF or click to browse and select it from your device.' },
      { title: 'Choose Compression Level',    desc: 'Select a compression level — from light (higher quality) to strong (smallest file).' },
      { title: 'Download Compressed File',    desc: 'Click "Compress PDF" and download your smaller PDF file instantly.' },
    ],
    features: [
      { title: 'Multiple Compression Levels', desc: 'Choose between light, medium, and strong compression to balance size and quality.' },
      { title: 'Maintains Readability',       desc: 'Text and images remain clear and readable after compression.' },
      { title: 'No Watermarks Added',         desc: 'Your compressed PDF is clean — no branding or watermarks from ToolifyPDF.' },
      { title: 'Privacy First',               desc: 'Files are deleted from Toolify\'s servers immediately after processing.' },
    ],
    faqs: [
      { q: 'How much will my PDF be reduced in size?',     a: 'Typical results are 20–80% reduction depending on the content and compression level chosen.' },
      { q: 'Will compression affect text quality?',        a: 'No. Text is always fully preserved. Only image resolution may be slightly reduced at strong levels.' },
      { q: 'Can I compress a scanned PDF?',                a: 'Yes. Scanned PDFs often see the highest size reduction since they are image-heavy.' },
      { q: 'Is the compressed PDF safe to send by email?', a: 'Yes. The resulting file is a standard PDF that works in any PDF viewer.' },
    ],
  },

  'rotate-pdf': {
    about: 'Fix the orientation of your PDF pages online with Toolify\'s free Rotate PDF tool. ToolifyPDF makes it easy to rotate all pages 90°, 180°, or 270° — perfect for correcting scanned documents that appear sideways or upside down. No installation needed. Upload your PDF, choose the rotation angle, and download the corrected file in seconds.',
    steps: [
      { title: 'Upload Your PDF',        desc: 'Select the PDF file you want to rotate using the file picker or drag and drop.' },
      { title: 'Choose Rotation Angle',  desc: 'Pick 90°, 180°, or 270° clockwise rotation to apply to all pages.' },
      { title: 'Download Rotated PDF',   desc: 'Click "Rotate PDF" and download the corrected file immediately.' },
    ],
    features: [
      { title: 'Rotate All Pages at Once', desc: 'Apply the selected rotation to every page in the document in one step.' },
      { title: '90, 180, 270 Degrees',     desc: 'Full rotation control — fix landscape PDFs, upside-down scans, and more.' },
      { title: 'Works on Any PDF',         desc: 'Compatible with scanned documents, reports, presentations, and any PDF type.' },
      { title: 'No Software Needed',       desc: 'Runs entirely in the browser on Toolify — nothing to install or configure.' },
    ],
    faqs: [
      { q: 'Can I rotate only some pages?',          a: 'Currently, the tool rotates all pages at once. For selective rotation, use our Organize PDF tool on ToolifyPDF.' },
      { q: 'Does rotation affect the PDF content?',  a: 'No. Only the orientation changes — all text, images, and links remain intact.' },
      { q: 'Can I rotate a password-protected PDF?', a: 'The PDF must be unlocked first. Use our Unlock PDF tool to remove the password, then rotate.' },
      { q: 'What file size limit applies?',          a: 'You can rotate PDFs up to 50 MB in size.' },
    ],
  },

  'watermark-pdf': {
    about: 'Add a custom text watermark to any PDF online with ToolifyPDF\'s free Watermark PDF tool. Protect your documents, mark them as CONFIDENTIAL, DRAFT, or add your company name — all without installing any software. Toolify lets you control the watermark text, size, opacity, and position. Upload your PDF, customize your watermark, and download the result instantly.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF file you want to watermark via drag-and-drop or file picker.' },
      { title: 'Customize Your Watermark', desc: 'Enter your watermark text, then adjust font size, opacity, and position.' },
      { title: 'Apply and Download',       desc: 'Click "Add Watermark" and download the watermarked PDF file.' },
    ],
    features: [
      { title: 'Custom Text Watermark',   desc: 'Add any text — company name, CONFIDENTIAL, DRAFT — as your watermark.' },
      { title: 'Opacity Control',         desc: 'Adjust transparency so the watermark is visible without obscuring content.' },
      { title: 'Position Options',        desc: 'Place the watermark at the center, corner, or diagonally across each page.' },
      { title: 'Applied to All Pages',    desc: 'The watermark is automatically added to every page of your document.' },
    ],
    faqs: [
      { q: 'Can I add an image watermark?',     a: 'Currently only text watermarks are supported. Image watermark support is planned for a future Toolify update.' },
      { q: 'Will the watermark be permanent?',  a: 'Yes. The watermark is embedded into the PDF pages and cannot be easily removed.' },
      { q: 'Can I control the watermark size?', a: 'Yes. You can adjust the font size and opacity to control how prominent the watermark appears.' },
      { q: 'Does it work on scanned PDFs?',     a: 'Yes. The watermark is added as an overlay on top of each page, including scanned documents.' },
    ],
  },

  'page-numbers': {
    about: 'Add page numbers to any PDF document online for free using ToolifyPDF\'s Page Numbers tool. Whether you\'re preparing a report, thesis, or contract, Toolify lets you add professional page numbers in your preferred position — bottom center, corners, or top — without any software installation. Upload your PDF, configure the style, and download the numbered document instantly.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF you want to add page numbers to.' },
      { title: 'Configure Page Numbers',   desc: 'Choose position (bottom center, corner, etc.), starting number, and format.' },
      { title: 'Download Numbered PDF',    desc: 'Click "Add Page Numbers" and download the updated file.' },
    ],
    features: [
      { title: 'Flexible Positioning',     desc: 'Place page numbers at the bottom center, bottom left, bottom right, top, or corners.' },
      { title: 'Custom Starting Number',   desc: 'Start numbering from any page number — useful for document chapters.' },
      { title: 'Applied to All Pages',     desc: 'Page numbers are added consistently to every page of the document.' },
      { title: 'Professional Output',      desc: 'Clean, readable page numbers that match standard document formatting.' },
    ],
    faqs: [
      { q: 'Can I skip adding numbers to the first page?', a: 'Yes. You can configure the tool to start numbering from page 2, which is common for title pages.' },
      { q: 'Can I choose the font or color?',              a: 'Basic font and color options are available. Full customization is being added in a future Toolify update.' },
      { q: 'Will page numbers appear on all pages?',       a: 'Yes. The tool adds numbers to every page in the document by default.' },
      { q: 'Is there a file size limit?',                  a: 'You can process PDF files up to 50 MB on ToolifyPDF.' },
    ],
  },

  'organize-pdf': {
    about: 'Need to rearrange or delete pages in a PDF? ToolifyPDF\'s free Organize PDF tool gives you full visual control over every page — without installing any software or creating an account. Whether you\'re removing a blank page, reordering chapters in a report, swapping two pages in a contract, or cleaning up a multi-page scanned document, Toolify makes the entire process simple.\n\nJust upload your PDF and instantly see thumbnail previews of every page. Hold any page thumbnail and drag it to a new position. Tap the trash icon to remove any unwanted page. Want to reorder many pages at once? No problem — the tool handles PDFs with hundreds of pages smoothly. Nothing is written to your file until you click the download button, so you can arrange freely before committing.\n\nEverything runs securely and privately — your file is never permanently stored on our servers and is deleted immediately after your session ends. No watermarks, no quality loss on any remaining page, and no hidden fees. Works on Windows, Mac, Linux, iOS, and Android. 100% free, forever.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Drag and drop your PDF file into the upload area, or click to browse and select it from your device. Files up to 50 MB are supported.' },
      { title: 'Preview All Pages',        desc: 'Toolify instantly renders thumbnail previews of every page so you can see exactly what you\'re working with before making any changes.' },
      { title: 'Reorder or Delete Pages',  desc: 'Hold any page thumbnail for half a second until it activates, then drag it to a new position. Tap the trash icon on any thumbnail to remove that page from the document.' },
      { title: 'Review Your New Order',    desc: 'Check the final arrangement in the grid. If anything looks wrong, keep rearranging — nothing is saved until you click the download button.' },
      { title: 'Download Your Organized PDF', desc: 'Click "Download Organized PDF" to generate and save your reorganized file instantly. No sign-up or waiting required.' },
    ],
    features: [
      { title: 'Drag-and-Drop Reordering',    desc: 'Hold any page thumbnail and drag it to a new position. The intuitive touch-friendly interface works on both desktop and mobile devices.' },
      { title: 'Delete Any Page Instantly',   desc: 'Remove unwanted pages — blank pages, cover pages, or repeated content — with a single tap on the trash icon.' },
      { title: 'Visual Page Previews',        desc: 'Every page is rendered as a thumbnail so you can see exactly what\'s on each page before reorganizing — no guessing by page number.' },
      { title: 'No Quality Loss',             desc: 'Rearranging or deleting pages does not compress, re-render, or alter any page content. Text sharpness and image quality are fully preserved.' },
      { title: 'Works on Any Device',         desc: 'Fully functional on Windows, Mac, Linux, iOS, and Android — no app download needed. Just open Toolify in any modern browser.' },
      { title: 'Completely Free, No Watermark', desc: 'The organized PDF you download is clean — no Toolify branding, no watermarks, and no hidden charges. 100% free forever.' },
      { title: 'Files Deleted After Processing', desc: 'Your uploaded PDF is never stored on our servers beyond the active session. Files are permanently deleted as soon as you download your result.' },
      { title: 'No Registration Required',    desc: 'Start organizing your PDF immediately — no account, no email, no subscription. Just upload and go.' },
    ],
    faqs: [
      { q: 'How do I rearrange pages in a PDF online for free?',
        a: 'Upload your PDF to ToolifyPDF\'s Organize PDF tool. You\'ll see thumbnail previews of every page. Hold any thumbnail until it activates, drag it to the new position you want, then click "Download Organized PDF" to save the result. It\'s completely free with no sign-up required.' },
      { q: 'Can I delete pages from a PDF without losing quality?',
        a: 'Yes. Deleting pages on Toolify does not affect the remaining pages in any way. The content, fonts, images, and resolution of every kept page remain exactly as in the original file.' },
      { q: 'Can I reorder PDF pages on my phone or tablet?',
        a: 'Yes. The tool is fully mobile-friendly and works on iPhone, Android, and tablets. Use a long press to activate drag mode, then slide the page thumbnail to its new position.' },
      { q: 'Is it safe to upload my PDF to reorganize it?',
        a: 'Yes. All processing happens securely in your browser session. Your file is never permanently stored on Toolify\'s servers and is deleted automatically after your session ends. We do not share or analyze your file contents.' },
      { q: 'What is the maximum PDF size I can organize?',
        a: 'You can upload and organize PDF files up to 50 MB. For very large PDFs with many pages, thumbnail rendering may take a few extra seconds, but the tool handles hundreds of pages without issues.' },
      { q: 'Can I undo a page move or deletion?',
        a: 'Page moves can be reversed by dragging back. If you delete a page by mistake, click "Clear" to reset and re-upload your original file — no changes are saved until you download.' },
      { q: 'Can I use Organize PDF together with Split PDF or Merge PDF?',
        a: 'Absolutely. A common workflow is to use Organize PDF to remove unwanted pages and reorder the rest, then use Split PDF to divide the result into separate files, or Merge PDF to combine it with another document — all free on ToolifyPDF.' },
      { q: 'Will organizing my PDF change the file size?',
        a: 'The file size will reflect the pages you keep. Removing pages reduces the size proportionally. No additional compression is applied, so the quality of remaining pages is identical to the original.' },
      { q: 'Can I organize a password-protected PDF?',
        a: 'Password-protected PDFs need to be unlocked first. Use ToolifyPDF\'s free Unlock PDF tool to remove the password, then come back to Organize PDF to rearrange your pages.' },
      { q: 'Does reorganizing pages affect embedded links or bookmarks?',
        a: 'Internal bookmarks pointing to specific page numbers may shift after reordering. External hyperlinks embedded within page content are not affected.' },
    ],
  },

  'repair-pdf': {
    about: 'Recover and repair corrupted or damaged PDF files online with Toolify\'s free Repair PDF tool. ToolifyPDF automatically analyzes the internal structure of your PDF and attempts to rebuild it, recovering text, images, and pages from partially corrupted files. No technical skills needed — just upload the damaged PDF and Toolify does the rest.',
    steps: [
      { title: 'Upload the Damaged PDF', desc: 'Upload the corrupted or damaged PDF file using the file picker.' },
      { title: 'Automatic Repair',       desc: 'The tool analyzes the file structure and attempts to recover all readable content.' },
      { title: 'Download Repaired File', desc: 'Download the repaired PDF if recovery was successful.' },
    ],
    features: [
      { title: 'Automatic Structure Repair', desc: 'Rebuilds the internal PDF structure to restore readability.' },
      { title: 'Content Recovery',           desc: 'Recovers text, images, and pages from partially corrupted files.' },
      { title: 'No Technical Skills Needed', desc: 'Just upload the file — the repair process is fully automatic on Toolify.' },
      { title: 'Safe and Private',           desc: 'Files are deleted from ToolifyPDF servers after processing.' },
    ],
    faqs: [
      { q: 'Can all PDF files be repaired?',       a: 'Not always. Severely corrupted files may not be fully recoverable, but Toolify will save whatever it can.' },
      { q: 'Why is my PDF corrupted?',             a: 'Common causes include interrupted downloads, storage errors, or incomplete file transfers.' },
      { q: 'Will the repaired PDF look the same?', a: 'Minor formatting differences may occur depending on how much data was recoverable.' },
      { q: 'Is there a size limit for repair?',    a: 'You can attempt to repair PDF files up to 50 MB on ToolifyPDF.' },
    ],
  },

  'protect-pdf': {
    about: 'Password-protect your PDF files online for free with ToolifyPDF\'s Protect PDF tool. Toolify uses industry-standard AES encryption to lock your documents, preventing unauthorized access, printing, or copying. No software installation is needed. Upload your PDF, set a strong password and your permission preferences, and download the encrypted file instantly.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF you want to password-protect.' },
      { title: 'Set a Password',           desc: 'Enter a strong password and choose your permission settings (printing, copying, etc.).' },
      { title: 'Download Protected PDF',   desc: 'Click "Protect PDF" and download your encrypted, password-locked file.' },
    ],
    features: [
      { title: 'AES Password Encryption',  desc: 'Your PDF is encrypted using industry-standard AES encryption on Toolify.' },
      { title: 'Permission Controls',      desc: 'Restrict printing, copying text, and editing independently.' },
      { title: 'Open Password Support',    desc: 'Set a password that must be entered before the PDF can even be opened.' },
      { title: 'No Registration Required', desc: 'Protect your PDF in seconds on ToolifyPDF — no account or subscription needed.' },
    ],
    faqs: [
      { q: 'What encryption is used?',                                  a: 'Toolify uses AES-128 or AES-256 encryption depending on your settings, which is industry standard.' },
      { q: 'Can the password be recovered?',                            a: 'No. If you lose the password, the file cannot be unlocked. Keep it in a safe place.' },
      { q: 'Can I set different passwords for opening and editing?',    a: 'Yes. You can set an open password and separately set an owner password for permissions.' },
      { q: 'Does protection affect PDF quality?',                       a: 'No. Adding a password does not change the content, quality, or size of your PDF.' },
    ],
  },

  'unlock-pdf': {
    about: 'Remove passwords from PDF files online with Toolify\'s free Unlock PDF tool. If you own a password-protected PDF and know its password, ToolifyPDF can remove the protection instantly — making the document freely accessible without needing to re-enter the password every time. All processing is done securely, and files are deleted immediately after unlocking.',
    steps: [
      { title: 'Upload Your Protected PDF', desc: 'Upload the password-locked PDF you want to unlock.' },
      { title: 'Enter the Password',        desc: 'Provide the correct password to authorize the unlocking process.' },
      { title: 'Download Unlocked PDF',     desc: 'Click "Unlock PDF" and download the unrestricted version of your file.' },
    ],
    features: [
      { title: 'Remove Password Instantly',       desc: 'Unlock any password-protected PDF in seconds as long as you know the password.' },
      { title: 'Removes Print/Copy Restrictions', desc: 'Also removes editing, printing, and copying restrictions from PDFs.' },
      { title: 'Works with Any PDF Viewer',       desc: 'The unlocked file opens normally in all PDF readers without any password prompt.' },
      { title: 'Files Deleted After Processing',  desc: 'Your uploaded files are securely deleted immediately after the process completes on Toolify.' },
    ],
    faqs: [
      { q: 'Can I unlock a PDF without knowing the password?', a: 'No. You must have the correct password. This tool is for files you already own and have authorization to unlock.' },
      { q: 'What if I enter the wrong password?',             a: 'ToolifyPDF will show an error. Double-check the password and try again.' },
      { q: 'Is it legal to unlock a PDF?',                    a: 'Yes, if you own the file or have been given the password by the owner.' },
      { q: 'Does unlocking change the PDF content?',         a: 'No. Only the password and restriction flags are removed — all content stays identical.' },
    ],
  },

  'image-to-pdf': {
    about: 'Convert JPG to PDF and other image formats to PDF online for free with Toolify. ToolifyPDF\'s Image to PDF converter lets you turn JPG, PNG, WebP, BMP, and other image files into a professional PDF document in seconds. Upload one or multiple images, arrange them in the order you want, and download a clean multi-page PDF — no account required.',
    steps: [
      { title: 'Upload Your Images',      desc: 'Upload JPG, PNG, WebP, or other image files. You can add multiple images at once.' },
      { title: 'Arrange the Order',       desc: 'Drag images to set the page order in the final PDF.' },
      { title: 'Convert and Download',    desc: 'Click "Convert to PDF" and download the ready PDF file.' },
    ],
    features: [
      { title: 'JPG to PDF and More',        desc: 'Supports JPG to PDF, PNG to PDF, WebP, BMP, GIF, and TIFF input images.' },
      { title: 'Multiple Images to One PDF', desc: 'Combine many images into a single multi-page PDF document on Toolify.' },
      { title: 'Maintains Image Quality',    desc: 'Images are embedded at full resolution to preserve sharpness.' },
      { title: 'No Watermarks',              desc: 'Your resulting PDF is clean — no logos or watermarks added by ToolifyPDF.' },
    ],
    faqs: [
      { q: 'Which image formats are supported?',                    a: 'JPG to PDF, PNG to PDF, WebP, BMP, GIF, and TIFF are all supported on ToolifyPDF.' },
      { q: 'Can I create a multi-page PDF from multiple images?',   a: 'Yes. Upload multiple images and each one becomes a separate page in the PDF.' },
      { q: 'What is the maximum file size per image?',              a: 'Each image can be up to 50 MB.' },
      { q: 'Will the image quality be reduced?',                    a: 'No. Images are embedded at their original resolution.' },
    ],
  },

  'pdf-to-jpg': {
    about: 'Convert PDF pages to JPG images online for free with ToolifyPDF\'s PDF to JPG converter. Toolify renders each page of your PDF as a high-quality JPG image — perfect for sharing on social media, embedding in presentations, or previewing document pages. No installation required. Upload your PDF, select the quality, and download all pages as images or a ZIP file.',
    steps: [
      { title: 'Upload Your PDF',         desc: 'Upload the PDF you want to convert to images.' },
      { title: 'Choose Output Settings',  desc: 'Select image quality and resolution for the output JPG files.' },
      { title: 'Download Images',         desc: 'Download each page as a separate JPG or download all as a ZIP archive.' },
    ],
    features: [
      { title: 'High-Resolution Output',  desc: 'Convert PDF pages to high-quality JPG images suitable for print and screen.' },
      { title: 'All Pages Converted',     desc: 'Every page in the PDF becomes a separate JPG image automatically.' },
      { title: 'ZIP Download Option',     desc: 'Download all converted images at once as a convenient ZIP archive on Toolify.' },
      { title: 'Adjustable Quality',      desc: 'Choose the image quality to balance file size and visual clarity.' },
    ],
    faqs: [
      { q: 'Does it convert all pages at once?',          a: 'Yes. All pages in the PDF are converted and available for download individually or as a ZIP on ToolifyPDF.' },
      { q: 'What DPI are the output images?',             a: 'Output resolution can typically be set to 150 or 300 DPI depending on quality settings.' },
      { q: 'Can I convert only one page?',                a: 'You can download individual pages from the output — you do not have to download all of them.' },
      { q: 'Are PDF annotations included in the image?',  a: 'Yes. The images represent the full visual content of each page including annotations.' },
    ],
  },

  'pdf-to-word': {
    about: 'Convert PDF to Word documents online for free with ToolifyPDF\'s PDF to Word converter. Toolify\'s PDF to Word converter extracts text, tables, and formatting from your PDF and delivers a fully editable .docx file compatible with Microsoft Word and Google Docs. Whether it\'s a scanned document or a digital PDF, ToolifyPDF handles it with OCR technology. No sign-up needed.',
    steps: [
      { title: 'Upload Your PDF',        desc: 'Upload the PDF file you want to convert to a Word document.' },
      { title: 'Start Conversion',       desc: 'Click "Convert to Word" — the tool processes text, tables, and layout automatically.' },
      { title: 'Download Word File',     desc: 'Download the resulting .docx file ready to edit in Microsoft Word or Google Docs.' },
    ],
    features: [
      { title: 'Editable Word Output',    desc: 'Get a fully editable .docx file with text, headings, and paragraphs preserved.' },
      { title: 'Table Recognition',       desc: 'Tables in the PDF are converted into editable Word tables.' },
      { title: 'Layout Preservation',     desc: 'Headings, paragraphs, and formatting are maintained as closely as possible.' },
      { title: 'OCR for Scanned PDFs',    desc: 'Toolify\'s PDF to Word converter uses OCR technology to extract text from scanned PDF pages too.' },
    ],
    faqs: [
      { q: 'Will the formatting be perfect after conversion?', a: 'Most formatting is preserved, but complex layouts may differ slightly due to PDF structure differences.' },
      { q: 'Can I convert scanned PDFs to Word?',             a: 'Yes. ToolifyPDF\'s PDF to Word converter uses OCR to extract text from scanned pages.' },
      { q: 'What Word format will I get?',                    a: 'You will receive a standard .docx file compatible with Microsoft Word and Google Docs.' },
      { q: 'Is this the best free PDF to Word converter?',    a: 'Toolify\'s PDF to Word converter is completely free, requires no sign-up, and processes your file securely with no file size restrictions beyond 50 MB.' },
    ],
  },

  'word-to-pdf': {
    about: 'Convert Word documents to PDF online for free with Toolify. ToolifyPDF\'s Word to PDF converter turns your .doc and .docx files into universally compatible PDF documents while preserving all fonts, images, tables, and formatting. Share your documents with anyone on any device — no Microsoft Word needed to open the result. Upload and convert instantly.',
    steps: [
      { title: 'Upload Your Word File',  desc: 'Upload a .doc or .docx file from your computer.' },
      { title: 'Convert Automatically',  desc: 'The tool converts your Word document to PDF while preserving all formatting.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF — ready to share, print, or archive.' },
    ],
    features: [
      { title: 'Perfect Formatting',      desc: 'Fonts, images, tables, and layout are preserved exactly as in your Word document.' },
      { title: 'Universal Compatibility', desc: 'The output PDF opens on any device without needing Microsoft Word installed.' },
      { title: 'Fast Conversion',         desc: 'Convert even lengthy Word documents to PDF in just a few seconds on Toolify.' },
      { title: 'No Quality Loss',         desc: 'Text, images, and vector graphics are all embedded at full quality.' },
    ],
    faqs: [
      { q: 'Does it support .doc and .docx?',              a: 'Yes. Both older .doc and modern .docx formats are fully supported on ToolifyPDF.' },
      { q: 'Will embedded images be included in the PDF?', a: 'Yes. All images embedded in the Word file are included in the PDF at full quality.' },
      { q: 'What is the maximum file size?',               a: 'You can convert Word files up to 50 MB.' },
      { q: 'Can I convert Word files with tracked changes?', a: 'Yes, but tracked changes will appear in their accepted or rejected final state in the PDF.' },
    ],
  },

  'excel-to-pdf': {
    about: 'Convert Excel spreadsheets to PDF online for free with ToolifyPDF. Toolify\'s Excel to PDF converter preserves your rows, columns, charts, and cell formatting — delivering a print-ready PDF that looks exactly like your spreadsheet. No Microsoft Excel installation needed. Upload your .xlsx or .xls file and download the PDF in seconds.',
    steps: [
      { title: 'Upload Your Excel File', desc: 'Upload an .xlsx or .xls spreadsheet file.' },
      { title: 'Automatic Conversion',   desc: 'The tool converts each worksheet into a PDF page, preserving tables and formatting.' },
      { title: 'Download PDF',           desc: 'Download the converted PDF file ready for sharing or printing.' },
    ],
    features: [
      { title: 'Preserves Spreadsheet Layout', desc: 'Rows, columns, borders, and cell formatting are maintained in the PDF output.' },
      { title: 'Multi-Sheet Support',          desc: 'All sheets in the workbook are converted and included in the PDF.' },
      { title: 'Print-Ready Output',           desc: 'The resulting PDF is formatted for standard page sizes, ready to print.' },
      { title: 'No Excel Required',            desc: 'Convert spreadsheets to PDF on Toolify without having Microsoft Excel installed.' },
    ],
    faqs: [
      { q: 'Are all sheets converted?',           a: 'Yes. Every worksheet in the workbook is included as pages in the resulting PDF.' },
      { q: 'What Excel formats are supported?',   a: '.xlsx and .xls files are both supported on ToolifyPDF.' },
      { q: 'Will charts and graphs be included?', a: 'Yes. Charts embedded in the spreadsheet are rendered in the PDF output.' },
      { q: 'What is the file size limit?',        a: 'Excel files up to 50 MB can be converted on Toolify.' },
    ],
  },

  'html-to-pdf': {
    about: 'Convert HTML pages and websites to PDF online for free with ToolifyPDF. Toolify\'s HTML to PDF converter renders your HTML and CSS into a clean, printable PDF — with styles, fonts, and images included. You can either paste HTML code directly or enter a public webpage URL to convert. No software installation needed.',
    steps: [
      { title: 'Enter HTML or URL',      desc: 'Paste your HTML code directly or enter a webpage URL to convert.' },
      { title: 'Convert to PDF',         desc: 'Click "Convert" — the tool renders the HTML and generates a PDF.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF file.' },
    ],
    features: [
      { title: 'Renders CSS Styles',         desc: 'CSS styling, fonts, colors, and layouts are fully rendered in the output PDF.' },
      { title: 'Supports URL Input',         desc: 'Enter a public webpage URL to convert a live website to PDF on Toolify.' },
      { title: 'Handles Responsive Layouts', desc: 'The tool renders content at a standard desktop viewport for consistent output.' },
      { title: 'Clean PDF Output',           desc: 'The generated PDF is a clean, printable version of your HTML content.' },
    ],
    faqs: [
      { q: 'Can I convert a live website to PDF?',    a: 'Yes. Enter the full URL of any publicly accessible webpage into ToolifyPDF.' },
      { q: 'Will JavaScript be executed?',            a: 'Basic JavaScript is executed during rendering, but complex interactive elements may not render fully.' },
      { q: 'Are external fonts and images included?', a: 'Yes, if they are publicly accessible — the renderer fetches external resources during conversion.' },
      { q: 'What page size is the output?',           a: 'The default output is A4. Page size options may vary.' },
    ],
  },

  'ppt-to-pdf': {
    about: 'Convert PowerPoint presentations to PDF online for free with ToolifyPDF. Toolify\'s PPT to PDF converter turns every slide into a PDF page — preserving images, charts, fonts, and layout. Share your presentation with anyone without needing PowerPoint installed. Supports both .ppt and .pptx formats. Upload and convert instantly, no account required.',
    steps: [
      { title: 'Upload Your PowerPoint', desc: 'Upload a .pptx or .ppt presentation file.' },
      { title: 'Automatic Conversion',   desc: 'Each slide is converted to a PDF page with all content preserved.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF — one page per slide.' },
    ],
    features: [
      { title: 'All Slides Converted',   desc: 'Every slide in the presentation becomes a page in the PDF.' },
      { title: 'Preserves Visuals',      desc: 'Images, charts, and shapes on slides are included at high quality.' },
      { title: 'Font & Color Retention', desc: 'Fonts, colors, and text formatting are preserved as closely as possible.' },
      { title: 'No PowerPoint Required', desc: 'Convert presentations to PDF on ToolifyPDF without having Microsoft PowerPoint installed.' },
    ],
    faqs: [
      { q: 'Does it support both .ppt and .pptx?', a: 'Yes. Both older .ppt and modern .pptx formats are supported on Toolify.' },
      { q: 'Will animations be preserved?',        a: 'No. Animations are not shown in static PDF pages — slides appear in their final resting state.' },
      { q: 'Are speaker notes included?',          a: 'Speaker notes are not included in the output by default.' },
      { q: 'What is the slide size in the PDF?',   a: 'Slides are exported to standard A4 or widescreen format depending on the original slide dimensions.' },
    ],
  },

  'pdf-to-ppt': {
    about: 'Convert PDF files to PowerPoint presentations online for free with Toolify. ToolifyPDF\'s PDF to PPT converter turns each PDF page into an editable slide in a .pptx file — ready to open and edit in Microsoft PowerPoint or Google Slides. Great for repurposing existing PDF reports into presentation format without recreating slides from scratch.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF file you want to convert to a PowerPoint presentation.' },
      { title: 'Convert Automatically',    desc: 'Each PDF page is converted to a PowerPoint slide.' },
      { title: 'Download Presentation',    desc: 'Download the .pptx file ready to open and edit in PowerPoint.' },
    ],
    features: [
      { title: 'One Slide Per Page',       desc: 'Each page of the PDF becomes an editable slide in the presentation.' },
      { title: 'Editable Output',          desc: 'Text and images on slides can be edited in Microsoft PowerPoint or Google Slides.' },
      { title: 'Visual Fidelity',          desc: 'The appearance of each slide closely matches the original PDF page.' },
      { title: 'Fast Processing',          desc: 'Multi-page PDFs are converted in seconds on ToolifyPDF.' },
    ],
    faqs: [
      { q: 'Will the text be editable in PowerPoint?', a: 'Yes. Text extracted from the PDF becomes editable text boxes in the slides.' },
      { q: 'What if the PDF has complex layouts?',     a: 'Complex layouts may be approximated — Toolify does its best to match the original visual.' },
      { q: 'Can I convert a scanned PDF to PPT?',     a: 'Scanned PDFs are converted as image slides since there is no selectable text to extract.' },
      { q: 'What file size is supported?',            a: 'PDF files up to 50 MB can be converted on ToolifyPDF.' },
    ],
  },

  'pdf-to-excel': {
    about: 'Extract tables and data from PDF files and convert them to Excel spreadsheets online for free with ToolifyPDF. Toolify\'s PDF to Excel converter automatically detects tables in your PDF and converts them into editable rows and columns in a .xlsx file — saving hours of manual data entry. No installation needed. Upload your PDF and download the Excel file instantly.',
    steps: [
      { title: 'Upload Your PDF',         desc: 'Upload the PDF containing the tables or data you want to extract.' },
      { title: 'Convert to Excel',        desc: 'The tool detects tables and converts them into spreadsheet rows and columns.' },
      { title: 'Download Excel File',     desc: 'Download the .xlsx file ready to open and edit in Microsoft Excel or Google Sheets.' },
    ],
    features: [
      { title: 'Automatic Table Detection', desc: 'Automatically identifies and extracts tables from PDF pages.' },
      { title: 'Editable Spreadsheet',      desc: 'Output is a fully editable .xlsx file with cells, rows, and columns.' },
      { title: 'Multi-Page Support',        desc: 'Tables from all pages of the PDF are extracted and included in the workbook.' },
      { title: 'No Excel Required',         desc: 'Convert and download on Toolify without having Microsoft Excel installed.' },
    ],
    faqs: [
      { q: 'What kinds of data can be extracted?',    a: 'The tool is best at extracting structured table data — rows, columns, and numeric data.' },
      { q: 'What if my PDF has no tables?',           a: 'The output may be less structured, with text placed in cells as best as possible.' },
      { q: 'Can it handle scanned PDFs?',             a: 'Scanned PDFs may not yield editable cell data since there is no machine-readable text.' },
      { q: 'What is the maximum file size?',          a: 'PDF files up to 50 MB are supported on ToolifyPDF.' },
    ],
  },

  'compress-image': {
    about: 'Reduce image file size online for free with ToolifyPDF\'s Compress Image tool. Toolify intelligently compresses JPG, PNG, WebP, and AVIF images with minimal visible quality loss — perfect for websites, email attachments, and social media. No account required. Upload your image, choose your compression settings, and download the smaller file instantly.',
    steps: [
      { title: 'Upload Your Image',         desc: 'Upload a JPG, PNG, WebP, or AVIF image using drag-and-drop or the file picker.' },
      { title: 'Choose Quality Settings',   desc: 'Adjust the compression level and output format to suit your needs.' },
      { title: 'Download Compressed Image', desc: 'Click "Compress" and download your smaller image file instantly.' },
    ],
    features: [
      { title: 'Smart Compression',        desc: 'Automatically finds the best quality level that reduces file size without visible degradation.' },
      { title: 'Multiple Output Formats',  desc: 'Compress and convert to JPG, PNG, WebP, or AVIF for maximum savings.' },
      { title: 'Preserves Visual Quality', desc: 'The result looks identical or very close to the original at a fraction of the file size.' },
      { title: 'No Watermarks',            desc: 'Your compressed image is clean — no branding added by ToolifyPDF.' },
    ],
    faqs: [
      { q: 'How much will my image be compressed?',   a: 'Typical results are 30–80% reduction in file size depending on the image type and settings.' },
      { q: 'Which formats are supported?',            a: 'JPG, PNG, WebP, and AVIF are all supported for input and output on Toolify.' },
      { q: 'Will the image lose visible quality?',    a: 'The tool intelligently selects quality settings to minimize visible differences while reducing file size.' },
      { q: 'Can I compress multiple images at once?', a: 'Currently one image is compressed per operation. Batch support is planned for ToolifyPDF.' },
    ],
  },

  'resize-image': {
    about: 'Resize images online for free with Toolify\'s Resize Image tool. ToolifyPDF lets you scale any JPG, PNG, or WebP image to exact pixel dimensions — with optional aspect ratio lock to prevent distortion. Perfect for social media sizes, profile pictures, email attachments, or web optimization. Upload your image, set your dimensions, and download instantly.',
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload the image you want to resize.' },
      { title: 'Set New Dimensions',       desc: 'Enter the target width and/or height in pixels. Aspect ratio lock is available.' },
      { title: 'Download Resized Image',   desc: 'Click "Resize" and download the resized image file.' },
    ],
    features: [
      { title: 'Pixel-Perfect Resizing',    desc: 'Set exact dimensions in pixels for precise output size control.' },
      { title: 'Aspect Ratio Lock',         desc: 'Automatically maintains the original proportions when you change one dimension.' },
      { title: 'Supports All Major Formats', desc: 'Resize JPG, PNG, WebP, and other common image formats on Toolify.' },
      { title: 'No Quality Loss',           desc: 'High-quality downsampling preserves image sharpness after resizing.' },
    ],
    faqs: [
      { q: 'Can I resize to a specific pixel size?', a: 'Yes. Enter exact width and height values in pixels for precise control on ToolifyPDF.' },
      { q: 'Will the image be distorted?',           a: 'Not if you use aspect ratio lock. The proportions are maintained automatically.' },
      { q: 'What is the maximum output size?',       a: 'You can resize up to very large dimensions. Very high megapixel outputs may take longer to process.' },
      { q: 'Which image formats are supported?',     a: 'JPG, PNG, WebP, AVIF, and GIF are all supported on Toolify.' },
    ],
  },

  'convert-image': {
    about: 'Convert images between formats online for free with ToolifyPDF\'s Image Converter. Toolify supports conversion between JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, and more — with quality control options. Whether you need to convert PNG to JPG to reduce file size, or JPG to WebP for web performance, Toolify handles it in seconds without any software installation.',
    steps: [
      { title: 'Upload Your Image',         desc: 'Upload the image you want to convert — JPG, PNG, WebP, AVIF, or others.' },
      { title: 'Choose Output Format',      desc: 'Select the target format you want to convert to.' },
      { title: 'Download Converted Image',  desc: 'Click "Convert" and download the image in the new format.' },
    ],
    features: [
      { title: 'Wide Format Support',      desc: 'Convert between JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, and more on Toolify.' },
      { title: 'Quality Control',          desc: 'Choose output quality to balance file size and image sharpness.' },
      { title: 'Instant Conversion',       desc: 'Conversions are processed in seconds with no software installation required.' },
      { title: 'No Watermarks',            desc: 'Your converted image is delivered clean, with no added branding from ToolifyPDF.' },
    ],
    faqs: [
      { q: 'Which formats can I convert between?',        a: 'JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF are all supported on ToolifyPDF.' },
      { q: 'Will converting reduce image quality?',       a: 'Converting to lossy formats like JPG may reduce quality slightly. Converting to PNG is lossless.' },
      { q: 'Can I convert PNG with transparency to JPG?', a: 'Yes, but the transparent areas will be filled with a white background since JPG does not support transparency.' },
      { q: 'Is there a file size limit?',                 a: 'You can convert images up to 50 MB on Toolify.' },
    ],
  },

  'crop-image': {
    about: 'Crop images online for free with Toolify\'s Crop Image tool. ToolifyPDF provides an interactive drag-and-drop crop interface with aspect ratio presets — perfect for creating square thumbnails, 16:9 banners, profile pictures, and more. No software installation needed. Upload your image, select your crop area, and download the result instantly.',
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload the image you want to crop.' },
      { title: 'Select Crop Area',         desc: 'Drag the crop handles to select the area you want to keep.' },
      { title: 'Download Cropped Image',   desc: 'Click "Crop" and download the cropped image.' },
    ],
    features: [
      { title: 'Interactive Crop Tool',    desc: 'Use an intuitive drag-and-drop interface to select your crop area precisely.' },
      { title: 'Aspect Ratio Presets',     desc: 'Crop to common ratios like 1:1, 4:3, 16:9, or use a custom size on Toolify.' },
      { title: 'Pixel-Accurate Output',    desc: 'The cropped image is saved at the exact pixel dimensions you selected.' },
      { title: 'Supports All Major Formats', desc: 'Crop JPG, PNG, WebP, and other common image formats on ToolifyPDF.' },
    ],
    faqs: [
      { q: 'Can I crop to a specific aspect ratio?',        a: 'Yes. Common presets like 1:1 (square), 16:9, and 4:3 are available, or set custom dimensions.' },
      { q: 'Will the image quality change after cropping?', a: 'No. Cropping is non-destructive — it only removes the parts outside your selection.' },
      { q: 'What formats are supported?',                   a: 'JPG, PNG, WebP, AVIF, and GIF are all supported for cropping on Toolify.' },
      { q: 'Can I undo a crop?',                            a: 'Yes — changes are only applied after clicking the Crop button, so you can adjust the selection freely.' },
    ],
  },

  'pdf-editor': {
    about: 'Edit PDF files online for free with ToolifyPDF\'s powerful PDF Editor. Toolify lets you add text, draw freehand, highlight content, insert images, sign documents, add sticky notes, create shapes, and manage pages — all directly in your browser without installing any software. The ToolifyPDF editor works on desktop and mobile and requires no account.',
    steps: [
      { title: 'Upload Your PDF',           desc: 'Upload the PDF you want to edit using the file picker or drag-and-drop.' },
      { title: 'Use the Editing Tools',     desc: 'Add text, draw, highlight, insert images, sign, or annotate using the toolbar.' },
      { title: 'Download Edited PDF',       desc: 'Click Download to save your edited PDF with all annotations embedded.' },
    ],
    features: [
      { title: 'Add Text Anywhere',         desc: 'Click any location on the PDF page and type to add text boxes.' },
      { title: 'Freehand Drawing',          desc: 'Draw, sketch, or annotate directly on PDF pages with a pen or finger.' },
      { title: 'Insert Images & Signatures', desc: 'Upload images or create a digital signature and place it anywhere on the page.' },
      { title: 'Highlight & Annotate',      desc: 'Highlight text, add comments, sticky notes, and shapes to any PDF on Toolify.' },
    ],
    faqs: [
      { q: 'Can I edit text that is already in the PDF?', a: 'You can add new text on top of existing content. Editing original PDF text requires a full PDF editor application.' },
      { q: 'Can I add a signature to a PDF?',             a: 'Yes. Draw, type, or upload an image of your signature and place it anywhere on the document using ToolifyPDF.' },
      { q: 'Will the edits be permanent?',                a: 'Yes. When you download the edited PDF, all annotations and additions are embedded permanently.' },
      { q: 'Does it work on mobile?',                     a: 'Yes. The Toolify PDF Editor is fully optimized for touch screens and mobile browsers.' },
    ],
  },

  'delete-pages': {
    about: 'Delete specific pages from a PDF online for free with ToolifyPDF\'s Delete Pages tool. Toolify lets you remove one or more pages from any PDF document without affecting the rest of the content. Just upload your PDF, select the pages you want to delete, and download the clean result instantly. No software installation and no account required.',
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF file you want to remove pages from.' },
      { title: 'Select Pages to Delete',   desc: 'Click on the page thumbnails you want to remove from the document.' },
      { title: 'Download Updated PDF',     desc: 'Click "Delete Pages" and download the updated PDF with selected pages removed.' },
    ],
    features: [
      { title: 'Visual Page Selection',    desc: 'Thumbnail previews help you identify and select exactly which pages to remove.' },
      { title: 'Delete Multiple Pages',    desc: 'Remove one or many pages in a single operation.' },
      { title: 'No Quality Change',        desc: 'The remaining pages are preserved exactly as they were in the original.' },
      { title: 'Fast & Free on Toolify',   desc: 'Process any PDF in seconds on ToolifyPDF with no account needed.' },
    ],
    faqs: [
      { q: 'Can I delete multiple pages at once?',   a: 'Yes. Select as many pages as you want to remove before clicking Delete Pages.' },
      { q: 'Can I preview pages before deleting?',   a: 'Yes. Thumbnail previews are shown for all pages so you can confirm your selection.' },
      { q: 'Will the remaining pages be renumbered?', a: 'The PDF page content is preserved as-is. You can add page numbers after using our Page Numbers tool on Toolify.' },
      { q: 'What is the file size limit?',           a: 'PDF files up to 50 MB are supported on ToolifyPDF.' },
    ],
  },

  'word-counter': {
    about: 'Count words, characters, sentences, and paragraphs instantly with Toolify\'s free Word Counter tool. ToolifyPDF\'s word counter works in real time as you type or paste text — no button to click. Ideal for writers, students, bloggers, and anyone checking content length for SEO, academic requirements, or social media character limits.',
    steps: [
      { title: 'Paste or Type Your Text',  desc: 'Enter your text directly into the text area on the page.' },
      { title: 'Instant Analysis',         desc: 'Word count, character count, sentence count, and more are calculated in real time.' },
      { title: 'Review Your Stats',        desc: 'See all text statistics instantly — no button to click.' },
    ],
    features: [
      { title: 'Real-Time Counting',         desc: 'All counts update instantly as you type or paste text.' },
      { title: 'Word & Character Count',     desc: 'Get accurate word count and character count (with and without spaces).' },
      { title: 'Sentence & Paragraph Count', desc: 'Counts sentences and paragraphs for full document analysis.' },
      { title: 'Reading Time Estimate',      desc: 'See an estimated reading time based on average reading speed.' },
    ],
    faqs: [
      { q: 'Does it count words in multiple languages?',  a: 'Yes. The Toolify counter works with any language that uses standard word spacing.' },
      { q: 'Is punctuation counted as characters?',       a: 'Yes. The character count includes punctuation, spaces, and all visible characters.' },
      { q: 'How is reading time calculated?',             a: 'Based on an average reading speed of approximately 200–250 words per minute.' },
      { q: 'Can I use it for SEO content length checks?', a: 'Yes. It is widely used on ToolifyPDF to verify that articles meet target word counts for SEO.' },
    ],
  },

  'text-case': {
    about: 'Convert text between letter cases instantly with Toolify\'s free Text Case Converter. ToolifyPDF\'s case converter supports UPPERCASE, lowercase, Title Case, Sentence case, camelCase, and more — with instant one-click conversion and clipboard copy. Paste any text, click the case you want, and it\'s done. No account or software needed.',
    steps: [
      { title: 'Paste Your Text',          desc: 'Enter the text you want to convert in the input area.' },
      { title: 'Choose a Case Style',      desc: 'Click the desired case button — UPPERCASE, lowercase, Title Case, Sentence case, and more.' },
      { title: 'Copy the Result',          desc: 'The converted text appears instantly — click to copy it to your clipboard.' },
    ],
    features: [
      { title: 'Multiple Case Options',    desc: 'Convert to UPPERCASE, lowercase, Title Case, Sentence case, and camelCase.' },
      { title: 'Instant Conversion',       desc: 'Text is converted immediately when you click a case button — no delay.' },
      { title: 'One-Click Copy',           desc: 'Copy the converted text to your clipboard with a single click on Toolify.' },
      { title: 'Works in Any Language',    desc: 'Case conversion works reliably with English and most Latin-script languages.' },
    ],
    faqs: [
      { q: 'What case styles are available?',      a: 'UPPERCASE, lowercase, Title Case, Sentence case, and camelCase are all available on ToolifyPDF.' },
      { q: 'Does it work for long documents?',     a: 'Yes. Paste any length of text and the conversion happens instantly.' },
      { q: 'Will special characters be affected?', a: 'Only alphabetic characters are changed. Numbers and symbols remain untouched.' },
      { q: 'Is there a character limit?',          a: 'There is no practical limit — the Toolify tool works entirely in your browser with no upload needed.' },
    ],
  },

  'percentage-calculator': {
    about: 'Calculate percentages instantly online with Toolify\'s free Percentage Calculator. ToolifyPDF offers multiple percentage calculation modes — find a percentage of a number, calculate what percentage one number is of another, compute percentage increase or decrease, and more. Results update in real time as you type. No account needed.',
    steps: [
      { title: 'Choose a Calculation Type', desc: 'Select the type of percentage calculation you need — percentage of, increase/decrease, etc.' },
      { title: 'Enter the Values',          desc: 'Fill in the number fields with your values.' },
      { title: 'See the Result Instantly',  desc: 'The answer is calculated and displayed immediately as you type.' },
    ],
    features: [
      { title: 'Multiple Calculation Modes', desc: 'Calculate percentages, find what percentage one number is of another, compute changes, and more.' },
      { title: 'Real-Time Results',          desc: 'Answers update instantly as you type — no need to press a button.' },
      { title: 'Easy to Use',               desc: 'Clear input fields and labeled results make calculations quick and error-free.' },
      { title: 'No App or Account Needed',  desc: 'Works entirely in your browser on ToolifyPDF — free, instant, and always available.' },
    ],
    faqs: [
      { q: 'What can I calculate with this tool?',      a: 'You can calculate: X% of Y, what percentage X is of Y, percentage increase/decrease, and more.' },
      { q: 'Can I calculate percentage change?',        a: 'Yes. Enter the original and new value to calculate the percentage increase or decrease.' },
      { q: 'Does it round results?',                    a: 'Results are displayed to two decimal places by default for precision.' },
      { q: 'Can I use it for VAT or tax calculations?', a: 'Yes. It works for any percentage-based calculation including tax, discounts, and tips.' },
    ],
  },

  'age-calculator': {
    about: 'Calculate your exact age online for free with Toolify\'s Age Calculator. ToolifyPDF\'s age calculator gives you your precise age in years, months, and days — plus the number of days until your next birthday. You can also calculate the age of anything (a company, an event, a building) by setting a custom start and target date. Instant results, no account needed.',
    steps: [
      { title: 'Enter Your Date of Birth', desc: 'Select your birth date using the date picker.' },
      { title: 'Set the Target Date',      desc: 'Choose the date to calculate age on — defaults to today.' },
      { title: 'See Your Age',             desc: 'Your age in years, months, and days is displayed instantly.' },
    ],
    features: [
      { title: 'Exact Age Calculation',    desc: 'Get your precise age in years, months, and days — not just years.' },
      { title: 'Custom Target Date',       desc: 'Calculate age on any date — past, present, or future.' },
      { title: 'Days Until Next Birthday', desc: 'See exactly how many days are left until your next birthday on Toolify.' },
      { title: 'Instant Results',          desc: 'Age is calculated and displayed immediately with no waiting on ToolifyPDF.' },
    ],
    faqs: [
      { q: 'Can I calculate age for a date in the past?',   a: 'Yes. Set any past date as the target and the tool calculates the age at that time.' },
      { q: 'Does it account for leap years?',               a: 'Yes. The calculation is fully accurate including leap years.' },
      { q: 'Can I calculate the age of a company or event?', a: 'Yes. Enter any start date and target date — not just birth dates.' },
      { q: 'Is the result in years only?',                  a: 'No. Toolify gives a detailed breakdown: years, months, and remaining days.' },
    ],
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════════
export function ToolSeoContent({ slug }: { slug: string }) {
  const data = DATA[slug]
  if (!data) return null

  // Split about into paragraphs
  const aboutParas = data.about.split('\n\n').filter(Boolean)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <>
      {/* FAQPage JSON-LD — server-side rendered for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    <div className="mt-12 space-y-10">

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${slug}-about`}>
        <h2
          id={`${slug}-about`}
          className="text-xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          What Is This Tool?
        </h2>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-3">
          {aboutParas.map((para, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
          ))}
        </div>
      </section>

      {/* ── How to Use ────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${slug}-steps`}>
        <h2
          id={`${slug}-steps`}
          className="text-xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          How to Use
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.steps.map((s, i) => {
            const StepIcon = STEP_ICONS[i] ?? CheckCheck
            return (
              <div
                key={i}
                className="relative bg-white border border-border rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
              >
                {/* step number watermark */}
                <span
                  aria-hidden="true"
                  className="absolute top-3 right-4 text-5xl font-black text-primary/5 select-none leading-none"
                >
                  {i + 1}
                </span>
                {/* icon badge */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <StepIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Trust Strip ───────────────────────────────────────────────────── */}
      <section aria-label="Why choose Toolify" className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_ITEMS.map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-primary/15 flex items-center justify-center shadow-sm">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Key Features ──────────────────────────────────────────────────── */}
      <section aria-labelledby={`${slug}-features`}>
        <h2
          id={`${slug}-features`}
          className="text-xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.features.map((f, i) => {
            const FeatIcon = resolveIcon(f.title)
            const color = FEAT_COLORS[i % FEAT_COLORS.length]
            return (
              <div
                key={i}
                className={`flex gap-4 p-4 rounded-2xl border ${color.bg} ${color.border}`}
              >
                <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border ${color.border}`}>
                  <FeatIcon className={`w-4 h-4 ${color.icon}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-0.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${slug}-faq`}>
        <h2
          id={`${slug}-faq`}
          className="text-xl font-bold text-foreground mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {data.faqs.map((faq, i) => (
            <details
              key={i}
              className="group bg-white border border-border rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
                <h3 className="font-semibold text-sm text-foreground">{faq.q}</h3>
                <ChevronDown
                  size={16}
                  className="text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="px-5 pb-4 pt-0 border-t border-border/60">
                <p className="text-sm text-muted-foreground leading-relaxed pt-3">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

    </div>
    </>
  )
}
