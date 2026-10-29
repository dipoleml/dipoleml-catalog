/**
 * Production Strip Tests
 *
 * Verifies that data-ds attributes are ABSENT in production builds.
 * This is a critical CI guardrail — dev metadata must never ship to production.
 *
 * Operates on a single fixture specified by the FIXTURE_ID env var.
 * Usage: FIXTURE_ID=vite-v5-react-18-ts nx integration domscribe-test-fixtures
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildFixture } from './utils/fixture-builder.js';
import { scanBundleForDataDs } from './utils/bundle-scanner.js';
import {
  getFixtureById,
  isBuildableFixture,
} from '../shared/fixture-registry.js';
import type { ParsedBundle } from '../shared/types.js';

const fixtureId = process.env['FIXTURE_ID'];
const fixture = fixtureId ? getFixtureById(fixtureId) : null;
if (fixtureId && (!fixture || !isBuildableFixture(fixture))) {
  throw new Error(
    `Fixture "${fixtureId}" not found or not buildable (node_modules not installed?)`,
  );
}

describe.skipIf(!fixture)('Production Strip', () => {
  let bundle: ParsedBundle;

  beforeAll(async () => {
    const result = await buildFixture(fixture!, {
      mode: 'production',
    });
    bundle = await scanBundleForDataDs(result.outputDir);
  }, 60_000);

  it('should not contain data-ds attributes in production bundle', () => {
    expect(
      bundle.dataDs,
      `Production bundle contains ${bundle.dataDs.length} data-ds attribute(s) — transforms should be disabled in production`,
    ).toEqual([]);
  });

  it('should not contain overlay scripts in production', () => {
    expect(bundle.js).not.toContain('domscribe-overlay');
    expect(bundle.html).not.toContain('domscribe-overlay');
  });
});
