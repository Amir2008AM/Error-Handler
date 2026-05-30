import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)

// Static candidate paths for the excel script — evaluated at request time only,
// no filesystem crawl during build/NFT tracing.
const SCRIPT_CANDIDATES: readonly string[] = [
  '/app/artifacts/web-toolify/lib/processing/excel_to_pdf.py',
  '/app/lib/processing/excel_to_pdf.py',
  '/opt/render/project/src/artifacts/web-toolify/lib/processing/excel_to_pdf.py',
]

export async function GET() {
  const results: Record<string, string> = {}

  // Check Python
  try {
    const { stdout } = await execAsync('python3 --version')
    results.python = stdout.trim()
  } catch (e) {
    results.python = 'NOT FOUND: ' + String(e)
  }

  // Check which python3 is on PATH
  try {
    const { stdout } = await execAsync('which python3')
    results.python_path = stdout.trim()
  } catch (e) {
    results.python_path = 'NOT FOUND: ' + String(e)
  }

  // Check pip
  try {
    const { stdout } = await execAsync('pip3 --version 2>/dev/null || pip --version 2>/dev/null')
    results.pip = stdout.trim()
  } catch (e) {
    results.pip = 'NOT FOUND: ' + String(e)
  }

  // Check each package
  for (const pkg of ['arabic_reshaper', 'bidi', 'reportlab', 'openpyxl', 'PIL']) {
    try {
      const { stdout } = await execAsync(
        `python3 -c "import ${pkg}; print('${pkg} OK')"`
      )
      results[pkg] = stdout.trim()
    } catch (e: unknown) {
      results[pkg] = 'MISSING: ' + (e instanceof Error ? e.message : String(e)).slice(0, 200)
    }
  }

  // Check process.cwd()
  results.cwd = process.cwd()

  // Check static candidate script paths
  for (const p of SCRIPT_CANDIDATES) {
    try {
      await execAsync(`test -f "${p}"`)
      results[`path_exists:${p}`] = 'YES'
    } catch {
      results[`path_exists:${p}`] = 'NO'
    }
  }

  // The resolved script (first existing path)
  let resolvedScript: string | undefined
  for (const p of SCRIPT_CANDIDATES) {
    try {
      await execAsync(`test -f "${p}"`)
      resolvedScript = p
      break
    } catch {
      // continue
    }
  }
  results.resolved_script = resolvedScript ?? 'NONE FOUND'

  // Try running script --help if we found it
  if (resolvedScript) {
    try {
      const { stdout, stderr } = await execAsync(
        `python3 "${resolvedScript}" --help`,
        { timeout: 10000 }
      )
      results.script_help = stdout.slice(0, 300)
      if (stderr) results.script_help_stderr = stderr.slice(0, 200)
    } catch (e: unknown) {
      results.script_error = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    }
  }

  // Node / env info
  results.node_version = process.version
  results.node_env = process.env.NODE_ENV ?? 'unknown'
  results.platform = process.platform

  return NextResponse.json(results, { status: 200 })
}
