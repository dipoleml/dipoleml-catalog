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
import { StatusResponse, StatusResponseSchema } from '../../schema.js';
import type { StatusHandlerOptions } from '../handlers/status-handler.js';
import { AnnotationService } from '../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../types.js';
import { RelayRoute } from './route.interface.js';

export class StatusRoute implements RelayRoute {
  apiPath = API_PATHS.STATUS;
  method: HTTPMethods = 'GET';

  constructor(
    private readonly manifestReader: ManifestReader,
    private readonly annotationService: AnnotationService,
    private readonly options: StatusHandlerOptions,
  ) {}

  static register({
    app,
    manifestReader,
    annotationService,
    options,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
    annotationService: AnnotationService;
    options: StatusHandlerOptions;
  }): void {
    const route = new StatusRoute(manifestReader, annotationService, options);
    const { apiPath: url, method, handler } = route;

    app
      .withTypeProvider<ZodTypeProvider>()
      .route<{ Reply: StatusResponse | RelayErrorResponse }>({
        url,
        method,
        handler: handler.bind(route),
        schema: {
          response: {
            200: StatusResponseSchema,
            500: RelayErrorResponseSchema,
          },
        },
      });
  }

  async handler(
    request: FastifyRequest,
    reply: FastifyReply<{
      Reply: StatusResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const version = request.server.getDecorator<string>('relayVersion');
      const manifestStats = this.manifestReader.getStats();
      const annotationCounts = await this.annotationService.getCountByStatus();

      return reply.status(HTTP_STATUS.OK).send({
        relay: {
          version,
          uptime: Math.floor((Date.now() - this.options.startTime) / 1000),
          port: this.options.port,
        },
        manifest: manifestStats,
        annotations: annotationCounts,
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
