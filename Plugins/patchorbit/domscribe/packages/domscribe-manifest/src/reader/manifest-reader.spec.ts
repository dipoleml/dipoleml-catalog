/**
 * Tests for ManifestReader
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  watchFile,
  unwatchFile,
} from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { ManifestReader } from './manifest-reader.js';
import type { ManifestEntry } from '@domscribe/core';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    watchFile: vi.fn(actual.watchFile),
    unwatchFile: vi.fn(actual.unwatchFile),
  };
});

describe('ManifestReader', () => {
  let reader: ManifestReader;
  let testDir: string;

  const createTestEntry = (
    id: string,
    overrides: Partial<ManifestEntry> = {},
  ): ManifestEntry => ({
    id,
    file: `src/components/${id}.tsx`,
    start: { line: 10, column: 0 },
    componentName: `Component${id}`,
    tagName: 'div',
    ...overrides,
  });

  const writeManifest = (entries: ManifestEntry[]): void => {
    const manifestDir = path.join(testDir, '.domscribe');
    mkdirSync(manifestDir, { recursive: true });
    const manifestPath = path.join(manifestDir, 'manifest.jsonl');
    const content = entries.map((e) => JSON.stringify(e)).join('\n');
    writeFileSync(manifestPath, content);
  };

  beforeEach(() => {
    testDir = path.join(tmpdir(), `domscribe-manifest-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (reader) {
      reader.close();
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialize', () => {
    it('loads entries from manifest file', () => {
      const entries = [
        createTestEntry('abc12345'),
        createTestEntry('def67890'),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const stats = reader.getStats();
      expect(stats.entryCount).toBe(2);
    });

    it('handles missing manifest file gracefully', () => {
      reader = new ManifestReader(testDir);
      reader.initialize();

      const stats = reader.getStats();
      expect(stats.entryCount).toBe(0);
    });

    it('handles empty manifest file', () => {
      writeManifest([]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const stats = reader.getStats();
      expect(stats.entryCount).toBe(0);
    });

    it('skips malformed lines', () => {
      const manifestDir = path.join(testDir, '.domscribe');
      mkdirSync(manifestDir, { recursive: true });
      const manifestPath = path.join(manifestDir, 'manifest.jsonl');
      writeFileSync(
        manifestPath,
        `${JSON.stringify(createTestEntry('abc12345'))}\ninvalid json line\n${JSON.stringify(createTestEntry('def67890'))}`,
      );

      reader = new ManifestReader(testDir);
      reader.initialize();

      const stats = reader.getStats();
      expect(stats.entryCount).toBe(2);
    });
  });

  describe('resolve', () => {
    it('resolves existing entry', () => {
      const entry = createTestEntry('abc12345');
      writeManifest([entry]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.resolve('abc12345');

      expect(result.success).toBe(true);
      expect(result.entry).toEqual(entry);
      expect(result.cacheHit).toBe(true);
      expect(result.resolveTimeMs).toBeDefined();
    });

    it('returns failure for non-existent entry', () => {
      writeManifest([]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.resolve('nonexistent');

      expect(result.success).toBe(false);
      expect(result.entry).toBeUndefined();
      expect(result.error).toBe('Entry not found');
    });

    it('measures resolve time', () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        createTestEntry(`entry${i.toString().padStart(3, '0')}`),
      );
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.resolve('entry050');

      expect(result.resolveTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.resolveTimeMs).toBeLessThan(10); // Should be very fast
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', () => {
      const entries = [
        createTestEntry('abc12345', { file: 'src/A.tsx', componentName: 'A' }),
        createTestEntry('def67890', { file: 'src/A.tsx', componentName: 'A' }),
        createTestEntry('ghi11111', { file: 'src/B.tsx', componentName: 'B' }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const stats = reader.getStats();

      expect(stats.entryCount).toBe(3);
      expect(stats.fileCount).toBe(2); // A.tsx and B.tsx
      expect(stats.componentCount).toBe(2); // A and B
      expect(stats.lastUpdated).toBeDefined();
    });

    it('tracks cache hit rate', () => {
      const entries = [createTestEntry('abc12345')];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      // No requests yet - default 100%
      expect(reader.getStats().cacheHitRate).toBe(1);

      // 1 hit
      reader.resolve('abc12345');
      expect(reader.getStats().cacheHitRate).toBe(1);

      // 1 miss
      reader.resolve('nonexistent');
      expect(reader.getStats().cacheHitRate).toBe(0.5);

      // 2 more hits
      reader.resolve('abc12345');
      reader.resolve('abc12345');
      expect(reader.getStats().cacheHitRate).toBe(0.75);
    });
  });

  describe('getEntriesByFile', () => {
    it('returns entries for a file', () => {
      const entries = [
        createTestEntry('abc12345', { file: 'src/A.tsx' }),
        createTestEntry('def67890', { file: 'src/A.tsx' }),
        createTestEntry('ghi11111', { file: 'src/B.tsx' }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const aEntries = reader.getEntriesByFile('src/A.tsx');
      expect(aEntries.length).toBe(2);
      expect(aEntries.map((e) => e.id).sort()).toEqual([
        'abc12345',
        'def67890',
      ]);

      const bEntries = reader.getEntriesByFile('src/B.tsx');
      expect(bEntries.length).toBe(1);
      expect(bEntries[0].id).toBe('ghi11111');
    });

    it('returns empty array for unknown file', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const entries = reader.getEntriesByFile('nonexistent.tsx');
      expect(entries).toEqual([]);
    });
  });

  describe('getEntriesByComponent', () => {
    it('returns entries for a component', () => {
      const entries = [
        createTestEntry('abc12345', { componentName: 'Button' }),
        createTestEntry('def67890', { componentName: 'Button' }),
        createTestEntry('ghi11111', { componentName: 'Input' }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const buttonEntries = reader.getEntriesByComponent('Button');
      expect(buttonEntries.length).toBe(2);

      const inputEntries = reader.getEntriesByComponent('Input');
      expect(inputEntries.length).toBe(1);
    });

    it('returns empty array for unknown component', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const entries = reader.getEntriesByComponent('NonExistent');
      expect(entries).toEqual([]);
    });
  });

  describe('getEntryByPosition', () => {
    it('returns exact line+column match', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 10, column: 4 },
        }),
        createTestEntry('def67890', {
          file: 'src/App.tsx',
          start: { line: 20, column: 8 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10, 4);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc12345');
    });

    it('returns exact line match without column', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 10, column: 4 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc12345');
    });

    it('returns match within tolerance range', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 12, column: 0 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10, undefined, 3);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc12345');
    });

    it('returns null when outside tolerance range', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 20, column: 0 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10, undefined, 3);

      expect(result).toBeNull();
    });

    it('breaks ties by column distance on same line', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 10, column: 20 },
        }),
        createTestEntry('def67890', {
          file: 'src/App.tsx',
          start: { line: 10, column: 5 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10, 4);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('def67890');
    });

    it('returns null for file not in index', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: 10, column: 0 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/Other.tsx', 10);

      expect(result).toBeNull();
    });

    it('skips entries with null start.line', () => {
      const entries = [
        createTestEntry('abc12345', {
          file: 'src/App.tsx',
          start: { line: null, column: null },
        }),
        createTestEntry('def67890', {
          file: 'src/App.tsx',
          start: { line: 10, column: 0 },
        }),
      ];
      writeManifest(entries);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const result = reader.getEntryByPosition('src/App.tsx', 10);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('def67890');
    });
  });

  describe('reload', () => {
    it('reloads entries from disk', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      expect(reader.getStats().entryCount).toBe(1);

      // Add more entries to the file
      writeManifest([createTestEntry('abc12345'), createTestEntry('def67890')]);

      reader.reload();

      expect(reader.getStats().entryCount).toBe(2);
    });

    it('emits manifest:updated event', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const listener = vi.fn();
      reader.onEvent(listener);

      writeManifest([createTestEntry('abc12345'), createTestEntry('def67890')]);
      reader.reload();

      expect(listener).toHaveBeenCalledWith({
        type: 'manifest:updated',
        data: expect.objectContaining({
          entryCount: 2,
        }),
      });
    });
  });

  describe('onEvent', () => {
    it('returns unsubscribe function', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const listener = vi.fn();
      const unsubscribe = reader.onEvent(listener);

      reader.reload();
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      unsubscribe();

      reader.reload();
      expect(listener).not.toHaveBeenCalled();
    });

    it('handles listener errors gracefully', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      reader.onEvent(errorListener);
      reader.onEvent(goodListener);

      // Should not throw and should call both listeners
      reader.reload();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('file watching', () => {
    type WatchCallback = (
      curr: { mtimeMs: number },
      prev: { mtimeMs: number },
    ) => void;
    let watchFileCallback: WatchCallback | null;

    beforeEach(() => {
      watchFileCallback = null;

      // Capture the watchFile callback so we can invoke it deterministically
      vi.mocked(watchFile).mockImplementation(
        (_path: unknown, _opts: unknown, cb?: unknown) => {
          const listener = typeof _opts === 'function' ? _opts : cb;
          watchFileCallback = listener as WatchCallback;
          return undefined as never;
        },
      );
    });

    afterEach(() => {
      vi.mocked(watchFile).mockRestore();
      vi.mocked(unwatchFile).mockRestore();
    });

    /** Simulate a watchFile poll cycle where mtime changed */
    const simulateFileChange = (newMtimeMs = Date.now()) => {
      expect(watchFileCallback).not.toBeNull();
      watchFileCallback!({ mtimeMs: newMtimeMs }, { mtimeMs: 0 });
    };

    it('sets up watcher even when manifest file does not exist', () => {
      // Arrange & Act — initialize with no manifest on disk
      reader = new ManifestReader(testDir);
      reader.initialize();

      // Assert — watchFile was called (watcher is active)
      expect(watchFileCallback).not.toBeNull();
    });

    it('detects manifest file created after initialization', () => {
      // Arrange — initialize with no manifest on disk
      reader = new ManifestReader(testDir);
      reader.initialize();
      expect(reader.getStats().entryCount).toBe(0);

      // Act — create the manifest and simulate the watcher firing
      writeManifest([createTestEntry('abc12345'), createTestEntry('def67890')]);
      simulateFileChange();

      // Assert
      expect(reader.getStats().entryCount).toBe(2);
      expect(reader.resolve('abc12345').success).toBe(true);
      expect(reader.resolve('def67890').success).toBe(true);
    });

    it('detects changes to existing manifest file', () => {
      // Arrange — initialize with one entry
      writeManifest([createTestEntry('abc12345')]);
      reader = new ManifestReader(testDir);
      reader.initialize();
      expect(reader.getStats().entryCount).toBe(1);

      // Act — rewrite manifest with two entries and simulate watcher
      writeManifest([createTestEntry('abc12345'), createTestEntry('def67890')]);
      simulateFileChange();

      // Assert
      expect(reader.getStats().entryCount).toBe(2);
    });

    it('emits manifest:updated when file appears after initialization', () => {
      // Arrange
      reader = new ManifestReader(testDir);
      reader.initialize();
      const listener = vi.fn();
      reader.onEvent(listener);

      // Act
      writeManifest([createTestEntry('abc12345')]);
      simulateFileChange();

      // Assert
      expect(listener).toHaveBeenCalledWith({
        type: 'manifest:updated',
        data: expect.objectContaining({ entryCount: 1 }),
      });
    });

    it('does not reload when mtime has not changed', () => {
      // Arrange
      writeManifest([createTestEntry('abc12345')]);
      reader = new ManifestReader(testDir);
      reader.initialize();
      const listener = vi.fn();
      reader.onEvent(listener);

      // Act — simulate poll where mtime is unchanged
      const sameMtime = Date.now();
      watchFileCallback!({ mtimeMs: sameMtime }, { mtimeMs: sameMtime });

      // Assert — no reload occurred
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('stops file watching', () => {
      writeManifest([createTestEntry('abc12345')]);

      reader = new ManifestReader(testDir);
      reader.initialize();

      // Should not throw
      reader.close();
    });
  });
});
