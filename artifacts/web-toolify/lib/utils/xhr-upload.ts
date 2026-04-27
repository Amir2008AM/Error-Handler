/**
 * XMLHttpRequest-based upload helper that exposes real upload progress
 * (which the fetch API does not provide in browsers).
 *
 * Returns a fetch-compatible response shape so calling code only needs to
 * swap `fetch(url, { method: 'POST', body: formData })` for
 * `xhrUpload({ url, formData, onUploadProgress })`.
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
   * Hint for how the success body will be consumed.
   *  - 'blob' (default): binary download endpoints (PDFs, images, ZIPs)
   *  - 'text' / 'json':  endpoints returning text or JSON
   */
  responseType?: 'blob' | 'text' | 'json'
  /**
   * Called with 0..100 representing the upload-bytes percentage
   * (request body bytes, not full request lifecycle).
   */
  onUploadProgress?: (percent: number) => void
}

export function xhrUpload(options: XhrUploadOptions): Promise<XhrUploadResponse> {
  const { url, formData, responseType = 'blob', onUploadProgress } = options

  return new Promise<XhrUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

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

    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')))

    xhr.open('POST', url)
    if (responseType === 'blob') {
      xhr.responseType = 'blob'
    }
    // For 'text' / 'json' leave responseType as default — xhr.response is a string.
    xhr.send(formData)
  })
}
