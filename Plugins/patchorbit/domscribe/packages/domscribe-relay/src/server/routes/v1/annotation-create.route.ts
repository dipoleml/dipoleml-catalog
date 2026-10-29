import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
} from '@domscribe/core';
import { AnnotationService } from '../../services/annotation-service.js';
import { ManifestReader } from '@domscribe/manifest';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import path from 'path';
import { ApiVersion, RelayRoute } from '../route.interface.js';
import {
  AnnotationCreateRequestBody,
  AnnotationCreateResponse,
  AnnotationCreateRequestBodySchema,
  AnnotationCreateResponseSchema,
} from '../../../schema.js';

export class AnnotationCreateRoute implements RelayRoute {
  apiPath = API_PATHS.ANNOTATIONS;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(
    private readonly annotationService: AnnotationService,
    private readonly manifestReader: ManifestReader,
  ) {}

  static register({
    app,
    annotationService,
    manifestReader,
  }: {
    app: FastifyInstance;
    annotationService: AnnotationService;
    manifestReader: ManifestReader;
  }): void {
    const route = new AnnotationCreateRoute(annotationService, manifestReader);
    const { apiPath, method, version, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: AnnotationCreateRequestBody;
      Reply: AnnotationCreateResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: AnnotationCreateRequestBodySchema,
        response: {
          201: AnnotationCreateResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: AnnotationCreateRequestBody }>,
    reply: FastifyReply<{
      Reply: AnnotationCreateResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { mode, interaction, context } = request.body;

      // Resolve manifest entry if dataDs is provided
      let manifestSnapshot;
      const dataDs = interaction.selectedElement?.dataDs;
      if (dataDs) {
        const result = this.manifestReader.resolve(dataDs);
        if (result.success && result.entry) {
          manifestSnapshot = [result.entry];
        }
      }

      const annotation = await this.annotationService.create(
        { mode, interaction, context },
        manifestSnapshot,
      );

      return reply.status(HTTP_STATUS.CREATED).send(annotation);
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
