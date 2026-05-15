/**
 * lib/concurrency-guard.ts
 *
 * Named semaphore system for heavy-processing routes.
 * Prevents OOM by capping how many LibreOffice / OCR / Ghostscript / pdfjs
 * subprocesses can run simultaneously in a single Node.js instance.
 *
 * Conservative defaults for a 4 GB server:
 *   libreoffice → 2   (300–500 MB each)
 *   ghostscript → 4   (100–300 MB each)
 *   ocr         → 2   (300–500 MB each)
 *   python      → 3   (150–300 MB each)
 *   pdfjs       → 3   (200–500 MB each)
 *
 * Override via env:  GUARD_LIBREOFFICE_MAX=4  GUARD_OCR_MAX=3  etc.
 */

export interface GuardState {
  name: string
  max: number
  current: number
  waiting: number
  totalAcquired: number
  totalRejected: number
  lastAcquiredAt: number | null
  lastReleasedAt: number | null
}

class Semaphore {
  private _current = 0
  private readonly _waiters: Array<() => void> = []
  private _totalAcquired = 0
  private _totalRejected = 0
  private _lastAcquiredAt: number | null = null
  private _lastReleasedAt: number | null = null

  constructor(
    readonly name: string,
    readonly max: number
  ) {}

  acquire(timeoutMs = 45_000): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (this._current < this.max) {
        this._grant(resolve)
        return
      }

      let settled = false

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        const idx = this._waiters.indexOf(waiter)
        if (idx !== -1) this._waiters.splice(idx, 1)
        this._totalRejected++
        reject(
          Object.assign(
            new Error(
              `Server is busy — ${this.name} limit (${this.max}) reached. ` +
              `Please try again in a few seconds.`
            ),
            { _status: 503, _guard: this.name }
          )
        )
      }, timeoutMs)

      const waiter = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this._grant(resolve)
      }

      this._waiters.push(waiter)
    })
  }

  private _grant(resolve: (release: () => void) => void): void {
    this._current++
    this._totalAcquired++
    this._lastAcquiredAt = Date.now()
    resolve(() => this._release())
  }

  private _release(): void {
    this._current = Math.max(0, this._current - 1)
    this._lastReleasedAt = Date.now()
    this._waiters.shift()?.()
  }

  getState(): GuardState {
    return {
      name: this.name,
      max: this.max,
      current: this._current,
      waiting: this._waiters.length,
      totalAcquired: this._totalAcquired,
      totalRejected: this._totalRejected,
      lastAcquiredAt: this._lastAcquiredAt,
      lastReleasedAt: this._lastReleasedAt,
    }
  }
}

function envInt(key: string, fallback: number): number {
  const v = parseInt(process.env[key] ?? '', 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

const _guards: Record<string, Semaphore> = {
  libreoffice: new Semaphore('libreoffice', envInt('GUARD_LIBREOFFICE_MAX', 2)),
  ghostscript:  new Semaphore('ghostscript',  envInt('GUARD_GHOSTSCRIPT_MAX', 4)),
  ocr:          new Semaphore('ocr',          envInt('GUARD_OCR_MAX',         2)),
  python:       new Semaphore('python',        envInt('GUARD_PYTHON_MAX',       3)),
  pdfjs:        new Semaphore('pdfjs',         envInt('GUARD_PDFJS_MAX',        3)),
}

/**
 * Acquire a named guard slot.
 * Returns a release function — MUST be called in a finally block.
 *
 * @throws {Error & { _status: 503 }} when the slot is not available within timeoutMs
 *
 * @example
 *   const release = await acquireGuard('libreoffice')
 *   try {
 *     await doWork()
 *   } finally {
 *     release()
 *   }
 */
export async function acquireGuard(name: string, timeoutMs = 45_000): Promise<() => void> {
  if (!_guards[name]) {
    _guards[name] = new Semaphore(name, envInt(`GUARD_${name.toUpperCase()}_MAX`, 4))
  }
  return _guards[name].acquire(timeoutMs)
}

export function getAllGuardStates(): GuardState[] {
  return Object.values(_guards).map((s) => s.getState())
}

export function getGuardState(name: string): GuardState | null {
  return _guards[name]?.getState() ?? null
}
