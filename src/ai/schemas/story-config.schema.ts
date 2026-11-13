import { z } from 'zod';
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_NARRATION_WPM,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_WPM,
  MAX_WPM,
} from '../../utils/word-count.js';

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const GenreSchema = z.enum([
  'mystery',
  'psychological_thriller',
  'horror',
  'romance',
  'fantasy',
  'science_fiction',
  'drama',
  'adventure',
  'crime',
  'comedy',
  'inspirational',
  'historical_fiction',
  'custom',
]);
export type Genre = z.infer<typeof GenreSchema>;

export const POVSchema = z.enum([
  'first_person',
  'third_person_limited',
  'third_person_omniscient',
  'second_person',
]);
export type POV = z.infer<typeof POVSchema>;

export const TenseSchema = z.enum(['past', 'present', 'experimental']);
export type Tense = z.infer<typeof TenseSchema>;

export const MoodSchema = z.enum([
  'dark',
  'mysterious',
  'romantic',
  'emotional',
  'sad',
  'suspenseful',
  'hopeful',
  'peaceful',
  'disturbing',
  'funny',
  'inspirational',
  'nostalgic',
  'tense',
  'eerie',
]);
export type Mood = z.infer<typeof MoodSchema>;

export const EmotionalJourneySchema = z.enum([
  'fear_to_relief',
  'sadness_to_hope',
  'curiosity_to_shock',
  'love_to_sacrifice',
  'confusion_to_understanding',
  'happiness_to_tragedy',
  'anger_to_redemption',
  'loneliness_to_belonging',
  'suspense_to_satisfaction',
]);
export type EmotionalJourney = z.infer<typeof EmotionalJourneySchema>;

export const HookStyleSchema = z.enum([
  'mysterious',
  'shocking',
  'emotional',
  'question_based',
  'impossible_situation',
  'unexpected_consequence',
  'dangerous_situation',
  'intriguing_confession',
  'dialogue_based',
  'climax_first',
]);
export type HookStyle = z.infer<typeof HookStyleSchema>;

export const EndingStyleSchema = z.enum([
  'happy',
  'sad',
  'bittersweet',
  'unexpected_twist',
  'revelation',
  'emotional_closure',
  'inspirational',
  'thought_provoking',
  'dark',
  'open_ended_but_satisfying',
]);
export type EndingStyle = z.infer<typeof EndingStyleSchema>;

export const PacingSchema = z.enum([
  'fast',
  'balanced',
  'slow_burn',
  'gradually_escalating',
]);
export type Pacing = z.infer<typeof PacingSchema>;

export const ComplexitySchema = z.enum(['simple', 'moderate', 'complex', 'nonlinear']);
export type Complexity = z.infer<typeof ComplexitySchema>;

export const DialogueIntensitySchema = z.enum([
  'narration_heavy',
  'balanced',
  'dialogue_heavy',
]);
export type DialogueIntensity = z.infer<typeof DialogueIntensitySchema>;

export const NarrativeStyleSchema = z.enum([
  'cinematic',
  'conversational',
  'documentary',
  'personal_confession',
  'literary',
  'simple_direct',
]);
export type NarrativeStyle = z.infer<typeof NarrativeStyleSchema>;

// ---------------------------------------------------------------------------
// Content preferences
// ---------------------------------------------------------------------------

export const ContentPreferencesSchema = z.object({
  avoidViolence: z.boolean().optional(),
  avoidProfanity: z.boolean().optional(),
  avoidSexualContent: z.boolean().optional(),
  additionalRestrictions: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Main configuration schema
// ---------------------------------------------------------------------------

export const StoryConfigurationSchema = z.object({
  genre: GenreSchema.default('drama'),
  pov: POVSchema.default('third_person_limited'),
  tense: TenseSchema.default('past'),

  durationMinutes: z
    .number()
    .int()
    .min(MIN_DURATION_MINUTES, `Duration must be at least ${MIN_DURATION_MINUTES} minutes`)
    .max(MAX_DURATION_MINUTES, `Duration must be at most ${MAX_DURATION_MINUTES} minutes`)
    .default(DEFAULT_DURATION_MINUTES),

  narrationWordsPerMinute: z
    .number()
    .int()
    .min(MIN_WPM)
    .max(MAX_WPM)
    .default(DEFAULT_NARRATION_WPM),

  mood: z.array(MoodSchema).min(1).default(['emotional']),
  emotionalJourney: EmotionalJourneySchema.optional(),
  hookStyle: HookStyleSchema.default('mysterious'),
  endingStyle: EndingStyleSchema.default('emotional_closure'),
  pacing: PacingSchema.default('balanced'),
  complexity: ComplexitySchema.default('moderate'),
  dialogueIntensity: DialogueIntensitySchema.default('balanced'),
  narrativeStyle: NarrativeStyleSchema.default('cinematic'),

  language: z.string().default('English'),
  audience: z.string().optional(),
  theme: z.string().optional(),
  customPremise: z.string().max(1000).optional(),
  protagonistDescription: z.string().max(500).optional(),
  characterRelationships: z.string().max(500).optional(),
  setting: z.string().max(500).optional(),
  additionalInstructions: z.string().max(1000).optional(),
  contentPreferences: ContentPreferencesSchema.optional(),
});

export type StoryConfiguration = z.infer<typeof StoryConfigurationSchema>;

// ---------------------------------------------------------------------------
// API request schema
// ---------------------------------------------------------------------------

export const StoryRequestSchema = z.object({
  configuration: StoryConfigurationSchema,
});

export type StoryRequest = z.infer<typeof StoryRequestSchema>;
