export type TranslationKey =
  | 'nav.pdf'
  | 'nav.security'
  | 'nav.converter'
  | 'nav.ocr'
  | 'nav.image'
  | 'nav.text'
  | 'nav.calculator'
  | 'nav.searchPlaceholder'
  | 'home.hero.title'
  | 'home.hero.subtitle'
  | 'home.allTools'
  | 'home.pdfTools'
  | 'home.securityTools'
  | 'home.converters'
  | 'home.ocrTools'
  | 'home.imageTools'
  | 'home.textTools'
  | 'home.calculators'
  | 'home.searchResultsFor'
  | 'home.noToolsFound'
  | 'home.noToolsFoundHint'
  | 'home.footer.privacy'
  | 'home.footer.terms'
  | 'home.footer.contact'
  | 'common.home'
  | 'common.upload'
  | 'common.download'
  | 'common.copy'
  | 'common.copied'
  | 'common.processing'
  | 'common.cancel'
  | 'common.change'
  | 'common.free'
  | 'common.noRegistration'
  | 'common.instantProcessing'
  | 'common.filesDeleted'
  | 'common.uploadPdf'
  | 'common.clickOrDragPdf'
  | 'common.dropPdfHere'
  | 'common.dropImageHere'
  | 'common.dropPdfsHere'
  | 'common.maxFileSizeMB'
  | 'common.originalSize'
  | 'common.reset'
  | 'common.newFile'
  | 'common.newImage'
  | 'common.downloadPdf'
  | 'common.downloadZip'
  | 'common.downloadDocx'
  | 'tool.relatedTools'
  | 'ocr.selectLanguage'
  | 'ocr.languageRequired'
  | 'ocr.extractText'
  | 'ocr.extracting'
  | 'ocr.extractedText'
  | 'ocr.detectedLanguage'
  | 'ocr.confidence'
  | 'ocr.searchLanguages'
  | 'ocr.uploading'
  | 'ocr.scanning'
  | 'ocr.extracted'
  | 'ocr.uploadImage'
  | 'ocr.supportedFormats'
  | 'ocr.supportedLanguages'
  | 'ocr.detectingScript'
  | 'ocr.selectLanguageHint'
  | 'ocr.detectedInImage'
  | 'ocr.noLanguagesFound'
  | 'ocr.charactersCount'
  | 'ocr.wordsCount'
  | 'ocr.recognitionAccuracy'
  | 'ocr.cleaningOutput'
  | 'lang.switchLanguage'
  | 'lang.searchPlaceholder'
  | 'lang.noResults'
  | 'compress.level'
  | 'compress.actionPdf'
  | 'compress.processing'
  | 'compress.light'
  | 'compress.lightDesc'
  | 'compress.medium'
  | 'compress.mediumDesc'
  | 'compress.maximum'
  | 'compress.maximumDesc'
  | 'compress.reducedBy'
  | 'compress.levelLabel'
  | 'compress.successPdf'
  | 'compress.originalFileSize'
  | 'compress.quality'
  | 'compress.outputFormat'
  | 'compress.sameFormat'
  | 'compress.actionImage'
  | 'compress.successImage'
  | 'compress.saved'
  | 'compress.original'
  | 'compress.compressed'
  | 'compress.smallerFile'
  | 'compress.betterQuality'
  | 'convert.convertTo'
  | 'convert.converting'
  | 'convert.successPrefix'
  | 'convert.bestForPhotos'
  | 'convert.losslessQuality'
  | 'convert.modernCompact'
  | 'convert.nextGen'
  | 'merge.dropFiles'
  | 'merge.subLabel'
  | 'merge.clearAll'
  | 'merge.reorderHint'
  | 'merge.action'
  | 'merge.processing'
  | 'merge.reset'
  | 'merge.successTitle'
  | 'merge.minFilesError'
  | 'merge.total'
  | 'merge.downloadPdf'
  | 'split.dropFile'
  | 'split.subLabel'
  | 'split.mode'
  | 'split.allPages'
  | 'split.allPagesDesc'
  | 'split.customRanges'
  | 'split.customRangesDesc'
  | 'split.pageRanges'
  | 'split.pageRangesHint'
  | 'split.action'
  | 'split.processing'
  | 'split.reset'
  | 'split.successTitle'
  | 'split.multiplePackaged'
  | 'split.singleExtracted'
  | 'split.errorRangeRequired'
  | 'split.downloadZip'
  | 'split.downloadPdf'
  | 'rotate.angle'
  | 'rotate.action'
  | 'rotate.processing'
  | 'rotate.willRotate'
  | 'rotate.successTitle'
  | 'rotate.download'
  | 'rotate.newFile'
  | 'watermark.text'
  | 'watermark.position'
  | 'watermark.opacity'
  | 'watermark.fontSize'
  | 'watermark.action'
  | 'watermark.processing'
  | 'watermark.successTitle'
  | 'watermark.moreSubtle'
  | 'watermark.moreVisible'
  | 'watermark.download'
  | 'watermark.newFile'
  | 'watermark.placeholder'
  | 'protect.uploadTitle'
  | 'protect.password'
  | 'protect.confirmPassword'
  | 'protect.enterPassword'
  | 'protect.confirmPlaceholder'
  | 'protect.action'
  | 'protect.processing'
  | 'protect.errorMinLength'
  | 'protect.errorMismatch'
  | 'unlock.uploadTitle'
  | 'unlock.clickOrDrag'
  | 'unlock.enterPassword'
  | 'unlock.pdfPassword'
  | 'unlock.enterPasswordPlaceholder'
  | 'unlock.leaveEmpty'
  | 'unlock.action'
  | 'unlock.processing'
  | 'repair.uploadTitle'
  | 'repair.whatItDoes'
  | 'repair.step1'
  | 'repair.step2'
  | 'repair.step3'
  | 'repair.step4'
  | 'repair.action'
  | 'repair.processing'
  | 'pageNum.position'
  | 'pageNum.format'
  | 'pageNum.startFrom'
  | 'pageNum.fontSize'
  | 'pageNum.action'
  | 'pageNum.processing'
  | 'wordToPdf.uploadTitle'
  | 'wordToPdf.supportedFormats'
  | 'wordToPdf.pdfSettings'
  | 'wordToPdf.pageSize'
  | 'wordToPdf.orientation'
  | 'wordToPdf.portrait'
  | 'wordToPdf.landscape'
  | 'wordToPdf.action'
  | 'wordToPdf.converting'
  | 'pdfToWord.dropFile'
  | 'pdfToWord.subLabel'
  | 'pdfToWord.note'
  | 'pdfToWord.action'
  | 'pdfToWord.converting'
  | 'pdfToWord.reset'
  | 'pdfToWord.successTitle'
  | 'pdfToWord.download'
  | 'pdfToJpg.uploadTitle'
  | 'pdfToJpg.clickOrDrag'
  | 'pdfToJpg.outputSettings'
  | 'pdfToJpg.outputFormat'
  | 'pdfToJpg.resolution'
  | 'pdfToJpg.quality'
  | 'pdfToJpg.converting'
  | 'pdfToJpg.headsUp'
  | 'pdfToJpg.qualityNote'
  | 'resize.dropImage'
  | 'resize.dimensions'
  | 'resize.ratioLocked'
  | 'resize.freeResize'
  | 'resize.widthPx'
  | 'resize.heightPx'
  | 'resize.action'
  | 'resize.processing'
  | 'resize.errorInvalidDimensions'
  | 'resize.successPrefix'
  | 'crop.dropImage'
  | 'crop.xPosition'
  | 'crop.yPosition'
  | 'crop.width'
  | 'crop.height'
  | 'crop.original'
  | 'crop.cropArea'
  | 'crop.remove'
  | 'crop.action'
  | 'crop.processing'
  | 'crop.successTitle'
  | 'crop.download'
  | 'crop.newImage'
  | 'wordCounter.words'
  | 'wordCounter.characters'
  | 'wordCounter.charsNoSpaces'
  | 'wordCounter.sentences'
  | 'wordCounter.paragraphs'
  | 'wordCounter.readingTime'
  | 'wordCounter.placeholder'
  | 'wordCounter.clear'
  | 'wordCounter.hint'
  | 'textCase.inputText'
  | 'textCase.result'
  | 'textCase.placeholder'
  | 'textCase.uppercase'
  | 'textCase.uppercaseDesc'
  | 'textCase.lowercase'
  | 'textCase.lowercaseDesc'
  | 'textCase.titleCase'
  | 'textCase.titleCaseDesc'
  | 'textCase.sentenceCase'
  | 'textCase.sentenceCaseDesc'
  | 'textCase.camelCase'
  | 'textCase.camelCaseDesc'
  | 'textCase.snakeCase'
  | 'textCase.snakeCaseDesc'
  | 'textCase.kebabCase'
  | 'textCase.kebabCaseDesc'
  | 'textCase.pascalCase'
  | 'textCase.pascalCaseDesc'
  | 'textCase.copiedExcl'
  | 'age.dateOfBirth'
  | 'age.calculateAsOf'
  | 'age.invalidDate'
  | 'age.exactAge'
  | 'age.years'
  | 'age.months'
  | 'age.days'
  | 'age.totalMonths'
  | 'age.totalWeeks'
  | 'age.totalDays'
  | 'age.nextBirthday'
  | 'age.happyBirthday'
  | 'age.daysAway'
  | 'pct.calcType'
  | 'pct.result'
  | 'pct.whatPercent'
  | 'pct.whatPercentDesc'
  | 'pct.percentOf'
  | 'pct.percentOfDesc'
  | 'pct.increaseBy'
  | 'pct.increaseByDesc'
  | 'pct.decreaseBy'
  | 'pct.decreaseByDesc'
  | 'pct.valueX'
  | 'pct.totalY'
  | 'pct.percentage'
  | 'pct.ofNumber'
  | 'pct.originalValue'
  | 'pct.increasePercent'
  | 'pct.decreasePercent'
  | 'imageToPdf.label'
  | 'imageToPdf.sublabel'
  | 'imageToPdf.selectAll'
  | 'imageToPdf.clearAll'
  | 'imageToPdf.howItWorks'
  | 'imageToPdf.clickToAdd'
  | 'imageToPdf.action'
  | 'imageToPdf.generating'
  | 'imageToPdf.reset'
  | 'imageToPdf.successTitle'
  | 'imageToPdf.selectImages'
  | 'imageToPdf.downloadPdf'

