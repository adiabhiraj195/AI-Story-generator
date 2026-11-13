import { isAppError } from '../utils/errors.js';
import type { FastifyError, FastifyReply } from 'fastify';

export function buildErrorResponse(
  err: unknown,
  reply: FastifyReply,
): void {
  if (isAppError(err)) {
    void reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        ...(process.env['NODE_ENV'] !== 'production' && err.statusCode >= 500
          ? { stack: err.stack }
          : {}),
      },
    });
    return;
  }

  // Fastify schema validation error
  const fastifyErr = err as FastifyError;
  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    void reply.status(fastifyErr.statusCode).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: fastifyErr.message,
      },
    });
    return;
  }

  void reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
