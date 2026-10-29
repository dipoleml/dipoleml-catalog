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
  AnnotationListRequestQuery,
  AnnotationListRequestQuerySchema,
  AnnotationListResponse,
  AnnotationListResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationListRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATIONS;
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
    const route = new AnnotationListRoute(annotationService);
    const { apiPath, method, version, handler } = route;

    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Querystring: AnnotationListRequestQuery;
      Reply: AnnotationListResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        querystring: AnnotationListRequestQuerySchema,
        response: {
          200: AnnotationListResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Querystring: AnnotationListRequestQuery }>,
    reply: FastifyReply<{ Reply: AnnotationListResponse | RelayErrorResponse }>,
  ) {
    try {
      const { status, limit, offset } = request.query;

      const statuses = status?.split(',') as AnnotationStatus[] | undefined;
      const result = await this.annotationService.list({
        status: statuses,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return reply.status(HTTP_STATUS.OK).send(result);
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
