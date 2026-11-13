import { z } from 'zod';
export declare const EvaluationScoresSchema: z.ZodObject<{
    hook: z.ZodNumber;
    engagement: z.ZodNumber;
    pacing: z.ZodNumber;
    characterDevelopment: z.ZodNumber;
    coherence: z.ZodNumber;
    emotionalImpact: z.ZodNumber;
    climax: z.ZodNumber;
    endingSatisfaction: z.ZodNumber;
    voiceoverQuality: z.ZodNumber;
    configurationAdherence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pacing: number;
    hook: number;
    engagement: number;
    characterDevelopment: number;
    coherence: number;
    emotionalImpact: number;
    climax: number;
    endingSatisfaction: number;
    voiceoverQuality: number;
    configurationAdherence: number;
}, {
    pacing: number;
    hook: number;
    engagement: number;
    characterDevelopment: number;
    coherence: number;
    emotionalImpact: number;
    climax: number;
    endingSatisfaction: number;
    voiceoverQuality: number;
    configurationAdherence: number;
}>;
export declare const StoryEvaluationOutputSchema: z.ZodObject<{
    scores: z.ZodObject<{
        hook: z.ZodNumber;
        engagement: z.ZodNumber;
        pacing: z.ZodNumber;
        characterDevelopment: z.ZodNumber;
        coherence: z.ZodNumber;
        emotionalImpact: z.ZodNumber;
        climax: z.ZodNumber;
        endingSatisfaction: z.ZodNumber;
        voiceoverQuality: z.ZodNumber;
        configurationAdherence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    }, {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    }>;
    overallScore: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString, "many">;
    weaknesses: z.ZodArray<z.ZodString, "many">;
    specificIssues: z.ZodArray<z.ZodString, "many">;
    requiredImprovements: z.ZodArray<z.ZodString, "many">;
    hookDelivered: z.ZodBoolean;
    approvalStatus: z.ZodEnum<["APPROVED", "NEEDS_REVISION", "NEEDS_REVIEW"]>;
    durationValidation: z.ZodOptional<z.ZodObject<{
        wordCount: z.ZodNumber;
        estimatedMinutes: z.ZodNumber;
        withinBounds: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    }, {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    scores: {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    specificIssues: string[];
    requiredImprovements: string[];
    hookDelivered: boolean;
    approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
    durationValidation?: {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    } | undefined;
}, {
    scores: {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    specificIssues: string[];
    requiredImprovements: string[];
    hookDelivered: boolean;
    approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
    durationValidation?: {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    } | undefined;
}>;
export declare const StoryEvaluationSchema: z.ZodObject<{
    scores: z.ZodObject<{
        hook: z.ZodNumber;
        engagement: z.ZodNumber;
        pacing: z.ZodNumber;
        characterDevelopment: z.ZodNumber;
        coherence: z.ZodNumber;
        emotionalImpact: z.ZodNumber;
        climax: z.ZodNumber;
        endingSatisfaction: z.ZodNumber;
        voiceoverQuality: z.ZodNumber;
        configurationAdherence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    }, {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    }>;
    overallScore: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString, "many">;
    weaknesses: z.ZodArray<z.ZodString, "many">;
    specificIssues: z.ZodArray<z.ZodString, "many">;
    requiredImprovements: z.ZodArray<z.ZodString, "many">;
    hookDelivered: z.ZodBoolean;
    approvalStatus: z.ZodEnum<["APPROVED", "NEEDS_REVISION", "NEEDS_REVIEW"]>;
} & {
    durationValidation: z.ZodObject<{
        wordCount: z.ZodNumber;
        estimatedMinutes: z.ZodNumber;
        withinBounds: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    }, {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    scores: {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    specificIssues: string[];
    requiredImprovements: string[];
    hookDelivered: boolean;
    approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
    durationValidation: {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    };
}, {
    scores: {
        pacing: number;
        hook: number;
        engagement: number;
        characterDevelopment: number;
        coherence: number;
        emotionalImpact: number;
        climax: number;
        endingSatisfaction: number;
        voiceoverQuality: number;
        configurationAdherence: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    specificIssues: string[];
    requiredImprovements: string[];
    hookDelivered: boolean;
    approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
    durationValidation: {
        wordCount: number;
        estimatedMinutes: number;
        withinBounds: boolean;
    };
}>;
export declare const RevisionFeedbackSchema: z.ZodObject<{
    targetWeaknesses: z.ZodArray<z.ZodString, "many">;
    revisionInstructions: z.ZodArray<z.ZodString, "many">;
    preserveElements: z.ZodArray<z.ZodString, "many">;
    priorityFixes: z.ZodArray<z.ZodString, "many">;
    durationAdjustment: z.ZodEnum<["shorten", "lengthen", "none"]>;
}, "strip", z.ZodTypeAny, {
    targetWeaknesses: string[];
    revisionInstructions: string[];
    preserveElements: string[];
    priorityFixes: string[];
    durationAdjustment: "shorten" | "lengthen" | "none";
}, {
    targetWeaknesses: string[];
    revisionInstructions: string[];
    preserveElements: string[];
    priorityFixes: string[];
    durationAdjustment: "shorten" | "lengthen" | "none";
}>;
export type EvaluationScores = z.infer<typeof EvaluationScoresSchema>;
export type StoryEvaluationOutput = z.infer<typeof StoryEvaluationOutputSchema>;
export type StoryEvaluation = z.infer<typeof StoryEvaluationSchema>;
export type RevisionFeedback = z.infer<typeof RevisionFeedbackSchema>;
export declare const APPROVAL_THRESHOLDS: {
    readonly hook: 8;
    readonly endingSatisfaction: 8;
    readonly coherence: 7;
    readonly voiceoverQuality: 7;
    readonly default: 7;
};
//# sourceMappingURL=evaluation.schema.d.ts.map