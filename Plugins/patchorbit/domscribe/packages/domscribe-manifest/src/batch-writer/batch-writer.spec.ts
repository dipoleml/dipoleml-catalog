/**
 * Tests for BatchWriter
 *
 * Tests the buffered async writer that batches manifest entries for efficient I/O.
 * Handles automatic flushing based on batch size, time intervals, and process exit.
 *
 * This test suite focuses on testing the business logic of BatchWriter only,
 * with all external dependencies mocked.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockInstance,
} from 'vitest';
import { BatchWriter } from './batch-writer.js';
import type { ManifestEntry } from '@domscribe/core';
import type { WriterStats } from './types.js';

// Mock all external dependencies
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

// Import mocked modules to access mock functions
import { appendFileSync } from 'fs';

const mockAppendFileSync = vi.mocked(appendFileSync);

// Helper functions
function createManifestEntry(
  overrides?: Partial<ManifestEntry>,
): ManifestEntry {
  return {
    id: 'abc12345',
    file: 'Button.tsx',
    start: { line: 10, column: 2 },
    tagName: 'button',
    ...overrides,
  };
}

function createMultipleEntries(count: number): ManifestEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createManifestEntry({
      id: `id${i.toString().padStart(5, '0')}`,
      file: `File${i}.tsx`,
      start: { line: i + 1, column: 0 },
    }),
  );
}

describe('BatchWriter', () => {
  let writer: BatchWriter;
  const testPath = '/workspace/manifest.jsonl';
  let mockProcessOn: MockInstance<typeof process.on>;
  let mockProcessOff: MockInstance<typeof process.off>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();

    // Mock process event handlers
    mockProcessOn = vi.spyOn(process, 'on').mockImplementation(() => process);
    mockProcessOff = vi.spyOn(process, 'off').mockImplementation(() => process);

    writer = new BatchWriter(testPath);
  });

  afterEach(() => {
    // Clean up writer if started
    if (writer) {
      writer.stop();
    }

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('IWriter interface - start()', () => {
    it('should initialize state and start interval', () => {
      // Act
      writer.start();

      // Assert
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(0);
      expect(stats.totalWritten).toBe(0);
      expect(stats.flushCount).toBe(0);
    });

    it('should be idempotent when called multiple times', () => {
      // Act
      writer.start();
      writer.start();
      writer.start();

      // Assert - should not throw or register multiple handlers
      const stats = writer.getStats();
      expect(stats).toBeDefined();
      expect(mockProcessOn).toHaveBeenCalledTimes(1);
    });

    it('should register process exit handler', () => {
      // Act
      writer.start();

      // Assert
      expect(mockProcessOn).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    it('should use default options when not specified', () => {
      // Arrange
      const defaultWriter = new BatchWriter(testPath);

      // Act
      defaultWriter.start();

      // Assert - defaults: batchSize 50, flushIntervalMs 100, debug false
      const stats = defaultWriter.getStats();
      expect(stats).toBeDefined();
    });

    it('should accept custom options without error', () => {
      // Arrange
      const customWriter = new BatchWriter(testPath, {
        batchSize: 100,
        flushIntervalMs: 200,
        debug: true,
      });

      // Act
      customWriter.start();

      // Assert - custom options are accepted (behavior tested in Options configuration)
      const stats = customWriter.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('IWriter interface - append()', () => {
    it('should auto-start if not started', () => {
      // Arrange
      const entry = createManifestEntry();

      // Act - append without calling start() first
      expect(() => writer.append([entry])).not.toThrow();

      // Assert - writer is now started and entry is buffered
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(1);
    });

    it('should add entries to buffer', async () => {
      // Arrange
      writer.start();
      const entries = createMultipleEntries(3);

      // Act
      await writer.append(entries);

      // Assert
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(3);
    });

    it('should update bufferSize stat', async () => {
      // Arrange
      writer.start();

      // Act
      await writer.append([createManifestEntry()]);
      const stats1 = writer.getStats();

      await writer.append(createMultipleEntries(2));
      const stats2 = writer.getStats();

      // Assert
      expect(stats1.bufferSize).toBe(1);
      expect(stats2.bufferSize).toBe(3);
    });

    it('should handle empty arrays gracefully', async () => {
      // Arrange
      writer.start();

      // Act
      await writer.append([]);

      // Assert
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(0);
    });

    it('should auto-flush when batch size reached', () => {
      // Arrange
      const writerWithSmallBatch = new BatchWriter(testPath, { batchSize: 2 });
      writerWithSmallBatch.start();
      const entries = createMultipleEntries(2);

      // Act
      writerWithSmallBatch.append(entries);

      // Assert
      expect(mockAppendFileSync).toHaveBeenCalled();
      const stats = writerWithSmallBatch.getStats();
      expect(stats.totalWritten).toBe(2);
      expect(stats.bufferSize).toBe(0);

      writerWithSmallBatch.stop();
    });

    it('should auto-flush exactly batchSize entries when exceeded, keeping remainder in buffer', () => {
      // Arrange
      const writerWithSmallBatch = new BatchWriter(testPath, { batchSize: 2 });
      writerWithSmallBatch.start();
      const entries = createMultipleEntries(3);

      // Act
      writerWithSmallBatch.append(entries);

      // Assert - only batchSize (2) entries flushed, 1 remains in buffer
      expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
      const stats = writerWithSmallBatch.getStats();
      expect(stats.totalWritten).toBe(2);
      expect(stats.bufferSize).toBe(1);

      // stop() drains remaining entries
      writerWithSmallBatch.stop();
      const finalStats = writerWithSmallBatch.getStats();
      expect(finalStats.totalWritten).toBe(3);
      expect(finalStats.bufferSize).toBe(0);
    });

    it('should not flush when below batch size', () => {
      // Arrange
      const writerWithLargeBatch = new BatchWriter(testPath, { batchSize: 10 });
      writerWithLargeBatch.start();
      const entries = createMultipleEntries(3);

      // Act
      writerWithLargeBatch.append(entries);

      // Assert
      expect(mockAppendFileSync).not.toHaveBeenCalled();
      const stats = writerWithLargeBatch.getStats();
      expect(stats.bufferSize).toBe(3);

      writerWithLargeBatch.stop();
    });

    it('should handle multiple consecutive appends', () => {
      // Arrange
      const writerWithLargeBatch = new BatchWriter(testPath, { batchSize: 20 });
      writerWithLargeBatch.start();

      // Act
      writerWithLargeBatch.append([createManifestEntry({ id: 'id1' })]);
      writerWithLargeBatch.append([createManifestEntry({ id: 'id2' })]);
      writerWithLargeBatch.append([createManifestEntry({ id: 'id3' })]);

      // Assert
      const stats = writerWithLargeBatch.getStats();
      expect(stats.bufferSize).toBe(3);
      expect(mockAppendFileSync).not.toHaveBeenCalled();

      writerWithLargeBatch.stop();
    });
  });

  describe('IWriter interface - flush()', () => {
    it('should do nothing when buffer is empty', () => {
      // Arrange
      writer.start();

      // Act
      writer.flush();

      // Assert
      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should write buffered entries to file', () => {
      // Arrange
      writer.start();
      const entries = createMultipleEntries(3);
      writer.append(entries);

      // Act
      writer.flush();

      // Assert
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        testPath,
        expect.any(String),
        'utf-8',
      );
    });

    it('should format entries as JSONL (newline-separated)', () => {
      // Arrange
      writer.start();
      const entries = [
        createManifestEntry({ id: 'id1' }),
        createManifestEntry({ id: 'id2' }),
      ];
      writer.append(entries);

      // Act
      writer.flush();

      // Assert
      const writeCall = mockAppendFileSync.mock.calls[0];
      const content = writeCall[1] as string;
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(content.endsWith('\n')).toBe(true);
    });

    it('should clear buffer after successful write', () => {
      // Arrange
      writer.start();
      writer.append(createMultipleEntries(3));

      // Act
      writer.flush();

      // Assert
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(0);
    });

    it('should update totalWritten stat', () => {
      // Arrange
      writer.start();
      writer.append(createMultipleEntries(5));

      // Act
      writer.flush();

      // Assert
      const stats = writer.getStats();
      expect(stats.totalWritten).toBe(5);
    });

    it('should update flushCount stat', () => {
      // Arrange
      writer.start();

      // Act
      writer.append([createManifestEntry()]);
      writer.flush();

      writer.append([createManifestEntry()]);
      writer.flush();

      // Assert
      const stats = writer.getStats();
      expect(stats.flushCount).toBe(2);
    });

    it('should restore buffer entries on write error', () => {
      // Arrange
      writer.start();
      mockAppendFileSync.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });
      const entries = createMultipleEntries(2);
      writer.append(entries);

      // Act - flush throws but entries should be restored
      expect(() => writer.flush()).toThrow('Write failed');

      // Assert - entries restored to buffer
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(2);
    });

    it('should throw on write error', () => {
      // Arrange
      writer.start();
      mockAppendFileSync.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });
      writer.append([createManifestEntry()]);

      // Act & Assert - flush propagates errors to caller
      expect(() => writer.flush()).toThrow('Write failed');
    });
  });

  describe('IWriter interface - stop()', () => {
    it('should be safe to call when not started', () => {
      // Act & Assert
      expect(() => writer.stop()).not.toThrow();
    });

    it('should clear flush interval timer', () => {
      // Arrange
      writer.start();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Act
      writer.stop();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should unregister exit handler', () => {
      // Arrange
      writer.start();

      // Act
      writer.stop();

      // Assert
      expect(mockProcessOff).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    it('should flush remaining buffered entries', () => {
      // Arrange
      writer.start();
      writer.append([createManifestEntry()]);

      // Act
      writer.stop();

      // Assert
      expect(mockAppendFileSync).toHaveBeenCalled();
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(0);
    });

    it('should set isStarted to false and auto-restart on next append', () => {
      // Arrange
      writer.start();
      writer.append([createManifestEntry()]);

      // Act
      writer.stop();

      // Assert - appending after stop should auto-restart (not throw)
      expect(() => writer.append([createManifestEntry()])).not.toThrow();
      const stats = writer.getStats();
      expect(stats.bufferSize).toBe(1);
    });

    it('should be idempotent', () => {
      // Arrange
      writer.start();

      // Act
      writer.stop();
      writer.stop();
      writer.stop();

      // Assert - should not throw
      expect(mockProcessOff).toHaveBeenCalledTimes(1);
    });
  });

  describe('IWriter interface - getStats()', () => {
    it('should return stats with correct structure', () => {
      // Arrange
      writer.start();

      // Act
      const stats = writer.getStats();

      // Assert
      expect(stats).toHaveProperty('totalWritten');
      expect(stats).toHaveProperty('flushCount');
      expect(stats).toHaveProperty('bufferSize');
    });

    it('should track bufferSize accurately', () => {
      // Arrange
      writer.start();

      // Act
      writer.append(createMultipleEntries(5));
      const stats = writer.getStats();

      // Assert
      expect(stats.bufferSize).toBe(5);
    });

    it('should track totalWritten across multiple flushes', () => {
      // Arrange
      writer.start();

      // Act
      writer.append([createManifestEntry()]);
      writer.flush();

      writer.append(createMultipleEntries(2));
      writer.flush();

      writer.append(createMultipleEntries(3));
      writer.flush();

      // Assert
      const stats = writer.getStats();
      expect(stats.totalWritten).toBe(6);
    });

    it('should track flushCount correctly', () => {
      // Arrange
      writer.start();

      // Act
      writer.append([createManifestEntry()]);
      writer.flush();

      writer.append([createManifestEntry()]);
      writer.flush();

      writer.append([createManifestEntry()]);
      writer.flush();

      // Assert
      const stats = writer.getStats();
      expect(stats.flushCount).toBe(3);
    });

    it('should return zero stats for new writer', () => {
      // Arrange
      writer.start();

      // Act
      const stats: WriterStats = writer.getStats();

      // Assert
      expect(stats.totalWritten).toBe(0);
      expect(stats.flushCount).toBe(0);
      expect(stats.bufferSize).toBe(0);
    });
  });

  describe('Interval flushing', () => {
    it('should auto-flush on interval when buffer has entries', async () => {
      // Arrange
      const intervalWriter = new BatchWriter(testPath, {
        flushIntervalMs: 100,
        batchSize: 1000,
      });
      intervalWriter.start();
      intervalWriter.append([createManifestEntry()]);

      // Act - advance time past interval
      await vi.advanceTimersByTimeAsync(150);

      // Assert
      expect(mockAppendFileSync).toHaveBeenCalled();
      const stats = intervalWriter.getStats();
      expect(stats.totalWritten).toBe(1);

      intervalWriter.stop();
    });

    it('should not flush on interval when buffer is empty', async () => {
      // Arrange
      const intervalWriter = new BatchWriter(testPath, {
        flushIntervalMs: 100,
        batchSize: 1000,
      });
      intervalWriter.start();

      // Act - advance time past interval
      await vi.advanceTimersByTimeAsync(150);

      // Assert
      expect(mockAppendFileSync).not.toHaveBeenCalled();

      intervalWriter.stop();
    });

    it('should respect custom interval delay', async () => {
      // Arrange
      const intervalWriter = new BatchWriter(testPath, {
        flushIntervalMs: 200,
        batchSize: 1000,
      });
      intervalWriter.start();
      intervalWriter.append([createManifestEntry()]);

      // Act - advance time less than interval
      await vi.advanceTimersByTimeAsync(100);

      // Assert - should not flush yet
      expect(mockAppendFileSync).not.toHaveBeenCalled();

      // Act - advance past interval
      await vi.advanceTimersByTimeAsync(150);

      // Assert - should flush now
      expect(mockAppendFileSync).toHaveBeenCalled();

      intervalWriter.stop();
    });

    it('should stop flushing after stop() is called', async () => {
      // Arrange
      const intervalWriter = new BatchWriter(testPath, {
        flushIntervalMs: 100,
        batchSize: 1000,
      });
      intervalWriter.start();
      intervalWriter.append([createManifestEntry()]);

      // Act - stop the writer
      intervalWriter.stop();
      mockAppendFileSync.mockClear();

      // Advance time past interval
      await vi.advanceTimersByTimeAsync(150);

      // Assert - should not flush after stop
      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should handle flush errors during interval without crashing', async () => {
      // Arrange
      const intervalWriter = new BatchWriter(testPath, {
        flushIntervalMs: 100,
        batchSize: 1000,
      });
      intervalWriter.start();
      // Use mockImplementationOnce so subsequent flushes succeed
      mockAppendFileSync.mockImplementationOnce(() => {
        throw new Error('Disk full');
      });
      intervalWriter.append([createManifestEntry()]);

      // Act - advance time to trigger interval flush (which fails)
      await vi.advanceTimersByTimeAsync(150);

      // Append another entry and advance again — writer should still be operational
      intervalWriter.append([createManifestEntry({ id: 'after_err' })]);
      await vi.advanceTimersByTimeAsync(150);

      // Assert - writer recovered and flushed the second entry
      const stats = intervalWriter.getStats();
      expect(stats.totalWritten).toBeGreaterThan(0);

      intervalWriter.stop();
    });
  });

  describe('Exit handler', () => {
    it('should flush synchronously on process exit', () => {
      // Arrange
      writer.start();
      writer.append([createManifestEntry()]);

      // Get the exit handler that was registered
      const exitHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === 'exit',
      )?.[1] as () => void;

      // Act - call the exit handler with proper context
      exitHandler.call(writer);

      // Assert - should use sync methods
      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it('should not flush empty buffer on exit', () => {
      // Arrange
      writer.start();

      // Get the exit handler
      const exitHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === 'exit',
      )?.[1] as () => void;

      // Act - call the exit handler with empty buffer and proper context
      exitHandler.call(writer);

      // Assert - should not write
      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should handle exit flush errors gracefully', () => {
      // Arrange
      writer.start();
      writer.append([createManifestEntry()]);
      mockAppendFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Get the exit handler
      const exitHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === 'exit',
      )?.[1] as () => void;

      // Act & Assert - exit handler should not throw even when flush fails
      expect(() => exitHandler.call(writer)).not.toThrow();
    });
  });

  describe('Options configuration', () => {
    it('should use defaults (batchSize: 50, flushIntervalMs: 100, debug: false)', () => {
      // Arrange
      const defaultWriter = new BatchWriter(testPath);
      defaultWriter.start();

      // Act - append 10 entries (below default batch size of 50)
      defaultWriter.append(createMultipleEntries(10));

      // Assert - should not auto-flush
      expect(mockAppendFileSync).not.toHaveBeenCalled();

      defaultWriter.stop();
    });

    it('should respect custom batchSize', () => {
      // Arrange
      const customWriter = new BatchWriter(testPath, { batchSize: 5 });
      customWriter.start();

      // Act - append 5 entries (meets custom batch size)
      customWriter.append(createMultipleEntries(5));

      // Assert - should auto-flush
      expect(mockAppendFileSync).toHaveBeenCalled();

      customWriter.stop();
    });

    it('should respect custom flushIntervalMs', async () => {
      // Arrange
      const customWriter = new BatchWriter(testPath, {
        flushIntervalMs: 300,
        batchSize: 1000,
      });
      customWriter.start();
      customWriter.append([createManifestEntry()]);

      // Act - advance less than custom interval
      await vi.advanceTimersByTimeAsync(200);

      // Assert - should not flush yet
      expect(mockAppendFileSync).not.toHaveBeenCalled();

      // Act - advance past custom interval
      await vi.advanceTimersByTimeAsync(150);

      // Assert - should flush now
      expect(mockAppendFileSync).toHaveBeenCalled();

      customWriter.stop();
    });
  });
});
