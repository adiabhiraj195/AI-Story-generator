import { z } from 'zod';
export const FinalStorySchema = z.object({
    title: z.string().min(1).max(200).describe('Story title'),
    script: z.string().min(50).describe('Complete narration-ready script'),
});
export const VoiceoverFormattedSchema = z.object({
    title: z.string(),
    script: z.string().describe('Voiceover-optimised script with proper paragraph breaks'),
    wordCount: z.number().int(),
    estimatedDurationSeconds: z.number(),
    estimatedDurationMinutes: z.number(),
});
//# sourceMappingURL=final-story.schema.js.map