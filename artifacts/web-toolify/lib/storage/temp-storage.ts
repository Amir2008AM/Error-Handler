/**
 * Temporary File Storage System
 * In-memory storage with automatic cleanup for Vercel serverless
 */

import { nanoid } from 'nanoid'

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
}

const DEFAULT_CONFIG: StorageConfig = {
  defaultTtlMs: 2 * 60 * 1000, // 2 minutes
  maxStorageBytes: 500 * 1024 * 1024, // 500MB
  maxFileBytes: 100 * 1024 * 1024, // 100MB per file
  cleanupIntervalMs: 30 * 1000, // 30 seconds
}

class TempStorage {
  private files: Map<string, StoredFile> = new Map()
  private config: StorageConfig
  private cleanupInterval: NodeJS.Timeout | null = null
  private totalSize: number = 0

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
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
    if (this.totalSize + buffer.length > this.config.maxStorageBytes) {
      // Try to free up space by removing expired files first
      this.cleanup()
      
      // If still not enough space, remove oldest files
      if (this.totalSize + buffer.length > this.config.maxStorageBytes) {
        this.freeSpace(buffer.length)
      }
    }

    const id = nanoid(16)
    const now = Date.now()
    const ttl = ttlMs ?? this.config.defaultTtlMs

    const file: StoredFile = {
      id,
      buffer,
      fileName,
      mimeType,
      size: buffer.length,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
    }

    this.files.set(id, file)
    this.totalSize += buffer.length

    return id
  }

  /**
   * Retrieve a file by ID
   */
  get(id: string): StoredFile | null {
    const file = this.files.get(id)
    
    if (!file) {
      return null
    }

    // Check if expired
    if (Date.now() > file.expiresAt) {
      this.delete(id)
      return null
    }

    // Increment access count
    file.accessCount++
    
    return file
  }

  /**
   * Delete a file by ID
   */
  delete(id: string): boolean {
    const file = this.files.get(id)
    
    if (!file) {
      return false
    }

    this.totalSize -= file.size
    this.files.delete(id)
    
    return true
  }

  /**
   * Extend the TTL of a file
   */
  extendTtl(id: string, additionalMs: number): boolean {
    const file = this.files.get(id)
    
    if (!file) {
      return false
    }

    file.expiresAt += additionalMs
    return true
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
    return {
      fileCount: this.files.size,
      totalSize: this.totalSize,
      maxSize: this.config.maxStorageBytes,
      usagePercent: (this.totalSize / this.config.maxStorageBytes) * 100,
    }
  }

  /**
   * Run cleanup of expired files
   */
  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [id, file] of this.files) {
      if (now > file.expiresAt) {
        this.totalSize -= file.size
        this.files.delete(id)
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Free up space by removing oldest files
   */
  private freeSpace(neededBytes: number): void {
    // Sort files by creation time (oldest first)
    const sortedFiles = Array.from(this.files.entries()).sort(
      ([, a], [, b]) => a.createdAt - b.createdAt
    )

    let freedBytes = 0
    
    for (const [id, file] of sortedFiles) {
      if (freedBytes >= neededBytes) {
        break
      }
      
      this.totalSize -= file.size
      freedBytes += file.size
      this.files.delete(id)
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
    this.files.clear()
    this.totalSize = 0
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
