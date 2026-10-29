import {
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
import { z } from 'zod';
import {
  AnnotationDeleteRequestParams,
  AnnotationDeleteRequestParamsSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationDeleteRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_BY_ID;
  method: HTTPMethods = 'DELETE';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationDeleteRoute(annotationService);
    const { apiPath, method, version, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationDeleteRequestParams;
      Reply: void | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationDeleteRequestParamsSchema,
        response: {
          204: z.ZodVoid,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Params: AnnotationDeleteRequestParams }>,
    reply: FastifyReply<{
      Reply: void | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;

      const deleted = await this.annotationService.delete(id);

      if (!deleted) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: 'Annotation not found',
          code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }

      return reply.status(HTTP_STATUS.NO_CONTENT).send();
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
