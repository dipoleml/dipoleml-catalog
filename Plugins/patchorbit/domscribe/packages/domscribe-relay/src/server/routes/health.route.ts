import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import { ManifestReader } from '@domscribe/manifest';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { HealthResponse, HealthResponseSchema } from '../../schema.js';
import { AnnotationService } from '../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../types.js';
import { RelayRoute } from './route.interface.js';

export class HealthRoute implements RelayRoute {
  apiPath = API_PATHS.HEALTH;
  method: HTTPMethods = 'GET';

  constructor(
    private readonly manifestReader: ManifestReader,
    private readonly annotationService: AnnotationService,
  ) {}

  static register({
    app,
    manifestReader,
    annotationService,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
    annotationService: AnnotationService;
  }): void {
    const route = new HealthRoute(manifestReader, annotationService);
    const { apiPath: url, method, handler } = route;

    app
      .withTypeProvider<ZodTypeProvider>()
      .route<{ Reply: HealthResponse | RelayErrorResponse }>({
        url,
        method,
        handler: handler.bind(route),
        schema: {
          response: {
            200: HealthResponseSchema,
            500: RelayErrorResponseSchema,
          },
        },
      });
  }

  async handler(
    request: FastifyRequest,
    reply: FastifyReply<{
      Reply: HealthResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const version = request.server.getDecorator<string>('relayVersion');
      const nonce = request.server.getDecorator<string>('nonce');
      const workspaceRoot =
        request.server.getDecorator<string>('workspaceRoot');

      return reply.status(HTTP_STATUS.OK).send({
        status: 'healthy',
        pid: process.pid,
        nonce,
        version,
        workspaceRoot,
        timestamp: new Date().toISOString(),
        services: {
          annotations: {
            counts: await this.annotationService.getCountByStatus(),
          },
          manifest: this.manifestReader.getStats(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof DomscribeError) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          ...error.toProblemDetails(),
          error: error.message,
        });
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }
}
