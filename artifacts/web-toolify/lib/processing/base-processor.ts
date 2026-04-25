/**
 * Base Processor Class
 * Provides common functionality for all processing modules
 */

import type { ProcessingResult, ProcessingMetadata } from './types'

export abstract class BaseProcessor {
  protected name: string
  protected version: string

  constructor(name: string, version: string = '1.0.0') {
    this.name = name
    this.version = version
  }

  /**
   * Create a successful processing result
   */
  protected success<T>(
    data: T,
    metadata?: ProcessingMetadata
  ): ProcessingResult<T> {
    return {
      success: true,
      data,
      metadata,
    }
  }

  /**
   * Create an error processing result
   */
  protected error<T>(message: string): ProcessingResult<T> {
    return {
      success: false,
      error: message,
    }
  }

  /**
   * Validate that a buffer is not empty
   */
  protected validateBuffer(buffer: ArrayBuffer | Buffer, name: string = 'file'): void {
    if (!buffer || buffer.byteLength === 0) {
      throw new Error(`Invalid ${name}: Buffer is empty or undefined`)
    }
  }

  /**
   * Convert ArrayBuffer to Buffer
   */
  protected toBuffer(arrayBuffer: ArrayBuffer): Buffer {
    return Buffer.from(arrayBuffer)
  }

  /**
   * Measure processing time
   */
  protected async measureTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; time: number }> {
    const start = performance.now()
    const result = await operation()
    const time = Math.round(performance.now() - start)
    return { result, time }
  }

  /**
   * Get processor info
   */
  getInfo(): { name: string; version: string } {
    return {
      name: this.name,
      version: this.version,
    }
  }
}
