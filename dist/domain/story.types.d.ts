import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';
import type { StoryEvaluation } from '../ai/schemas/evaluation.schema.js';
import type { AggregatedTokenUsage } from '../utils/token-usage.js';
export type ApprovalStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'PENDING';
export interface Story {
    storyId: string;
    generationId: string;
    title: string;
    script: string;
    configuration: StoryConfiguration;
    genre: string;
    pov: string;
    tense: string;
    mood: string[];
    language: string;
    targetDurationMinutes: number;
    narrationWordsPerMinute: number;
    estimatedDurationSeconds: number;
    wordCount: number;
    evaluation?: StoryEvaluation | undefined;
    approvalStatus: ApprovalStatus;
    tokenUsage?: AggregatedTokenUsage | undefined;
    modelMetadata?: ModelMetadata | undefined;
    promptVersion: string;
    createdAt: string;
    updatedAt: string;
    GSI1PK: string;
    GSI1SK: string;
}
export interface ModelMetadata {
    writerModelId: string;
    evaluatorModelId: string;
    revisionCount: number;
}
export type CreateStoryInput = Omit<Story, 'createdAt' | 'updatedAt' | 'GSI1PK' | 'GSI1SK'>;
//# sourceMappingURL=story.types.d.ts.map