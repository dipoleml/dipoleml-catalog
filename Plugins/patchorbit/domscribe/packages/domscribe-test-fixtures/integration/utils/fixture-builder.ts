/**
 * Fixture Builder - Build fixtures using bundler programmatic APIs
 *
 * Provides buildFixture() for integration tests that need to run
 * Vite or Webpack builds on discovered fixtures.
 */

import {
  build as viteBuild,
  loadConfigFromFile,
  type UserConfig,
  type Plugin,
} from 'vite';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import type {
  FixtureConfig,
  BuildOptions,
  FixtureBuildResult,
} from '../../shared/types.js';
import type { DiscoveredFixture } from '../../shared/fixture-registry.js';

/**
 * Check whether a Vite plugin is domscribe-related by name.
 */
function isDomscribePlugin(plugin: Plugin): boolean {
  return typeof plugin.name === 'string' && plugin.name.includes('domscribe');
}

/**
 * Recursively filter domscribe plugins from a Vite plugin list.
 * Vite plugins can be nested arrays, false, null, or undefined.
 */
function filterDomscribePlugins(
  plugins: UserConfig['plugins'],
): UserConfig['plugins'] {
  if (!plugins) return [];
  return plugins
    .map((p) => {
      if (Array.isArray(p)) return filterDomscribePlugins(p);
      if (!p) return p;
      if (isDomscribePlugin(p as Plugin)) return false;
      return p;
    })
    .filter(Boolean);
}

/**
 * Force domscribe plugins to apply during builds.
 * By default the Vite plugin has `apply: 'serve'` (dev server only).
 * For integration tests we need it to run during `viteBuild()` too.
 * Relay failures are caught by the plugin and don't fail the build.
 */
function forceDomscribePlugins(
  plugins: UserConfig['plugins'],
): UserConfig['plugins'] {
  if (!plugins) return [];
  return plugins.map((p) => {
    if (Array.isArray(p)) return forceDomscribePlugins(p);
    if (!p) return p;
    if (isDomscribePlugin(p as Plugin)) {
      (p as Plugin).apply = undefined; // Apply in all modes
    }
    return p;
  });
}

/**
 * Build a fixture using Vite
 */
async function buildViteFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { mode = 'development', disableDomscribe = false } = options;
  const startTime = Date.now();

  // Use mode-specific output dirs to avoid race conditions when
  // multiple test files build the same fixture in parallel.
  // Append '-baseline' for domscribe-disabled builds to avoid clobbering.
  const suffix = disableDomscribe ? `${mode}-baseline` : mode;
  const outDir = join(config.path, `dist-${suffix}`);

  if (disableDomscribe) {
    // Load the fixture's vite.config, strip domscribe plugin(s), rebuild
    // with configFile: false so Vite doesn't re-read the config file.
    const loaded = await loadConfigFromFile(
      { command: 'build', mode },
      undefined,
      config.path,
    );

    if (!loaded) {
      throw new Error(`Could not load Vite config from ${config.path}`);
    }

    const userConfig = loaded.config;
    userConfig.plugins = filterDomscribePlugins(userConfig.plugins);

    await viteBuild({
      ...userConfig,
      root: config.path,
      configFile: false,
      mode,
      build: {
        ...userConfig.build,
        outDir,
        emptyOutDir: true,
        chunkSizeWarningLimit: 1500,
      },
      logLevel: 'warn',
    });
  } else {
    // Normal build — load config, replace domscribe plugin for build mode
    const loaded = await loadConfigFromFile(
      { command: 'build', mode },
      undefined,
      config.path,
    );

    if (!loaded) {
      throw new Error(`Could not load Vite config from ${config.path}`);
    }

    const userConfig = loaded.config;
    if (mode !== 'production') {
      userConfig.plugins = forceDomscribePlugins(userConfig.plugins);
    }

    await viteBuild({
      ...userConfig,
      root: config.path,
      configFile: false,
      mode,
      build: {
        ...userConfig.build,
        outDir,
        emptyOutDir: true,
        chunkSizeWarningLimit: 1500,
      },
      logLevel: 'warn',
    });
  }

  const buildTime = Date.now() - startTime;
  const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');

  return {
    outputDir: outDir,
    manifestPath,
    buildTime,
  };
}

/**
 * Build a fixture using Webpack programmatic API
 */
