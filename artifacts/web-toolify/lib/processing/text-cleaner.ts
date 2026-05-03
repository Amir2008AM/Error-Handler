/**
 * Simple OCR text cleaner.
 * Strips control characters and invisible Unicode while preserving all script characters.
 * Does NOT filter by script range — avoids stripping valid non-Latin output.
 */
export function cleanOcrText(text: string, _langCode: string): string {
  if (!text) return ''

  return text
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
    .replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2060-\u206F]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
}
