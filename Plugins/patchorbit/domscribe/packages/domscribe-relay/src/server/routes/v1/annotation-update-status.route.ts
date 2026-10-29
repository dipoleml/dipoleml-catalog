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
  AnnotationUpdateStatusRequestBody,
  AnnotationUpdateStatusRequestBodySchema,
  AnnotationUpdateStatusRequestParams,
  AnnotationUpdateStatusRequestParamsSchema,
  AnnotationUpdateStatusResponse,
  AnnotationUpdateStatusResponseSchema,
} from '../../../schema.js';
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class AnnotationUpdateStatusRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_STATUS;
  method: HTTPMethods = 'PUT';
  version: ApiVersion = 'v1';

  constructor(private readonly annotationService: AnnotationService) {}

  static register({
    app,
    annotationService,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
  }): void {
    const route = new AnnotationUpdateStatusRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationUpdateStatusRequestParams;
      Body: AnnotationUpdateStatusRequestBody;
      Reply: AnnotationUpdateStatusResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: AnnotationUpdateStatusRequestBodySchema,
        params: AnnotationUpdateStatusRequestParamsSchema,
        response: {
          200: AnnotationUpdateStatusResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{
      Params: AnnotationUpdateStatusRequestParams;
      Body: AnnotationUpdateStatusRequestBody;
    }>,
    reply: FastifyReply<{
      Reply: AnnotationUpdateStatusResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const { status, errorDetails } = request.body;

      if (!status) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error: 'Missing required field: status',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }

      const annotation = await this.annotationService.updateStatus(id, status, {
        errorDetails,
      });
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
      return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        error: errorMessage,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      });
    }
  }
}
