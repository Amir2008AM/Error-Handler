/**
 * lib/preupload-store.ts
 *
 * In-memory store for pre-uploaded files.
 * Files are uploaded silently on file-select and referenced by uploadId.
 * Entries expire after 10 minutes and their temp dirs are cleaned up.
 */

import { rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export interface PreUploadEntry {
  uploadId: string
  /** Absolute path to the temp file on disk */
  path: string
  /** Temp dir that contains the file — deleted on expiry or after use */
  dir: string
  filename: string
  mimeType: string
  size: number
  expires: number
}

const store = new Map<string, PreUploadEntry>()
const TTL_MS = 10 * 60 * 1000 // 10 minutes

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (entry.expires < now) {
      store.delete(id)
      rm(entry.dir, { recursive: true, force: true }).catch(() => {})
    }
  }
}, 60_000).unref()

export function createPreUploadId(): string {
  return randomUUID()
}

export function setPreUpload(entry: Omit<PreUploadEntry, 'expires'>): void {
  store.set(entry.uploadId, { ...entry, expires: Date.now() + TTL_MS })
}

export function getPreUpload(uploadId: string): PreUploadEntry | null {
  const entry = store.get(uploadId)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    store.delete(uploadId)
    rm(entry.dir, { recursive: true, force: true }).catch(() => {})
    return null
  }
  return entry
}

/** Get the entry and remove it from the store (caller owns cleanup). */
export function consumePreUpload(uploadId: string): PreUploadEntry | null {
  const entry = store.get(uploadId)
  if (!entry) return null
  store.delete(uploadId)
  if (entry.expires < Date.now()) {
    rm(entry.dir, { recursive: true, force: true }).catch(() => {})
    return null
  }
  return entry
}

export function deletePreUpload(uploadId: string): void {
  const entry = store.get(uploadId)
  if (entry) {
    store.delete(uploadId)
    rm(entry.dir, { recursive: true, force: true }).catch(() => {})
  }
}
