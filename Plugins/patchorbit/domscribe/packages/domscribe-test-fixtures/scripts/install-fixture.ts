/**
 * CLI entry point for single-fixture installation.
 *
 * Requires FIXTURE_ID env var. Orchestration across fixtures is
 * handled by Nx via per-fixture `install-fixture--<id>` targets.
 *
 * Expects Verdaccio to be running on localhost:4873 with packages
 * already published.
 *
 * Usage:
 *   FIXTURE_ID=vite-v5-react-18-ts node --import @swc-node/register/esm \
 *     packages/domscribe-test-fixtures/scripts/install-fixture.ts
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { installFixture } from '../shared/fixture-installer.ts';
import { getFixtureById } from '../shared/fixture-registry.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERDACCIO_PORT = 4873;

const fixtureId = process.env['FIXTURE_ID'];
if (!fixtureId) {
  console.error('[install-fixture] FIXTURE_ID env var is required');
  process.exit(1);
}

const fixture = getFixtureById(fixtureId);
if (!fixture) {
  console.error(`[install-fixture] Fixture not found: ${fixtureId}`);
  process.exit(1);
}

const log = (msg: string) =>
  console.log(`[install-fixture:${fixtureId}] ${msg}`);

const outcome = installFixture(fixture.path, {
  workspaceRoot: resolve(__dirname, '../../..'),
  registryUrl: `http://localhost:${VERDACCIO_PORT}`,
  registryPort: VERDACCIO_PORT,
  log,
});

if (outcome.action === 'failed') {
  process.exit(1);
}
