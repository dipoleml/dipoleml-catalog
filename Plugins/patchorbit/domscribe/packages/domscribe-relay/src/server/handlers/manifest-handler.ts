/**
 * Manifest HTTP handlers for Domscribe Relay
 */
import type { FastifyInstance } from 'fastify';
import type { ManifestReader } from '@domscribe/manifest';
import {
  ManifestResolveRoute,
  ManifestBatchResolveRoute,
  ManifestQueryRoute,
  ManifestStatsRoute,
} from '../routes/index.js';
import { registerRoute } from '../routes/route.interface.js';

/**
 * Register manifest routes on a Fastify instance
 */
export function registerManifestHandlers(
  app: FastifyInstance,
  manifestReader: ManifestReader,
): void {
  /**
   * GET /api/v1/manifest/resolve?id=<dataDs>
   * Performance-critical endpoint for element ID resolution (p99 ≤10ms)
   */
  registerRoute(ManifestResolveRoute, {
    app,
    manifestReader,
  });

  /**
   * POST /api/v1/manifest/resolve/batch
   * Resolve multiple element IDs in a single request
   */
  registerRoute(ManifestBatchResolveRoute, {
    app,
    manifestReader,
  });

  /**
   * GET /api/v1/manifest/stats
   * Get manifest statistics for debug panel
   */
  registerRoute(ManifestStatsRoute, {
    app,
    manifestReader,
  });

  /**
   * GET /api/v1/manifest/query?file=X&componentName=Y&tagName=Z&limit=N
   * Query manifest entries by various criteria
   */
  registerRoute(ManifestQueryRoute, {
    app,
    manifestReader,
  });
}
