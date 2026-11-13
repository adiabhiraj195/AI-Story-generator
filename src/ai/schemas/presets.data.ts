import type { StoryConfiguration } from '../schemas/story-config.schema.js';

// ---------------------------------------------------------------------------
// Built-in story presets
// ---------------------------------------------------------------------------

export interface BuiltInPreset {
  presetId: string;
  name: string;
  description: string;
  configuration: Partial<StoryConfiguration>;
  isSystemPreset: true;
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    presetId: 'preset-dark-mystery',
    name: 'Dark Mystery',
    description: 'A brooding, suspenseful mystery with a shocking revelation',
    isSystemPreset: true,
    configuration: {
      genre: 'mystery',
      pov: 'first_person',
      tense: 'past',
      durationMinutes: 4,
      mood: ['dark', 'mysterious', 'suspenseful'],
      emotionalJourney: 'curiosity_to_shock',
      hookStyle: 'mysterious',
      endingStyle: 'revelation',
      pacing: 'gradually_escalating',
      complexity: 'moderate',
      dialogueIntensity: 'balanced',
      narrativeStyle: 'cinematic',
    },
  },
  {
    presetId: 'preset-emotional-story',
    name: 'Emotional Story',
    description: 'A deeply emotional narrative focused on human connection',
    isSystemPreset: true,
    configuration: {
      genre: 'drama',
      pov: 'third_person_limited',
      tense: 'past',
      durationMinutes: 4,
      mood: ['emotional', 'nostalgic', 'hopeful'],
      emotionalJourney: 'sadness_to_hope',
      hookStyle: 'emotional',
      endingStyle: 'emotional_closure',
      pacing: 'slow_burn',
      complexity: 'simple',
      dialogueIntensity: 'dialogue_heavy',
      narrativeStyle: 'conversational',
    },
  },
  {
    presetId: 'preset-horror-confession',
    name: 'Horror Confession',
    description: 'A chilling first-person horror confession that gets under your skin',
    isSystemPreset: true,
    configuration: {
      genre: 'horror',
      pov: 'first_person',
      tense: 'present',
      durationMinutes: 3,
      mood: ['dark', 'disturbing', 'eerie', 'tense'],
      emotionalJourney: 'fear_to_relief',
      hookStyle: 'intriguing_confession',
      endingStyle: 'dark',
      pacing: 'gradually_escalating',
      complexity: 'moderate',
      dialogueIntensity: 'narration_heavy',
      narrativeStyle: 'personal_confession',
    },
  },
  {
    presetId: 'preset-psychological-thriller',
    name: 'Psychological Thriller',
    description: 'A tense psychological thriller that blurs the line between reality and perception',
    isSystemPreset: true,
    configuration: {
      genre: 'psychological_thriller',
      pov: 'first_person',
      tense: 'past',
      durationMinutes: 4,
      mood: ['suspenseful', 'tense', 'dark', 'mysterious'],
      emotionalJourney: 'confusion_to_understanding',
      hookStyle: 'impossible_situation',
      endingStyle: 'unexpected_twist',
      pacing: 'gradually_escalating',
      complexity: 'complex',
      dialogueIntensity: 'balanced',
      narrativeStyle: 'cinematic',
    },
  },
  {
    presetId: 'preset-sci-fi-mystery',
    name: 'Sci-Fi Mystery',
    description: 'A science fiction mystery set in an unexpected future',
    isSystemPreset: true,
    configuration: {
      genre: 'science_fiction',
      pov: 'third_person_limited',
      tense: 'past',
      durationMinutes: 5,
      mood: ['mysterious', 'tense', 'eerie'],
      emotionalJourney: 'curiosity_to_shock',
      hookStyle: 'mysterious',
      endingStyle: 'thought_provoking',
      pacing: 'balanced',
      complexity: 'complex',
      dialogueIntensity: 'balanced',
      narrativeStyle: 'cinematic',
    },
  },
  {
    presetId: 'preset-inspirational',
    name: 'Inspirational Story',
    description: 'An uplifting story of perseverance and triumph',
    isSystemPreset: true,
    configuration: {
      genre: 'inspirational',
      pov: 'third_person_omniscient',
      tense: 'past',
      durationMinutes: 3,
      mood: ['hopeful', 'emotional', 'inspirational'],
      emotionalJourney: 'loneliness_to_belonging',
      hookStyle: 'emotional',
      endingStyle: 'inspirational',
      pacing: 'balanced',
      complexity: 'simple',
      dialogueIntensity: 'balanced',
      narrativeStyle: 'simple_direct',
    },
  },
];
