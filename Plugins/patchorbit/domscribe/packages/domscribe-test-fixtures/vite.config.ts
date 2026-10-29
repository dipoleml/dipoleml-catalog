import { defineConfig } from 'vite';

export default defineConfig(() => {
  // When Nx runs per-fixture targets in parallel, each Vitest process
  // needs its own coverage directory to avoid temp-file collisions.
  const fixtureId = process.env['FIXTURE_ID'];
  const coverageDir = fixtureId
    ? `./test-output/vitest/coverage/${fixtureId}`
    : './test-output/vitest/coverage';

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/domscribe-test-fixtures',
    plugins: [],
    test: {
      globalSetup: ['./integration/global-setup.ts'],
      name: 'domscribe-test-fixtures',
      watch: false,
      globals: true,
      environment: 'node',
      // Include integration tests and benchmarks
      include: ['integration/**/*.{test,spec}.ts', 'integration/**/*.bench.ts'],
      reporters: ['default'],
      // Integration tests run against a single fixture (FIXTURE_ID env var).
      // Keep serial to avoid any shared state issues within a single process.
      fileParallelism: false,
      coverage: {
        enabled: true,
        reportsDirectory: coverageDir,
        provider: 'v8' as const,
        include: ['shared/**/*.ts', 'integration/**/*.ts'],
        exclude: [
          'fixtures/**',
          '**/*.spec.ts',
          '**/*.test.ts',
          '**/*.bench.ts',
        ],
      },
      // Increase timeout for integration tests (building fixtures takes time)
      testTimeout: 120_000,
      hookTimeout: 120_000,
      typecheck: {
        tsconfig: './tsconfig.spec.json',
      },
    },
  };
});
