import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import { AnnotationService } from '../../services/index.js';
import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import path from 'path';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import {
  AnnotationGetRequestParams,
  AnnotationGetRequestParamsSchema,
  AnnotationGetResponse,
  AnnotationGetResponseSchema,
} from '../../../schema.js';

export class AnnotationGetRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_BY_ID;
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
    const route = new AnnotationGetRoute(annotationService);
    const { apiPath, method, version, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationGetRequestParams;
      Reply: AnnotationGetResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationGetRequestParamsSchema,
        response: {
          200: AnnotationGetResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Params: AnnotationGetRequestParams }>,
    reply: FastifyReply<{ Reply: AnnotationGetResponse | RelayErrorResponse }>,
  ) {
    try {
      const { id } = request.params;
      const annotation = await this.annotationService.get(id);

      if (!annotation) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: 'Annotation not found',
          code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }

      return reply.status(HTTP_STATUS.OK).send(annotation);
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
