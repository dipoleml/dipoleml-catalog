/**
 * Status HTTP handler for Domscribe Relay
 *
 * Aggregates system status from manifest and annotations.
 */
import type { FastifyInstance } from 'fastify';
import type { ManifestReader } from '@domscribe/manifest';
import type { AnnotationService } from '../services/index.js';
import { StatusRoute } from '../routes/status.route.js';
import { registerRoute } from '../routes/route.interface.js';

/**
 * Options for creating the status handler
 */
export interface StatusHandlerOptions {
  /** Server port number */
  port: number;
  /** Server start time (used to calculate uptime) */
  startTime: number;
}

/**
 * Register status route on a Fastify instance
 */
export function registerStatusHandler(
  app: FastifyInstance,
  manifestReader: ManifestReader,
  annotationService: AnnotationService,
  options: StatusHandlerOptions,
): void {
  /**
   * GET /status
   * Get complete system status
   */
  registerRoute(StatusRoute, {
    app,
    manifestReader,
    annotationService,
    options,
  });
}
