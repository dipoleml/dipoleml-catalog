/**
 * Build Performance Benchmarks
 *
 * Measures full build overhead introduced by the Domscribe transform.
 *
 * **Full build A/B** — Builds with and without the Domscribe transform
 * to measure total build overhead. Works across all bundlers:
 * - Vite: strips domscribe plugins via filterDomscribePlugins()
 * - Webpack: strips domscribe loader rules and plugin
 * - Next: omits DOMSCRIBE_FORCE_TRANSFORM (production guard skips transforms)
 * - Nuxt: omits DOMSCRIBE_FORCE_TRANSFORM (module returns early)
 *
 * Per-file transform benchmarks live in @domscribe/transform
 * (injector-performance.bench.ts) — no @domscribe/* imports needed here.
 *
 * Operates on a single fixture specified by the FIXTURE_ID env var.
 * Usage: FIXTURE_ID=webpack-v5-react-19-ts nx integration domscribe-test-fixtures
 */

import { describe, it, expect } from 'vitest';
import { buildFixture } from './utils/fixture-builder.js';
import {
  getFixtureById,
  isBuildableFixture,
} from '../shared/fixture-registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum acceptable build overhead (%).
 * Local default is strict (50%) to catch regressions early.
 * CI runners are slower and noisier — set DS_MAX_BUILD_OVERHEAD_PERCENT=75
 * in the workflow to allow for that.
 */
const MAX_BUILD_OVERHEAD_PERCENT =
  Number(process.env['DS_MAX_BUILD_OVERHEAD_PERCENT']) || 50;

/** Number of iterations for the full build A/B comparison */
const BUILD_ITERATIONS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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

describe.skipIf(!fixture)('Build Performance', () => {
  // =========================================================================
  // Full Build A/B Comparison
  //
  // Builds with and without domscribe to measure transform overhead.
  // Each bundler has its own mechanism for disabling domscribe — see
  // fixture-builder.ts for details.
  // =========================================================================

  it.skipIf(!fixture)(
    'build overhead within budget',
    async () => {
      // Warmup build (both paths) to populate caches
      await buildFixture(fixture!, { mode: 'development' });
      await buildFixture(fixture!, {
        mode: 'development',
        disableDomscribe: true,
      });

      // Measure with domscribe
      const withTimes: number[] = [];
      for (let i = 0; i < BUILD_ITERATIONS; i++) {
        const result = await buildFixture(fixture!, {
          mode: 'development',
        });
        withTimes.push(result.buildTime);
      }

      // Measure without domscribe
      const withoutTimes: number[] = [];
      for (let i = 0; i < BUILD_ITERATIONS; i++) {
        const result = await buildFixture(fixture!, {
          mode: 'development',
          disableDomscribe: true,
        });
        withoutTimes.push(result.buildTime);
      }

      const medianWith = median(withTimes);
      const medianWithout = median(withoutTimes);
      const overheadMs = medianWith - medianWithout;
      const overheadPct =
        medianWithout > 0 ? (overheadMs / medianWithout) * 100 : 0;

      console.log(
        `[${fixture!.manifest.id}] with=${medianWith.toFixed(0)}ms | ` +
          `without=${medianWithout.toFixed(0)}ms | ` +
          `overhead=${overheadMs.toFixed(0)}ms (${overheadPct.toFixed(1)}%)`,
      );

      expect(
        overheadPct,
        `build overhead ${overheadPct.toFixed(1)}% exceeds ${MAX_BUILD_OVERHEAD_PERCENT}%`,
      ).toBeLessThan(MAX_BUILD_OVERHEAD_PERCENT);
    },
    300_000,
  );
});
