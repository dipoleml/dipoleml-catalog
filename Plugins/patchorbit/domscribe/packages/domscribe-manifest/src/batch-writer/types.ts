/**
 * Types for the batch writer subsystem
 * @module @domscribe/manifest/batch-writer/types
 */
import type { ManifestEntry } from '@domscribe/core';

/**
 * Interface for manifest entry writers
 *
 * Defines the contract for components that write manifest entries to persistent storage.
 */
export interface IWriter {
  /**
   * Start the writer (begins auto-flush interval and registers exit handlers)
   */
  start(): void;

  /**
   * Append entries to the writer buffer
   *
   * @param entries - Manifest entries to append
   */
  append(entries: ManifestEntry[]): void;

  /**
   * Flush buffered entries to disk immediately
   */
  flush(): void;

  /**
   * Stop the writer (clears interval, flushes remaining entries)
   */
  stop(): void;

  /**
   * Get current writer statistics
   */
  getStats(): WriterStats;
}

/**
 * Configuration options for BatchWriter
 */
export interface BatchWriterOptions {
  /**
   * Number of entries to buffer before auto-flush
   *
   * @default 50
   */
  batchSize?: number;

  /**
   * Time interval in ms to auto-flush
   *
   * @default 100
   */
  flushIntervalMs?: number;

  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;
}

/**
 * Statistics tracking for writer operations
 */
export interface WriterStats {
  totalWritten: number;
  flushCount: number;
  bufferSize: number;
  appendTimeMs: number;
  flushTimeMs: number;
}
