import { describe, it, expect } from 'vitest';
import {
  StoryConfigurationSchema,
  StoryRequestSchema,
} from '../../src/ai/schemas/story-config.schema.js';
import { BUILT_IN_PRESETS } from '../../src/ai/schemas/presets.data.js';

describe('Story Configuration and Zod Validation', () => {
  it('accepts valid default configuration', () => {
    const parsed = StoryConfigurationSchema.parse({});
    expect(parsed.durationMinutes).toBe(4);
    expect(parsed.narrationWordsPerMinute).toBe(145);
    expect(parsed.genre).toBe('drama');
    expect(parsed.pov).toBe('third_person_limited');
    expect(parsed.tense).toBe('past');
  });

  it('accepts all valid duration values from 2 to 6', () => {
    for (let duration = 2; duration <= 6; duration++) {
      const parsed = StoryConfigurationSchema.parse({ durationMinutes: duration });
      expect(parsed.durationMinutes).toBe(duration);
    }
  });

  it('rejects duration 1 (below minimum 2 minutes)', () => {
    const result = StoryConfigurationSchema.safeParse({ durationMinutes: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects duration 7 (above maximum 6 minutes)', () => {
    const result = StoryConfigurationSchema.safeParse({ durationMinutes: 7 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer durations', () => {
    const result = StoryConfigurationSchema.safeParse({ durationMinutes: 3.5 });
    expect(result.success).toBe(false);
  });

  it('validates narration speed range (120 to 180 WPM)', () => {
    expect(StoryConfigurationSchema.safeParse({ narrationWordsPerMinute: 120 }).success).toBe(true);
    expect(StoryConfigurationSchema.safeParse({ narrationWordsPerMinute: 180 }).success).toBe(true);
    expect(StoryConfigurationSchema.safeParse({ narrationWordsPerMinute: 100 }).success).toBe(false);
    expect(StoryConfigurationSchema.safeParse({ narrationWordsPerMinute: 200 }).success).toBe(false);
  });

  it('validates all built-in presets conform to schema', () => {
    expect(BUILT_IN_PRESETS).toHaveLength(6);
    for (const preset of BUILT_IN_PRESETS) {
      expect(preset.presetId).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.isSystemPreset).toBe(true);
      const parsed = StoryConfigurationSchema.safeParse(preset.configuration);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.durationMinutes).toBeGreaterThanOrEqual(2);
        expect(parsed.data.durationMinutes).toBeLessThanOrEqual(6);
      }
    }
  });

  it('validates StoryRequestSchema wrapping configuration', () => {
    const request = {
      configuration: {
        genre: 'mystery',
        durationMinutes: 3,
        narrationWordsPerMinute: 150,
      },
    };
    const parsed = StoryRequestSchema.parse(request);
    expect(parsed.configuration.genre).toBe('mystery');
    expect(parsed.configuration.durationMinutes).toBe(3);
    expect(parsed.configuration.narrationWordsPerMinute).toBe(150);
  });
});

