import { z } from 'zod';
export declare const HookCandidateSchema: z.ZodObject<{
    text: z.ZodString;
    wordCount: z.ZodNumber;
    style: z.ZodString;
    questionRaised: z.ZodString;
    hookType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    wordCount: number;
    style: string;
    questionRaised: string;
    hookType: string;
}, {
    text: string;
    wordCount: number;
    style: string;
    questionRaised: string;
    hookType: string;
}>;
export declare const HookCandidatesSchema: z.ZodObject<{
    candidates: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        wordCount: z.ZodNumber;
        style: z.ZodString;
        questionRaised: z.ZodString;
        hookType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }, {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    candidates: {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }[];
}, {
    candidates: {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }[];
}>;
export declare const HookEvaluationSchema: z.ZodObject<{
    scores: z.ZodObject<{
        curiosity: z.ZodNumber;
        clarity: z.ZodNumber;
        impact: z.ZodNumber;
        relevance: z.ZodNumber;
        promiseFulfillment: z.ZodNumber;
        narrationQuality: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        curiosity: number;
        clarity: number;
        impact: number;
        relevance: number;
        promiseFulfillment: number;
        narrationQuality: number;
    }, {
        curiosity: number;
        clarity: number;
        impact: number;
        relevance: number;
        promiseFulfillment: number;
        narrationQuality: number;
    }>;
    overallScore: z.ZodNumber;
    selectedCandidateIndex: z.ZodNumber;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scores: {
        curiosity: number;
        clarity: number;
        impact: number;
        relevance: number;
        promiseFulfillment: number;
        narrationQuality: number;
    };
    overallScore: number;
    selectedCandidateIndex: number;
    reasoning: string;
}, {
    scores: {
        curiosity: number;
        clarity: number;
        impact: number;
        relevance: number;
        promiseFulfillment: number;
        narrationQuality: number;
    };
    overallScore: number;
    selectedCandidateIndex: number;
    reasoning: string;
}>;
export type HookCandidate = z.infer<typeof HookCandidateSchema>;
export type HookCandidates = z.infer<typeof HookCandidatesSchema>;
export type HookEvaluation = z.infer<typeof HookEvaluationSchema>;
//# sourceMappingURL=hook.schema.d.ts.map