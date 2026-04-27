/**
 * Temporary File Storage System
 *
 * Filesystem-backed storage with automatic cleanup and **fully async** I/O.
 *
 * Improvements over the previous implementation:
 *  - All disk I/O uses `fs/promises` (no sync calls blocking the event loop)
 *  - Streaming `storeStream()` writes uploads/results directly to disk
 *    without ever holding the full payload in JS heap
 *  - Streaming `getStream()` returns a Node Readable for backpressured
 *    downloads (used by `/api/files/[id]`)
 *  - Atomic writes (temp filename → rename) so a crashed write never
 *    leaves a half-written file readable
 *  - Cached `totalSize` so `store()` doesn't walk the entire storage
 *    directory on every upload
 *  - Buffer-based `store()`/`get()` are now async too (every caller is in
 *    an async context already)
 */

import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
  rename,
  access,
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export interface StoredFile {
  id: string
  buffer: Buffer
  fileName: string
  mimeType: string
  size: number
  createdAt: number
  expiresAt: number
  accessCount: number
}

export interface StoredFileMeta {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: number
  expiresAt: number
  accessCount: number
}

export interface StoredFileStream {
  meta: StoredFileMeta
  stream: Readable
}

export interface StorageConfig {
  defaultTtlMs: number
  maxStorageBytes: number
  maxFileBytes: number
  cleanupIntervalMs: number
  storageDir: string
}

const DEFAULT_CONFIG: StorageConfig = {
  defaultTtlMs: 20 * 60 * 1000, // 20 minutes
  maxStorageBytes: 500 * 1024 * 1024, // 500MB
  maxFileBytes: 100 * 1024 * 1024, // 100MB per file
  cleanupIntervalMs: 60 * 1000, // 1 minute
  storageDir: join(tmpdir(), 'toolify'),
}

interface StoredMetadata {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: number
  expiresAt: number
  accessCount: number
}

const DATA_FILENAME = 'data'
const META_FILENAME = 'meta.json'

