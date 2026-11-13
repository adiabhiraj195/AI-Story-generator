import { z } from 'zod';
export declare const StoryConceptSchema: z.ZodObject<{
    premise: z.ZodString;
    protagonist: z.ZodString;
    motivation: z.ZodString;
    setting: z.ZodString;
    centralConflict: z.ZodString;
    stakes: z.ZodString;
    incitingIncident: z.ZodString;
    majorRevelation: z.ZodString;
    emotionalJourney: z.ZodString;
    climaxDirection: z.ZodString;
    endingDirection: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emotionalJourney: string;
    setting: string;
    premise: string;
    protagonist: string;
    motivation: string;
    centralConflict: string;
    stakes: string;
    incitingIncident: string;
    majorRevelation: string;
    climaxDirection: string;
    endingDirection: string;
}, {
    emotionalJourney: string;
    setting: string;
    premise: string;
    protagonist: string;
    motivation: string;
    centralConflict: string;
    stakes: string;
    incitingIncident: string;
    majorRevelation: string;
    climaxDirection: string;
    endingDirection: string;
}>;
export type StoryConcept = z.infer<typeof StoryConceptSchema>;
//# sourceMappingURL=concept.schema.d.ts.map