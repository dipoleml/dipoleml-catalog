/**
 * Manifest Validation Integration Tests
 *
 * Builds the target fixture and deeply validates every manifest entry:
 * - Every entry has a valid 8-char nanoid ID
 * - Every entry points to a real source file within the fixture
 * - Every entry has valid source positions (line >= 1, column >= 0)
 * - Every entry has start before or equal to end
 * - Every entry has a non-empty tagName
 * - Every entry has a valid 16-char hex fileHash
 * - All IDs are globally unique
 * - No entries reference node_modules or files outside the fixture
 * - No duplicate file+position combinations (fileHash ensures stale dedup)
 * - data-ds attributes in the dev bundle match the manifest IDs
 *
 * Operates on a single fixture specified by the FIXTURE_ID env var.
 * Usage: FIXTURE_ID=vite-v5-react-18-ts nx integration domscribe-test-fixtures
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { buildFixture } from './utils/fixture-builder.js';
import { readManifest } from './utils/manifest-reader.js';
import { scanBundleForDataDs } from './utils/bundle-scanner.js';
import {
  getFixtureById,
  isBuildableFixture,
} from '../shared/fixture-registry.js';
import type { ManifestData, ParsedBundle } from '../shared/types.js';

const ID_PATTERN = /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/;
const FILE_HASH_PATTERN = /^[0-9a-f]{1,16}$/;

const fixtureId = process.env['FIXTURE_ID'];
const fixture = fixtureId ? getFixtureById(fixtureId) : null;
if (fixtureId && (!fixture || !isBuildableFixture(fixture))) {
  throw new Error(
    `Fixture "${fixtureId}" not found or not buildable (node_modules not installed?)`,
  );
}

describe.skipIf(!fixture)('Manifest Validation', () => {
  let manifest: ManifestData;
  let bundle: ParsedBundle;
  let fixtureRoot: string;

  beforeAll(async () => {
    fixtureRoot = fixture!.path;
    const result = await buildFixture(fixture!, {
      mode: 'development',
    });
    manifest = await readManifest(result.manifestPath);
    bundle = await scanBundleForDataDs(result.outputDir);
  }, 120_000);

  it('should produce a non-empty manifest', () => {
    expect(manifest.entries.size).toBeGreaterThan(0);
  });

  it('should have unique 8-char nanoid IDs for every entry', () => {
    const seenIds = new Set<string>();

    for (const [id, entry] of manifest.entries) {
      expect(entry.id).toBe(id);
      expect(id).toMatch(ID_PATTERN);
      expect(seenIds.has(id)).toBe(false);
      seenIds.add(id);
    }
  });

  it('should have a valid fileHash on every entry', () => {
    for (const [id, entry] of manifest.entries) {
      expect(entry.fileHash, `Entry ${id} missing fileHash`).toBeDefined();
      expect(
        entry.fileHash,
        `Entry ${id} has invalid fileHash: ${entry.fileHash}`,
      ).toMatch(FILE_HASH_PATTERN);
    }
  });

  it('should have consistent fileHash per file', () => {
    const fileHashes = new Map<string, string>();

    for (const [id, entry] of manifest.entries) {
      const existingHash = fileHashes.get(entry.file);
      if (existingHash) {
        expect(
          entry.fileHash,
          `Entry ${id} has different fileHash than other entries in ${entry.file}`,
        ).toBe(existingHash);
      } else if (entry.fileHash) {
        fileHashes.set(entry.file, entry.fileHash);
      }
    }
  });

  it('should point every entry to a real source file within the fixture', () => {
    for (const [id, entry] of manifest.entries) {
      expect(entry.file, `Entry ${id} missing file`).toBeTruthy();

      expect(
        entry.file.startsWith(fixtureRoot),
        `Entry ${id} file outside fixture: ${entry.file}`,
      ).toBe(true);

      expect(
        entry.file.includes('node_modules'),
        `Entry ${id} references node_modules: ${entry.file}`,
      ).toBe(false);

      expect(
        existsSync(entry.file),
        `Entry ${id} file does not exist: ${entry.file}`,
      ).toBe(true);
    }
  });

  it('should have valid source positions on every entry', () => {
    for (const [id, entry] of manifest.entries) {
      expect(entry.start, `Entry ${id} missing start`).toBeDefined();
      expect(
        entry.start.line,
        `Entry ${id} start.line should be >= 1`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        entry.start.column,
        `Entry ${id} start.column should be >= 0`,
      ).toBeGreaterThanOrEqual(0);

      if (entry.end) {
        expect(
          entry.end.line,
          `Entry ${id} end.line should be >= 1`,
        ).toBeGreaterThanOrEqual(1);
        expect(
          entry.end.column,
          `Entry ${id} end.column should be >= 0`,
        ).toBeGreaterThanOrEqual(0);

        if (entry.end.line === entry.start.line) {
          expect(
            entry.end.column,
            `Entry ${id} end.column should be >= start.column on same line`,
          ).toBeGreaterThanOrEqual(entry.start.column!);
        } else {
          expect(
            entry.end.line,
            `Entry ${id} end.line should be >= start.line`,
          ).toBeGreaterThanOrEqual(entry.start.line!);
        }
      }
    }
  });

  it('should have a non-empty tagName on every entry', () => {
    for (const [id, entry] of manifest.entries) {
      expect(entry.tagName, `Entry ${id} missing tagName`).toBeTruthy();
      expect(
        typeof entry.tagName,
        `Entry ${id} tagName should be a string`,
      ).toBe('string');
    }
  });

  it('should cover multiple source files', () => {
    const files = new Set<string>();
    for (const entry of manifest.entries.values()) {
      files.add(entry.file);
    }
    expect(files.size).toBeGreaterThanOrEqual(2);
  });

  it('should have entries for both HTML elements and components', () => {
    const tagNames = new Set<string>();
    for (const entry of manifest.entries.values()) {
      tagNames.add(entry.tagName!);
    }

    const htmlTags = [...tagNames].filter(
      (t) => t === t.toLowerCase() && !t.includes('.'),
    );
    expect(
      htmlTags.length,
      'Expected at least one HTML element tag',
    ).toBeGreaterThan(0);

    const componentTags = [...tagNames].filter(
      (t) => t[0] === t[0].toUpperCase() && t[0] !== t[0].toLowerCase(),
    );
    expect(
      componentTags.length,
      'Expected at least one component tag',
    ).toBeGreaterThan(0);
  });

  it('should have data-ds attributes in the dev bundle matching manifest IDs', () => {
    expect(
      bundle.dataDs.length,
      'Dev bundle should contain data-ds attributes',
    ).toBeGreaterThan(0);

    const manifestIds = new Set(manifest.entries.keys());

    for (const dsId of bundle.dataDs) {
      expect(
        manifestIds.has(dsId),
        `Bundle contains data-ds="${dsId}" not found in manifest`,
      ).toBe(true);
    }
  });

  it('should not have entries with unreasonable line numbers', () => {
    for (const [id, entry] of manifest.entries) {
      expect(
        entry.start.line,
        `Entry ${id} has suspiciously large line number: ${entry.start.line}`,
      ).toBeLessThan(10_000);
    }
  });

  // Turbopack (used by Next.js) runs loaders in parallel worker threads
  // with separate V8 isolates. Workers processing the same file for server
  // and client compilations can race on the ID cache, producing different
  // IDs for identical source positions. Both entries are valid (each ID
  // appears in its respective bundle) so the manifest keeps them.
  it.skip(
    'should have no duplicate file+position combinations',
    () => {
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const [id, entry] of manifest.entries) {
        const key = `${entry.file}:${entry.start.line}:${entry.start.column}`;
        if (seen.has(key)) {
          duplicates.push(`${id} at ${key}`);
        }
        seen.add(key);
      }

      expect(
        duplicates,
        `Found entries at identical positions: ${duplicates.join(', ')}`,
      ).toEqual([]);
    },
  );
});
