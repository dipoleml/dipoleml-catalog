/**
 * Route interface and registration helpers for relay HTTP routes
 * @module @domscribe/relay/server/routes/route-interface
 */
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';

/** API version identifier. Expand this union as new versions are introduced. */
export type ApiVersion = 'v1';

/**
 * Instance-level contract for all relay route handlers.
 *
 * Every route class exposes these members, which get destructured
 * during registration:
 *
 * ```ts
 * const { apiPath, version, method, handler } = new SomeRoute(deps);
 * const url = path.posix.join(API_PATHS.BASE.replace(':version', version), apiPath);
 * app.route({ url, method, handler, schema });
 * ```
 */
export interface RelayRoute {
  /**
   * API version this route belongs to.
   * Undefined for unversioned routes (e.g. `/health`, `/status`).
   *
   * When a route introduces a breaking change, bump its version
   * independently — other routes remain on their current version.
   */
  readonly version?: ApiVersion;
  /** API path without the version prefix and base path (e.g. `/annotations/:id`) */
  readonly apiPath: string;
  /** HTTP method this route responds to */
  readonly method: HTTPMethods;
  /** Fastify-compatible request handler */
  handler(request: FastifyRequest, reply: FastifyReply): Promise<unknown>;
}

/**
 * Base registration context shared by all routes.
 * Each route's `register` method accepts this (extended with route-specific deps).
 */
export interface RouteRegistrationContext {
  app: FastifyInstance;
}

/**
 * Static-side contract for route classes.
 *
 * TypeScript interfaces can't enforce static methods, so this type
 * describes the class itself (not the instance). Use it to type-check
 * route classes at registration boundaries:
 */
export interface RelayRouteClass<
  TContext extends RouteRegistrationContext = RouteRegistrationContext,
> {
  register(context: TContext): void;
}

export function registerRoute<TContext extends RouteRegistrationContext>(
  Route: RelayRouteClass<TContext>,
  context: TContext,
): void {
  Route.register(context);
}
