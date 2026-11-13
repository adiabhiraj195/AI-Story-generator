import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import * as dbModule from '../../src/infrastructure/aws/dynamodb.client.js';

describe('Fastify REST API Endpoints', () => {
  let app: FastifyInstance;
  const mockSend = vi.fn();

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dbModule, 'getDynamoDBClient').mockReturnValue({
      send: mockSend,
    } as unknown as ReturnType<typeof dbModule.getDynamoDBClient>);
  });

  describe('Health Endpoint (GET /health)', () => {
    it('returns service status and timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.status).toBe('ok');
      expect(json.service).toBe('personal-story-generator');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Generations API (/api/v1/generations)', () => {
    it('POST / starts generation and returns 202 with generationId', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand for GenerationJob

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/generations',
        payload: {
          configuration: {
            genre: 'psychological_thriller',
            pov: 'first_person',
            tense: 'past',
            durationMinutes: 3,
            narrationWordsPerMinute: 145,
            mood: ['dark', 'suspenseful'],
            hookStyle: 'mysterious',
            endingStyle: 'unexpected_twist',
            pacing: 'gradually_escalating',
            narrativeStyle: 'conversational',
            language: 'English',
            theme: 'A person receives calls from their future self',
          },
        },
      });

      expect(response.statusCode).toBe(202);
      const json = JSON.parse(response.body);
      expect(json.generationId).toBeDefined();
      expect(json.status).toBe('PENDING');
      expect(json.message).toContain('Generation job started');
    });

    it('POST / rejects duration below 2 minutes (e.g. 1 min)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/generations',
        payload: {
          configuration: {
            genre: 'mystery',
            durationMinutes: 1,
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST / rejects duration above 6 minutes (e.g. 7 min)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/generations',
        payload: {
          configuration: {
            genre: 'mystery',
            durationMinutes: 7,
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /:generationId returns job status', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          generationId: 'gen-test-1',
          status: 'PROCESSING',
          currentStage: 'WRITING_STORY',
          targetDurationMinutes: 3,
          revisionCount: 0,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/generations/gen-test-1',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.generationId).toBe('gen-test-1');
      expect(json.status).toBe('PROCESSING');
      expect(json.currentStage).toBe('WRITING_STORY');
    });

    it('GET / returns paginated generation history', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ generationId: 'g1' }, { generationId: 'g2' }],
        LastEvaluatedKey: { generationId: 'g2' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/generations?limit=10',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.items).toHaveLength(2);
      expect(json.nextKey).toBeDefined();
    });
  });

  describe('Stories API (/api/v1/stories)', () => {
    it('GET /:storyId returns story', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          storyId: 'story-123',
          title: 'The Echo of Silence',
          script: 'Once upon a time in a distant land...',
          wordCount: 435,
          targetDurationMinutes: 3,
          approvalStatus: 'APPROVED',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/stories/story-123',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.storyId).toBe('story-123');
      expect(json.title).toBe('The Echo of Silence');
    });

    it('GET /:storyId returns 404 for missing story', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/stories/missing-story',
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('GET / returns paginated story list', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ storyId: 's1' }, { storyId: 's2' }],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/stories',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.items).toHaveLength(2);
    });

    it('DELETE /:storyId deletes existing story', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: { storyId: 's-to-delete' } }) // findById
        .mockResolvedValueOnce({}); // delete

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/stories/s-to-delete',
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('Presets API (/api/v1/presets)', () => {
    it('POST / creates a custom preset', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/presets',
        payload: {
          name: 'My SciFi Preset',
          description: 'A custom preset for sci-fi adventures',
          configuration: {
            genre: 'science_fiction',
            durationMinutes: 5,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.name).toBe('My SciFi Preset');
      expect(json.isSystemPreset).toBe(false);
    });

    it('GET / returns list of presets', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { presetId: 'p1', name: 'Preset 1', isSystemPreset: true },
          { presetId: 'p2', name: 'Preset 2', isSystemPreset: false },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/presets',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.items).toHaveLength(2);
    });

    it('PATCH /:presetId updates custom preset but rejects system preset', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { presetId: 'system-preset-1', isSystemPreset: true },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/presets/system-preset-1',
        payload: { name: 'Attempted Change' },
      });

      expect(response.statusCode).toBe(409);
      const json = JSON.parse(response.body);
      expect(json.error.code).toBe('CONFLICT');
    });

    it('DELETE /:presetId deletes custom preset', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: { presetId: 'custom-p1', isSystemPreset: false } }) // findById
        .mockResolvedValueOnce({}); // delete

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/presets/custom-p1',
      });

      expect(response.statusCode).toBe(204);
    });
  });
});

