import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E Configuration
 *
 * Parallelism model:
 *   Nx (cross-fixture)  →  each fixture gets its own `e2e--<id>` target
 *   Playwright (intra-fixture)  →  tests within a fixture run serially
 *
 * Nx controls concurrency across fixtures via its task runner. Each
 * `e2e--<id>` target launches a single Playwright process filtered by
 * `--grep <id>`. Within that process, tests run serially in one worker
 * so that the describe block's beforeAll/afterAll reliably manage a
 * single dev server per fixture.
 *
 * Using multiple Playwright workers here would cause each worker to
 * independently call beforeAll → startDevServer(), multiplying dev
 * servers (and their inotify/file-watcher instances) per fixture.
 */
export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  globalTimeout: 1_800_000, // 30 min for full suite across all fixtures
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    trace: 'on-first-retry',
  },
});
