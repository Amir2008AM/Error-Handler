/**
 * PDF Repair Pipeline
 *
 * Multi-step recovery for damaged PDFs. We try cheaper, structure-preserving
 * tools first, then fall back to deeper rebuilds.
 *
 *   Step 1 — qpdf rewrite (reconstructs broken xref tables, fixes most
 *            real-world corruption: truncated downloads, off-by-one xref
 *            offsets, missing trailers).
 *
 *   Step 2 — qpdf with object-stream/stream decompression (a more aggressive
 *            rewrite that re-encodes every object; recovers some files where
 *            the lighter qpdf pass produced an unusable output).
 *
 *   Step 3 — Ghostscript pdfwrite (re-renders the document to a fresh PDF;
 *            slowest but the most thorough — succeeds on files where qpdf
 *            cannot parse the structure at all).
 *
 * Each step has a timeout. If all steps fail to produce a valid PDF, we
 * surface a clear, structured error.
 */

import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STEP_TIMEOUT_MS = 60_000

export type RepairStep = 'qpdf' | 'qpdf-deep' | 'ghostscript'

export interface RepairResult {
  data: Buffer
  step: RepairStep
  warnings: string
}

interface RunResult {
  code: number
  stdout: string
  stderr: string
  timedOut: boolean
}

function run(cmd: string, args: string[], timeoutMs = STEP_TIMEOUT_MS): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill('SIGKILL')
    }, timeoutMs)

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? -1, stdout, stderr, timedOut })
    })
  })
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-repair-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Verify a candidate output file looks like a real PDF: starts with %PDF-,
 * contains an %%EOF marker, and is at least a few hundred bytes. Cheap and
 * catches the common failure modes (empty file, garbage, partial output).
 */
async function isValidPdfFile(path: string): Promise<boolean> {
  try {
    const st = await stat(path)
    if (st.size < 100) return false
    const buf = await readFile(path)
    if (buf.subarray(0, 5).toString('ascii') !== '%PDF-') return false
    // Search the last 1024 bytes for %%EOF (PDF spec puts it near end).
    const tail = buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1')
    return tail.includes('%%EOF')
  } catch {
    return false
  }
}

export class UnrepairableError extends Error {
  constructor(message = 'File is too corrupted to repair') {
    super(message)
    this.name = 'UnrepairableError'
  }
}

/**
 * Attempt to repair a PDF buffer using the multi-step pipeline above.
 * Returns the repaired bytes plus which step succeeded.
 * Throws UnrepairableError if all steps fail or the input is not a PDF.
 */
export async function repairPdf(pdfBuffer: Buffer): Promise<RepairResult> {
  if (pdfBuffer.length < 5) {
    throw new UnrepairableError('File is empty or too small to be a PDF')
  }
  // Be lenient on the header check: real-world corruption sometimes prepends
  // garbage bytes before %PDF-. Search the first 1024 bytes for the marker.
  const head = pdfBuffer.subarray(0, Math.min(1024, pdfBuffer.length)).toString('latin1')
  if (!head.includes('%PDF-')) {
    throw new UnrepairableError('File is not a PDF (missing %PDF- header)')
  }

  return withTempDir(async (dir) => {
    const inPath = join(dir, 'in.pdf')
    await writeFile(inPath, pdfBuffer)

    const accumulatedWarnings: string[] = []

    // ---- Step 1: qpdf basic rewrite ----
    {
      const outPath = join(dir, 'out-qpdf.pdf')
      // qpdf always attempts xref reconstruction on damaged input; no special
      // flag needed. --object-streams=preserve keeps file size sane.
      const r = await run('qpdf', [
        '--object-streams=preserve',
        '--warning-exit-0',
        inPath,
        outPath,
      ])
      if (r.stderr) accumulatedWarnings.push(`[qpdf] ${r.stderr.trim()}`)
      if (!r.timedOut && (r.code === 0 || r.code === 3) && (await isValidPdfFile(outPath))) {
        return {
          data: await readFile(outPath),
          step: 'qpdf' as const,
          warnings: accumulatedWarnings.join('\n'),
        }
      }
    }

    // ---- Step 2: qpdf deep rewrite ----
    {
      const outPath = join(dir, 'out-qpdf-deep.pdf')
      // Decompose object streams and recompress everything from scratch.
      // Helps when the cheap pass left structural problems behind.
      const r = await run('qpdf', [
        '--object-streams=disable',
        '--stream-data=uncompress',
        '--warning-exit-0',
        inPath,
        outPath,
      ])
      if (r.stderr) accumulatedWarnings.push(`[qpdf-deep] ${r.stderr.trim()}`)
      if (!r.timedOut && (r.code === 0 || r.code === 3) && (await isValidPdfFile(outPath))) {
        return {
          data: await readFile(outPath),
          step: 'qpdf-deep' as const,
          warnings: accumulatedWarnings.join('\n'),
        }
      }
    }

    // ---- Step 3: Ghostscript rebuild ----
    {
      const outPath = join(dir, 'out-gs.pdf')
      // -dPDFSTOPONERROR=false  : keep going after recoverable errors
      // -dNOPAUSE -dBATCH       : non-interactive
      // -dQUIET                 : suppress normal output (we keep stderr)
      // -sDEVICE=pdfwrite       : re-render the document to a clean PDF
      const r = await run(
        'gs',
        [
          '-o', outPath,
          '-sDEVICE=pdfwrite',
          '-dPDFSTOPONERROR=false',
          '-dNOPAUSE',
          '-dBATCH',
          '-dQUIET',
          inPath,
        ],
        STEP_TIMEOUT_MS,
      )
      if (r.stderr) accumulatedWarnings.push(`[gs] ${r.stderr.trim()}`)
      if (!r.timedOut && r.code === 0 && (await isValidPdfFile(outPath))) {
        return {
          data: await readFile(outPath),
          step: 'ghostscript' as const,
          warnings: accumulatedWarnings.join('\n'),
        }
      }
    }

    throw new UnrepairableError('File is too corrupted to repair')
  })
}
