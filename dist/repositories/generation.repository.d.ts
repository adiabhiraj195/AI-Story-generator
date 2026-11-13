import type { GenerationJob, CreateGenerationInput, GenerationStatus, GenerationStage } from '../domain/generation.types.js';
import type { AggregatedTokenUsage } from '../utils/token-usage.js';
export interface ListGenerationsOptions {
    limit?: number | undefined;
    lastKey?: Record<string, unknown> | undefined;
}
export interface ListGenerationsResult {
    items: GenerationJob[];
    lastKey?: Record<string, unknown> | undefined;
}
export declare class GenerationRepository {
    private readonly table;
    create(input: Omit<CreateGenerationInput, 'generationId'>): Promise<GenerationJob>;
    findById(generationId: string): Promise<GenerationJob>;
    updateStatus(generationId: string, status: GenerationStatus, stage: GenerationStage, extra?: Partial<GenerationJob>): Promise<void>;
    updateTokenUsage(generationId: string, tokenUsage: AggregatedTokenUsage): Promise<void>;
    listRecent(options?: ListGenerationsOptions): Promise<ListGenerationsResult>;
    /** Find stale PROCESSING jobs (older than staleThresholdMs, default 10 min) */
    findStaleProcessingJobs(staleThresholdMs?: number): Promise<GenerationJob[]>;
    /** Find PENDING jobs for recovery on startup */
    findPendingJobs(limit?: number): Promise<GenerationJob[]>;
    delete(generationId: string): Promise<void>;
}
//# sourceMappingURL=generation.repository.d.ts.map