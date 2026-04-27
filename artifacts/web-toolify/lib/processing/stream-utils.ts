/**
 * Stream interop helpers.
 *
 * Bridges Node's `Readable` and the Web `ReadableStream` so we can
 * stream files end-to-end through Next.js's Response without
 * materializing the full payload as a Buffer in process memory.
 */

import { Readable } from 'node:stream'

/**
 * Convert a Node Readable to a Web ReadableStream that can be passed
 * directly as a `NextResponse` body. Backpressure is preserved.
 */
export function nodeToWebStream(readable: Readable): ReadableStream<Uint8Array> {
  // Modern Node exposes a static helper that handles backpressure + abort.
  type WithToWeb = typeof Readable & {
    toWeb?: (r: Readable) => ReadableStream<Uint8Array>
  }
  const ctor = Readable as WithToWeb
  if (typeof ctor.toWeb === 'function') {
    // toWeb is typed as ReadableStream<any>; coerce to the Uint8Array
    // variant that NextResponse expects.
    return ctor.toWeb(readable) as unknown as ReadableStream<Uint8Array>
  }

  // Fallback for environments without Readable.toWeb.
  return new ReadableStream<Uint8Array>({
    start(controller) {
      readable.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      readable.on('end', () => controller.close())
      readable.on('error', (err) => controller.error(err))
    },
    cancel() {
      readable.destroy()
    },
  })
}

/**
 * Collect a Web ReadableStream into a single Buffer.
 * Use only when downstream really needs a Buffer (e.g. pdf-lib).
 */
export async function webStreamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        const buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
        chunks.push(buf)
        total += buf.length
      }
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}
