import type { FastifyInstance } from 'fastify';
import type { ManifestReader } from '@domscribe/manifest';
import type { AnnotationService } from '../services/index.js';
import { HealthRoute } from '../routes/health.route.js';
import { registerRoute } from '../routes/route.interface.js';

/**
 * Register status route on a Fastify instance
 */
export function registerHealthHandler(
  app: FastifyInstance,
  manifestReader: ManifestReader,
  annotationService: AnnotationService,
): void {
  /**
   * GET /health
   * Get complete system status
   */
  registerRoute(HealthRoute, {
    app,
    manifestReader,
    annotationService,
  });
}
