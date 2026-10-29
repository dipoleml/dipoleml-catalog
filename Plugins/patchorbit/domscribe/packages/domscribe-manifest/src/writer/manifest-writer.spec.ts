/**
 * Tests for ManifestWriter
 *
 * Tests the singleton manifest writer that handles batch writing,
 * in-memory indexing, and entry lifecycle management for a workspace.
 *
 * This test suite focuses on testing the business logic of ManifestWriter only,
 * with all external dependencies mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManifestWriter } from './manifest-writer.js';
import type { ManifestEntry } from '@domscribe/core';
import type { IWriter } from '../batch-writer/types.js';
import type { ManifestWriterStats } from './types.js';

const mockWriterAppend = vi.fn();

// Mock IWriter interface
const mockWriter: IWriter = {
  start: vi.fn(),
  append: mockWriterAppend,
  flush: vi.fn(),
  stop: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalWritten: 0,
    flushCount: 0,
    bufferSize: 0,
  }),
};

// Mock fs operations
const mockExistsSync = vi.fn();
const mockReadFile = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', () => ({
  existsSync: vi.fn((path: string) => mockExistsSync(path)),
  mkdirSync: vi.fn((...args: unknown[]) => mockMkdirSync(...args)),
  readFileSync: vi.fn((path: string, encoding: string) =>
    mockReadFile(path, encoding),
  ),
}));

// Mock BatchWriter to return our IWriter mock
vi.mock('../batch-writer/batch-writer.js', () => ({
  BatchWriter: class {
    start = mockWriter.start;
    append = mockWriter.append;
    flush = mockWriter.flush;
    stop = mockWriter.stop;
    getStats = mockWriter.getStats;
  },
}));

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

function createMultipleEntries(): ManifestEntry[] {
  return [
    createManifestEntry({ id: 'abc12345', file: 'Button.tsx' }),
    createManifestEntry({
      id: 'def67890',
      file: 'Input.tsx',
      componentName: 'Input',
    }),
    createManifestEntry({
      id: 'ghi13579',
      file: 'Button.tsx',
      componentName: 'Button',
    }),
  ];
}

function serializeEntries(entries: ManifestEntry[]): string {
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
}

describe('ManifestWriter', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock return values to defaults
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockReturnValue('');

    // Clear singleton instances by accessing private static field
    // This is necessary because tests can't properly clean up singletons otherwise
    (
      ManifestWriter as unknown as { instances: Map<string, ManifestWriter> }
    ).instances.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return same instance for same workspace path', () => {
      // Act
      const instance1 = ManifestWriter.getInstance(workspaceRoot);
      const instance2 = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should return different instances for different workspaces', () => {
      // Act
      const instance1 = ManifestWriter.getInstance('/workspace1');
      const instance2 = ManifestWriter.getInstance('/workspace2');

      // Assert
      expect(instance1).not.toBe(instance2);
    });

    it('should normalize relative paths to absolute', () => {
      // Act
      const instance1 = ManifestWriter.getInstance('/workspace/.');
      const instance2 = ManifestWriter.getInstance('/workspace');

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization (via constructor)', () => {
    it('should initialize with empty index when file does not exist', () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);

      // Act - getInstance calls constructor which calls initialize()
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.filesIndexed).toBe(0);
    });

    it('should load existing entries and build index', () => {
      // Arrange
      const entries = createMultipleEntries();
      mockReadFile.mockReturnValue(serializeEntries(entries));

      // Act - getInstance calls constructor which calls initialize()
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(3);
      expect(stats.filesIndexed).toBe(2); // Button.tsx and Input.tsx
    });

    it('should start the writer after loading entries', () => {
      // Act - getInstance calls constructor which calls initialize()
      ManifestWriter.getInstance(workspaceRoot);

      // Assert
      expect(mockWriter.start).toHaveBeenCalledTimes(1);
    });

    it('should handle file read errors gracefully', () => {
      // Arrange
      mockReadFile.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Act & Assert - getInstance calls constructor which calls initialize()
      expect(() => ManifestWriter.getInstance(workspaceRoot)).toThrow(
        'Permission denied',
      );
    });

    it('should build id-to-file mapping correctly', () => {
      // Arrange
      const entries = createMultipleEntries();
      mockReadFile.mockReturnValue(serializeEntries(entries));

      // Act - getInstance calls constructor which calls initialize()
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      expect(writer.resolveId('abc12345')).toBe('Button.tsx');
      expect(writer.resolveId('def67890')).toBe('Input.tsx');
      expect(writer.resolveId('ghi13579')).toBe('Button.tsx');
    });

    it('should build file-to-ids mapping correctly', () => {
      // Arrange
      const entries = createMultipleEntries();
      mockReadFile.mockReturnValue(serializeEntries(entries));

      // Act - getInstance calls constructor which calls initialize()
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      const buttonIds = writer.getEntriesByFile('Button.tsx');
      const inputIds = writer.getEntriesByFile('Input.tsx');

      expect(buttonIds).toHaveLength(2);
      expect(buttonIds).toContain('abc12345');
      expect(buttonIds).toContain('ghi13579');
      expect(inputIds).toHaveLength(1);
      expect(inputIds).toContain('def67890');
    });

    it('should update stats after initialization', () => {
      // Arrange
      const entries = createMultipleEntries();
      mockReadFile.mockReturnValue(serializeEntries(entries));

      // Act - getInstance calls constructor which calls initialize()
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Assert
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(3);
      expect(stats.filesIndexed).toBe(2);
      expect(stats.lastRebuild).toBeDefined();
    });
  });

  describe('appendEntries()', () => {
    it('should write entries directly to writer', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);
      const entries = [
        createManifestEntry({ id: 'new001', file: 'New.tsx' }),
        createManifestEntry({ id: 'new002', file: 'New.tsx' }),
      ];

      // Act
      writer.appendEntries(entries);

      // Assert - entries are written to writer immediately
      expect(mockWriter.append).toHaveBeenCalledWith(entries);
    });

    it('should update index with new entries immediately', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);
      const newEntry = createManifestEntry({ id: 'new123', file: 'New.tsx' });

      // Act
      writer.appendEntries([newEntry]);

      // Assert - index is updated immediately even though not flushed
      expect(writer.resolveId('new123')).toBe('New.tsx');
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(1);
    });

    it('should filter out duplicate IDs', () => {
      // Arrange
      const entries = createMultipleEntries();
      mockReadFile.mockReturnValue(serializeEntries(entries));
      const writer = ManifestWriter.getInstance(workspaceRoot);

      const initialCount = writer.getStats().entryCount;

      // Act - try to append entries that already exist
      writer.appendEntries([
        createManifestEntry({ id: 'abc12345', file: 'Button.tsx' }),
      ]);

      // Assert - count should not change since entry was filtered
      expect(writer.getStats().entryCount).toBe(initialCount);
    });

    it('should skip empty arrays', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Act
      writer.appendEntries([]);

      // Assert
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(0);
    });

    it('should write entries for each append call', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Act - multiple appends each write to writer
      writer.appendEntries([
        createManifestEntry({ id: 'id1', file: 'File1.tsx' }),
      ]);
      writer.appendEntries([
        createManifestEntry({ id: 'id2', file: 'File2.tsx' }),
      ]);
      writer.appendEntries([
        createManifestEntry({ id: 'id3', file: 'File3.tsx' }),
      ]);

      // Assert - writer called for each append
      expect(mockWriter.append).toHaveBeenCalledTimes(3);
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(3);
    });

    it('should update stats after append', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);
      const entries = [
        createManifestEntry({ id: 'new1', file: 'New.tsx' }),
        createManifestEntry({ id: 'new2', file: 'New.tsx' }),
        createManifestEntry({ id: 'new3', file: 'Other.tsx' }),
      ];

      // Act
      writer.appendEntries(entries);

      // Assert
      const stats = writer.getStats();
      expect(stats.entryCount).toBe(3);
      expect(stats.filesIndexed).toBe(2);
    });
  });

  describe('close()', () => {
    it('should stop writer', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);

      // Act
      writer.close();

      // Assert
      expect(mockWriter.stop).toHaveBeenCalled();
    });

    it('should handle stop errors and rethrow', () => {
      // Arrange
      const writer = ManifestWriter.getInstance(workspaceRoot);
      (mockWriter.stop as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => {
          throw new Error('Stop failed');
        },
      );

      // Act & Assert
      expect(() => writer.close()).toThrow('Stop failed');
    });
  });

  describe('Query methods', () => {
    describe('resolveId()', () => {
      it('should resolve ID to file path', () => {
        // Arrange
        const entries = createMultipleEntries();
        mockReadFile.mockReturnValue(serializeEntries(entries));
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const file = writer.resolveId('abc12345');

        // Assert
        expect(file).toBe('Button.tsx');
      });

      it('should return undefined for unknown IDs', () => {
        // Arrange
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const file = writer.resolveId('unknown123');

        // Assert
        expect(file).toBeUndefined();
      });
    });

    describe('getEntriesByFile()', () => {
      it('should return IDs for a given file', () => {
        // Arrange
        const entries = createMultipleEntries();
        mockReadFile.mockReturnValue(serializeEntries(entries));
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const ids = writer.getEntriesByFile('Button.tsx');

        // Assert
        expect(ids).toHaveLength(2);
        expect(ids).toContain('abc12345');
        expect(ids).toContain('ghi13579');
      });

      it('should return empty array for unknown files', () => {
        // Arrange
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const ids = writer.getEntriesByFile('Unknown.tsx');

        // Assert
        expect(ids).toEqual([]);
      });
    });

    describe('getStats()', () => {
      it('should return correct stats structure', () => {
        // Arrange
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const stats: ManifestWriterStats = writer.getStats();

        // Assert
        expect(stats).toHaveProperty('entryCount');
        expect(stats).toHaveProperty('filesIndexed');
        expect(stats).toHaveProperty('lastRebuild');
      });

      it('should track entryCount and filesIndexed', () => {
        // Arrange
        const entries = createMultipleEntries();
        mockReadFile.mockReturnValue(serializeEntries(entries));
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const stats = writer.getStats();

        // Assert
        expect(stats.entryCount).toBe(3);
        expect(stats.filesIndexed).toBe(2); // Button.tsx and Input.tsx
      });

      it('should track lastRebuild timestamp', () => {
        // Arrange
        const entries = createMultipleEntries();
        mockReadFile.mockReturnValue(serializeEntries(entries));
        const writer = ManifestWriter.getInstance(workspaceRoot);

        // Act
        const stats = writer.getStats();

        // Assert
        expect(stats.lastRebuild).toBeDefined();
        expect(typeof stats.lastRebuild).toBe('string');
      });
    });
  });

  describe('Options configuration', () => {
    it('should use default manifestPath when not specified', () => {
      // Act - getInstance calls constructor which calls initialize()
      ManifestWriter.getInstance(workspaceRoot);

      // Assert
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('.domscribe/manifest.jsonl'),
        'utf-8',
      );
    });

    it('should respect custom manifestPath', () => {
      // Arrange
      const customPath = 'custom/manifest.jsonl';

      // Act - getInstance calls constructor which calls initialize()
      ManifestWriter.getInstance(workspaceRoot, {
        manifestPath: customPath,
      });

      // Assert
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(customPath),
        'utf-8',
      );
    });
  });
});
