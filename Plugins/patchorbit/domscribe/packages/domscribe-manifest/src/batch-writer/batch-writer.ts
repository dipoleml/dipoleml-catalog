/**
 * BatchWriter - Buffered writer for manifest entries
 *
 * Buffers manifest entries in memory and flushes to disk in batches
 * for efficient I/O. Automatic flushing on:
 * - Batch size threshold (default: 50 entries)
 * - Time interval (default: 100ms)
 * - Process exit
 *
 * Performance:
 * - Target: <2ms per flush (50 entries)
 * - Reduces fs operations by ~50x vs individual writes
 */

import type { ManifestEntry } from '@domscribe/core';
import { IWriter, BatchWriterOptions, WriterStats } from './types.js';
import { appendFileSync } from 'fs';

export class BatchWriter implements IWriter {
  private buffer: ManifestEntry[] = [];
  private readonly options: Required<BatchWriterOptions>;

  /*
   * State variables for the batch writer
   */
  private flushInterval: NodeJS.Timeout | undefined;
  private isStarted = false;
  private isFlushing = false;
  private stats = {
    totalWritten: 0,
    flushCount: 0,
    appendTimeMs: 0,
    flushTimeMs: 0,
  };

  private exitHandler: (() => void) | undefined;

  constructor(
    private filePath: string,
    options?: BatchWriterOptions,
  ) {
    this.options = {
      batchSize: options?.batchSize ?? 50,
      flushIntervalMs: options?.flushIntervalMs ?? 100,
      debug: options?.debug ?? false,
    };
  }

  start(): void {
    if (this.isStarted) {
      return;
    }

    // Start interval timer for auto-flush
    this.startFlushInterval();

    // Register process exit handler
    this.registerExitHandler();

    // Set started flag to true
    this.setStarted(true);

    const { batchSize, flushIntervalMs, debug } = this.options;

    if (debug) {
      console.log(
        `[domscribe-manifest][batch-writer] Started (batchSize: ${batchSize}, interval: ${flushIntervalMs}ms)`,
      );
    }
  }

  append(entries: ManifestEntry[]): void {
    const start = performance.now();
    if (!this.isStarted) {
      // Auto-start if append is called before start() — this happens when
      // sequential viteBuild() calls reuse plugin closures and the writer
      // singleton was closed between builds.
      this.start();
    }

    this.pushEntriesToBuffer(entries);

    const { batchSize } = this.options;

    // Check if batch size threshold reached
    if (this.buffer.length >= batchSize) {
      // Flush without waiting for completion
      this.flush();
    }
    this.stats.appendTimeMs += performance.now() - start;
  }

  flush({ drain = false }: { drain?: boolean } = {}): void {
    const start = performance.now();
    // Skip if already flushing or buffer is empty
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    try {
      // Write entries to file
      const entriesWritten = this.writeEntriesToFile({
        pushToBufferOnError: true,
        drain,
      });

      // Update stats
      this.updateStats(entriesWritten, this.stats.flushCount + 1);

      if (this.options.debug) {
        console.log(
          `[domscribe-manifest][batch-writer] Flushed ${entriesWritten} entries (total: ${this.stats.totalWritten})`,
        );
      }
    } catch (error) {
      if (this.options.debug) {
        console.error(
          '[domscribe-manifest][batch-writer] Flush failed:',
          error instanceof Error ? error.message : String(error),
        );
      }

      throw error;
    } finally {
      this.isFlushing = false;
      this.stats.flushTimeMs += performance.now() - start;
    }
  }

  stop(): void {
    if (!this.isStarted) {
      return;
    }

    // Clear interval timer
    clearInterval(this.flushInterval);
    this.flushInterval = undefined;

    // Unregister exit handler
    this.unregisterExitHandler();

    // Set started flag to false
    this.setStarted(false);

    // Flush remaining entries
    this.flush({ drain: true });

    if (this.options.debug) {
      console.log('[domscribe-manifest][batch-writer] Stopped');
    }
  }

  getStats(): WriterStats {
    return {
      ...this.stats,
      bufferSize: this.buffer.length,
    };
  }

  private setStarted(value: boolean) {
    this.isStarted = value;
  }

  private pushEntriesToBuffer(entries: ManifestEntry[]) {
    this.buffer.push(...entries);
  }

  private updateStats(entriesWritten: number, flushCount: number) {
    this.stats.totalWritten += entriesWritten;
    this.stats.flushCount = flushCount;
  }

  private startFlushInterval() {
    const { flushIntervalMs } = this.options;

    this.flushInterval = setInterval(() => {
      try {
        this.flush();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Ignore error
      }
    }, flushIntervalMs);
  }

  private writeEntriesToFile({ pushToBufferOnError = true, drain = false }) {
    // If draining, write all remaining entries, otherwise write a batch of batchSize entries
    const batchSize = drain ? this.buffer.length : this.options.batchSize;
    // Extract batchSize entries (or all remaining if draining)
    const entries = this.buffer.splice(0, batchSize);

    try {
      const content =
        entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';

      appendFileSync(this.filePath, content, 'utf-8');

      return entries.length;
    } catch (error) {
      if (pushToBufferOnError) {
        // Add entries back to buffer for retry at a later time
        this.buffer.unshift(...entries);
      }
      throw error;
    }
  }

  private registerExitHandler() {
    this.exitHandler = this.onExit.bind(this);
    process.on('exit', this.exitHandler);
  }

  private unregisterExitHandler() {
    if (this.exitHandler) {
      process.off('exit', this.exitHandler);
      this.exitHandler = undefined;
    }
  }

  private onExit() {
    if (this.buffer.length === 0) {
      return;
    }

    // Flush on exit
    try {
      this.writeEntriesToFile({ pushToBufferOnError: false, drain: true });
    } catch (error) {
      console.error(
        '[domscribe-manifest][batch-writer] Exit flush failed:',
        error,
      );
    }
  }
}