class TempStorage {
  private config: StorageConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  /** Cached running total of bytes on disk; -1 means "needs recompute". */
  private cachedTotalSize: number = -1
  private dirReady: Promise<void> | null = null

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.dirReady = this.ensureStorageDir()
    this.startCleanup()
  }

  // -----------------------------------------------------------------
  // Public: write
  // -----------------------------------------------------------------

  /**
   * Store a buffer and return the new file id.
   * Backwards-compatible signature; all callers are async.
   */
  async store(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    ttlMs?: number
  ): Promise<string> {
    if (buffer.length > this.config.maxFileBytes) {
      throw new Error(
        `File size ${buffer.length} exceeds maximum ${this.config.maxFileBytes}`
      )
    }
    await this.ensureCapacity(buffer.length)

    const { id, dir, dataPath } = await this.allocate()
    const tmpPath = `${dataPath}.tmp`
    await writeFile(tmpPath, buffer)
    await rename(tmpPath, dataPath)

    await this.writeMetaForNew(id, dir, fileName, mimeType, buffer.length, ttlMs)
    this.bumpTotalSize(buffer.length)
    return id
  }

  /**
   * Stream-store: pipe a Readable directly to disk without buffering.
   * `expectedSize` is the only way we can validate against
   * `maxFileBytes` *before* writing — pass it whenever known
   * (Content-Length, formData file.size, etc).
   */
  async storeStream(
    source: Readable | ReadableStream<Uint8Array>,
    fileName: string,
    mimeType: string,
    options: { expectedSize?: number; ttlMs?: number } = {}
  ): Promise<string> {
    const { expectedSize, ttlMs } = options

    if (expectedSize !== undefined && expectedSize > this.config.maxFileBytes) {
      throw new Error(
        `File size ${expectedSize} exceeds maximum ${this.config.maxFileBytes}`
      )
    }
    await this.ensureCapacity(expectedSize ?? 0)

    const { id, dir, dataPath } = await this.allocate()
    const tmpPath = `${dataPath}.tmp`
    const readable: Readable =
      source instanceof Readable ? source : Readable.fromWeb(source as never)

    let bytesWritten = 0
    const sink = createWriteStream(tmpPath)
    const limiter = new (await import('node:stream')).Transform({
      transform: (chunk: Buffer, _enc, cb) => {
        bytesWritten += chunk.length
        if (bytesWritten > this.config.maxFileBytes) {
          cb(
            new Error(
              `Stream exceeded maximum file size of ${this.config.maxFileBytes} bytes`
            )
          )
          return
        }
        cb(null, chunk)
      },
    })

    try {
      await pipeline(readable, limiter, sink)
    } catch (err) {
      // best-effort cleanup of the partial temp file
      await rm(tmpPath, { force: true }).catch(() => undefined)
      await rm(dir, { recursive: true, force: true }).catch(() => undefined)
      throw err
    }

    await rename(tmpPath, dataPath)
    await this.writeMetaForNew(id, dir, fileName, mimeType, bytesWritten, ttlMs)
    this.bumpTotalSize(bytesWritten)
    return id
  }

  // -----------------------------------------------------------------
  // Public: read
  // -----------------------------------------------------------------

  /** Read full file into memory. Use only when downstream needs a Buffer. */
  async get(id: string): Promise<StoredFile | null> {
    const meta = await this.readMeta(id)
    if (!meta) return null
    if (Date.now() > meta.expiresAt) {
      await this.delete(id)
      return null
    }

    let buffer: Buffer
    try {
      buffer = await readFile(join(this.getFileDir(id), DATA_FILENAME))
    } catch {
      return null
    }

    meta.accessCount++
    // best-effort access count update
    void writeFile(
      join(this.getFileDir(id), META_FILENAME),
      JSON.stringify(meta)
    ).catch(() => undefined)

    return {
      id: meta.id,
      buffer,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      size: meta.size,
      createdAt: meta.createdAt,
      expiresAt: meta.expiresAt,
      accessCount: meta.accessCount,
    }
  }

  /** Stream a stored file. Caller is responsible for consuming/closing. */
  async getStream(id: string): Promise<StoredFileStream | null> {
    const meta = await this.readMeta(id)
    if (!meta) return null
    if (Date.now() > meta.expiresAt) {
      await this.delete(id)
      return null
    }

    const dataPath = join(this.getFileDir(id), DATA_FILENAME)
    try {
      await access(dataPath)
    } catch {
      return null
    }

    meta.accessCount++
    void writeFile(
      join(this.getFileDir(id), META_FILENAME),
      JSON.stringify(meta)
    ).catch(() => undefined)

    const stream = createReadStream(dataPath, { highWaterMark: 64 * 1024 })
    return { meta, stream }
  }

  async getMeta(id: string): Promise<StoredFileMeta | null> {
    return this.readMeta(id)
  }

  // -----------------------------------------------------------------
  // Public: lifecycle
  // -----------------------------------------------------------------

  async delete(id: string): Promise<boolean> {
    const dir = this.getFileDir(id)
    const meta = await this.readMeta(id).catch(() => null)
    try {
      await rm(dir, { recursive: true, force: true })
      if (meta) this.bumpTotalSize(-meta.size)
      return true
    } catch {
      return false
    }
  }

  async extendTtl(id: string, additionalMs: number): Promise<boolean> {
    const meta = await this.readMeta(id)
    if (!meta) return false
    meta.expiresAt += additionalMs
    try {
      await writeFile(
        join(this.getFileDir(id), META_FILENAME),
        JSON.stringify(meta)
      )
      return true
    } catch {
      return false
    }
  }

  async getStats(): Promise<{
    fileCount: number
    totalSize: number
    maxSize: number
    usagePercent: number
  }> {
    let fileCount = 0
    let totalSize = 0
    for await (const meta of this.iterMeta()) {
      fileCount++
      totalSize += meta.size
    }
    this.cachedTotalSize = totalSize
    return {
      fileCount,
      totalSize,
      maxSize: this.config.maxStorageBytes,
      usagePercent: (totalSize / this.config.maxStorageBytes) * 100,
    }
  }

  /** Remove all files whose `expiresAt` has passed. */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let removed = 0
    for await (const meta of this.iterMeta()) {
      if (now > meta.expiresAt) {
        if (await this.delete(meta.id)) removed++
      }
    }
    return removed
  }

  async clear(): Promise<void> {
    try {
      await rm(this.config.storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    this.cachedTotalSize = 0
    this.dirReady = this.ensureStorageDir()
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  // -----------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------

  private async ensureCapacity(incoming: number): Promise<void> {
    let total = await this.getTotalSize()
    if (total + incoming <= this.config.maxStorageBytes) return

    // First reclaim expired entries.
    await this.cleanup()
    total = await this.getTotalSize()
    if (total + incoming <= this.config.maxStorageBytes) return

    // Then evict oldest until we have room.
    await this.freeSpace(total + incoming - this.config.maxStorageBytes)
  }

  private async freeSpace(neededBytes: number): Promise<void> {
    const metas: StoredMetadata[] = []
    for await (const meta of this.iterMeta()) metas.push(meta)
    metas.sort((a, b) => a.createdAt - b.createdAt)

    let freed = 0
    for (const meta of metas) {
      if (freed >= neededBytes) break
      if (await this.delete(meta.id)) freed += meta.size
    }
  }

  private async allocate(): Promise<{ id: string; dir: string; dataPath: string }> {
    if (this.dirReady) await this.dirReady
    const id = randomUUID()
    const dir = this.getFileDir(id)
    await mkdir(dir, { recursive: true })
    return { id, dir, dataPath: join(dir, DATA_FILENAME) }
  }

  private async writeMetaForNew(
    id: string,
    dir: string,
    fileName: string,
    mimeType: string,
    size: number,
    ttlMs?: number
  ): Promise<void> {
    const now = Date.now()
    const ttl = ttlMs ?? this.config.defaultTtlMs
    const meta: StoredMetadata = {
      id,
      fileName,
      mimeType,
      size,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
    }
    await writeFile(join(dir, META_FILENAME), JSON.stringify(meta))
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => {
      void this.cleanup().catch(() => undefined)
    }, this.config.cleanupIntervalMs)
    if (this.cleanupInterval.unref) this.cleanupInterval.unref()
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await mkdir(this.config.storageDir, { recursive: true })
    } catch {
      /* ignore */
    }
  }

  private getFileDir(id: string): string {
    return join(this.config.storageDir, id)
  }

  private async readMeta(id: string): Promise<StoredMetadata | null> {
    const metaPath = join(this.getFileDir(id), META_FILENAME)
    try {
      const raw = await readFile(metaPath, 'utf8')
      return JSON.parse(raw) as StoredMetadata
    } catch {
      return null
    }
  }

  private async *iterMeta(): AsyncIterableIterator<StoredMetadata> {
    if (this.dirReady) await this.dirReady

    let entries: string[]
    try {
      entries = await readdir(this.config.storageDir)
    } catch {
      return
    }

    for (const entry of entries) {
      const dir = join(this.config.storageDir, entry)
      try {
        const st = await stat(dir)
        if (!st.isDirectory()) continue
      } catch {
        continue
      }
      const meta = await this.readMeta(entry)
      if (meta) yield meta
    }
  }

  private async getTotalSize(): Promise<number> {
    if (this.cachedTotalSize >= 0) return this.cachedTotalSize
    let total = 0
    for await (const meta of this.iterMeta()) total += meta.size
    this.cachedTotalSize = total
    return total
  }

  private bumpTotalSize(delta: number): void {
    if (this.cachedTotalSize < 0) return
    this.cachedTotalSize = Math.max(0, this.cachedTotalSize + delta)
  }
}

let storageInstance: TempStorage | null = null

export function getTempStorage(config?: Partial<StorageConfig>): TempStorage {
  if (!storageInstance) {
    storageInstance = new TempStorage(config)
  }
  return storageInstance
}

export function resetTempStorage(): void {
  if (storageInstance) {
    storageInstance.stopCleanup()
    void storageInstance.clear()
    storageInstance = null
  }
}

export { TempStorage }