export type TranslationMap = Record<TranslationKey, string>

export const en: TranslationMap = {
  'nav.pdf': 'PDF',
  'nav.security': 'Security',
  'nav.converter': 'Converter',
  'nav.ocr': 'OCR',
  'nav.image': 'Image',
  'nav.text': 'Text',
  'nav.calculator': 'Calculator',
  'nav.searchPlaceholder': 'Search tools...',
  'home.hero.title': 'Online Tools for PDF & Image Lovers',
  'home.hero.subtitle': 'Free PDF tools to merge, split, compress, and convert PDFs. Transform images to JPG or PDF. No installation or registration required.',
  'home.allTools': 'All Tools',
  'home.pdfTools': 'PDF Tools',
  'home.securityTools': 'Security Tools',
  'home.converters': 'Converters',
  'home.ocrTools': 'OCR Tools',
  'home.imageTools': 'Image Tools',
  'home.textTools': 'Text Tools',
  'home.calculators': 'Calculators',
  'home.searchResultsFor': 'results for',
  'home.noToolsFound': 'No tools found for',
  'home.noToolsFoundHint': 'Try a different keyword or browse all tools',
  'home.footer.privacy': 'Privacy',
  'home.footer.terms': 'Terms',
  'home.footer.contact': 'Contact',
  'common.home': 'Home',
  'common.upload': 'Upload',
  'common.download': 'Download',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.processing': 'Processing...',
  'common.cancel': 'Cancel',
  'common.change': 'Change',
  'common.free': 'Free',
  'common.noRegistration': 'No registration required',
  'common.instantProcessing': 'Instant processing',
  'common.filesDeleted': 'Files auto-deleted after processing',
  'common.uploadPdf': 'Upload PDF',
  'common.clickOrDragPdf': 'Click or drag and drop your PDF file here',
  'common.dropPdfHere': 'Drop a PDF here or click to browse',
  'common.dropImageHere': 'Drop an image here or click to browse',
  'common.dropPdfsHere': 'Drop PDF files here or click to browse',
  'common.maxFileSizeMB': 'Maximum file size: 50 MB',
  'common.originalSize': 'Original size',
  'common.reset': 'Reset',
  'common.newFile': 'New File',
  'common.newImage': 'New Image',
  'common.downloadPdf': 'Download PDF',
  'common.downloadZip': 'Download ZIP',
  'common.downloadDocx': 'Download .docx',
  'tool.relatedTools': 'Related Tools',
  'ocr.selectLanguage': 'Select Language',
  'ocr.languageRequired': 'Please select a language to continue',
  'ocr.extractText': 'Extract Text',
  'ocr.extracting': 'Extracting Text...',
  'ocr.extractedText': 'Extracted Text',
  'ocr.detectedLanguage': 'Detected Language',
  'ocr.confidence': 'Confidence',
  'ocr.searchLanguages': 'Search languages...',
  'ocr.uploading': 'Uploading image...',
  'ocr.scanning': 'Scanning document...',
  'ocr.extracted': 'Text extracted!',
  'ocr.uploadImage': 'Upload Image',
  'ocr.supportedFormats': 'Supports JPG, PNG, GIF, WebP, BMP and TIFF · Max 50 MB',
  'ocr.supportedLanguages': '100+ languages · Arabic, Chinese, Japanese, Korean, Hindi and more',
  'ocr.detectingScript': 'Detecting language…',
  'ocr.selectLanguageHint': 'Select the language in your image for accurate results',
  'ocr.detectedInImage': 'Detected in your image:',
  'ocr.noLanguagesFound': 'No languages found',
  'ocr.charactersCount': 'characters',
  'ocr.wordsCount': 'words',
  'ocr.recognitionAccuracy': 'Recognition accuracy',
  'ocr.cleaningOutput': 'Cleaning output...',
  'lang.switchLanguage': 'Switch Language',
  'lang.searchPlaceholder': 'Search language...',
  'lang.noResults': 'No results',
  'compress.level': 'Compression Level',
  'compress.actionPdf': 'Compress PDF',
  'compress.processing': 'Compressing...',
  'compress.light': 'Light',
  'compress.lightDesc': 'Best quality, smaller reduction',
  'compress.medium': 'Medium',
  'compress.mediumDesc': 'Good balance of quality and size',
  'compress.maximum': 'Maximum',
  'compress.maximumDesc': 'Smallest file, lower quality',
  'compress.reducedBy': 'Reduced by',
  'compress.levelLabel': 'Level:',
  'compress.successPdf': 'Compression complete!',
  'compress.originalFileSize': 'Original file size',
  'compress.quality': 'Quality',
  'compress.outputFormat': 'Output Format',
  'compress.sameFormat': 'Same',
  'compress.actionImage': 'Compress Image',
  'compress.successImage': 'Image compressed successfully!',
  'compress.saved': 'Saved',
  'compress.original': 'Original',
  'compress.compressed': 'Compressed',
  'compress.smallerFile': 'Smaller file',
  'compress.betterQuality': 'Better quality',
  'convert.convertTo': 'Convert To',
  'convert.converting': 'Converting...',
  'convert.successPrefix': 'Converted to',
  'convert.bestForPhotos': 'Best for photos',
  'convert.losslessQuality': 'Lossless quality',
  'convert.modernCompact': 'Modern & compact',
  'convert.nextGen': 'Next-gen format',
  'merge.dropFiles': 'Drop PDF files here or click to browse',
  'merge.subLabel': 'Add multiple PDFs — drag to reorder before merging',
  'merge.clearAll': 'Clear all',
  'merge.reorderHint': 'Drag rows or use the arrow buttons to reorder PDFs. The final merged document will follow this order.',
  'merge.action': 'Merge PDFs',
  'merge.processing': 'Merging PDFs...',
  'merge.reset': 'Reset',
  'merge.successTitle': 'PDFs merged successfully!',
  'merge.minFilesError': 'Please add at least 2 PDF files to merge.',
  'merge.total': 'total',
  'merge.downloadPdf': 'Download PDF',
  'split.dropFile': 'Drop your PDF here or click to browse',
  'split.subLabel': 'Select a PDF to split into multiple files or extract pages',
  'split.mode': 'Split Mode',
  'split.allPages': 'Split all pages',
  'split.allPagesDesc': 'Extract every page as a separate PDF file. Downloads as a ZIP archive.',
  'split.customRanges': 'Custom page ranges',
  'split.customRangesDesc': 'Define specific pages or ranges to extract. Downloads as PDF or ZIP.',
  'split.pageRanges': 'Page Ranges',
  'split.pageRangesHint': 'Separate ranges with commas. Use hyphens for page ranges',
  'split.action': 'Split PDF',
  'split.processing': 'Splitting PDF...',
  'split.reset': 'Reset',
  'split.successTitle': 'PDF split successfully!',
  'split.multiplePackaged': 'Multiple PDFs packaged as ZIP',
  'split.singleExtracted': 'Single PDF extracted',
  'split.errorRangeRequired': 'Please enter page ranges (e.g. 1-3, 5, 7-9)',
  'split.downloadZip': 'Download ZIP',
  'split.downloadPdf': 'Download PDF',
  'rotate.angle': 'Rotation Angle',
  'rotate.action': 'Rotate PDF',
  'rotate.processing': 'Rotating...',
  'rotate.willRotate': 'All pages will be rotated clockwise.',
  'rotate.successTitle': 'PDF rotated successfully!',
  'rotate.download': 'Download Rotated PDF',
  'rotate.newFile': 'New File',
  'watermark.text': 'Watermark Text',
  'watermark.position': 'Position',
  'watermark.opacity': 'Opacity',
  'watermark.fontSize': 'Font Size',
  'watermark.action': 'Add Watermark',
  'watermark.processing': 'Adding Watermark...',
  'watermark.successTitle': 'Watermark added successfully!',
  'watermark.moreSubtle': 'More subtle',
  'watermark.moreVisible': 'More visible',
  'watermark.download': 'Download Watermarked PDF',
  'watermark.newFile': 'New File',
  'watermark.placeholder': 'e.g., CONFIDENTIAL, DRAFT, etc.',
  'protect.uploadTitle': 'Upload PDF to Protect',
  'protect.password': 'Password',
  'protect.confirmPassword': 'Confirm Password',
  'protect.enterPassword': 'Enter password',
  'protect.confirmPlaceholder': 'Confirm password',
  'protect.action': 'Protect & Download',
  'protect.processing': 'Protecting...',
  'protect.errorMinLength': 'Password must be at least 4 characters',
  'protect.errorMismatch': 'Passwords do not match',
  'unlock.uploadTitle': 'Upload Protected PDF',
  'unlock.clickOrDrag': 'Click or drag and drop your password-protected PDF',
  'unlock.enterPassword': 'Enter Password',
  'unlock.pdfPassword': 'PDF Password',
  'unlock.enterPasswordPlaceholder': 'Enter the document password',
  'unlock.leaveEmpty': 'Leave empty if only an owner password is set.',
  'unlock.action': 'Unlock & Download',
  'unlock.processing': 'Unlocking...',
  'repair.uploadTitle': 'Upload Damaged PDF',
  'repair.whatItDoes': 'What this tool does:',
  'repair.step1': 'Attempts to load and parse the PDF structure',
  'repair.step2': 'Recovers all readable pages and content',
  'repair.step3': 'Rebuilds the PDF with a clean structure',
  'repair.step4': 'Preserves metadata where possible',
  'repair.action': 'Repair & Download',
  'repair.processing': 'Repairing...',
  'pageNum.position': 'Position',
  'pageNum.format': 'Format',
  'pageNum.startFrom': 'Start From',
  'pageNum.fontSize': 'Font Size (pt)',
  'pageNum.action': 'Add Page Numbers',
  'pageNum.processing': 'Processing...',
  'wordToPdf.uploadTitle': 'Upload Word Document',
  'wordToPdf.supportedFormats': 'Supports .docx and .doc files',
  'wordToPdf.pdfSettings': 'PDF Settings',
  'wordToPdf.pageSize': 'Page Size',
  'wordToPdf.orientation': 'Orientation',
  'wordToPdf.portrait': 'Portrait',
  'wordToPdf.landscape': 'Landscape',
  'wordToPdf.action': 'Convert to PDF',
  'wordToPdf.converting': 'Converting...',
  'pdfToWord.dropFile': 'Drop your PDF here or click to browse',
  'pdfToWord.subLabel': 'Converts PDF to a formatted Microsoft Word (.docx) file',
  'pdfToWord.note': 'The converter generates a structured Word document. Layout and text are extracted and preserved as best as possible.',
  'pdfToWord.action': 'Convert to Word',
  'pdfToWord.converting': 'Converting to Word...',
  'pdfToWord.reset': 'Reset',
  'pdfToWord.successTitle': 'Conversion successful!',
  'pdfToWord.download': 'Download .docx',
  'pdfToJpg.uploadTitle': 'Upload PDF',
  'pdfToJpg.clickOrDrag': 'Click or drag and drop your PDF file here',
  'pdfToJpg.outputSettings': 'Output Settings',
  'pdfToJpg.outputFormat': 'Output Format',
  'pdfToJpg.resolution': 'Resolution (DPI)',
  'pdfToJpg.quality': 'Quality',
  'pdfToJpg.converting': 'Converting...',
  'pdfToJpg.headsUp': 'Heads up about quality',
  'pdfToJpg.qualityNote': 'PDF rendering uses an open-source engine and may not perfectly match Adobe Acrobat. For best results, choose 150 DPI or higher.',
  'resize.dropImage': 'Drop an image here or click to browse',
  'resize.dimensions': 'Dimensions',
  'resize.ratioLocked': 'Ratio locked',
  'resize.freeResize': 'Free resize',
  'resize.widthPx': 'Width (px)',
  'resize.heightPx': 'Height (px)',
  'resize.action': 'Resize Image',
  'resize.processing': 'Resizing...',
  'resize.errorInvalidDimensions': 'Please enter valid width and height values.',
  'resize.successPrefix': 'Resized to',
  'crop.dropImage': 'Drop an image here or click to browse',
  'crop.xPosition': 'X Position',
  'crop.yPosition': 'Y Position',
  'crop.width': 'Width',
  'crop.height': 'Height',
  'crop.original': 'Original',
  'crop.cropArea': 'Crop',
  'crop.remove': 'Remove',
  'crop.action': 'Crop Image',
  'crop.processing': 'Cropping...',
  'crop.successTitle': 'Image cropped successfully!',
  'crop.download': 'Download Cropped Image',
  'crop.newImage': 'New Image',
  'wordCounter.words': 'Words',
  'wordCounter.characters': 'Characters',
  'wordCounter.charsNoSpaces': 'Chars (no spaces)',
  'wordCounter.sentences': 'Sentences',
  'wordCounter.paragraphs': 'Paragraphs',
  'wordCounter.readingTime': 'Reading Time',
  'wordCounter.placeholder': 'Paste or type your text here...',
  'wordCounter.clear': 'Clear',
  'wordCounter.hint': 'Statistics update instantly as you type. No server required.',
  'textCase.inputText': 'Input Text',
  'textCase.result': 'Result',
  'textCase.placeholder': 'Type or paste your text here...',
  'textCase.uppercase': 'UPPERCASE',
  'textCase.uppercaseDesc': 'ALL LETTERS CAPITALIZED',
  'textCase.lowercase': 'lowercase',
  'textCase.lowercaseDesc': 'all letters in small caps',
  'textCase.titleCase': 'Title Case',
  'textCase.titleCaseDesc': 'First Letter Of Each Word',
  'textCase.sentenceCase': 'Sentence case',
  'textCase.sentenceCaseDesc': 'First letter of each sentence',
  'textCase.camelCase': 'camelCase',
  'textCase.camelCaseDesc': 'joinWordsLikeThis',
  'textCase.snakeCase': 'snake_case',
  'textCase.snakeCaseDesc': 'join_words_like_this',
  'textCase.kebabCase': 'kebab-case',
  'textCase.kebabCaseDesc': 'join-words-like-this',
  'textCase.pascalCase': 'PascalCase',
  'textCase.pascalCaseDesc': 'JoinWordsLikeThis',
  'textCase.copiedExcl': 'Copied!',
  'age.dateOfBirth': 'Date of Birth',
  'age.calculateAsOf': 'Calculate Age As Of',
  'age.invalidDate': 'Date of birth must be before the target date.',
  'age.exactAge': 'Your exact age',
  'age.years': 'years',
  'age.months': 'months',
  'age.days': 'days',
  'age.totalMonths': 'Total Months',
  'age.totalWeeks': 'Total Weeks',
  'age.totalDays': 'Total Days',
  'age.nextBirthday': 'Next Birthday:',
  'age.happyBirthday': 'Today! Happy Birthday!',
  'age.daysAway': 'days away',
  'pct.calcType': 'Calculation Type',
  'pct.result': 'Result',
  'pct.whatPercent': 'What % is X of Y?',
  'pct.whatPercentDesc': 'Find what percentage one number is of another',
  'pct.percentOf': 'X% of Y = ?',
  'pct.percentOfDesc': 'Calculate a percentage of a number',
  'pct.increaseBy': 'Increase by %',
  'pct.increaseByDesc': 'Add a percentage to a value (e.g. price + tax)',
  'pct.decreaseBy': 'Decrease by %',
  'pct.decreaseByDesc': 'Subtract a percentage from a value (e.g. discount)',
  'pct.valueX': 'Value (X)',
  'pct.totalY': 'Total (Y)',
  'pct.percentage': 'Percentage (%)',
  'pct.ofNumber': 'Of number (Y)',
  'pct.originalValue': 'Original value',
  'pct.increasePercent': 'Increase by (%)',
  'pct.decreasePercent': 'Decrease by (%)',
  'imageToPdf.label': 'Drop images here or click to browse',
  'imageToPdf.sublabel': 'Supports JPG, PNG, WebP — click images below to set page order',
  'imageToPdf.selectAll': 'Select All',
  'imageToPdf.clearAll': 'Clear All',
  'imageToPdf.howItWorks': 'How it works: Click any image to assign it a page number. Click again to remove it from the selection. Drag to reorder. Only selected images will be included in the PDF.',
  'imageToPdf.clickToAdd': 'Click to add',
  'imageToPdf.action': 'Convert to PDF',
  'imageToPdf.generating': 'Generating PDF…',
  'imageToPdf.reset': 'Reset',
  'imageToPdf.successTitle': 'PDF generated successfully!',
  'imageToPdf.selectImages': 'Please click on images to select and order them before converting.',
  'imageToPdf.downloadPdf': 'Download PDF',
}

export function t(lang: string, key: TranslationKey, map: TranslationMap = en): string {
  return map[key] ?? en[key] ?? key
}
