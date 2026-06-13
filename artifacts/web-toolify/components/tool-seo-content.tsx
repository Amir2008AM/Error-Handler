import { ChevronDown } from 'lucide-react'

type Step  = { title: string; desc: string }
type Feat  = { title: string; desc: string }
type QA    = { q: string; a: string }

type ToolSeoData = {
  steps:    Step[]
  features: Feat[]
  faqs:     QA[]
}

const DATA: Record<string, ToolSeoData> = {
  'merge-pdf': {
    steps: [
      { title: 'Upload Your PDF Files',    desc: 'Click "Choose Files" or drag and drop multiple PDF files into the upload area.' },
      { title: 'Reorder Pages',            desc: 'Drag the uploaded files to set the order you want in the final merged document.' },
      { title: 'Merge and Download',       desc: 'Click "Merge PDF" and download the combined file instantly — no sign-up required.' },
    ],
    features: [
      { title: 'Unlimited File Merging',   desc: 'Combine as many PDF files as you need into one single document.' },
      { title: 'Drag-and-Drop Reordering', desc: 'Easily reorder files before merging to get the exact output you want.' },
      { title: 'No Quality Loss',          desc: 'Your PDF content and formatting remain intact after merging.' },
      { title: 'Fast & Free',              desc: 'Merging happens instantly in the cloud — completely free with no hidden fees.' },
    ],
    faqs: [
      { q: 'How many PDF files can I merge at once?',   a: 'You can merge as many PDF files as you need. Simply upload them all and reorder before clicking Merge.' },
      { q: 'Will merging affect the quality of my PDF?', a: 'No. The text, images, and formatting in each file are preserved exactly as-is.' },
      { q: 'Is it safe to upload my files?',            a: 'Yes. Files are processed securely and deleted automatically after processing.' },
      { q: 'Can I merge password-protected PDFs?',      a: 'You will need to unlock password-protected PDFs first using our Unlock PDF tool before merging.' },
    ],
  },

  'split-pdf': {
    steps: [
      { title: 'Upload Your PDF',        desc: 'Upload the PDF file you want to split using the file picker or drag and drop.' },
      { title: 'Choose Split Options',   desc: 'Select page ranges, specific pages, or split every page into a separate file.' },
      { title: 'Download Split Files',   desc: 'Click "Split PDF" and download each resulting file individually or as a ZIP.' },
    ],
    features: [
      { title: 'Custom Page Ranges',     desc: 'Extract any range of pages — e.g. pages 1-5, 10-15 — into separate files.' },
      { title: 'Split Every Page',       desc: 'Automatically split each page into its own PDF file with one click.' },
      { title: 'Preserves Formatting',   desc: 'All text, images, and layout are preserved in each split file.' },
      { title: 'Instant Processing',     desc: 'Split large PDFs in seconds without installing any software.' },
    ],
    faqs: [
      { q: 'Can I extract a single page from a PDF?',  a: 'Yes. Enter that page number as both the start and end of a range (e.g. 3–3) to extract just that page.' },
      { q: 'What is the maximum file size I can split?', a: 'The tool supports PDF files up to 50 MB.' },
      { q: 'Will the split files be compressed?',      a: 'No. The content of each split file is identical to the original pages.' },
      { q: 'Can I split a password-protected PDF?',    a: 'You need to unlock it first with our Unlock PDF tool, then split it.' },
    ],
  },

  'compress-pdf': {
    steps: [
      { title: 'Upload Your PDF',             desc: 'Drag and drop your PDF or click to browse and select it from your device.' },
      { title: 'Choose Compression Level',    desc: 'Select a compression level — from light (higher quality) to strong (smallest file).' },
      { title: 'Download Compressed File',    desc: 'Click "Compress PDF" and download your smaller PDF file instantly.' },
    ],
    features: [
      { title: 'Multiple Compression Levels', desc: 'Choose between light, medium, and strong compression to balance size and quality.' },
      { title: 'Maintains Readability',       desc: 'Text and images remain clear and readable after compression.' },
      { title: 'No Watermarks Added',         desc: 'Your compressed PDF is clean — no branding or watermarks from us.' },
      { title: 'Privacy First',               desc: 'Files are deleted from our servers immediately after processing.' },
    ],
    faqs: [
      { q: 'How much will my PDF be reduced in size?',  a: 'Typical results are 20–80% reduction depending on the content and level chosen.' },
      { q: 'Will compression affect text quality?',     a: 'No. Text is always fully preserved. Only image resolution may be slightly reduced at strong levels.' },
      { q: 'Can I compress a scanned PDF?',             a: 'Yes. Scanned PDFs often see the highest size reduction since they are image-heavy.' },
      { q: 'Is the compressed PDF safe to send by email?', a: 'Yes. The resulting file is a standard PDF that works in any PDF viewer.' },
    ],
  },

  'rotate-pdf': {
    steps: [
      { title: 'Upload Your PDF',        desc: 'Select the PDF file you want to rotate using the file picker or drag and drop.' },
      { title: 'Choose Rotation Angle',  desc: 'Pick 90°, 180°, or 270° clockwise rotation to apply to all pages.' },
      { title: 'Download Rotated PDF',   desc: 'Click "Rotate PDF" and download the corrected file immediately.' },
    ],
    features: [
      { title: 'Rotate All Pages at Once', desc: 'Apply the selected rotation to every page in the document in one step.' },
      { title: '90, 180, 270 Degrees',     desc: 'Full rotation control — fix landscape PDFs, upside-down scans, and more.' },
      { title: 'Works on Any PDF',         desc: 'Compatible with scanned documents, reports, presentations, and any PDF type.' },
      { title: 'No Software Needed',       desc: 'Runs entirely in the browser — nothing to install or configure.' },
    ],
    faqs: [
      { q: 'Can I rotate only some pages?',          a: 'Currently, the tool rotates all pages at once. For selective rotation, use our Organize PDF tool.' },
      { q: 'Does rotation affect the PDF content?',  a: 'No. Only the orientation changes — all text, images, and links remain intact.' },
      { q: 'Can I rotate a password-protected PDF?', a: 'The PDF must be unlocked first. Use our Unlock PDF tool to remove the password, then rotate.' },
      { q: 'What file size limit applies?',          a: 'You can rotate PDFs up to 50 MB in size.' },
    ],
  },

  'watermark-pdf': {
    steps: [
      { title: 'Upload Your PDF',         desc: 'Upload the PDF file you want to watermark via drag-and-drop or file picker.' },
      { title: 'Customize Your Watermark', desc: 'Enter your watermark text, then adjust font size, opacity, and position.' },
      { title: 'Apply and Download',      desc: 'Click "Add Watermark" and download the watermarked PDF file.' },
    ],
    features: [
      { title: 'Custom Text Watermark',   desc: 'Add any text — company name, CONFIDENTIAL, DRAFT — as your watermark.' },
      { title: 'Opacity Control',         desc: 'Adjust transparency so the watermark is visible without obscuring content.' },
      { title: 'Position Options',        desc: 'Place the watermark at the center, corner, or diagonally across each page.' },
      { title: 'Applied to All Pages',    desc: 'The watermark is automatically added to every page of your document.' },
    ],
    faqs: [
      { q: 'Can I add an image watermark?',          a: 'Currently only text watermarks are supported. Image watermark support is coming soon.' },
      { q: 'Will the watermark be permanent?',       a: 'Yes. The watermark is embedded into the PDF pages and cannot be easily removed.' },
      { q: 'Can I control the watermark size?',      a: 'Yes. You can adjust the font size and opacity to control how prominent the watermark appears.' },
      { q: 'Does it work on scanned PDFs?',          a: 'Yes. The watermark is added as an overlay on top of each page, including scanned documents.' },
    ],
  },

  'page-numbers': {
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
      { q: 'Can I choose the font or color?',              a: 'Basic font and color options are available. Full customization is being added in a future update.' },
      { q: 'Will page numbers appear on all pages?',       a: 'Yes. The tool adds numbers to every page in the document by default.' },
      { q: 'Is there a file size limit?',                  a: 'You can process PDF files up to 50 MB.' },
    ],
  },

  'organize-pdf': {
    steps: [
      { title: 'Upload Your PDF',        desc: 'Upload the PDF whose pages you want to reorganize.' },
      { title: 'Reorder or Delete Pages', desc: 'Drag pages to reorder, click to select pages to delete, or duplicate any page.' },
      { title: 'Save and Download',      desc: 'Click "Save" and download your reorganized PDF file.' },
    ],
    features: [
      { title: 'Drag-to-Reorder',        desc: 'Easily move pages to any position by dragging their thumbnail previews.' },
      { title: 'Delete Unwanted Pages',  desc: 'Remove any page from the document with a single click.' },
      { title: 'Duplicate Pages',        desc: 'Create copies of any page and place them anywhere in the document.' },
      { title: 'Visual Page Previews',   desc: 'See thumbnail previews of each page before making changes.' },
    ],
    faqs: [
      { q: 'Can I undo changes before saving?',      a: 'Yes. Changes are only applied when you click Save, so you can rearrange freely before committing.' },
      { q: 'Can I combine organize and split?',      a: 'Yes — use Organize PDF to remove or reorder pages, and Split PDF to separate specific page ranges.' },
      { q: 'What is the maximum number of pages?',   a: 'The tool handles PDFs with hundreds of pages. For very large files, processing may take a few extra seconds.' },
      { q: 'Will text quality be affected?',         a: 'No. Reorganizing pages does not change or compress any content.' },
    ],
  },

  'repair-pdf': {
    steps: [
      { title: 'Upload the Damaged PDF', desc: 'Upload the corrupted or damaged PDF file using the file picker.' },
      { title: 'Automatic Repair',       desc: 'The tool analyzes the file structure and attempts to recover all readable content.' },
      { title: 'Download Repaired File', desc: 'Download the repaired PDF if recovery was successful.' },
    ],
    features: [
      { title: 'Automatic Structure Repair', desc: 'Rebuilds the internal PDF structure to restore readability.' },
      { title: 'Content Recovery',           desc: 'Recovers text, images, and pages from partially corrupted files.' },
      { title: 'No Technical Skills Needed', desc: 'Just upload the file — the repair process is fully automatic.' },
      { title: 'Safe and Private',           desc: 'Files are deleted from our servers after processing.' },
    ],
    faqs: [
      { q: 'Can all PDF files be repaired?',          a: 'Not always. Severely corrupted files may not be fully recoverable, but the tool will save whatever it can.' },
      { q: 'Why is my PDF corrupted?',                a: 'Common causes include interrupted downloads, storage errors, or incomplete file transfers.' },
      { q: 'Will the repaired PDF look the same?',    a: 'Minor formatting differences may occur depending on how much data was recoverable.' },
      { q: 'Is there a size limit for repair?',       a: 'You can attempt to repair PDF files up to 50 MB.' },
    ],
  },

  'protect-pdf': {
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF you want to password-protect.' },
      { title: 'Set a Password',           desc: 'Enter a strong password and choose your permission settings (printing, copying, etc.).' },
      { title: 'Download Protected PDF',   desc: 'Click "Protect PDF" and download your encrypted, password-locked file.' },
    ],
    features: [
      { title: 'Password Encryption',      desc: 'Your PDF is encrypted using industry-standard AES encryption.' },
      { title: 'Permission Controls',      desc: 'Restrict printing, copying text, and editing independently.' },
      { title: 'Open Password Support',    desc: 'Set a password that must be entered before the PDF can even be opened.' },
      { title: 'No Registration Required', desc: 'Protect your PDF in seconds — no account or subscription needed.' },
    ],
    faqs: [
      { q: 'What encryption is used?',               a: 'The tool uses AES-128 or AES-256 encryption depending on your settings, which is industry standard.' },
      { q: 'Can the password be recovered?',         a: 'No. If you lose the password, the file cannot be unlocked. Keep it in a safe place.' },
      { q: 'Can I set different passwords for opening and editing?', a: 'Yes. You can set an open password and separately set an owner password for permissions.' },
      { q: 'Does protection affect PDF quality?',    a: 'No. Adding a password does not change the content, quality, or size of your PDF.' },
    ],
  },

  'unlock-pdf': {
    steps: [
      { title: 'Upload Your Protected PDF', desc: 'Upload the password-locked PDF you want to unlock.' },
      { title: 'Enter the Password',        desc: 'Provide the correct password to authorize the unlocking process.' },
      { title: 'Download Unlocked PDF',     desc: 'Click "Unlock PDF" and download the unrestricted version of your file.' },
    ],
    features: [
      { title: 'Remove Password Instantly', desc: 'Unlock any password-protected PDF in seconds as long as you know the password.' },
      { title: 'Removes Print/Copy Restrictions', desc: 'Also removes editing, printing, and copying restrictions from PDFs.' },
      { title: 'Works with Any PDF Viewer', desc: 'The unlocked file opens normally in all PDF readers without any password prompt.' },
      { title: 'Files Deleted After Processing', desc: 'Your uploaded files are securely deleted immediately after the process completes.' },
    ],
    faqs: [
      { q: 'Can I unlock a PDF without knowing the password?', a: 'No. You must have the correct password. This tool is for files you already own and have authorization to unlock.' },
      { q: 'What if I enter the wrong password?',             a: 'The tool will show an error. Double-check the password and try again.' },
      { q: 'Is it legal to unlock a PDF?',                    a: 'Yes, if you own the file or have been given the password by the owner.' },
      { q: 'Does unlocking change the PDF content?',         a: 'No. Only the password and restriction flags are removed — all content stays identical.' },
    ],
  },

  'image-to-pdf': {
    steps: [
      { title: 'Upload Your Images',      desc: 'Upload JPG, PNG, WebP, or other image files. You can add multiple images at once.' },
      { title: 'Arrange the Order',       desc: 'Drag images to set the page order in the final PDF.' },
      { title: 'Convert and Download',    desc: 'Click "Convert to PDF" and download the ready PDF file.' },
    ],
    features: [
      { title: 'Multiple Image Formats',  desc: 'Supports JPG, PNG, WebP, BMP, GIF, and TIFF input images.' },
      { title: 'Multiple Images to One PDF', desc: 'Combine many images into a single multi-page PDF document.' },
      { title: 'Maintains Image Quality', desc: 'Images are embedded at full resolution to preserve sharpness.' },
      { title: 'No Watermarks',           desc: 'Your resulting PDF is clean — no logos or watermarks added.' },
    ],
    faqs: [
      { q: 'Which image formats are supported?', a: 'JPG, PNG, WebP, BMP, GIF, and TIFF are all supported.' },
      { q: 'Can I create a multi-page PDF from multiple images?', a: 'Yes. Upload multiple images and each one becomes a separate page in the PDF.' },
      { q: 'What is the maximum file size per image?', a: 'Each image can be up to 50 MB.' },
      { q: 'Will the image quality be reduced?', a: 'No. Images are embedded at their original resolution.' },
    ],
  },

  'pdf-to-jpg': {
    steps: [
      { title: 'Upload Your PDF',         desc: 'Upload the PDF you want to convert to images.' },
      { title: 'Choose Output Settings',  desc: 'Select image quality and resolution for the output JPG files.' },
      { title: 'Download Images',         desc: 'Download each page as a separate JPG or download all as a ZIP archive.' },
    ],
    features: [
      { title: 'High-Resolution Output',  desc: 'Convert PDF pages to high-quality JPG images suitable for print and screen.' },
      { title: 'All Pages Converted',     desc: 'Every page in the PDF becomes a separate JPG image automatically.' },
      { title: 'ZIP Download Option',     desc: 'Download all converted images at once as a convenient ZIP archive.' },
      { title: 'Adjustable Quality',      desc: 'Choose the image quality to balance file size and visual clarity.' },
    ],
    faqs: [
      { q: 'Does it convert all pages at once?',        a: 'Yes. All pages in the PDF are converted and available for download individually or as a ZIP.' },
      { q: 'What DPI are the output images?',           a: 'Output resolution can typically be set to 150 or 300 DPI depending on quality settings.' },
      { q: 'Can I convert only one page?',              a: 'You can download individual pages from the output — you do not have to download all of them.' },
      { q: 'Are PDF annotations included in the image?', a: 'Yes. The images represent the full visual content of each page including annotations.' },
    ],
  },

  'pdf-to-word': {
    steps: [
      { title: 'Upload Your PDF',        desc: 'Upload the PDF file you want to convert to a Word document.' },
      { title: 'Start Conversion',       desc: 'Click "Convert to Word" — the tool processes text, tables, and layout automatically.' },
      { title: 'Download Word File',     desc: 'Download the resulting .docx file ready to edit in Microsoft Word or Google Docs.' },
    ],
    features: [
      { title: 'Editable Word Output',   desc: 'Get a fully editable .docx file with text, headings, and paragraphs preserved.' },
      { title: 'Table Recognition',      desc: 'Tables in the PDF are converted into editable Word tables.' },
      { title: 'Layout Preservation',    desc: 'Headings, paragraphs, and formatting are maintained as closely as possible.' },
      { title: 'Works with Scanned PDFs', desc: 'OCR technology extracts text from scanned PDF pages too.' },
    ],
    faqs: [
      { q: 'Will the formatting be perfect after conversion?', a: 'Most formatting is preserved, but complex layouts may differ slightly due to PDF structure differences.' },
      { q: 'Can I convert scanned PDFs to Word?',             a: 'Yes. The tool uses OCR to extract text from scanned pages.' },
      { q: 'What Word format will I get?',                    a: 'You will receive a standard .docx file compatible with Microsoft Word and Google Docs.' },
      { q: 'Is there a page limit?',                         a: 'There is no strict page limit, but very large files may take longer to process.' },
    ],
  },

  'word-to-pdf': {
    steps: [
      { title: 'Upload Your Word File',  desc: 'Upload a .doc or .docx file from your computer.' },
      { title: 'Convert Automatically',  desc: 'The tool converts your Word document to PDF while preserving all formatting.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF — ready to share, print, or archive.' },
    ],
    features: [
      { title: 'Perfect Formatting',     desc: 'Fonts, images, tables, and layout are preserved exactly as in your Word document.' },
      { title: 'Universal Compatibility', desc: 'The output PDF opens on any device without needing Microsoft Word installed.' },
      { title: 'Fast Conversion',        desc: 'Convert even lengthy Word documents to PDF in just a few seconds.' },
      { title: 'No Quality Loss',        desc: 'Text, images, and vector graphics are all embedded at full quality.' },
    ],
    faqs: [
      { q: 'Does it support .doc and .docx?',           a: 'Yes. Both older .doc and modern .docx formats are fully supported.' },
      { q: 'Will embedded images be included in the PDF?', a: 'Yes. All images embedded in the Word file are included in the PDF at full quality.' },
      { q: 'What is the maximum file size?',            a: 'You can convert Word files up to 50 MB.' },
      { q: 'Can I convert Word files with tracked changes?', a: 'Yes, but tracked changes will appear in their accepted or rejected final state in the PDF.' },
    ],
  },

  'excel-to-pdf': {
    steps: [
      { title: 'Upload Your Excel File', desc: 'Upload an .xlsx or .xls spreadsheet file.' },
      { title: 'Automatic Conversion',   desc: 'The tool converts each worksheet into a PDF page, preserving tables and formatting.' },
      { title: 'Download PDF',           desc: 'Download the converted PDF file ready for sharing or printing.' },
    ],
    features: [
      { title: 'Preserves Spreadsheet Layout', desc: 'Rows, columns, borders, and cell formatting are maintained in the PDF output.' },
      { title: 'Multi-Sheet Support',           desc: 'All sheets in the workbook are converted and included in the PDF.' },
      { title: 'Print-Ready Output',            desc: 'The resulting PDF is formatted for standard page sizes, ready to print.' },
      { title: 'No Excel Required',             desc: 'Convert spreadsheets without having Microsoft Excel installed.' },
    ],
    faqs: [
      { q: 'Are all sheets converted?',              a: 'Yes. Every worksheet in the workbook is included as pages in the resulting PDF.' },
      { q: 'What Excel formats are supported?',      a: '.xlsx and .xls files are both supported.' },
      { q: 'Will charts and graphs be included?',    a: 'Yes. Charts embedded in the spreadsheet are rendered in the PDF output.' },
      { q: 'What is the file size limit?',           a: 'Excel files up to 50 MB can be converted.' },
    ],
  },

  'html-to-pdf': {
    steps: [
      { title: 'Enter HTML or URL',      desc: 'Paste your HTML code directly or enter a webpage URL to convert.' },
      { title: 'Convert to PDF',         desc: 'Click "Convert" — the tool renders the HTML and generates a PDF.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF file.' },
    ],
    features: [
      { title: 'Renders CSS Styles',     desc: 'CSS styling, fonts, colors, and layouts are fully rendered in the output PDF.' },
      { title: 'Supports URL Input',     desc: 'Enter a public webpage URL to convert a live website to PDF.' },
      { title: 'Handles Responsive Layouts', desc: 'The tool renders content at a standard desktop viewport for consistent output.' },
      { title: 'Clean PDF Output',       desc: 'The generated PDF is a clean, printable version of your HTML content.' },
    ],
    faqs: [
      { q: 'Can I convert a live website to PDF?',    a: 'Yes. Enter the full URL of any publicly accessible webpage.' },
      { q: 'Will JavaScript be executed?',            a: 'Basic JavaScript is executed during rendering, but complex interactive elements may not render fully.' },
      { q: 'Are external fonts and images included?', a: 'Yes, if they are publicly accessible — the renderer fetches external resources during conversion.' },
      { q: 'What page size is the output?',           a: 'The default output is A4. Page size options may vary.' },
    ],
  },

  'ppt-to-pdf': {
    steps: [
      { title: 'Upload Your PowerPoint', desc: 'Upload a .pptx or .ppt presentation file.' },
      { title: 'Automatic Conversion',   desc: 'Each slide is converted to a PDF page with all content preserved.' },
      { title: 'Download PDF',           desc: 'Download the resulting PDF — one page per slide.' },
    ],
    features: [
      { title: 'All Slides Converted',   desc: 'Every slide in the presentation becomes a page in the PDF.' },
      { title: 'Preserves Visuals',      desc: 'Images, charts, and shapes on slides are included at high quality.' },
      { title: 'Font & Color Retention', desc: 'Fonts, colors, and text formatting are preserved as closely as possible.' },
      { title: 'No PowerPoint Required', desc: 'Convert presentations without having Microsoft PowerPoint installed.' },
    ],
    faqs: [
      { q: 'Does it support both .ppt and .pptx?',   a: 'Yes. Both older .ppt and modern .pptx formats are supported.' },
      { q: 'Will animations be preserved?',           a: 'No. Animations are not shown in static PDF pages — slides appear in their final resting state.' },
      { q: 'Are speaker notes included?',             a: 'Speaker notes are not included in the output by default.' },
      { q: 'What is the slide size in the PDF?',      a: 'Slides are exported to standard A4 or widescreen format depending on the original slide dimensions.' },
    ],
  },

  'pdf-to-ppt': {
    steps: [
      { title: 'Upload Your PDF',          desc: 'Upload the PDF file you want to convert to a PowerPoint presentation.' },
      { title: 'Convert Automatically',    desc: 'Each PDF page is converted to a PowerPoint slide.' },
      { title: 'Download Presentation',    desc: 'Download the .pptx file ready to open and edit in PowerPoint.' },
    ],
    features: [
      { title: 'One Slide Per Page',       desc: 'Each page of the PDF becomes an editable slide in the presentation.' },
      { title: 'Editable Output',          desc: 'Text and images on slides can be edited in Microsoft PowerPoint or Google Slides.' },
      { title: 'Visual Fidelity',          desc: 'The appearance of each slide closely matches the original PDF page.' },
      { title: 'Fast Processing',          desc: 'Multi-page PDFs are converted in seconds.' },
    ],
    faqs: [
      { q: 'Will the text be editable in PowerPoint?', a: 'Yes. Text extracted from the PDF becomes editable text boxes in the slides.' },
      { q: 'What if the PDF has complex layouts?',     a: 'Complex layouts may be approximated — the tool does its best to match the original visual.' },
      { q: 'Can I convert a scanned PDF to PPT?',     a: 'Scanned PDFs are converted as image slides since there is no selectable text to extract.' },
      { q: 'What file size is supported?',            a: 'PDF files up to 50 MB can be converted.' },
    ],
  },

  'pdf-to-excel': {
    steps: [
      { title: 'Upload Your PDF',         desc: 'Upload the PDF containing the tables or data you want to extract.' },
      { title: 'Convert to Excel',        desc: 'The tool detects tables and converts them into spreadsheet rows and columns.' },
      { title: 'Download Excel File',     desc: 'Download the .xlsx file ready to open and edit in Microsoft Excel or Google Sheets.' },
    ],
    features: [
      { title: 'Table Detection',         desc: 'Automatically identifies and extracts tables from PDF pages.' },
      { title: 'Editable Spreadsheet',    desc: 'Output is a fully editable .xlsx file with cells, rows, and columns.' },
      { title: 'Multi-Page Support',      desc: 'Tables from all pages of the PDF are extracted and included in the workbook.' },
      { title: 'No Excel Required',       desc: 'Convert and download without having Microsoft Excel installed.' },
    ],
    faqs: [
      { q: 'What kinds of data can be extracted?',    a: 'The tool is best at extracting structured table data — rows, columns, and numeric data.' },
      { q: 'What if my PDF has no tables?',           a: 'The output may be less structured, with text placed in cells as best as possible.' },
      { q: 'Can it handle scanned PDFs?',             a: 'Scanned PDFs may not yield editable cell data since there is no machine-readable text.' },
      { q: 'What is the maximum file size?',          a: 'PDF files up to 50 MB are supported.' },
    ],
  },

  'compress-image': {
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload a JPG, PNG, WebP, or AVIF image using drag-and-drop or the file picker.' },
      { title: 'Choose Quality Settings',  desc: 'Adjust the compression level and output format to suit your needs.' },
      { title: 'Download Compressed Image', desc: 'Click "Compress" and download your smaller image file instantly.' },
    ],
    features: [
      { title: 'Smart Compression',        desc: 'Automatically finds the best quality level that reduces file size without visible degradation.' },
      { title: 'Multiple Output Formats',  desc: 'Compress and convert to JPG, PNG, WebP, or AVIF for maximum savings.' },
      { title: 'Preserves Visual Quality', desc: 'The result looks identical or very close to the original at a fraction of the file size.' },
      { title: 'No Watermarks',            desc: 'Your compressed image is clean — no branding added.' },
    ],
    faqs: [
      { q: 'How much will my image be compressed?',      a: 'Typical results are 30–80% reduction in file size depending on the image type and settings.' },
      { q: 'Which formats are supported?',               a: 'JPG, PNG, WebP, and AVIF are all supported for input and output.' },
      { q: 'Will the image lose visible quality?',       a: 'The tool intelligently selects quality settings to minimize visible differences while reducing file size.' },
      { q: 'Can I compress multiple images at once?',    a: 'Currently one image is compressed per operation. Batch support is planned.' },
    ],
  },

  'resize-image': {
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload the image you want to resize.' },
      { title: 'Set New Dimensions',       desc: 'Enter the target width and/or height in pixels. Aspect ratio lock is available.' },
      { title: 'Download Resized Image',   desc: 'Click "Resize" and download the resized image file.' },
    ],
    features: [
      { title: 'Pixel-Perfect Resizing',   desc: 'Set exact dimensions in pixels for precise output size control.' },
      { title: 'Aspect Ratio Lock',        desc: 'Automatically maintains the original proportions when you change one dimension.' },
      { title: 'Supports All Major Formats', desc: 'Resize JPG, PNG, WebP, and other common image formats.' },
      { title: 'No Quality Loss',          desc: 'High-quality downsampling preserves image sharpness after resizing.' },
    ],
    faqs: [
      { q: 'Can I resize to a specific pixel size?',     a: 'Yes. Enter exact width and height values in pixels for precise control.' },
      { q: 'Will the image be distorted?',               a: 'Not if you use aspect ratio lock. The proportions are maintained automatically.' },
      { q: 'What is the maximum output size?',           a: 'You can resize up to very large dimensions. Very high megapixel outputs may take longer to process.' },
      { q: 'Which image formats are supported?',         a: 'JPG, PNG, WebP, AVIF, and GIF are all supported.' },
    ],
  },

  'convert-image': {
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload the image you want to convert — JPG, PNG, WebP, AVIF, or others.' },
      { title: 'Choose Output Format',     desc: 'Select the target format you want to convert to.' },
      { title: 'Download Converted Image', desc: 'Click "Convert" and download the image in the new format.' },
    ],
    features: [
      { title: 'Wide Format Support',      desc: 'Convert between JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, and more.' },
      { title: 'Quality Control',          desc: 'Choose output quality to balance file size and image sharpness.' },
      { title: 'Instant Conversion',       desc: 'Conversions are processed in seconds with no software installation required.' },
      { title: 'No Watermarks',            desc: 'Your converted image is delivered clean, with no added branding.' },
    ],
    faqs: [
      { q: 'Which formats can I convert between?',       a: 'JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF are all supported.' },
      { q: 'Will converting reduce image quality?',      a: 'Converting to lossy formats like JPG may reduce quality slightly. Converting to PNG is lossless.' },
      { q: 'Can I convert PNG with transparency to JPG?', a: 'Yes, but the transparent areas will be filled with a white background since JPG does not support transparency.' },
      { q: 'Is there a file size limit?',                a: 'You can convert images up to 50 MB.' },
    ],
  },

  'crop-image': {
    steps: [
      { title: 'Upload Your Image',        desc: 'Upload the image you want to crop.' },
      { title: 'Select Crop Area',         desc: 'Drag the crop handles to select the area you want to keep.' },
      { title: 'Download Cropped Image',   desc: 'Click "Crop" and download the cropped image.' },
    ],
    features: [
      { title: 'Interactive Crop Tool',    desc: 'Use an intuitive drag-and-drop interface to select your crop area precisely.' },
      { title: 'Aspect Ratio Presets',     desc: 'Crop to common ratios like 1:1, 4:3, 16:9, or use a custom size.' },
      { title: 'Pixel-Accurate Output',    desc: 'The cropped image is saved at the exact pixel dimensions you selected.' },
      { title: 'Supports All Major Formats', desc: 'Crop JPG, PNG, WebP, and other common image formats.' },
    ],
    faqs: [
      { q: 'Can I crop to a specific aspect ratio?',     a: 'Yes. Common presets like 1:1 (square), 16:9, and 4:3 are available, or set custom dimensions.' },
      { q: 'Will the image quality change after cropping?', a: 'No. Cropping is non-destructive — it only removes the parts outside your selection.' },
      { q: 'What formats are supported?',                a: 'JPG, PNG, WebP, AVIF, and GIF are all supported for cropping.' },
      { q: 'Can I undo a crop?',                         a: 'Yes — changes are only applied after clicking the Crop button, so you can adjust the selection freely.' },
    ],
  },

  'word-counter': {
    steps: [
      { title: 'Paste or Type Your Text',  desc: 'Enter your text directly into the text area on the page.' },
      { title: 'Instant Analysis',         desc: 'Word count, character count, sentence count, and more are calculated in real time.' },
      { title: 'Review Your Stats',        desc: 'See all text statistics instantly — no button to click.' },
    ],
    features: [
      { title: 'Real-Time Counting',       desc: 'All counts update instantly as you type or paste text.' },
      { title: 'Word & Character Count',   desc: 'Get accurate word count and character count (with and without spaces).' },
      { title: 'Sentence & Paragraph Count', desc: 'Counts sentences and paragraphs for full document analysis.' },
      { title: 'Reading Time Estimate',    desc: 'See an estimated reading time based on average reading speed.' },
    ],
    faqs: [
      { q: 'Does it count words in multiple languages?',  a: 'Yes. The counter works with any language that uses standard word spacing.' },
      { q: 'Is punctuation counted as characters?',       a: 'Yes. The character count includes punctuation, spaces, and all visible characters.' },
      { q: 'How is reading time calculated?',             a: 'Based on an average reading speed of approximately 200–250 words per minute.' },
      { q: 'Can I use it for SEO content length checks?', a: 'Yes. It is widely used to verify that articles meet target word counts for SEO.' },
    ],
  },

  'text-case': {
    steps: [
      { title: 'Paste Your Text',          desc: 'Enter the text you want to convert in the input area.' },
      { title: 'Choose a Case Style',      desc: 'Click the desired case button — UPPERCASE, lowercase, Title Case, Sentence case, and more.' },
      { title: 'Copy the Result',          desc: 'The converted text appears instantly — click to copy it to your clipboard.' },
    ],
    features: [
      { title: 'Multiple Case Options',    desc: 'Convert to UPPERCASE, lowercase, Title Case, Sentence case, and camelCase.' },
      { title: 'Instant Conversion',       desc: 'Text is converted immediately when you click a case button — no delay.' },
      { title: 'One-Click Copy',           desc: 'Copy the converted text to your clipboard with a single click.' },
      { title: 'Works in Any Language',    desc: 'Case conversion works reliably with English and most Latin-script languages.' },
    ],
    faqs: [
      { q: 'What case styles are available?',         a: 'UPPERCASE, lowercase, Title Case, Sentence case, and camelCase are all available.' },
      { q: 'Does it work for long documents?',        a: 'Yes. Paste any length of text and the conversion happens instantly.' },
      { q: 'Will special characters be affected?',    a: 'Only alphabetic characters are changed. Numbers and symbols remain untouched.' },
      { q: 'Is there a character limit?',             a: 'There is no practical limit — the tool works entirely in your browser with no upload needed.' },
    ],
  },

  'percentage-calculator': {
    steps: [
      { title: 'Choose a Calculation Type', desc: 'Select the type of percentage calculation you need — percentage of, increase/decrease, etc.' },
      { title: 'Enter the Values',          desc: 'Fill in the number fields with your values.' },
      { title: 'See the Result Instantly',  desc: 'The answer is calculated and displayed immediately as you type.' },
    ],
    features: [
      { title: 'Multiple Calculation Modes', desc: 'Calculate percentages, find what percentage one number is of another, compute changes, and more.' },
      { title: 'Real-Time Results',          desc: 'Answers update instantly as you type — no need to press a button.' },
      { title: 'Easy to Use',               desc: 'Clear input fields and labeled results make calculations quick and error-free.' },
      { title: 'No App or Account Needed',  desc: 'Works entirely in your browser — free, instant, and always available.' },
    ],
    faqs: [
      { q: 'What can I calculate with this tool?',      a: 'You can calculate: X% of Y, what percentage X is of Y, percentage increase/decrease, and more.' },
      { q: 'Can I calculate percentage change?',        a: 'Yes. Enter the original and new value to calculate the percentage increase or decrease.' },
      { q: 'Does it round results?',                    a: 'Results are displayed to two decimal places by default for precision.' },
      { q: 'Can I use it for VAT or tax calculations?', a: 'Yes. It works for any percentage-based calculation including tax, discounts, and tips.' },
    ],
  },

  'age-calculator': {
    steps: [
      { title: 'Enter Your Date of Birth', desc: 'Select your birth date using the date picker.' },
      { title: 'Set the Target Date',      desc: 'Choose the date to calculate age on — defaults to today.' },
      { title: 'See Your Age',             desc: 'Your age in years, months, and days is displayed instantly.' },
    ],
    features: [
      { title: 'Exact Age Calculation',    desc: 'Get your precise age in years, months, and days — not just years.' },
      { title: 'Custom Target Date',       desc: 'Calculate age on any date — past, present, or future.' },
      { title: 'Days Until Next Birthday', desc: 'See exactly how many days are left until your next birthday.' },
      { title: 'Instant Results',          desc: 'Age is calculated and displayed immediately with no waiting.' },
    ],
    faqs: [
      { q: 'Can I calculate age for a date in the past?',  a: 'Yes. Set any past date as the target and the tool calculates the age at that time.' },
      { q: 'Does it account for leap years?',              a: 'Yes. The calculation is fully accurate including leap years.' },
      { q: 'Can I calculate the age of a company or event?', a: 'Yes. Enter any start date and target date — not just birth dates.' },
      { q: 'Is the result in years only?',                 a: 'No. You get a detailed breakdown: years, months, and remaining days.' },
    ],
  },
}

function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4 border border-border">
      <h3 className="font-semibold text-foreground mb-1 text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-border rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-muted/30 transition-colors">
        <h3 className="font-semibold text-foreground text-sm">{q}</h3>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-4 pt-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </details>
  )
}

export function ToolSeoContent({ slug }: { slug: string }) {
  const data = DATA[slug]
  if (!data) return null

  return (
    <div className="mt-12 space-y-12 border-t border-border pt-10">
      {/* How It Works */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-6">How It Works</h2>
        <div className="space-y-5">
          {data.steps.map((s, i) => (
            <StepItem key={i} n={i + 1} title={s.title} desc={s.desc} />
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-5">Key Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.features.map((f, i) => (
            <FeatureItem key={i} title={f.title} desc={f.desc} />
          ))}
        </div>
      </section>

      {/* FAQ link */}
      <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Have a question about this tool?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Find answers to all common PDF tool questions in one place.</p>
        </div>
        <a
          href="/faq"
          className="shrink-0 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          Visit FAQ →
        </a>
      </div>
    </div>
  )
}
