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
import { ShutdownRequestBody, ShutdownRequestBodySchema, ShutdownResponse, ShutdownResponseSchema } from '../../schema.js';
import { RelayErrorResponse, RelayErrorResponseSchema } from '../types.js';
import { RelayRoute } from './route.interface.js';

export class ShutdownRoute implements RelayRoute {
  apiPath = API_PATHS.SHUTDOWN;
  method: HTTPMethods = 'POST';


  static register({
    app,
  }: {
    app: FastifyInstance;
  }): void {
    const route = new ShutdownRoute();
    const { apiPath: url, method, handler } = route;

    app
      .withTypeProvider<ZodTypeProvider>()
      .route<{ Body: ShutdownRequestBody; Reply: ShutdownResponse | RelayErrorResponse }>({
        url,
        method,
        handler: handler.bind(route),
        schema: {
          body: ShutdownRequestBodySchema,
          response: {
            200: ShutdownResponseSchema,
            401: RelayErrorResponseSchema,
            500: RelayErrorResponseSchema,
          },
        },
      });
  }

  async handler(
    request: FastifyRequest<{ Body: ShutdownRequestBody }>,
    reply: FastifyReply<{
      Reply: ShutdownResponse | RelayErrorResponse;
    }>,
  ) {
    try {
      const nonce = request.server.getDecorator<string>('nonce');

      if (nonce !== request.body.nonce) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          error: 'Invalid nonce',
          code: DomscribeErrorCode.DS_INVALID_INPUT,
        });
      }

      const response = reply.status(HTTP_STATUS.OK).send({ success: true });

      // Shut down on next tick after response is sent
      setImmediate(() => process.emit('SIGTERM'));

      return response;
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
