import { GenerationService } from '../../services/generation.service.js';
import { buildErrorResponse } from '../errors.js';
const service = new GenerationService();
export async function generationRoutes(app) {
    /**
     * POST /api/v1/generations
     * Start a generation job. Returns 202 Accepted.
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['configuration'],
                properties: {
                    configuration: {
                        type: 'object',
                        description: 'Story generation configuration',
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const body = request.body;
            const job = await service.startGeneration(body.configuration);
            return reply.status(202).send({
                generationId: job.generationId,
                status: job.status,
                createdAt: job.createdAt,
                message: 'Generation job started. Poll GET /api/v1/generations/:generationId for status.',
            });
        }
        catch (err) {
            return buildErrorResponse(err, reply);
        }
    });
    /**
     * GET /api/v1/generations/:generationId
     * Returns generation job status.
     */
    app.get('/:generationId', {
        schema: {
            params: {
                type: 'object',
                required: ['generationId'],
                properties: { generationId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        try {
            const { generationId } = request.params;
            const job = await service.getJob(generationId);
            return reply.send(job);
        }
        catch (err) {
            return buildErrorResponse(err, reply);
        }
    });
    /**
     * GET /api/v1/generations
     * Returns generation history (paginated).
     */
    app.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    lastKey: { type: 'string', description: 'Base64-encoded pagination cursor' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const query = request.query;
            const lastKey = query.lastKey
                ? JSON.parse(Buffer.from(query.lastKey, 'base64').toString())
                : undefined;
            const result = await service.listJobs({ limit: query.limit, lastKey });
            return reply.send({
                items: result.items,
                nextKey: result.lastKey
                    ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
                    : null,
            });
        }
        catch (err) {
            return buildErrorResponse(err, reply);
        }
    });
}
//# sourceMappingURL=generations.js.map