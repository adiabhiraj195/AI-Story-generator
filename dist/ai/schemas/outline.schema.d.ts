import { z } from 'zod';
export declare const SceneBeatSchema: z.ZodObject<{
    beatNumber: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    purpose: z.ZodString;
    wordBudget: z.ZodNumber;
    key_moments: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    description: string;
    beatNumber: number;
    title: string;
    purpose: string;
    wordBudget: number;
    key_moments: string[];
}, {
    description: string;
    beatNumber: number;
    title: string;
    purpose: string;
    wordBudget: number;
    key_moments: string[];
}>;
export declare const StoryOutlineSchema: z.ZodObject<{
    totalWordBudget: z.ZodNumber;
    beats: z.ZodArray<z.ZodObject<{
        beatNumber: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        purpose: z.ZodString;
        wordBudget: z.ZodNumber;
        key_moments: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        description: string;
        beatNumber: number;
        title: string;
        purpose: string;
        wordBudget: number;
        key_moments: string[];
    }, {
        description: string;
        beatNumber: number;
        title: string;
        purpose: string;
        wordBudget: number;
        key_moments: string[];
    }>, "many">;
    narrativeArc: z.ZodString;
    paceNotes: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totalWordBudget: number;
    beats: {
        description: string;
        beatNumber: number;
        title: string;
        purpose: string;
        wordBudget: number;
        key_moments: string[];
    }[];
    narrativeArc: string;
    paceNotes: string;
}, {
    totalWordBudget: number;
    beats: {
        description: string;
        beatNumber: number;
        title: string;
        purpose: string;
        wordBudget: number;
        key_moments: string[];
    }[];
    narrativeArc: string;
    paceNotes: string;
}>;
export type SceneBeat = z.infer<typeof SceneBeatSchema>;
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;
//# sourceMappingURL=outline.schema.d.ts.map