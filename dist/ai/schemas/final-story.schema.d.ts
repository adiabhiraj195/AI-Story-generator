import { z } from 'zod';
export declare const FinalStorySchema: z.ZodObject<{
    title: z.ZodString;
    script: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    script: string;
}, {
    title: string;
    script: string;
}>;
export type FinalStory = z.infer<typeof FinalStorySchema>;
export declare const VoiceoverFormattedSchema: z.ZodObject<{
    title: z.ZodString;
    script: z.ZodString;
    wordCount: z.ZodNumber;
    estimatedDurationSeconds: z.ZodNumber;
    estimatedDurationMinutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    wordCount: number;
    title: string;
    script: string;
    estimatedDurationSeconds: number;
    estimatedDurationMinutes: number;
}, {
    wordCount: number;
    title: string;
    script: string;
    estimatedDurationSeconds: number;
    estimatedDurationMinutes: number;
}>;
export type VoiceoverFormatted = z.infer<typeof VoiceoverFormattedSchema>;
//# sourceMappingURL=final-story.schema.d.ts.map