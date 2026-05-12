import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '../auth/route'
import os from 'node:os'

export const runtime = 'nodejs'

interface DiagnosisRequest {
  tool: string
  message: string
  severity?: string
  errorType?: string
  ts?: number
}

interface DiagnosisResult {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  rootCause: string
  affectedComponents: string[]
  explanation: string
  steps: Array<{ order: number; action: string; command?: string }>
  estimatedFixTime: string
  preventionTips: string[]
  systemContext: {
    cpuLoad: number
    memPct: number
    uptime: number
    redisOk: boolean
    dbOk: boolean
  }
  generatedAt: number
}

function analyzeError(req: DiagnosisRequest): DiagnosisResult {
  const msg   = (req.message ?? '').toLowerCase()
  const tool  = (req.tool ?? '').toLowerCase()
  const tsNow = Date.now()

  const cpus   = os.cpus()
  const memPct = Math.round((1 - os.freemem() / os.totalmem()) * 100)
  const uptime = Math.round(process.uptime())

  let severity:           DiagnosisResult['severity'] = 'medium'
  let title               = 'Processing Error'
  let rootCause           = 'An unexpected error occurred during file processing.'
  let affectedComponents: string[] = [tool || 'processing-engine']
  let explanation         = ''
  let steps:              DiagnosisResult['steps'] = []
  let estimatedFixTime    = '1–5 minutes'
  let preventionTips:     string[] = []

  if (msg.includes('libreoffice') || msg.includes('soffice')) {
    severity = 'high'
    title    = 'LibreOffice Conversion Failure'
    rootCause = 'LibreOffice (soffice) crashed or timed out during document conversion.'
    affectedComponents = ['libreoffice', 'soffice', tool, 'document-converter']
    explanation = 'LibreOffice runs as a headless process to convert documents. It can fail due to a corrupted user profile, a hung process from a previous crash, memory pressure, or an unsupported file format feature.'
    steps = [
      { order: 1, action: 'Check if any soffice processes are hung', command: 'ps aux | grep soffice' },
      { order: 2, action: 'Kill any stuck LibreOffice processes', command: 'pkill -9 soffice 2>/dev/null; pkill -9 "soffice.bin" 2>/dev/null' },
      { order: 3, action: 'Clear LibreOffice temp profiles', command: 'rm -rf /tmp/lo-* /tmp/xlsx-lo-* /tmp/lo-conv-* 2>/dev/null' },
      { order: 4, action: 'Verify LibreOffice is functional', command: 'soffice --headless --version' },
      { order: 5, action: 'Monitor memory during next conversion', command: 'free -h' },
    ]
    estimatedFixTime = '2–3 minutes'
    preventionTips = [
      'Set a strict 120s timeout on LibreOffice calls (already applied).',
      'Run each LO conversion with a unique user profile directory to avoid conflicts.',
      'Add a pre-flight check that kills hung soffice processes before each job.',
    ]
  } else if (msg.includes('redis') || msg.includes('econnrefused') || msg.includes('ioredis')) {
    severity = 'critical'
    title    = 'Redis Connection Failure'
    rootCause = 'The Redis server is not reachable or has crashed.'
    affectedComponents = ['redis', 'bullmq', 'job-queue', 'all-workers']
    explanation = 'BullMQ uses Redis as its backing store. When Redis is down, no jobs can be queued or processed. The job workers will stop accepting new tasks immediately.'
    steps = [
      { order: 1, action: 'Check if Redis is running', command: 'redis-cli ping' },
      { order: 2, action: 'Start Redis if not running', command: 'redis-server --daemonize yes --loglevel warning' },
      { order: 3, action: 'Check Redis connection URL', command: 'echo $REDIS_URL' },
      { order: 4, action: 'Restart the application after Redis is restored', command: 'pnpm --filter @workspace/web-toolify run dev' },
    ]
    estimatedFixTime = '< 1 minute'
    preventionTips = [
      'Add a Redis health check to the /api/health endpoint.',
      'Configure Redis with persistence (AOF) so state survives restarts.',
      'Use a Redis connection retry policy with exponential backoff.',
    ]
  } else if (msg.includes('timeout') || msg.includes('timed out')) {
    severity = 'high'
    title    = 'Processing Timeout'
    rootCause = `The ${tool} job exceeded its time limit.`
    affectedComponents = [tool, 'job-processor', 'worker']
    explanation = 'The processing job ran longer than the configured timeout. This can happen with very large files, complex spreadsheets, or when the server is under heavy load.'
    steps = [
      { order: 1, action: 'Check current server load', command: 'top -bn1 | head -5' },
      { order: 2, action: 'Check active LibreOffice/Python processes', command: 'ps aux | grep -E "soffice|python3" | grep -v grep' },
      { order: 3, action: 'Check temp directory disk usage', command: 'du -sh /tmp/* 2>/dev/null | sort -h | tail -10' },
      { order: 4, action: 'Kill any stuck processing jobs', command: 'pkill -9 soffice; pkill -9 "python3.*excel"' },
    ]
    estimatedFixTime = '2–5 minutes'
    preventionTips = [
      'Increase timeout limits for large file conversions.',
      'Implement file size limits to reject files too large to process reliably.',
      'Add concurrency limits per tool to prevent resource starvation.',
    ]
  } else if (msg.includes('memory') || msg.includes('heap') || msg.includes('oom') || msg.includes('killed')) {
    severity = 'critical'
    title    = 'Out of Memory / Process Killed'
    rootCause = 'The server ran out of available memory and the OS killed a process.'
    affectedComponents = ['node-process', 'workers', tool]
    explanation = 'Large file processing (especially PDF rendering with pdfjs or LibreOffice) can consume significant RAM. When the system runs low, the OS OOM killer terminates processes.'
    steps = [
      { order: 1, action: 'Check current memory usage', command: 'free -h' },
      { order: 2, action: 'Find large memory consumers', command: 'ps aux --sort=-%mem | head -10' },
      { order: 3, action: 'Clear tmp files to free disk', command: 'rm -rf /tmp/lo-* /tmp/py-* /tmp/upload-* /tmp/toolify/*' },
      { order: 4, action: 'Restart the application', command: 'pkill -f "next dev" && sleep 2 && pnpm run dev' },
    ]
    estimatedFixTime = '3–5 minutes'
    preventionTips = [
      'Set Node.js --max-old-space-size to limit heap growth.',
      'Reduce worker concurrency to lower peak memory usage.',
      'Add file size limits — files > 50MB should be rejected or queued differently.',
    ]
  } else if (msg.includes('python') || msg.includes('openpyxl') || msg.includes('reportlab') || msg.includes('module not found')) {
    severity = 'high'
    title    = 'Python Dependency Missing'
    rootCause = 'A required Python package is missing or incompatible.'
    affectedComponents = ['python3', 'excel-pipeline', tool]
    explanation = 'The Excel/PDF pipeline depends on Python packages (openpyxl, reportlab, arabic-reshaper). If the virtual environment is missing or a package failed to install, conversions will fail.'
    steps = [
      { order: 1, action: 'Check Python environment', command: 'python3 --version && pip3 list' },
      { order: 2, action: 'Re-install all Python requirements', command: 'pip3 install -r requirements.txt -q' },
      { order: 3, action: 'Verify key packages', command: 'python3 -c "import openpyxl, reportlab, arabic_reshaper; print(\'OK\')"' },
      { order: 4, action: 'Check requirements.txt exists', command: 'cat requirements.txt' },
    ]
    estimatedFixTime = '2–10 minutes'
    preventionTips = [
      'Pin exact package versions in requirements.txt.',
      'Run pip install check as part of the startup health check.',
      'Cache the pip install output in CI/CD to speed up deploys.',
    ]
  } else if (msg.includes('permission') || msg.includes('eacces') || msg.includes('access denied')) {
    severity = 'high'
    title    = 'File System Permission Error'
    rootCause = 'The server process cannot read or write to required directories.'
    affectedComponents = ['filesystem', '/tmp', tool]
    explanation = 'Processing tools write temporary files to /tmp. If the directory is not writable or disk is full, all conversions fail.'
    steps = [
      { order: 1, action: 'Check /tmp permissions and disk space', command: 'df -h /tmp && ls -la /tmp | head -20' },
      { order: 2, action: 'Fix /tmp permissions', command: 'chmod 1777 /tmp' },
      { order: 3, action: 'Check disk usage', command: 'df -h' },
      { order: 4, action: 'Clean up old temp files', command: 'find /tmp -maxdepth 1 -type d -name "lo-*" -mmin +60 -exec rm -rf {} + 2>/dev/null' },
    ]
    estimatedFixTime = '1–3 minutes'
    preventionTips = [
      'Run periodic cleanup of /tmp every 30 minutes.',
      'Monitor disk usage and alert when > 80%.',
    ]
  } else if (msg.includes('ghostscript') || msg.includes(' gs ') || msg.includes('gs:') || msg.includes('pdfsettings') || (msg.includes('compress') && tool.includes('pdf'))) {
    severity = 'high'
    title    = 'Ghostscript Processing Failure'
    rootCause = 'Ghostscript (gs) crashed, timed out, or produced no output during PDF compression.'
    affectedComponents = ['ghostscript', 'gs', tool, 'compress-pdf']
    explanation = 'Ghostscript runs as a child process for PDF compression. It can fail if the input PDF is malformed, uses features GS does not support, or if the process is killed due to timeout or memory limits.'
    steps = [
      { order: 1, action: 'Check Ghostscript is installed and working', command: 'gs --version' },
      { order: 2, action: 'Test GS against a known-good PDF', command: 'gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=/tmp/test-gs-out.pdf /tmp/test.pdf 2>&1' },
      { order: 3, action: 'Check tmp disk space for Ghostscript output', command: 'df -h /tmp' },
      { order: 4, action: 'Clear Ghostscript temp files', command: 'rm -f /tmp/gs-* /tmp/toolify/*.gs.* 2>/dev/null' },
    ]
    estimatedFixTime = '1–3 minutes'
    preventionTips = [
      'Validate PDF structure with qpdf --check before passing to Ghostscript.',
      'Set a strict 120s timeout on all gs subprocess calls.',
      'Fall back to qpdf --compress-streams=y for compression when GS fails.',
    ]
  } else if (msg.includes('qpdf') || msg.includes('wrong password') || msg.includes('pdf decrypt') || msg.includes('password')) {
    severity = 'medium'
    title    = 'qpdf / PDF Security Error'
    rootCause = msg.includes('wrong password') || msg.includes('password')
      ? 'The provided PDF password is incorrect or the file is not password-protected.'
      : 'qpdf failed to process the PDF — the file may be corrupted or use unsupported encryption.'
    affectedComponents = ['qpdf', tool, 'pdf-security']
    explanation = 'qpdf handles PDF encryption and decryption. A wrong-password error is a user error and requires no server fix. A qpdf crash indicates a corrupted or non-standard PDF.'
    steps = [
      { order: 1, action: 'Check qpdf is installed', command: 'qpdf --version' },
      { order: 2, action: 'Test the PDF integrity', command: 'qpdf --check /path/to/file.pdf 2>&1' },
      { order: 3, action: 'Check for qpdf temp files that may be blocking writes', command: 'ls -lh /tmp/qpdf-* 2>/dev/null' },
    ]
    estimatedFixTime = '< 1 minute (user error) or 2–5 minutes (file issue)'
    preventionTips = [
      'Return a clear HTTP 400 with "Wrong password" message (already implemented).',
      'Validate the PDF is a real PDF (magic bytes) before calling qpdf.',
    ]
  } else if (msg.includes('sharp') || msg.includes('libvips') || msg.includes('vips') || (msg.includes('image') && (msg.includes('corrupt') || msg.includes('decode') || msg.includes('encode')))) {
    severity = 'medium'
    title    = 'Sharp / Image Processing Failure'
    rootCause = 'The Sharp (libvips) image processing library failed to decode or encode the image.'
    affectedComponents = ['sharp', 'libvips', tool, 'image-processor']
    explanation = 'Sharp uses libvips for high-performance image processing. Failures typically stem from corrupt input images, unsupported color spaces, or decompression bomb protection triggering on oversized images.'
    steps = [
      { order: 1, action: 'Check Sharp version and libvips binding', command: 'node -e "const s=require(\'sharp\'); s.versions && console.log(JSON.stringify(s.versions))"' },
      { order: 2, action: 'Test Sharp with a known-good image', command: 'node -e "require(\'sharp\')(Buffer.alloc(0)).toBuffer().catch(e=>console.error(e.message))"' },
      { order: 3, action: 'Verify limitInputPixels is not triggering on normal images', command: '' },
    ]
    estimatedFixTime = '1–5 minutes'
    preventionTips = [
      'Add file size and dimension limits before Sharp processing (e.g., max 8000x8000 px).',
      'Catch Sharp errors per-image in batch jobs and continue the batch instead of failing all.',
      'Log the input file\'s magic bytes when Sharp fails for easier diagnosis.',
    ]
  } else if (msg.includes('sqlite') || msg.includes('sqlite_') || msg.includes('database disk image') || msg.includes('no such table')) {
    severity = 'high'
    title    = 'SQLite Database Error'
    rootCause = 'The SQLite analytics database is corrupted, locked, or the schema is out of date.'
    affectedComponents = ['sqlite', 'analytics.db', 'lib/telegram/db.ts']
    explanation = 'The analytics database stores job history, error logs, and user activity. A corrupted or locked database prevents all analytics writes. Core processing still works but data is lost.'
    steps = [
      { order: 1, action: 'Check if analytics.db exists and is readable', command: 'ls -lh ./analytics.db 2>/dev/null && sqlite3 ./analytics.db "PRAGMA integrity_check;" 2>&1' },
      { order: 2, action: 'Check WAL mode is active', command: 'sqlite3 ./analytics.db "PRAGMA journal_mode;"' },
      { order: 3, action: 'If corrupted, back up and reinitialize', command: 'mv ./analytics.db ./analytics.db.bak && echo "DB backed up — will reinitialize on next boot"' },
    ]
    estimatedFixTime = '1–2 minutes'
    preventionTips = [
      'WAL mode is already enabled — ensure all writes go through the single db.ts module.',
      'Add a startup PRAGMA integrity_check to detect early corruption.',
    ]
  } else if (msg.includes('enospc') || msg.includes('no space left') || msg.includes('disk full')) {
    severity = 'critical'
    title    = 'Disk Full — No Space Left on Device'
    rootCause = 'The /tmp partition (or root disk) has run out of space, preventing any file writes.'
    affectedComponents = ['filesystem', '/tmp', 'all-tools']
    explanation = 'All tools write temporary files to /tmp during processing. When disk space is exhausted, every conversion fails. This is usually caused by temp files not being cleaned up after a high-volume period or a failed upload cleanup.'
    steps = [
      { order: 1, action: 'Check disk usage immediately', command: 'df -h' },
      { order: 2, action: 'Find the largest directories in /tmp', command: 'du -sh /tmp/* 2>/dev/null | sort -rh | head -20' },
      { order: 3, action: 'Purge all toolify temp files', command: 'rm -rf /tmp/toolify/* /tmp/lo-* /tmp/upload-* /tmp/busboy-* 2>/dev/null && echo "Freed"' },
      { order: 4, action: 'Check Node.js temp storage TTL is running', command: '' },
    ]
    estimatedFixTime = '< 1 minute'
    preventionTips = [
      'Set up a cron job to clean /tmp/toolify/* every 30 minutes.',
      'Alert when disk usage exceeds 80% (CPU monitor already watches RAM — add disk).',
      'Enforce TempStorage TTL aggressively (already set to 20 min).',
    ]
  } else if (msg.includes('unauthorized') || msg.includes('403') || msg.includes('forbidden') || msg.includes('invalid token') || msg.includes('auth')) {
    severity = 'medium'
    title    = 'Authentication / Authorization Error'
    rootCause = 'A request was rejected due to an invalid or missing auth token/session.'
    affectedComponents = ['ops-auth', 'dev_admin_key', tool]
    explanation = 'The ops dashboard and internal APIs require a valid HMAC session token. This error typically means a token expired, was rotated, or an unauthorized access was attempted.'
    steps = [
      { order: 1, action: 'Verify DEV_ADMIN_KEY is set in environment', command: 'echo $DEV_ADMIN_KEY | cut -c1-4' },
      { order: 2, action: 'Check recent failed auth attempts in security monitor', },
      { order: 3, action: 'Clear the ops_session cookie and re-authenticate at /ops' },
    ]
    estimatedFixTime = '< 1 minute'
    preventionTips = [
      'Rotate DEV_ADMIN_KEY periodically and update all dashboards.',
      'Monitor the Security panel in /ops for repeated failed attempts.',
    ]
  } else if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('dns')) {
    severity = 'high'
    title    = 'Network / Connectivity Error'
    rootCause = 'A required network connection was refused or the DNS lookup failed.'
    affectedComponents = ['network', tool, 'external-services']
    explanation = 'This error occurs when the server cannot reach an external service (Supabase, Telegram, Redis) or an internal service endpoint. It may be transient or indicate a service outage.'
    steps = [
      { order: 1, action: 'Check Redis connectivity', command: 'redis-cli ping' },
      { order: 2, action: 'Check general internet access', command: 'curl -s --max-time 5 https://1.1.1.1 -o /dev/null && echo "OK" || echo "FAIL"' },
      { order: 3, action: 'Check environment variables for service URLs', command: 'env | grep -E "REDIS_URL|SUPABASE|TELEGRAM" | sed "s/=.*/=***/"' },
    ]
    estimatedFixTime = '1–10 minutes (depends on service)'
    preventionTips = [
      'Add retry logic with exponential backoff for all external API calls.',
      'Use the connectivity snapshot in the ops dashboard to spot offline services early.',
    ]
  } else if (msg.includes('invalid') || msg.includes('corrupt') || msg.includes('magic bytes') || msg.includes('bad magic')) {
    severity = 'low'
    title    = 'Invalid or Corrupted File'
    rootCause = 'The uploaded file is not a valid document or is corrupted.'
    affectedComponents = [tool, 'input-validation']
    explanation = 'The file failed magic-byte validation or could not be parsed. This is usually a user error (wrong file type, renamed file, or corrupted download).'
    steps = [
      { order: 1, action: 'No server action needed — this is a user-side issue.', },
      { order: 2, action: 'Ensure the error message shown to users is clear and actionable.' },
      { order: 3, action: 'Check if validation logic is too strict for valid edge-case files', command: 'grep -r "magic bytes\\|isPdf\\|validateStreamedFile" lib/ --include="*.ts" -l' },
    ]
    estimatedFixTime = 'No fix needed'
    preventionTips = [
      'Show users a clear error: "This file appears corrupted. Please re-download and try again."',
      'Log invalid file attempts to spot patterns (e.g., a specific browser mis-encoding uploads).',
    ]
    severity = 'low'
  } else {
    title = `${tool.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Processing Error`
    rootCause = 'An unexpected error occurred. Check the full stack trace and server logs for details.'
    explanation = `The ${tool} pipeline returned an error. This may be caused by an unsupported file feature, a transient resource issue, or a bug in the processing code.`
    steps = [
      { order: 1, action: 'Check server logs for full stack trace', command: 'tail -100 /tmp/logs/Start_application_*.log 2>/dev/null | tail -50' },
      { order: 2, action: 'Check system health', command: 'free -h && df -h /tmp' },
      { order: 3, action: 'Clear temp files', command: 'rm -rf /tmp/lo-* /tmp/py-* /tmp/upload-* 2>/dev/null' },
      { order: 4, action: 'Retry with a smaller or simpler test file to isolate the issue.' },
    ]
    preventionTips = [
      'Add more specific error handling to the ' + tool + ' route.',
      'Log the full error stack trace on every failure.',
    ]
  }

  return {
    severity,
    title,
    rootCause,
    affectedComponents,
    explanation,
    steps,
    estimatedFixTime,
    preventionTips,
    systemContext: {
      cpuLoad: cpus.reduce((a, c) => a + (c.times.user / (c.times.user + c.times.sys + c.times.idle)), 0) / cpus.length * 100,
      memPct,
      uptime,
      redisOk: !!(process.env.REDIS_URL),
      dbOk: true,
    },
    generatedAt: tsNow,
  }
}

export async function POST(request: NextRequest) {
  if (!verifyOpsSession(request)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    const body: DiagnosisRequest = await request.json()
    const result = analyzeError(body)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
