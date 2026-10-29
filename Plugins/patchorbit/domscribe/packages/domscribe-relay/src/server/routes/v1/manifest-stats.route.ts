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
import path from 'path';
import {
  ManifestStatsResponse,
  ManifestStatsResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class ManifestStatsRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_STATS;
  method: HTTPMethods = 'GET';
  version: ApiVersion = 'v1';

  constructor(private readonly manifestReader: ManifestReader) {}

  static register({
    app,
    manifestReader,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
  }): void {
    const route = new ManifestStatsRoute(manifestReader);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app
      .withTypeProvider<ZodTypeProvider>()
      .route<{ Reply: ManifestStatsResponse | RelayErrorResponse }>({
        url,
        method,
        handler: handler.bind(route),
        schema: {
          response: {
            200: ManifestStatsResponseSchema,
            500: RelayErrorResponseSchema,
          },
        },
      });
  }

  async handler(
    _request: FastifyRequest,
    reply: FastifyReply<{ Reply: ManifestStatsResponse | RelayErrorResponse }>,
  ) {
    try {
      return reply.status(HTTP_STATUS.OK).send(this.manifestReader.getStats());
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
