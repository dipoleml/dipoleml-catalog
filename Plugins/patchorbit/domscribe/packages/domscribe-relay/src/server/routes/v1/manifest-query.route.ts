import {
  API_PATHS,
  DomscribeError,
  DomscribeErrorCode,
  HTTP_STATUS,
  ManifestEntry,
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
  ManifestQueryRequestQuery,
  ManifestQueryRequestQuerySchema,
  ManifestQueryResponse,
  ManifestQueryResponseSchema,
} from '../../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../../types.js';
import { ApiVersion, RelayRoute } from '../route.interface.js';

export class ManifestQueryRoute implements RelayRoute {
  apiPath = API_PATHS.MANIFEST_QUERY;
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
    const route = new ManifestQueryRoute(manifestReader);
    const { apiPath, version, method, handler } = route;
    const url = path.posix.join(
      API_PATHS.BASE.replace(':version', version),
      apiPath,
    );

    app.withTypeProvider<ZodTypeProvider>().route<{
      Querystring: ManifestQueryRequestQuery;
      Reply: ManifestQueryResponse | RelayErrorResponse;
    }>({
      url,
      method,
      handler: handler.bind(route),
      schema: {
        querystring: ManifestQueryRequestQuerySchema,
        response: {
          200: ManifestQueryResponseSchema,
          400: RelayErrorResponseSchema,
          500: RelayErrorResponseSchema,
        },
      },
    });
  }

  async handler(
    request: FastifyRequest<{ Querystring: ManifestQueryRequestQuery }>,
    reply: FastifyReply<{ Reply: ManifestQueryResponse | RelayErrorResponse }>,
  ) {
    try {
      const { file, componentName, tagName, limit } = request.query;
      const maxLimit = Math.min(parseInt(limit || '100', 10), 500);

      // Must provide at least one filter
      if (!file && !componentName && !tagName) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          error:
            'At least one filter is required: file, componentName, or tagName',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }

      let entries: ManifestEntry[] = [];

      // Start with file filter if provided
      if (file) {
        entries = this.manifestReader.getEntriesByFile(file);
      } else if (componentName) {
        entries = this.manifestReader.getEntriesByComponent(componentName);
      }

      // Filter by tagName if provided (additional filter)
      if (tagName) {
        if (entries.length === 0 && !file && !componentName) {
          // If only tagName filter, need to get all entries and filter
          // This is less efficient, so we discourage using tagName alone
          const stats = this.manifestReader.getStats();
          return reply.status(HTTP_STATUS.BAD_REQUEST).send({
            error: 'tagName filter requires file or componentName filter',
            code: DomscribeErrorCode.DS_INVALID_INPUT,
            hint: `The manifest has ${stats.fileCount} files. Provide a file or componentName filter to narrow results.`,
          });
        }
        entries = entries.filter((e) => e.tagName === tagName);
      }

      // Apply limit
      const total = entries.length;
      if (entries.length > maxLimit) {
        entries = entries.slice(0, maxLimit);
      }

      return reply.status(HTTP_STATUS.OK).send({
        entries,
        total,
        hasMore: total > maxLimit,
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
