/**
 * Tests for ManifestCompactor
 *
 * Tests the static compaction logic that removes stale manifest entries:
 * entries for deleted files and superseded entries (older fileHash versions).
 * All fs operations are mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManifestCompactor } from './manifest-compactor.js';
import type { ManifestEntry } from '@domscribe/core';
import type { CompactionResult } from './types.js';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from 'fs';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockRenameSync = vi.mocked(renameSync);
const mockUnlinkSync = vi.mocked(unlinkSync);

const MANIFEST_PATH = '/workspace/.domscribe/manifest.jsonl';
const WORKSPACE_ROOT = '/workspace';

function createEntry(overrides?: Partial<ManifestEntry>): ManifestEntry {
  return {
    id: 'abc12345',
    file: 'src/Button.tsx',
    start: { line: 10, column: 2 },
    tagName: 'button',
    ...overrides,
  };
}

function toJsonl(entries: ManifestEntry[]): string {
  return entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

/**
 * Sets up fs mocks so the manifest file exists and returns the given entries.
 * By default, all source files referenced by entries also exist.
 */
function setupManifest(
  entries: ManifestEntry[],
  opts?: { missingFiles?: Set<string> },
): void {
  const missingFiles = opts?.missingFiles ?? new Set<string>();

  mockExistsSync.mockImplementation((p: unknown) => {
    if (p === MANIFEST_PATH) return true;
    // Source file existence check
    if (typeof p === 'string') {
      const relative = p.replace(`${WORKSPACE_ROOT}/`, '');
      return !missingFiles.has(relative);
    }
    return true;
  });

  mockReadFileSync.mockReturnValue(toJsonl(entries));
}

