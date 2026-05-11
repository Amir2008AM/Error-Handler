/**
 * POST /api/internal/diagnose  { tool, message, severity?, errorType?, ts? }
 *
 * Returns a structured diagnosis with:
 *  • severity (critical | high | medium | low)
 *  • root cause analysis
 *  • realistic diagnosis
 *  • recommended fix steps
 *  • confidence score (0–100)
 *  • affected components
 *  • prevention tips
 *  • system context at diagnosis time
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '../auth/route'
import os from 'node:os'

export const runtime = 'nodejs'

interface DiagnosisRequest {
  tool: string
  message: string
  severity?: string
  errorType?: string
  ts?: number
}

export interface DiagnosisResult {
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number   // 0-100
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
  matchedPattern: string
  generatedAt: number
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s % 60}s`
}

function analyzeError(req: DiagnosisRequest): DiagnosisResult {
  const msg   = (req.message ?? '').toLowerCase()
  const tool  = (req.tool ?? '').toLowerCase()
  const tsNow = Date.now()

  const cpus   = os.cpus()
  const cpuLoad = cpus.reduce((a, c) => {
    const total = Object.values(c.times).reduce((x, y) => x + y, 0)
    return a + (total - c.times.idle) / total
  }, 0) / (cpus.length || 1) * 100

  const totMem  = os.totalmem()
  const freeMem = os.freemem()
  const memPct  = Math.round(((totMem - freeMem) / totMem) * 100)
  const uptime  = Math.round(process.uptime())

  type Sev = DiagnosisResult['severity']
  let severity:           Sev      = 'medium'
  let confidence         = 70
  let title              = 'Processing Error'
  let rootCause          = 'An unexpected error occurred during file processing.'
  let affectedComponents = [tool || 'processing-engine']
  let explanation        = ''
  let matchedPattern     = 'generic'
  let steps:             DiagnosisResult['steps'] = []
  let estimatedFixTime   = '1–5 minutes'
  let preventionTips:    string[] = []

  if (msg.includes('libreoffice') || msg.includes('soffice')) {
    severity = 'high'; confidence = 92; matchedPattern = 'libreoffice'
    title    = 'LibreOffice Conversion Failure'
    rootCause = 'LibreOffice (soffice) crashed or timed out during document conversion.'
    affectedComponents = ['libreoffice', 'soffice', tool, 'document-converter']
    explanation = 'LibreOffice runs headless to convert documents. It can fail from a corrupted user profile, a hung process from a previous crash, memory pressure, or an unsupported file format feature.'
    steps = [
      { order: 1, action: 'Check for hung soffice processes', command: 'ps aux | grep soffice' },
      { order: 2, action: 'Kill stuck LibreOffice processes', command: 'pkill -9 soffice 2>/dev/null; pkill -9 "soffice.bin" 2>/dev/null' },
      { order: 3, action: 'Clear LibreOffice temp profiles', command: 'rm -rf /tmp/lo-* /tmp/xlsx-lo-* /tmp/lo-conv-* 2>/dev/null' },
      { order: 4, action: 'Verify LibreOffice is functional', command: 'soffice --headless --version' },
      { order: 5, action: 'Monitor memory during next conversion', command: 'free -h' },
    ]
    estimatedFixTime = '2–3 minutes'
    preventionTips = [
      'Enforce a strict 120s timeout on all LibreOffice calls.',
      'Use a unique user profile directory per conversion to avoid inter-job conflicts.',
      'Pre-flight: kill hung soffice processes before each job.',
    ]
  } else if (msg.includes('redis') || msg.includes('econnrefused') || msg.includes('ioredis')) {
    severity = 'critical'; confidence = 97; matchedPattern = 'redis'
    title    = 'Redis Connection Failure'
    rootCause = 'The Redis server is unreachable or has crashed.'
    affectedComponents = ['redis', 'bullmq', 'job-queue', 'all-workers']
    explanation = 'BullMQ uses Redis as its backing store. When Redis is down, no jobs can be queued or processed. Workers stop accepting new tasks immediately.'
    steps = [
      { order: 1, action: 'Check Redis status', command: 'redis-cli ping' },
      { order: 2, action: 'Start Redis if not running', command: 'redis-server --daemonize yes --loglevel warning' },
      { order: 3, action: 'Verify connection URL', command: 'echo $REDIS_URL' },
      { order: 4, action: 'Restart application after Redis is restored', command: 'pnpm --filter @workspace/web-toolify run dev' },
    ]
    estimatedFixTime = '< 1 minute'
    preventionTips = [
      'Add Redis health check to /api/health endpoint.',
      'Configure Redis persistence (AOF) so state survives restarts.',
      'Use exponential backoff reconnection in ioredis config.',
    ]
  } else if (msg.includes('timeout') || msg.includes('timed out')) {
    severity = 'high'; confidence = 88; matchedPattern = 'timeout'
    title    = 'Processing Timeout'
    rootCause = `The ${tool} job exceeded its configured time limit.`
    affectedComponents = [tool, 'job-processor', 'worker']
    explanation = 'The job ran longer than the timeout. This happens with very large files, complex spreadsheets, or heavy server load.'
    steps = [
      { order: 1, action: 'Check server load', command: 'top -bn1 | head -5' },
      { order: 2, action: 'Check active conversion processes', command: 'ps aux | grep -E "soffice|python3" | grep -v grep' },
      { order: 3, action: 'Check temp disk usage', command: 'du -sh /tmp/* 2>/dev/null | sort -h | tail -10' },
      { order: 4, action: 'Kill stuck processing jobs', command: 'pkill -9 soffice; pkill -9 "python3.*excel"' },
    ]
    estimatedFixTime = '2–5 minutes'
    preventionTips = [
      'Increase timeout limits for large file conversions.',
      'Enforce file size limits to reject oversized files.',
      'Add concurrency limits per tool to prevent resource starvation.',
    ]
  } else if (msg.includes('memory') || msg.includes('heap') || msg.includes('oom') || msg.includes('killed')) {
    severity = 'critical'; confidence = 91; matchedPattern = 'oom'
    title    = 'Out of Memory / Process Killed'
    rootCause = 'Server ran out of available memory; OS killed a process.'
    affectedComponents = ['node-process', 'workers', tool]
    explanation = 'Large PDF or LibreOffice operations can consume substantial RAM. When the system runs low, the OOM killer terminates processes.'
    steps = [
      { order: 1, action: 'Check memory usage', command: 'free -h' },
      { order: 2, action: 'Find top memory consumers', command: 'ps aux --sort=-%mem | head -10' },
      { order: 3, action: 'Clear temp files', command: 'rm -rf /tmp/lo-* /tmp/py-* /tmp/upload-* /tmp/toolify/*' },
      { order: 4, action: 'Restart the application', command: 'pkill -f "next dev" && sleep 2 && pnpm run dev' },
    ]
    estimatedFixTime = '3–5 minutes'
    preventionTips = [
      'Set NODE_OPTIONS="--max-old-space-size=2048" to cap heap growth.',
      'Reduce worker concurrency to lower peak memory use.',
      'Reject files > 50MB with a clear user error message.',
    ]
  } else if (msg.includes('python') || msg.includes('openpyxl') || msg.includes('reportlab') || msg.includes('module not found') || msg.includes('pandas') || msg.includes('no module named')) {
    severity = 'high'; confidence = 95; matchedPattern = 'python-dep'
    title    = 'Python Dependency Missing'
    rootCause = 'A required Python package is missing or incompatible.'
    affectedComponents = ['python3', 'excel-pipeline', tool]
    explanation = 'The Excel/PDF pipeline requires openpyxl, reportlab, and arabic-reshaper. If these are not installed, conversions fail immediately.'
    steps = [
      { order: 1, action: 'Check Python environment', command: 'python3 --version && pip3 list' },
      { order: 2, action: 'Re-install all Python requirements', command: 'pip install -q -r requirements.txt' },
      { order: 3, action: 'Verify key packages', command: "python3 -c \"import openpyxl, reportlab, arabic_reshaper; print('OK')\"" },
      { order: 4, action: 'Check for pandas (optional dependency)', command: "pip install pandas 2>/dev/null; python3 -c \"import pandas; print('pandas OK')\"" },
    ]
    estimatedFixTime = '2–10 minutes'
    preventionTips = [
      'Pin exact package versions in requirements.txt.',
      'Run pip install as a startup health check.',
      'Cache pip install output in CI/CD to speed up deploys.',
    ]
  } else if (msg.includes('permission') || msg.includes('eacces') || msg.includes('access denied')) {
    severity = 'high'; confidence = 93; matchedPattern = 'permission'
    title    = 'File System Permission Error'
    rootCause = 'The server process cannot read or write required directories.'
    affectedComponents = ['filesystem', '/tmp', tool]
    explanation = 'Processing tools write temporary files to /tmp. If this directory is unwritable or disk is full, all conversions fail.'
    steps = [
      { order: 1, action: 'Check /tmp permissions and disk space', command: 'df -h /tmp && ls -la /tmp | head -20' },
      { order: 2, action: 'Fix /tmp permissions', command: 'chmod 1777 /tmp' },
      { order: 3, action: 'Check overall disk usage', command: 'df -h' },
      { order: 4, action: 'Clean old temp files', command: 'find /tmp -maxdepth 1 -type d -name "lo-*" -mmin +60 -exec rm -rf {} + 2>/dev/null' },
    ]
    estimatedFixTime = '1–3 minutes'
    preventionTips = [
      'Schedule periodic /tmp cleanup every 30 minutes.',
      'Alert when disk usage > 80%.',
    ]
  } else if (msg.includes('invalid') || msg.includes('corrupt') || msg.includes('magic bytes') || msg.includes('bad magic')) {
    severity = 'low'; confidence = 85; matchedPattern = 'corrupt-file'
    title    = 'Invalid or Corrupted File'
    rootCause = 'The uploaded file is not valid or is corrupted.'
    affectedComponents = [tool, 'input-validation']
    explanation = 'The file failed magic-byte validation or could not be parsed. This is usually a user error (wrong file type, renamed file, corrupted download).'
    steps = [
      { order: 1, action: 'No server action needed — this is a user-side issue.' },
      { order: 2, action: 'Ensure user-facing error messages are clear and actionable.' },
      { order: 3, action: 'Check if validation logic is too strict for edge-case files', command: 'grep -r "magic bytes\\|isPdf\\|validateStreamedFile" lib/ --include="*.ts" -l' },
    ]
    estimatedFixTime = 'No server fix needed'
    preventionTips = [
      'Show users: "This file appears corrupted. Please re-download and try again."',
      'Log invalid file attempts to spot patterns.',
    ]
  } else if (msg.includes('enoent') || msg.includes('no such file')) {
    severity = 'medium'; confidence = 87; matchedPattern = 'enoent'
    title    = 'Missing File or Directory'
    rootCause = 'A required file or directory was not found.'
    affectedComponents = [tool, 'filesystem']
    explanation = 'Temporary files may have been cleaned up prematurely, or the expected output path does not exist.'
    steps = [
      { order: 1, action: 'Check temp directory contents', command: 'ls -la /tmp/ | head -20' },
      { order: 2, action: 'Verify job temp dirs are created', command: 'ls -la /tmp/toolify/ 2>/dev/null || echo "no toolify dir"' },
      { order: 3, action: 'Check disk space', command: 'df -h' },
    ]
    estimatedFixTime = '5 minutes'
    preventionTips = [
      'Use atomic temp file creation to avoid race conditions.',
      'Ensure cleanup only happens after files have been delivered to the client.',
    ]
  } else if (msg.includes('queue') || msg.includes('bullmq') || msg.includes('worker')) {
    severity = 'high'; confidence = 82; matchedPattern = 'queue'
    title    = 'Job Queue Problem'
    rootCause = 'A BullMQ worker or queue is in an unhealthy state.'
    affectedComponents = ['bullmq', 'redis', 'workers', tool]
    explanation = 'The job queue may be stalled, a worker may have crashed, or Redis connectivity is degraded.'
    steps = [
      { order: 1, action: 'Check Redis connectivity', command: 'redis-cli ping' },
      { order: 2, action: 'Check BullMQ queue status via dashboard.' },
      { order: 3, action: 'Restart workers by restarting the application' },
    ]
    estimatedFixTime = '2–5 minutes'
    preventionTips = [
      'Set worker stalledInterval to detect and recover stalled jobs.',
      'Use maxRetriesOnError for resilient queue processing.',
    ]
  } else {
    confidence = 55; matchedPattern = 'generic'
    title = `${tool.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Processing Error`
    rootCause = 'An unexpected error occurred. Check server logs for the full stack trace.'
    explanation = `The ${tool} pipeline returned an unexpected error. This may be caused by an unsupported file feature, transient resource issue, or a code bug.`
    steps = [
      { order: 1, action: 'Check server logs for full stack trace', command: 'ls /tmp/logs/ 2>/dev/null && tail -100 /tmp/logs/*.log 2>/dev/null | tail -50' },
      { order: 2, action: 'Check system health', command: 'free -h && df -h /tmp' },
      { order: 3, action: 'Clear temp files', command: 'rm -rf /tmp/lo-* /tmp/py-* /tmp/upload-* 2>/dev/null' },
      { order: 4, action: 'Retry with a smaller or simpler test file to isolate the issue.' },
    ]
    preventionTips = [
      `Add more specific error handling to the ${tool} route.`,
      'Log full stack traces on every failure.',
    ]
  }

  return {
    severity,
    confidence,
    title,
    rootCause,
    affectedComponents,
    explanation,
    steps,
    estimatedFixTime,
    preventionTips,
    matchedPattern,
    systemContext: { cpuLoad, memPct, uptime, redisOk: !!process.env.REDIS_URL, dbOk: true },
    generatedAt: tsNow,
  }
}

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }
  try {
    const body: DiagnosisRequest = await request.json()
    return NextResponse.json(analyzeError(body))
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
