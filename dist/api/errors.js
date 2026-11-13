import { isAppError } from '../utils/errors.js';
export function buildErrorResponse(err, reply) {
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
    const fastifyErr = err;
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
//# sourceMappingURL=errors.js.map