import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
  ManifestEntryId,
} from '@domscribe/core';
import { ManifestReader, ManifestResolveResult } from '@domscribe/manifest';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HTTPMethods,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import path from 'path';
import {
  ManifestBatchResolveRequestBody,
  ManifestBatchResolveRequestBodySchema,
  ManifestBatchResolveResponse,
  ManifestBatchResolveResponseSchema,
} from '../../../schema.js';
import {
  RelayErrorResponseSchema,
  type RelayErrorResponse,
} from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class ManifestBatchResolveRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_RESOLVE_BATCH;
  method: HTTPMethods = 'POST';
  version: ApiVersion = 'v1';

  constructor(private readonly manifestReader: ManifestReader) {}

  static register({
    app,
    manifestReader,
  }: {
    app: FastifyInstance;
    manifestReader: ManifestReader;
  }): void {
    const route = new ManifestBatchResolveRoute(manifestReader);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Body: ManifestBatchResolveRequestBody;
      Reply: ManifestBatchResolveResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        body: ManifestBatchResolveRequestBodySchema,
        response: {
          200: ManifestBatchResolveResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Body: ManifestBatchResolveRequestBody }>,
    reply: FastifyReply<{
      Reply: ManifestBatchResolveResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const { entryIds } = request.body;

      if (!entryIds || !Array.isArray(entryIds)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error: 'Missing required field: entryIds (array)',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }

      if (entryIds.length > 100) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error: 'Too many entry IDs. Maximum is 100.',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }

      const startTime = performance.now();
      const results: Record<ManifestEntryId, ManifestResolveResult> = {};

      for (const id of entryIds) {
        results[id] = this.manifestReader.resolve(id);
      }

      const resolveTimeMs =
        Math.round((performance.now() - startTime) * 100) / 100;

      return reply.status(HTTP_STATUS.OK).send({
        results,
        resolveTimeMs,
        count: entryIds.length,
      });
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
