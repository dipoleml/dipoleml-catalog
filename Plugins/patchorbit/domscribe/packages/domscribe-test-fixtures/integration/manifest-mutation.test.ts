/**
 * Manifest Mutation Integration Tests
 *
 * Verifies Domscribe's manifest behavior when source files change:
 * - Unmodified files: All IDs and entries remain identical
 * - Mutated file: All entries get new IDs and a new fileHash
 * - No stale data: Only entries with the current fileHash are present
 * - New elements are present in the mutated manifest
 * - Element count for the mutated file increases
 *
 * Note on build lifecycle:
 * The IDStabilizer regenerates ALL IDs for a file when its content hash
 * changes. Since programmatic builds via viteBuild()/webpack() close
 * singletons after each build, the second build gets fresh instances
 * (self-healing singleton pattern). The fileHash field on manifest entries
 * ensures stale entries from the first build are filtered out when reading
 * the manifest after the second build.
 *
 * Operates on a single fixture specified by the FIXTURE_ID env var.
 * Usage: FIXTURE_ID=vite-v5-react-18-ts nx integration domscribe-test-fixtures
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildFixture } from './utils/fixture-builder.js';
import { readManifest, getEntriesForFile } from './utils/manifest-reader.js';
import {
  getFixtureById,
  isBuildableFixture,
  type DiscoveredFixture,
} from '../shared/fixture-registry.js';
import type { ManifestData } from '../shared/types.js';

const ID_PATTERN = /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/;

// ---------------------------------------------------------------------------
// Framework-aware mutation helpers
// ---------------------------------------------------------------------------

interface MutationTarget {
  /** Relative path from fixture root to the file to mutate */
  relativePath: string;
  /** The snippet to insert (framework-appropriate syntax) */
  insertedSnippet: string;
  /** Find the insertion point in the file content */
  findInsertionPoint: (content: string) => number;
}

