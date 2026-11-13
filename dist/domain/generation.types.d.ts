import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';
import type { AggregatedTokenUsage } from '../utils/token-usage.js';
export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type GenerationStage = 'VALIDATING_REQUEST' | 'GENERATING_CONCEPT' | 'GENERATING_HOOKS' | 'EVALUATING_HOOKS' | 'GENERATING_OUTLINE' | 'WRITING_STORY' | 'EVALUATING_STORY' | 'REVISING_STORY' | 'FINAL_VALIDATION' | 'FORMATTING_VOICEOVER' | 'SAVING_STORY' | 'COMPLETED' | 'FAILED';
export interface GenerationJob {
    generationId: string;
    status: GenerationStatus;
    currentStage: GenerationStage;
    configuration: StoryConfiguration;
    progressMessage?: string | undefined;
    targetDurationMinutes: number;
    wordCount?: number | undefined;
    storyId?: string | undefined;
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
    revisionCount: number;
    tokenUsage?: AggregatedTokenUsage | undefined;
    createdAt: string;
    updatedAt: string;
    completedAt?: string | undefined;
    GSI1PK: string;
    GSI1SK: string;
}
export type CreateGenerationInput = Omit<GenerationJob, 'createdAt' | 'updatedAt' | 'completedAt' | 'GSI1PK' | 'GSI1SK'>;
//# sourceMappingURL=generation.types.d.ts.map