/**
 * Vitest Global Setup for Integration Tests
 *
 * Each Nx integration target spawns its own Vitest process with a
 * FIXTURE_ID env var. This setup cleans only that fixture's build
 * artifacts (.domscribe, .next, .output, .nuxt) so parallel targets
 * don't clobber each other.
 */

import { getFixtureById } from '../shared/fixture-registry.js';
import { cleanFixtures } from '../shared/cleanup.js';

export function setup(): void {
  const fixtureId = process.env['FIXTURE_ID'];
  if (!fixtureId) return;

  const fixture = getFixtureById(fixtureId);
  if (!fixture) return;

  cleanFixtures([fixture]);
}
