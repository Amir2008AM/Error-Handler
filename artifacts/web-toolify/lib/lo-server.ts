/**
 * lib/lo-server.ts
 *
 * Fast PDF→DOCX via pdf2docx (pure Python, no LibreOffice startup overhead).
 * Also exports warmSoffice() to pre-load LibreOffice shared libs into the
 * OS page cache so fallback soffice spawns are faster.
 */

import { spawn }    from 'node:child_process'
import { join }     from 'node:path'
import { existsSync } from 'node:fs'

const PDF2DOCX_SCRIPT = join(process.cwd(), 'scripts', 'pdf2docx-convert.py')

/**
 * Convert a PDF to DOCX using pdf2docx (pure Python).
 * Returns true on success, false if the script is missing or fails.
 */
export async function runPdf2Docx(
  srcPath:   string,
  dstPath:   string,
  timeoutMs: number = 90_000,
): Promise<boolean> {
  if (!existsSync(PDF2DOCX_SCRIPT)) {
    console.warn('[pdf2docx] script not found at', PDF2DOCX_SCRIPT)
    return false
  }

  return new Promise<boolean>((resolve) => {
    let stdout = ''
    let stderr = ''

    const child = spawn('python3', [PDF2DOCX_SCRIPT, srcPath, dstPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      console.warn('[pdf2docx] timed out after', timeoutMs, 'ms')
      resolve(false)
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && stdout.includes('OK:')) {
        resolve(true)
      } else {
        const errMsg = stderr.trim().slice(0, 300)
        if (errMsg) console.warn('[pdf2docx] error:', errMsg)
        resolve(false)
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      console.warn('[pdf2docx] spawn error:', err.message)
      resolve(false)
    })
  })
}

/**
 * Pre-warm LibreOffice by running soffice --terminate_after_init once.
 * Loads the shared libraries into the OS page cache so subsequent cold
 * spawns are slightly faster.
 */
export function warmSoffice(): void {
  const child = spawn('soffice', ['--headless', '--norestore', '--terminate_after_init'], {
    stdio: 'ignore',
    detached: false,
  })
  const kill = setTimeout(() => child.kill('SIGKILL'), 12_000)
  child.on('exit',  () => clearTimeout(kill))
  child.on('error', () => clearTimeout(kill))
}
