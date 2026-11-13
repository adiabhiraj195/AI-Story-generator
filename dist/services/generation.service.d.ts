import type { GenerationJob } from '../domain/generation.types.js';
export declare class GenerationService {
    private readonly storyRepo;
    private readonly genRepo;
    /**
     * Start a new generation job.
     * Validates config, creates a PENDING record, then enqueues the LangGraph workflow.
     */
    startGeneration(rawConfig: unknown): Promise<GenerationJob>;
    /**
     * Core generation execution — runs inside the in-process worker.
     */
    private executeGeneration;
    private updateStageFromNode;
    getJob(generationId: string): Promise<GenerationJob>;
    listJobs(options?: {
        limit?: number | undefined;
        lastKey?: Record<string, unknown> | undefined;
    }): Promise<import("../repositories/generation.repository.js").ListGenerationsResult>;
    /**
     * Startup recovery: re-enqueue PENDING jobs, mark stale PROCESSING as FAILED.
     */
    recoverOnStartup(): Promise<void>;
}
//# sourceMappingURL=generation.service.d.ts.map