async function buildWebpackFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { mode = 'development', disableDomscribe = false } = options;
  const startTime = Date.now();

  // Import webpack from the fixture's own node_modules (not the test runner's)
  const webpackPath = join(config.path, 'node_modules', 'webpack');
  const { default: webpack } = await import(webpackPath);

  // Load the fixture's webpack config
  const configPath = join(config.path, 'webpack.config.js');
  if (!existsSync(configPath)) {
    throw new Error(`Webpack config not found: ${configPath}`);
  }

  const resolvedMode = mode === 'production' ? 'production' : 'development';

  // Set NODE_ENV before requiring the config so that webpack.config.js
  // can correctly detect production mode (e.g., for disabling the overlay)
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = resolvedMode;
  const configExport = require(configPath);
  process.env.NODE_ENV = prevNodeEnv;

  // Webpack configs can export a function (env, argv) => config or a plain object
  const webpackConfig =
    typeof configExport === 'function'
      ? configExport({}, { mode: resolvedMode })
      : { ...configExport, mode: resolvedMode };

  // Ensure webpack resolves relative to the fixture directory, not process.cwd()
  if (!webpackConfig.context) {
    webpackConfig.context = config.path;
  }

  // Strip domscribe loader rules and plugin when disabled
  if (disableDomscribe) {
    if (webpackConfig.module?.rules) {
      webpackConfig.module.rules = webpackConfig.module.rules.filter(
        (rule: Record<string, unknown>) => {
          // Filter out rules whose use array contains the domscribe loader
          const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
          return !uses.some(
            (u: string | Record<string, string>) =>
              (typeof u === 'string' && u.includes('domscribe')) ||
              (typeof u === 'object' &&
                u?.loader &&
                u.loader.includes('domscribe')),
          );
        },
      );
    }
    if (webpackConfig.plugins) {
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (p: { constructor?: { name?: string } }) =>
          !p?.constructor?.name?.includes('Domscribe'),
      );
    }
  }

  // Use mode-specific output dirs to avoid race conditions
  const suffix = disableDomscribe ? `${resolvedMode}-baseline` : resolvedMode;
  const outDir = join(config.path, `dist-${suffix}`);
  if (webpackConfig.output) {
    webpackConfig.output.path = outDir;
  } else {
    webpackConfig.output = { path: outDir };
  }

  const compiler = webpack(webpackConfig);

  return new Promise<FixtureBuildResult>((resolvePromise, reject) => {
    compiler.run((err: Error | null, stats: unknown) => {
      // Always close the compiler to trigger the shutdown hook
      // (flushes ManifestWriter, persists ID cache) and release resources.
      compiler.close((closeErr: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        if (closeErr) {
          reject(closeErr);
          return;
        }

        const statsObj = stats as {
          hasErrors: () => boolean;
          toString: (opts: Record<string, boolean>) => string;
        };
        if (statsObj.hasErrors()) {
          reject(
            new Error(
              `Webpack build failed:\n${statsObj.toString({ errors: true })}`,
            ),
          );
          return;
        }

        const buildTime = Date.now() - startTime;
        const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');

        resolvePromise({
          outputDir: outDir,
          manifestPath,
          buildTime,
        });
      });
    });
  });
}

/**
 * Build a fixture using Next.js CLI.
 *
 * Next.js always builds in production mode (NODE_ENV=production).
 * DOMSCRIBE_FORCE_TRANSFORM=1 bypasses the production guard in withDomscribe().
 */
async function buildNextFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { mode = 'development', disableDomscribe = false } = options;
  const startTime = Date.now();

  // Clean previous build output — Next always writes to .next/
  const dotNext = join(config.path, '.next');
  if (existsSync(dotNext)) {
    rmSync(dotNext, { recursive: true, force: true });
  }

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NODE_ENV: 'production',
  };

  // Force transforms unless we're testing production stripping or domscribe is disabled
  if (mode === 'development' && !disableDomscribe) {
    env['DOMSCRIBE_FORCE_TRANSFORM'] = '1';
  }

  const nextBin = join(config.path, 'node_modules', '.bin', 'next');
  execSync(`"${nextBin}" build`, {
    cwd: config.path,
    env,
    stdio: 'pipe',
    timeout: 120_000,
  });

  const buildTime = Date.now() - startTime;
  const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');

  // Next.js client JS lives under .next/static/chunks/
  const outputDir = join(config.path, '.next');

  return {
    outputDir,
    manifestPath,
    buildTime,
  };
}

/**
 * Build a fixture using Nuxt CLI.
 *
 * Nuxt builds in production mode by default (dev: false).
 * DOMSCRIBE_FORCE_TRANSFORM=1 bypasses the dev guard in the Nuxt module.
 */
async function buildNuxtFixture(
  config: FixtureConfig,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { mode = 'development', disableDomscribe = false } = options;
  const startTime = Date.now();

  // Clean previous build output — Nuxt writes to .output/
  const dotOutput = join(config.path, '.output');
  if (existsSync(dotOutput)) {
    rmSync(dotOutput, { recursive: true, force: true });
  }

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
  };

  // Force transforms unless we're testing production stripping or domscribe is disabled
  if (mode === 'development' && !disableDomscribe) {
    env['DOMSCRIBE_FORCE_TRANSFORM'] = '1';
  }

  const nuxiBin = join(config.path, 'node_modules', '.bin', 'nuxi');
  execSync(`"${nuxiBin}" build`, {
    cwd: config.path,
    env,
    stdio: 'pipe',
    timeout: 120_000,
  });

  const buildTime = Date.now() - startTime;
  const manifestPath = join(config.path, '.domscribe', 'manifest.jsonl');

  // Nuxt client JS lives under .output/public/_nuxt/
  const outputDir = join(config.path, '.output');

  return {
    outputDir,
    manifestPath,
    buildTime,
  };
}

/**
 * Build a discovered fixture.
 *
 * Uses the fixture's absolute path and manifest bundler field to pick
 * the right build method.
 */
export async function buildFixture(
  fixture: DiscoveredFixture,
  options: BuildOptions = {},
): Promise<FixtureBuildResult> {
  const { manifest, path: fixturePath } = fixture;

  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture directory not found: ${fixturePath}`);
  }

  // Meta-frameworks (next/nuxt) don't have a bundler field —
  // they manage their own build, so use the framework name as the bundler.
  const bundler = (manifest.bundler ??
    manifest.framework) as FixtureConfig['bundler'];

  const config: FixtureConfig = {
    path: fixturePath,
    bundler,
    framework: manifest.framework as FixtureConfig['framework'],
    language: manifest.language,
    bundlerVersion: manifest.bundlerVersion ?? manifest.frameworkVersion,
    frameworkVersion: manifest.frameworkVersion,
  };

  if (config.bundler === 'vite') {
    return buildViteFixture(config, options);
  } else if (config.bundler === 'webpack') {
    return buildWebpackFixture(config, options);
  } else if (config.bundler === 'next') {
    return buildNextFixture(config, options);
  } else if (config.bundler === 'nuxt') {
    return buildNuxtFixture(config, options);
  }

  throw new Error(
    `Unsupported bundler "${manifest.bundler}" for fixture ${manifest.id}`,
  );
}
