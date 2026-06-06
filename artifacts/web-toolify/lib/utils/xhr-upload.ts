'use client'

/**
 * XMLHttpRequest-based upload helper.
 *
 * Improvements over a plain fetch():
 *  - Real upload progress (fetch API has no upload progress)
 *  - Real download progress for binary responses
 *  - Hard timeout so the request never hangs forever
 *  - Automatic retry with exponential back-off on transient network errors
 *  - Abort support: call the returned cancel() function to abort mid-flight
 */

export interface XhrUploadResponse {
  ok: boolean
  status: number
  blob: () => Promise<Blob>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: () => Promise<any>
  text: () => Promise<string>
  headers: { get: (key: string) => string | null }
}

export interface XhrUploadOptions {
  url: string
  formData: FormData
  /**
   * How the success body will be consumed.
   *  - 'blob' (default): binary download endpoints (PDFs, images, ZIPs)
   *  - 'text' / 'json':  text or JSON responses
   */
  responseType?: 'blob' | 'text' | 'json'
  /**
   * 0–100: bytes sent to the server (upload phase).
   */
  onUploadProgress?: (percent: number) => void
  /**
   * 0–100: bytes received from the server (download phase).
   * Only fires when the server sends a Content-Length header.
   */
  onDownloadProgress?: (percent: number) => void
  /**
   * Total timeout in milliseconds for the entire request (upload + processing +
   * download). Defaults to 5 minutes (300 000 ms).
   */
  timeoutMs?: number
  /**
   * How many times to automatically retry on transient network errors.
   * Retries are NOT triggered on HTTP error status codes (4xx / 5xx).
   * Defaults to 2.
   */
  maxRetries?: number
}

export interface XhrUploadResult {
  /** The fetch-compatible response object. */
  response: XhrUploadResponse
  /**
   * Call this to abort the in-flight request.
   * After calling cancel() the upload promise rejects with "Upload aborted".
   */
  cancel: () => void
}

// ── Internal single-attempt helper ────────────────────────────────────────────

function attempt(
  options: XhrUploadOptions,
  onCancel: (abortFn: () => void) => void,
): Promise<XhrUploadResponse> {
  const {
    url,
    formData,
    responseType = 'blob',
    onUploadProgress,
    onDownloadProgress,
    timeoutMs = 300_000,
  } = options

  return new Promise<XhrUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // ── Upload progress ────────────────────────────────────────────────────────
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    // ── Download progress ──────────────────────────────────────────────────────
    xhr.addEventListener('progress', (e) => {
      if (e.lengthComputable && onDownloadProgress) {
        onDownloadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    // ── Response ───────────────────────────────────────────────────────────────
    xhr.addEventListener('load', () => {
      const ok = xhr.status >= 200 && xhr.status < 300
      const raw = xhr.response

      const getBlob = async (): Promise<Blob> => {
        if (raw instanceof Blob) return raw
        if (typeof raw === 'string') return new Blob([raw])
        return new Blob([JSON.stringify(raw ?? '')])
      }

      const getText = async (): Promise<string> => {
        if (typeof raw === 'string') return raw
        if (raw instanceof Blob) return await raw.text()
        return JSON.stringify(raw ?? '')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getJson = async (): Promise<any> => {
        const text = await getText()
        try {
          return JSON.parse(text)
        } catch {
          throw new Error('Server response was not valid JSON')
        }
      }

      resolve({
        ok,
        status: xhr.status,
        blob: getBlob,
        text: getText,
        json: getJson,
        headers: { get: (k: string) => xhr.getResponseHeader(k) },
      })
    })

    // ── Errors / abort / timeout ──────────────────────────────────────────────
    xhr.addEventListener('error',   () => reject(new Error('Network error — check your connection and try again')))
    xhr.addEventListener('abort',   () => reject(new Error('Upload aborted')))
    xhr.addEventListener('timeout', () => reject(new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)))

    // ── Open, configure, send ─────────────────────────────────────────────────
    xhr.open('POST', url)
    xhr.timeout = timeoutMs
    if (responseType === 'blob') xhr.responseType = 'blob'
    xhr.send(formData)

    // Expose the abort handle to the retry wrapper
    onCancel(() => xhr.abort())
  })
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Upload a FormData payload with progress tracking, timeout, and auto-retry.
 *
 * Returns both the response and a `cancel()` function.
 *
 * Basic usage (drop-in replacement for the old xhrUpload):
 * ```ts
 * const { response, cancel } = xhrUpload({ url, formData, onUploadProgress })
 * // later: cancel()
 * const res = await response
 * ```
 */
export function xhrUpload(options: XhrUploadOptions): Promise<XhrUploadResponse> & { cancel: () => void } {
  const maxRetries = options.maxRetries ?? 2
  let currentAbort: (() => void) | null = null
  let cancelled = false

  const promise = (async (): Promise<XhrUploadResponse> => {
    let lastError: Error = new Error('Upload failed')

    for (let attempt_num = 0; attempt_num <= maxRetries; attempt_num++) {
      if (cancelled) throw new Error('Upload aborted')

      if (attempt_num > 0) {
        // Exponential back-off: 1s, 2s
        const delay = 1000 * attempt_num
        await new Promise<void>((r) => setTimeout(r, delay))
        if (cancelled) throw new Error('Upload aborted')
      }

      try {
        const response = await attempt(options, (abortFn) => {
          currentAbort = abortFn
        })
        // HTTP error codes are NOT retried — they are deterministic failures
        return response
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // Do not retry on abort or explicit timeout — these are intentional
        const msg = lastError.message
        if (msg.includes('aborted') || msg.includes('timed out')) throw lastError

        // Retry on transient network errors only
        if (attempt_num < maxRetries) {
          console.warn(`[xhrUpload] Attempt ${attempt_num + 1} failed: ${msg}. Retrying…`)
          continue
        }
      }
    }

    throw lastError
  })()

  const cancel = () => {
    cancelled = true
    currentAbort?.()
  }

  // Attach cancel to the promise object so callers can do:
  //   const upload = xhrUpload(...)
  //   upload.cancel()
  //   const res = await upload
  ;(promise as Promise<XhrUploadResponse> & { cancel: () => void }).cancel = cancel

  return promise as Promise<XhrUploadResponse> & { cancel: () => void }
}
