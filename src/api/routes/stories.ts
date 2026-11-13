import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StoryService } from '../../services/story.service.js';
import { buildErrorResponse } from '../errors.js';

const service = new StoryService();

export async function storyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/stories/:storyId
   * Returns the complete story.
   */
  app.get(
    '/:storyId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['storyId'],
          properties: { storyId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { storyId } = request.params as { storyId: string };
        const story = await service.findById(storyId);
        return reply.send(story);
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );

  /**
   * GET /api/v1/stories
   * Returns paginated story history.
   */
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
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
        const result = await service.listRecent({ limit: query.limit, lastKey });
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
   * DELETE /api/v1/stories/:storyId
   * Deletes a story.
   */
  app.delete(
    '/:storyId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['storyId'],
          properties: { storyId: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { storyId } = request.params as { storyId: string };
        await service.delete(storyId);
        return reply.status(204).send();
      } catch (err) {
        return buildErrorResponse(err, reply);
      }
    },
  );
}