describe('ManifestCompactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('threshold gating', () => {
    it('should return skipped result when threshold is 0 (disabled)', () => {
      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 0,
        currentEntryCount: 1000,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: true,
          entriesBefore: 1000,
          entriesAfter: 1000,
          entriesRemoved: 0,
        }),
      );
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should return skipped result when currentEntryCount is below threshold', () => {
      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 500,
        currentEntryCount: 100,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: true,
          entriesBefore: 100,
          entriesAfter: 100,
          entriesRemoved: 0,
        }),
      );
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should use default threshold of 500 when not specified', () => {
      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        currentEntryCount: 499,
      });

      expect(result).toEqual(
        expect.objectContaining({ skipped: true, entriesBefore: 499 }),
      );
    });

    it('should proceed when currentEntryCount equals threshold', () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createEntry({
          id: `id_${String(i).padStart(5, '0')}`,
          file: `src/File${i}.tsx`,
        }),
      );
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 10,
        currentEntryCount: 10,
      });

      expect(result).toEqual(expect.objectContaining({ skipped: false }));
    });

    it('should gate on parsed count when currentEntryCount is not provided', () => {
      const entries = [createEntry()];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 100,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: true,
          entriesBefore: 1,
          entriesAfter: 1,
        }),
      );
    });
  });

  describe('manifest file handling', () => {
    it('should return skipped result when manifest file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 10,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: true,
          entriesBefore: 0,
          entriesAfter: 0,
        }),
      );
    });

    it('should skip malformed JSON lines without failing', () => {
      mockExistsSync.mockReturnValue(true);
      const validEntry = createEntry({ id: 'valid001' });
      const content = [
        JSON.stringify(validEntry),
        'not valid json{{{',
        '',
        JSON.stringify(createEntry({ id: 'valid002' })),
      ].join('\n');
      mockReadFileSync.mockReturnValue(content);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 10,
      });

      // 2 valid entries parsed, nothing to remove
      expect(result).toEqual(
        expect.objectContaining({
          skipped: false,
          entriesBefore: 2,
          entriesAfter: 2,
          entriesRemoved: 0,
        }),
      );
    });
  });

  describe('deleted file removal', () => {
    it('should remove entries whose source files no longer exist', () => {
      const entries = [
        createEntry({ id: 'exist_01', file: 'src/Alive.tsx' }),
        createEntry({ id: 'gone__01', file: 'src/Deleted.tsx' }),
        createEntry({ id: 'gone__02', file: 'src/Deleted.tsx' }),
      ];
      setupManifest(entries, { missingFiles: new Set(['src/Deleted.tsx']) });

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 3,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: false,
          entriesBefore: 3,
          entriesAfter: 1,
          entriesRemoved: 2,
          filesRemoved: 1,
        }),
      );
    });

    it('should count distinct deleted files in filesRemoved', () => {
      const entries = [
        createEntry({ id: 'gone_a01', file: 'src/A.tsx' }),
        createEntry({ id: 'gone_b01', file: 'src/B.tsx' }),
        createEntry({ id: 'alive_01', file: 'src/C.tsx' }),
      ];
      setupManifest(entries, {
        missingFiles: new Set(['src/A.tsx', 'src/B.tsx']),
      });

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 3,
      });

      expect(result).toEqual(
        expect.objectContaining({
          filesRemoved: 2,
          entriesRemoved: 2,
          entriesAfter: 1,
        }),
      );
    });
  });

  describe('superseded entry removal', () => {
    it('should remove entries with outdated fileHash for the same file', () => {
      const entries = [
        createEntry({ id: 'old__001', file: 'src/App.tsx', fileHash: 'aaaa' }),
        createEntry({ id: 'old__002', file: 'src/App.tsx', fileHash: 'bbbb' }),
        createEntry({ id: 'curr_001', file: 'src/App.tsx', fileHash: 'cccc' }),
      ];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 3,
      });

      expect(result).toEqual(
        expect.objectContaining({
          entriesBefore: 3,
          entriesAfter: 1,
          entriesRemoved: 2,
          entriesSuperseded: 2,
          filesRemoved: 0,
        }),
      );
    });

    it('should keep entries without fileHash (not subject to superseding)', () => {
      const entries = [
        createEntry({ id: 'no_hash1', file: 'src/App.tsx' }),
        createEntry({ id: 'hashed01', file: 'src/App.tsx', fileHash: 'aaaa' }),
        createEntry({ id: 'hashed02', file: 'src/App.tsx', fileHash: 'bbbb' }),
      ];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 3,
      });

      // no_hash1 is kept (no fileHash), hashed01 superseded, hashed02 is latest
      expect(result).toEqual(
        expect.objectContaining({
          entriesBefore: 3,
          entriesAfter: 2,
          entriesSuperseded: 1,
        }),
      );
    });

    it('should keep all entries when they share the same fileHash', () => {
      const entries = [
        createEntry({ id: 'same_001', file: 'src/App.tsx', fileHash: 'aaaa' }),
        createEntry({ id: 'same_002', file: 'src/App.tsx', fileHash: 'aaaa' }),
      ];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 2,
      });

      expect(result).toEqual(
        expect.objectContaining({
          entriesBefore: 2,
          entriesAfter: 2,
          entriesRemoved: 0,
        }),
      );
    });
  });

  describe('combined removal', () => {
    it('should remove both deleted-file entries and superseded entries', () => {
      const entries = [
        createEntry({
          id: 'alive_01',
          file: 'src/Keep.tsx',
          fileHash: 'latest',
        }),
        createEntry({
          id: 'alive_02',
          file: 'src/Keep.tsx',
          fileHash: 'stale_',
        }),
        createEntry({
          id: 'gone__01',
          file: 'src/Gone.tsx',
          fileHash: 'any___',
        }),
      ];
      setupManifest(entries, { missingFiles: new Set(['src/Gone.tsx']) });

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 3,
      });

      expect(result).toEqual(
        expect.objectContaining({
          entriesBefore: 3,
          entriesAfter: 1,
          entriesRemoved: 2,
          filesRemoved: 1,
          entriesSuperseded: 1,
        }),
      );
    });
  });

  describe('no-op compaction', () => {
    it('should return non-skipped result with zero removals when all entries are current', () => {
      const entries = [
        createEntry({ id: 'fresh_01', file: 'src/A.tsx', fileHash: 'hash1_' }),
        createEntry({ id: 'fresh_02', file: 'src/B.tsx', fileHash: 'hash2_' }),
      ];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 2,
      });

      expect(result).toEqual(
        expect.objectContaining({
          skipped: false,
          entriesBefore: 2,
          entriesAfter: 2,
          entriesRemoved: 0,
        }),
      );
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(mockRenameSync).not.toHaveBeenCalled();
    });
  });

  describe('atomic rewrite', () => {
    it('should write survivors to a temp file and rename atomically', () => {
      const kept = createEntry({ id: 'keep_001', file: 'src/Keep.tsx' });
      const removed = createEntry({ id: 'gone_001', file: 'src/Gone.tsx' });
      setupManifest([kept, removed], {
        missingFiles: new Set(['src/Gone.tsx']),
      });

      ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 2,
      });

      const expectedTempFile = `${MANIFEST_PATH}.tmp.${process.pid}`;
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expectedTempFile,
        JSON.stringify(kept) + '\n',
        'utf-8',
      );
      expect(mockRenameSync).toHaveBeenCalledWith(
        expectedTempFile,
        MANIFEST_PATH,
      );
    });

    it('should write empty string when all entries are removed', () => {
      const entries = [createEntry({ id: 'gone_001', file: 'src/Gone.tsx' })];
      setupManifest(entries, { missingFiles: new Set(['src/Gone.tsx']) });

      ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 1,
      });

      const expectedTempFile = `${MANIFEST_PATH}.tmp.${process.pid}`;
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expectedTempFile,
        '',
        'utf-8',
      );
    });

    it('should attempt to clean up temp file in finally block', () => {
      const entries = [createEntry({ id: 'gone_001', file: 'src/Gone.tsx' })];
      setupManifest(entries, { missingFiles: new Set(['src/Gone.tsx']) });

      ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 1,
      });

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        `${MANIFEST_PATH}.tmp.${process.pid}`,
      );
    });

    it('should not throw if temp file cleanup fails', () => {
      const entries = [createEntry({ id: 'gone_001', file: 'src/Gone.tsx' })];
      setupManifest(entries, { missingFiles: new Set(['src/Gone.tsx']) });
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() =>
        ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
          entryCountThreshold: 1,
          currentEntryCount: 1,
        }),
      ).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should return null when an unexpected error occurs', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('disk failure');
      });

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 10,
      });

      expect(result).toBeNull();
    });
  });

  describe('result shape', () => {
    it('should include durationMs as a non-negative number', () => {
      const entries = [createEntry()];
      setupManifest(entries);

      const result = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 1,
      });

      if (result === null) {
        expect.unreachable('Expected CompactionResult but got null');
        return;
      }
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should satisfy the CompactionResult interface on all code paths', () => {
      // Threshold-0 path
      const disabled = ManifestCompactor.compact(
        MANIFEST_PATH,
        WORKSPACE_ROOT,
        { entryCountThreshold: 0 },
      );
      assertCompactionResult(disabled);

      // Below-threshold path
      const belowThreshold = ManifestCompactor.compact(
        MANIFEST_PATH,
        WORKSPACE_ROOT,
        { currentEntryCount: 1 },
      );
      assertCompactionResult(belowThreshold);

      // No-op compaction path
      const entries = [createEntry({ id: 'ok___001' })];
      setupManifest(entries);
      const noOp = ManifestCompactor.compact(MANIFEST_PATH, WORKSPACE_ROOT, {
        entryCountThreshold: 1,
        currentEntryCount: 1,
      });
      assertCompactionResult(noOp);
    });
  });
});

function assertCompactionResult(result: CompactionResult | null): void {
  if (result === null) {
    expect.unreachable('Expected CompactionResult but got null');
    return;
  }
  expect(typeof result.skipped).toBe('boolean');
  expect(typeof result.entriesBefore).toBe('number');
  expect(typeof result.entriesAfter).toBe('number');
  expect(typeof result.entriesRemoved).toBe('number');
  expect(typeof result.filesRemoved).toBe('number');
  expect(typeof result.entriesSuperseded).toBe('number');
  expect(typeof result.durationMs).toBe('number');
}
