import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PresetService } from '../../services/preset.service.js';
import { buildErrorResponse } from '../errors.js';

const service = new PresetService();

export async function presetRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/presets
   * Creates a custom preset.
   */
  app.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'description', 'configuration'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            configuration: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          name: string;
          description: string;
          configuration: Record<string, unknown>;
        };
        const preset = await service.create(body.name, body.description, body.configuration as never);
        return reply.status(201).send(preset);
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );

  /**
   * GET /api/v1/presets
   * Lists all presets (system + custom).
   */
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            lastKey: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as { limit?: number; lastKey?: string };
        const lastKey = query.lastKey
          ? (JSON.parse(Buffer.from(query.lastKey, 'base64').toString()) as Record<string, unknown>)
          : undefined;
        const result = await service.list({ limit: query.limit, lastKey });
        return reply.send({
          items: result.items,
          nextKey: result.lastKey
            ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
            : null,
        });
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );

  /**
   * GET /api/v1/presets/:presetId
   * Retrieves a single preset.
   */
  app.get(
    '/:presetId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['presetId'],
          properties: { presetId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { presetId } = request.params as { presetId: string };
        const preset = await service.findById(presetId);
        return reply.send(preset);
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );

  /**
   * PATCH /api/v1/presets/:presetId
   * Updates a custom preset (system presets cannot be modified).
   */
  app.patch(
    '/:presetId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['presetId'],
          properties: { presetId: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            configuration: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { presetId } = request.params as { presetId: string };
        const updates = request.body as import('../../domain/preset.types.js').UpdatePresetInput;
        const preset = await service.update(presetId, updates);
        return reply.send(preset);
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );

  /**
   * DELETE /api/v1/presets/:presetId
   * Deletes a custom preset (system presets cannot be deleted).
   */
  app.delete(
    '/:presetId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['presetId'],
          properties: { presetId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { presetId } = request.params as { presetId: string };
        await service.delete(presetId);
        return reply.status(204).send();
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );
}
