/**
 * Strip characters that break Content-Disposition headers or enable HTTP
 * header injection: double-quotes, backslashes, carriage returns, newlines.
 *
 * Usage:
 *   'Content-Disposition': `attachment; filename="${safeFilename(name)}"`
 */
export function safeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, '_')
}
