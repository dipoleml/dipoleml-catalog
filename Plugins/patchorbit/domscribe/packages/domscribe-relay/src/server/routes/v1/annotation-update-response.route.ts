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
import { AnnotationService } from '../../services/index.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import {
  AnnotationUpdateResponseRequestParams,
  AnnotationUpdateResponseRequestParamsSchema,
  AnnotationUpdateResponseRequestBody,
  AnnotationUpdateResponseRequestBodySchema,
  AnnotationUpdateResponseResponse,
  AnnotationUpdateResponseResponseSchema,
} from '../../../schema.js';

export class AnnotationUpdateResponseRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATION_RESPONSE;
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
    const route = new AnnotationUpdateResponseRoute(annotationService);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Params: AnnotationUpdateResponseRequestParams;
      Body: AnnotationUpdateResponseRequestBody;
      Reply: AnnotationUpdateResponseResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        params: AnnotationUpdateResponseRequestParamsSchema,
        body: AnnotationUpdateResponseRequestBodySchema,
        response: {
          200: AnnotationUpdateResponseResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{
      Params: AnnotationUpdateResponseRequestParams;
      Body: AnnotationUpdateResponseRequestBody;
    }>,
    reply: FastifyReply<{
      Reply: AnnotationUpdateResponseResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.params;
      const { message } = request.body;

      if (!message) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error: 'Message is required',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }
      const annotation = await this.annotationService.respond(id, {
        message,
      });
      return { success: true, annotation };
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
