/**
 * Lazy loader for the standalone webpack plugin (used by tests)
 * @module @domscribe/next/webpack-plugin-loader
 */
import { createRequire } from 'node:module';

type WebpackPluginConstructor = new (opts: Record<string, unknown>) => unknown;

// ESM-safe require — the bare `require` global does not exist in ESM contexts
// (e.g. Next.js 15+ loads next.config.ts as ESM).
const esmRequire = createRequire(import.meta.url);

/**
 * Lazily loads DomscribeWebpackPlugin from @domscribe/transform.
 * Separated into its own module so tests can mock it via vi.mock().
 * Returns null if the module can't be loaded.
 */
export function loadWebpackPlugin(): WebpackPluginConstructor | null {
  try {
    const mod = esmRequire('@domscribe/transform/plugins/webpack') as {
      DomscribeWebpackPlugin: WebpackPluginConstructor;
    };
    return mod.DomscribeWebpackPlugin;
  } catch {
    return null;
  }
}
