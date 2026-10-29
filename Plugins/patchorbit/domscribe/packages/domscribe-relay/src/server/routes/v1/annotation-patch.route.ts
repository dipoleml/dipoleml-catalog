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
import {
  AnnotationPatchRequestBody,
  AnnotationPatchRequestBodySchema,
  AnnotationPatchRequestParams,
  AnnotationPatchRequestParamsSchema,
  AnnotationPatchResponse,
  AnnotationPatchResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationPatchRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_BY_ID;
  method: HTTPMethods = 'PATCH';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationPatchRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationPatchRequestParams;
      Body: AnnotationPatchRequestBody;
      Reply: AnnotationPatchResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: AnnotationPatchRequestBodySchema,
        params: AnnotationPatchRequestParamsSchema,
        response: {
          200: AnnotationPatchResponseSchema,
          404: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{
      Params: AnnotationPatchRequestParams;
      Body: AnnotationPatchRequestBody;
    }>,
    reply: FastifyReply<{
      Reply: AnnotationPatchResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const { context } = request.body;

      const annotation = await this.annotationService.patch(id, { context });
      return reply.status(HTTP_STATUS.OK).send({ annotation });
    } catch (error: unknown) {
      if (error instanceof DomscribeError) {
        return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          ...error.toProblemDetails(),
          error: error.message,
        });
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: errorMessage,
          code: DomscribeErrorCode.DS_ANNOTATION_NOTFOUND,
        });
      }

      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }
}
