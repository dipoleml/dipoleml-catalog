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
  ManifestResolveRequestQuery,
  ManifestResolveRequestQuerySchema,
  ManifestResolveResponse,
  ManifestResolveResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class ManifestResolveRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_RESOLVE;
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
    const route = new ManifestResolveRoute(manifestReader);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Querystring: ManifestResolveRequestQuery;
      Reply: ManifestResolveResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        querystring: ManifestResolveRequestQuerySchema,
        response: {
          200: ManifestResolveResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Querystring: ManifestResolveRequestQuery }>,
    reply: FastifyReply<{
      Reply: ManifestResolveResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { id } = request.query;

      const result = this.manifestReader.resolve(id);

      if (!result.success) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          error: 'Entry not found',
          code: DomscribeErrorCode.DS_ELEMENT_NOT_FOUND,
        });
      }

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