function getMutationTarget(fixture: DiscoveredFixture): MutationTarget {
  const { framework } = fixture.manifest;
  const isVue = framework === 'vue' || framework === 'nuxt';

  const componentsDir = framework === 'nuxt' ? 'components' : 'src/components';
  const ext = isVue ? '.vue' : '.tsx';
  const relativePath = `${componentsDir}/BasicElements${ext}`;

  if (isVue) {
    return {
      relativePath,
      insertedSnippet:
        '\n    <section>\n      <h4>Mutation Test</h4>\n      <div class="mutation-target">Mutation test element</div>\n    </section>',
      findInsertionPoint(content: string): number {
        const templateEnd = content.indexOf('</template>');
        if (templateEnd === -1) {
          throw new Error('Could not find </template> in Vue file');
        }
        const searchRegion = content.slice(0, templateEnd);
        const lastDiv = searchRegion.lastIndexOf('</div>');
        if (lastDiv === -1) {
          throw new Error('Could not find closing </div> before </template>');
        }
        return lastDiv;
      },
    };
  }

  return {
    relativePath,
    insertedSnippet:
      '\n      <section>\n        <h4>Mutation Test</h4>\n        <div className="mutation-target">Mutation test element</div>\n      </section>',
    findInsertionPoint(content: string): number {
      const lastClosingDiv = content.lastIndexOf('    </div>');
      if (lastClosingDiv === -1) {
        throw new Error('Could not find closing </div> in JSX file');
      }
      return lastClosingDiv;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const fixtureId = process.env['FIXTURE_ID'];
const fixture = fixtureId ? getFixtureById(fixtureId) : null;
if (fixtureId && (!fixture || !isBuildableFixture(fixture))) {
  throw new Error(
    `Fixture "${fixtureId}" not found or not buildable (node_modules not installed?)`,
  );
}

describe.skipIf(!fixture)('Manifest Mutation', () => {
  const target = fixture ? getMutationTarget(fixture) : null;

  let absoluteTargetFile: string;
  let originalContent: string;
  let baselineManifest: ManifestData;
  let mutatedManifest: ManifestData;
  let targetFileName: string;

  beforeAll(async () => {
    absoluteTargetFile = join(fixture!.path, target!.relativePath);
    targetFileName = target!.relativePath;

    if (!existsSync(absoluteTargetFile)) {
      throw new Error(`Mutation target not found: ${absoluteTargetFile}`);
    }

    // Build baseline
    const baselineResult = await buildFixture(fixture!, {
      mode: 'development',
    });
    baselineManifest = await readManifest(baselineResult.manifestPath);

    // Save original content for restore
    originalContent = readFileSync(absoluteTargetFile, 'utf-8');

    // Insert a new section before the identified insertion point
    const insertionPoint = target!.findInsertionPoint(originalContent);
    const modified =
      originalContent.slice(0, insertionPoint) +
      target!.insertedSnippet +
      '\n' +
      originalContent.slice(insertionPoint);

    writeFileSync(absoluteTargetFile, modified, 'utf-8');

    // Rebuild with mutation — fileHash filtering in readManifest()
    // ensures stale entries from the baseline build are excluded
    const mutatedResult = await buildFixture(fixture!, {
      mode: 'development',
    });
    mutatedManifest = await readManifest(mutatedResult.manifestPath);
  }, 120_000);

  afterAll(() => {
    // Restore original file
    if (originalContent && absoluteTargetFile) {
      writeFileSync(absoluteTargetFile, originalContent, 'utf-8');
    }
  });

  describe('Unmodified files', () => {
    // Turbopack worker threads can race on the ID cache across builds,
    // producing additional duplicate IDs for the same positions.
    it(
      'should preserve all IDs from unmodified files exactly',
      () => {
        const unmodifiedBaseline = new Map<string, string>();
        const unmodifiedMutated = new Map<string, string>();

        for (const [id, entry] of baselineManifest.entries) {
          if (!entry.file.includes(targetFileName)) {
            unmodifiedBaseline.set(id, JSON.stringify(entry));
          }
        }
        for (const [id, entry] of mutatedManifest.entries) {
          if (!entry.file.includes(targetFileName)) {
            unmodifiedMutated.set(id, JSON.stringify(entry));
          }
        }

        // Same IDs
        const baselineIds = [...unmodifiedBaseline.keys()].sort();
        const mutatedIds = [...unmodifiedMutated.keys()].sort();
        expect(mutatedIds).toEqual(baselineIds);

        // Identical entries (same file, positions, tagName, fileHash)
        for (const [id, json] of unmodifiedMutated) {
          expect(
            json,
            `Entry ${id} in unmodified file changed after mutation`,
          ).toBe(unmodifiedBaseline.get(id));
        }
      },
    );

    it('should have same fileHash for unmodified files', () => {
      const baselineHashes = new Map<string, string>();
      const mutatedHashes = new Map<string, string>();

      for (const entry of baselineManifest.entries.values()) {
        if (!entry.file.includes(targetFileName) && entry.fileHash) {
          baselineHashes.set(entry.file, entry.fileHash);
        }
      }
      for (const entry of mutatedManifest.entries.values()) {
        if (!entry.file.includes(targetFileName) && entry.fileHash) {
          mutatedHashes.set(entry.file, entry.fileHash);
        }
      }

      for (const [file, hash] of baselineHashes) {
        expect(
          mutatedHashes.get(file),
          `fileHash changed for unmodified file: ${file}`,
        ).toBe(hash);
      }
    });
  });

  describe('Mutated file', () => {
    it('should have entirely new IDs for the mutated file', () => {
      const baselineFileIds = new Set(
        getEntriesForFile(baselineManifest, targetFileName).map((e) => e.id),
      );
      const mutatedFileIds = getEntriesForFile(
        mutatedManifest,
        targetFileName,
      ).map((e) => e.id);

      // All mutated file IDs should be different from baseline
      for (const id of mutatedFileIds) {
        expect(
          baselineFileIds.has(id),
          `Mutated file ID ${id} should be new (content hash changed)`,
        ).toBe(false);
      }
    });

    it('should have a different fileHash for the mutated file', () => {
      let baselineHash: string | undefined;
      let mutatedHash: string | undefined;

      for (const entry of baselineManifest.entries.values()) {
        if (entry.file.includes(targetFileName)) {
          baselineHash = entry.fileHash;
          break;
        }
      }
      for (const entry of mutatedManifest.entries.values()) {
        if (entry.file.includes(targetFileName)) {
          mutatedHash = entry.fileHash;
          break;
        }
      }

      expect(baselineHash).toBeDefined();
      expect(mutatedHash).toBeDefined();
      expect(
        mutatedHash,
        'Mutated file should have a different fileHash',
      ).not.toBe(baselineHash);
    });

    it('should have more entries for the mutated file than baseline', () => {
      const baselineCount = getEntriesForFile(
        baselineManifest,
        targetFileName,
      ).length;
      const mutatedCount = getEntriesForFile(
        mutatedManifest,
        targetFileName,
      ).length;

      // The inserted snippet has: <section>, <h4>, <div> = 3 new elements
      expect(
        mutatedCount,
        `Expected more entries in mutated file (baseline: ${baselineCount})`,
      ).toBeGreaterThan(baselineCount);
    });

    it('should have entries for the inserted elements', () => {
      const mutatedFileEntries = getEntriesForFile(
        mutatedManifest,
        targetFileName,
      );

      const tagNames = mutatedFileEntries.map((e) => e.tagName);

      expect(tagNames).toContain('section');
      expect(tagNames).toContain('h4');
      expect(tagNames).toContain('div');
    });
  });

  describe('No stale data', () => {
    it('should have no duplicate IDs', () => {
      const ids = [...mutatedManifest.entries.keys()];
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.skip(
      'should have no duplicate file+position combinations',
      () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];

        for (const [id, entry] of mutatedManifest.entries) {
          const key = `${entry.file}:${entry.start.line}:${entry.start.column}`;
          if (seen.has(key)) {
            duplicates.push(`${id} at ${key}`);
          }
          seen.add(key);
        }

        expect(duplicates).toEqual([]);
      },
    );

    it('should have consistent fileHash within each file', () => {
      const fileHashes = new Map<string, string>();

      for (const [id, entry] of mutatedManifest.entries) {
        if (!entry.fileHash) continue;
        const existing = fileHashes.get(entry.file);
        if (existing) {
          expect(
            entry.fileHash,
            `Entry ${id} has inconsistent fileHash in ${entry.file}`,
          ).toBe(existing);
        } else {
          fileHashes.set(entry.file, entry.fileHash);
        }
      }
    });

    it('should have valid IDs on all entries', () => {
      for (const id of mutatedManifest.entries.keys()) {
        expect(id).toMatch(ID_PATTERN);
      }
    });
  });
});
