/**
 * Temporary File Storage System
 * Filesystem-backed storage with automatic cleanup.
 * Files are persisted under /tmp/toolify/{uuid}/ and auto-deleted after their TTL.
 */

import { randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

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

export interface StorageConfig {
  defaultTtlMs: number // Time to live in milliseconds
  maxStorageBytes: number // Max total storage
  maxFileBytes: number // Max single file size
  cleanupIntervalMs: number // How often to run cleanup
  storageDir: string // Root directory for stored files
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

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.ensureStorageDir()
    this.startCleanup()
  }

  /**
   * Store a file and return its ID
   */
  store(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    ttlMs?: number
  ): string {
    // Validate file size
    if (buffer.length > this.config.maxFileBytes) {
      throw new Error(
        `File size ${buffer.length} exceeds maximum ${this.config.maxFileBytes}`
      )
    }

    // Check total storage
    if (this.getTotalSize() + buffer.length > this.config.maxStorageBytes) {
      // Try to free up space by removing expired files first
      this.cleanup()

      // If still not enough space, remove oldest files
      if (this.getTotalSize() + buffer.length > this.config.maxStorageBytes) {
        this.freeSpace(buffer.length)
      }
    }

    const id = randomUUID()
    const now = Date.now()
    const ttl = ttlMs ?? this.config.defaultTtlMs

    const meta: StoredMetadata = {
      id,
      fileName,
      mimeType,
      size: buffer.length,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
    }

    const dir = this.getFileDir(id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, DATA_FILENAME), buffer)
    writeFileSync(join(dir, META_FILENAME), JSON.stringify(meta))

    return id
  }

  /**
   * Retrieve a file by ID
   */
  get(id: string): StoredFile | null {
    const meta = this.readMeta(id)
    if (!meta) {
      return null
    }

    // Check if expired
    if (Date.now() > meta.expiresAt) {
      this.delete(id)
      return null
    }

    let buffer: Buffer
    try {
      buffer = readFileSync(join(this.getFileDir(id), DATA_FILENAME))
    } catch {
      return null
    }

    // Increment access count and persist
    meta.accessCount++
    try {
      writeFileSync(join(this.getFileDir(id), META_FILENAME), JSON.stringify(meta))
    } catch {
      // Best-effort; not fatal if we can't update the access counter
    }

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

  /**
   * Delete a file by ID
   */
  delete(id: string): boolean {
    const dir = this.getFileDir(id)
    if (!existsSync(dir)) {
      return false
    }
    try {
      rmSync(dir, { recursive: true, force: true })
      return true
    } catch {
      return false
    }
  }

  /**
   * Extend the TTL of a file
   */
  extendTtl(id: string, additionalMs: number): boolean {
    const meta = this.readMeta(id)
    if (!meta) {
      return false
    }
    meta.expiresAt += additionalMs
    try {
      writeFileSync(join(this.getFileDir(id), META_FILENAME), JSON.stringify(meta))
      return true
    } catch {
      return false
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    fileCount: number
    totalSize: number
    maxSize: number
    usagePercent: number
  } {
    let fileCount = 0
    let totalSize = 0

    for (const meta of this.iterMeta()) {
      fileCount++
      totalSize += meta.size
    }

    return {
      fileCount,
      totalSize,
      maxSize: this.config.maxStorageBytes,
      usagePercent: (totalSize / this.config.maxStorageBytes) * 100,
    }
  }

  /**
   * Run cleanup of expired files
   */
  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const meta of this.iterMeta()) {
      if (now > meta.expiresAt) {
        if (this.delete(meta.id)) {
          removedCount++
        }
      }
    }

    return removedCount
  }

  /**
   * Free up space by removing oldest files
   */
  private freeSpace(neededBytes: number): void {
    const metas = Array.from(this.iterMeta()).sort(
      (a, b) => a.createdAt - b.createdAt
    )

    let freedBytes = 0

    for (const meta of metas) {
      if (freedBytes >= neededBytes) {
        break
      }
      if (this.delete(meta.id)) {
        freedBytes += meta.size
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Clear all files
   */
  clear(): void {
    if (!existsSync(this.config.storageDir)) {
      return
    }
    try {
      rmSync(this.config.storageDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
    this.ensureStorageDir()
  }

  // ---------- internal helpers ----------

  private ensureStorageDir(): void {
    try {
      mkdirSync(this.config.storageDir, { recursive: true })
    } catch {
      // ignore
    }
  }

  private getFileDir(id: string): string {
    return join(this.config.storageDir, id)
  }

  private readMeta(id: string): StoredMetadata | null {
    const metaPath = join(this.getFileDir(id), META_FILENAME)
    try {
      const raw = readFileSync(metaPath, 'utf8')
      return JSON.parse(raw) as StoredMetadata
    } catch {
      return null
    }
  }

  private *iterMeta(): IterableIterator<StoredMetadata> {
    if (!existsSync(this.config.storageDir)) {
      return
    }

    let entries: string[]
    try {
      entries = readdirSync(this.config.storageDir)
    } catch {
      return
    }

    for (const entry of entries) {
      const dir = join(this.config.storageDir, entry)
      try {
        const stat = statSync(dir)
        if (!stat.isDirectory()) continue
      } catch {
        continue
      }

      const meta = this.readMeta(entry)
      if (meta) {
        yield meta
      }
    }
  }

  private getTotalSize(): number {
    let total = 0
    for (const meta of this.iterMeta()) {
      total += meta.size
    }
    return total
  }
}

// Singleton instance
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
    storageInstance.clear()
    storageInstance = null
  }
}

export { TempStorage }
