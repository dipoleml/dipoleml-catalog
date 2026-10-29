/**
 * Playwright Global Setup
 *
 * Each Nx e2e target spawns its own Playwright process with a
 * FIXTURE_ID env var. This setup cleans only that fixture's build
 * artifacts (.domscribe, .next, .output, .nuxt) so parallel targets
 * don't clobber each other.
 *
 * Fixture installation is handled by the `install-fixture` Nx target
 * (a dependency of each `e2e--<id>` target).
 */

import { getFixtureById } from '../shared/fixture-registry.js';
import { cleanFixtures } from '../shared/cleanup.js';

export default async function globalSetup(): Promise<() => Promise<void>> {
  const fixtureId = process.env['FIXTURE_ID'];
  if (fixtureId) {
    const fixture = getFixtureById(fixtureId);
    if (fixture) {
      cleanFixtures([fixture]);
    }
  }

  return async () => {
    // no-op
  };
}
