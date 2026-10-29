import type { FastifyInstance } from 'fastify';
import { ShutdownRoute } from '../routes/shutdown.route.js';
import { registerRoute } from '../routes/route.interface.js';

/**
 * Register shutdown route on a Fastify instance
 */
export function registerShutdownHandler(
  app: FastifyInstance,
): void {
  /**
   * POST /shutdown
   * Shutdown the relay
   */
  registerRoute(ShutdownRoute, {
    app,
  });
}
