import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { buildErrorResponse } from './api/errors.js';
import { healthRoutes } from './api/routes/health.js';
import { generationRoutes } from './api/routes/generations.js';
import { storyRoutes } from './api/routes/stories.js';
import { presetRoutes } from './api/routes/presets.js';
export async function buildApp() {
    const app = Fastify({
        logger: env.NODE_ENV !== 'test' ? logger : false,
        disableRequestLogging: env.NODE_ENV === 'test',
    });
    // ── Plugins ───────────────────────────────────────────────────────────────
    await app.register(helmet, {
        contentSecurityPolicy: false,
    });
    await app.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: (_request, context) => ({
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded. Try again in ${context.after}`,
            },
        }),
    });
    // ── Global error handler ──────────────────────────────────────────────────
    app.setErrorHandler((err, _request, reply) => {
        buildErrorResponse(err, reply);
    });
    // ── Routes ────────────────────────────────────────────────────────────────
    await app.register(healthRoutes);
    await app.register(generationRoutes, { prefix: '/api/v1/generations' });
    await app.register(storyRoutes, { prefix: '/api/v1/stories' });
    await app.register(presetRoutes, { prefix: '/api/v1/presets' });
    // ── 404 handler ───────────────────────────────────────────────────────────
    app.setNotFoundHandler((_request, reply) => {
        void reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Route not found' },
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map