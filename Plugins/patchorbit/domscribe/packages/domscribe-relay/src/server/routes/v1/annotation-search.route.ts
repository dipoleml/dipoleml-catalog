import {
  AnnotationStatus,
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  AnnotationSearchRequestQuery,
  AnnotationSearchRequestQuerySchema,
  AnnotationSearchResponse,
  AnnotationSearchResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationSearchRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_SEARCH;
  method: HTTPMethods = 'GET';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationSearchRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Querystring: AnnotationSearchRequestQuery;
      Reply: AnnotationSearchResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        querystring: AnnotationSearchRequestQuerySchema,
        response: {
          200: AnnotationSearchResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Querystring: AnnotationSearchRequestQuery }>,
    reply: FastifyReply<{
      Reply: AnnotationSearchResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { entryId, file, query, status, limit } = request.query;

      const statuses = status?.split(',') as AnnotationStatus[] | undefined;
      const result = await this.annotationService.search({
        entryId,
        file,
        query,
        status: statuses,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return result;
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
