import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoryRepository } from '../../src/repositories/story.repository.js';
import { StoryPresetRepository } from '../../src/repositories/preset.repository.js';
import { GenerationRepository } from '../../src/repositories/generation.repository.js';
import * as dbModule from '../../src/infrastructure/aws/dynamodb.client.js';

describe('DynamoDB Repositories (Mocked Commands)', () => {
  const mockSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dbModule, 'getDynamoDBClient').mockReturnValue({
      send: mockSend,
    } as unknown as ReturnType<typeof dbModule.getDynamoDBClient>);
  });

  describe('StoryRepository', () => {
    it('creates a story record with generated ID and timestamps', async () => {
      mockSend.mockResolvedValueOnce({});
      const repo = new StoryRepository();

      const story = await repo.create({
        generationId: 'gen-123',
        title: 'The Whispering Clock',
        script: 'Tick tock went the old grandfather clock...',
        configuration: {
          genre: 'mystery',
          pov: 'first_person',
          tense: 'past',
          durationMinutes: 3,
          narrationWordsPerMinute: 145,
          mood: ['mysterious'],
          hookStyle: 'mysterious',
          endingStyle: 'unexpected_twist',
          pacing: 'balanced',
          complexity: 'moderate',
          dialogueIntensity: 'balanced',
          narrativeStyle: 'conversational',
          language: 'English',
        },
        genre: 'mystery',
        pov: 'first_person',
        tense: 'past',
        mood: ['mysterious'],
        language: 'English',
        targetDurationMinutes: 3,
        narrationWordsPerMinute: 145,
        estimatedDurationSeconds: 180,
        wordCount: 435,
        approvalStatus: 'APPROVED',
        promptVersion: '1.0.0',
      });

      expect(story.storyId).toBeDefined();
      expect(story.GSI1PK).toBe('STORY');
      expect(story.createdAt).toBeDefined();
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('finds a story by ID or throws NotFoundError', async () => {
      const repo = new StoryRepository();
      mockSend.mockResolvedValueOnce({
        Item: { storyId: 'story-1', title: 'Found Story' },
      });

      const found = await repo.findById('story-1');
      expect(found.storyId).toBe('story-1');
      expect(found.title).toBe('Found Story');

      mockSend.mockResolvedValueOnce({ Item: undefined });
      await expect(repo.findById('missing-id')).rejects.toThrow('Story not found: missing-id');
    });

    it('queries recent stories using GSI1', async () => {
      const repo = new StoryRepository();
      mockSend.mockResolvedValueOnce({
        Items: [{ storyId: 's1' }, { storyId: 's2' }],
        LastEvaluatedKey: { storyId: 's2' },
      });

      const result = await repo.listRecent({ limit: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.lastKey).toEqual({ storyId: 's2' });
    });
  });

  describe('StoryPresetRepository', () => {
    it('creates a custom preset', async () => {
      mockSend.mockResolvedValueOnce({});
      const repo = new StoryPresetRepository();

      const preset = await repo.create({
        name: 'My Custom Preset',
        description: 'Test description',
        configuration: { genre: 'horror' },
        isSystemPreset: false,
      });

      expect(preset.presetId).toBeDefined();
      expect(preset.isSystemPreset).toBe(false);
      expect(preset.GSI1PK).toBe('PRESET');
    });

    it('prevents modifying or deleting system presets', async () => {
      const repo = new StoryPresetRepository();
      mockSend.mockResolvedValue({
        Item: { presetId: 'sys-1', isSystemPreset: true },
      });

      await expect(repo.update('sys-1', { name: 'New Name' })).rejects.toThrow(
        'Cannot update a system preset',
      );
      await expect(repo.delete('sys-1')).rejects.toThrow(
        'Cannot delete a system preset',
      );
    });
  });

  describe('GenerationRepository', () => {
    it('creates a generation job with status PENDING', async () => {
      mockSend.mockResolvedValueOnce({});
      const repo = new GenerationRepository();

      const job = await repo.create({
        status: 'PENDING',
        currentStage: 'VALIDATING_REQUEST',
        configuration: {
          genre: 'mystery',
          pov: 'first_person',
          tense: 'past',
          durationMinutes: 4,
          narrationWordsPerMinute: 145,
          mood: ['mysterious'],
          hookStyle: 'mysterious',
          endingStyle: 'unexpected_twist',
          pacing: 'balanced',
          complexity: 'moderate',
          dialogueIntensity: 'balanced',
          narrativeStyle: 'conversational',
          language: 'English',
        },
        targetDurationMinutes: 4,
        revisionCount: 0,
      });

      expect(job.generationId).toBeDefined();
      expect(job.status).toBe('PENDING');
      expect(job.GSI1PK).toBe('GEN');
    });

    it('updates status and adds completedAt on COMPLETED or FAILED', async () => {
      mockSend.mockResolvedValueOnce({});
      const repo = new GenerationRepository();

      await repo.updateStatus('gen-1', 'COMPLETED', 'COMPLETED', {
        progressMessage: 'Done',
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const callArg = mockSend.mock.calls[0]?.[0];
      expect(callArg.input.ExpressionAttributeValues[':status']).toBe('COMPLETED');
      expect(callArg.input.ExpressionAttributeValues[':completedAt']).toBeDefined();
    });

    it('finds pending jobs for startup recovery', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ generationId: 'g1', status: 'PENDING' }],
      });
      const repo = new GenerationRepository();

      const pending = await repo.findPendingJobs();
      expect(pending).toHaveLength(1);
    });
  });
});

