import { getStoryGraph } from '../ai/workflow/graph.js';
import { StoryConfigurationSchema } from '../ai/schemas/story-config.schema.js';
import { aggregateTokenUsage } from '../utils/token-usage.js';
import { ValidationError, WorkflowError, toAppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { StoryRepository } from '../repositories/story.repository.js';
import { GenerationRepository } from '../repositories/generation.repository.js';
import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';
import type { GenerationJob } from '../domain/generation.types.js';
import type { WorkflowState } from '../ai/workflow/state.js';
import { effectiveWriterModelId, effectiveEvaluatorModelId } from '../config/env.js';

// ---------------------------------------------------------------------------
// In-process worker queue (concurrency = 1)
// ---------------------------------------------------------------------------

type GenerationTask = () => Promise<void>;
let isWorkerRunning = false;
const taskQueue: GenerationTask[] = [];

function enqueueTask(task: GenerationTask): void {
  taskQueue.push(task);
  if (!isWorkerRunning) {
    void processNextTask();
  }
}

async function processNextTask(): Promise<void> {
  const task = taskQueue.shift();
  if (!task) {
    isWorkerRunning = false;
    return;
  }
  isWorkerRunning = true;
  try {
    await task();
  } catch (err) {
    logger.error({ err }, '[worker] Task failed unexpectedly');
  } finally {
    // Process next after a tick
    setImmediate(() => void processNextTask());
  }
}

// ---------------------------------------------------------------------------
// Generation Service
// ---------------------------------------------------------------------------

export class GenerationService {
  private readonly storyRepo = new StoryRepository();
  private readonly genRepo = new GenerationRepository();

  /**
   * Start a new generation job.
   * Validates config, creates a PENDING record, then enqueues the LangGraph workflow.
   */
  async startGeneration(rawConfig: unknown): Promise<GenerationJob> {
    const parseResult = StoryConfigurationSchema.safeParse(rawConfig);
    if (!parseResult.success) {
      throw new ValidationError('Invalid story configuration', parseResult.error.flatten());
    }

    const config = parseResult.data;

    const job = await this.genRepo.create({
      status: 'PENDING',
      currentStage: 'VALIDATING_REQUEST',
      configuration: config,
      targetDurationMinutes: config.durationMinutes,
      revisionCount: 0,
    });

    logger.info({ generationId: job.generationId }, '[GenerationService] Job created');

    // Enqueue async execution
    enqueueTask(() => this.executeGeneration(job.generationId, config));

    return job;
  }

  /**
   * Core generation execution — runs inside the in-process worker.
   */
  private async executeGeneration(
    generationId: string,
    config: StoryConfiguration,
  ): Promise<void> {
    logger.info({ generationId }, '[GenerationService] Starting execution');

    try {
      // Mark PROCESSING
      await this.genRepo.updateStatus(generationId, 'PROCESSING', 'GENERATING_CONCEPT', {
        progressMessage: 'Generating story concept...',
      });

      const graph = getStoryGraph();

      const initialState: Partial<WorkflowState> = {
        generationId,
        request: config,
        targetWordCount: 0,
        minimumWords: 0,
        maximumWords: 0,
        storyConcept: null,
        hookCandidates: [],
        selectedHook: null,
        hookEvaluation: null,
        storyOutline: null,
        draftTitle: '',
        draftScript: '',
        revisionCount: 0,
        storyEvaluation: null,
        revisionFeedback: [],
        finalTitle: '',
        finalScript: '',
        finalWordCount: 0,
        finalDurationSeconds: 0,
        approvalStatus: 'NEEDS_REVIEW',
        validationPassed: false,
        tokenUsage: [],
        modelMetadata: {},
        error: null,
      };

      // Stream events for stage updates
      const stream = graph.streamEvents(initialState, { version: 'v2' });
      let finalState: WorkflowState | null = null;

      for await (const event of stream) {
        if (event.event === 'on_chain_start' && event.name !== 'LangGraph') {
          await this.updateStageFromNode(generationId, event.name as string);
        }

        if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
          finalState = event.data?.output as WorkflowState;
        }
      }

      if (!finalState) {
        throw new WorkflowError('Workflow did not produce final state', 'execution');
      }

      // Aggregate token usage
      const tokenUsage = aggregateTokenUsage(finalState.tokenUsage ?? []);

      // Save story
      await this.genRepo.updateStatus(generationId, 'PROCESSING', 'SAVING_STORY', {
        progressMessage: 'Saving story...',
      });

      const story = await this.storyRepo.create({
        generationId,
        title: finalState.finalTitle,
        script: finalState.finalScript,
        configuration: config,
        genre: config.genre,
        pov: config.pov,
        tense: config.tense,
        mood: config.mood,
        language: config.language,
        targetDurationMinutes: config.durationMinutes,
        narrationWordsPerMinute: config.narrationWordsPerMinute,
        estimatedDurationSeconds: finalState.finalDurationSeconds,
        wordCount: finalState.finalWordCount,
        evaluation: finalState.storyEvaluation ?? undefined,
        approvalStatus: finalState.approvalStatus,
        tokenUsage,
        modelMetadata: {
          writerModelId: effectiveWriterModelId,
          evaluatorModelId: effectiveEvaluatorModelId,
          revisionCount: finalState.revisionCount,
        },
        promptVersion: '1.0.0',
      });

      // Mark COMPLETED
      await this.genRepo.updateStatus(generationId, 'COMPLETED', 'COMPLETED', {
        storyId: story.storyId,
        wordCount: finalState.finalWordCount,
        revisionCount: finalState.revisionCount,
        tokenUsage,
        progressMessage: 'Story generated successfully',
      });

      logger.info(
        {
          generationId,
          storyId: story.storyId,
          wordCount: finalState.finalWordCount,
          approvalStatus: finalState.approvalStatus,
          totalTokens: tokenUsage.totalTokens,
        },
        '[GenerationService] Execution completed',
      );
    } catch (err) {
      const appErr = toAppError(err);
      logger.error({ generationId, err: appErr.message }, '[GenerationService] Execution failed');

      await this.genRepo.updateStatus(generationId, 'FAILED', 'FAILED', {
        errorCode: appErr.code,
        errorMessage: appErr.message,
        progressMessage: 'Generation failed',
      });
    }
  }

  private async updateStageFromNode(generationId: string, nodeName: string): Promise<void> {
    const stageMap: Record<string, string> = {
      validateRequest: 'VALIDATING_REQUEST',
      generateConcept: 'GENERATING_CONCEPT',
      generateHooks: 'GENERATING_HOOKS',
      evaluateHooks: 'EVALUATING_HOOKS',
      generateOutline: 'GENERATING_OUTLINE',
      writeStory: 'WRITING_STORY',
      evaluateStory: 'EVALUATING_STORY',
      reviseStory: 'REVISING_STORY',
      finalValidation: 'FINAL_VALIDATION',
      formatVoiceover: 'FORMATTING_VOICEOVER',
    };

    const stage = stageMap[nodeName];
    if (!stage) return;

    await this.genRepo.updateStatus(
      generationId,
      'PROCESSING',
      stage as GenerationJob['currentStage'],
      { progressMessage: `Running ${nodeName}...` },
    ).catch((err: unknown) => {
      logger.warn({ err, nodeName }, '[GenerationService] Stage update failed (non-fatal)');
    });
  }

  async getJob(generationId: string): Promise<GenerationJob> {
    return this.genRepo.findById(generationId);
  }

  async listJobs(options?: { limit?: number | undefined; lastKey?: Record<string, unknown> | undefined }) {
    return this.genRepo.listRecent(options);
  }

  /**
   * Startup recovery: re-enqueue PENDING jobs, mark stale PROCESSING as FAILED.
   */
  async recoverOnStartup(): Promise<void> {
    logger.info('[GenerationService] Running startup recovery');

    // Mark stale PROCESSING jobs as FAILED
    const staleJobs = await this.genRepo.findStaleProcessingJobs();
    for (const job of staleJobs) {
      logger.warn({ generationId: job.generationId }, '[GenerationService] Marking stale job as FAILED');
      await this.genRepo.updateStatus(job.generationId, 'FAILED', 'FAILED', {
        errorCode: 'STALE_EXECUTION',
        errorMessage: 'Job was interrupted and cannot be safely retried',
      });
    }

    // Re-enqueue PENDING jobs
    const pendingJobs = await this.genRepo.findPendingJobs();
    for (const job of pendingJobs) {
      logger.info({ generationId: job.generationId }, '[GenerationService] Re-enqueueing PENDING job');
      enqueueTask(() => this.executeGeneration(job.generationId, job.configuration));
    }
  }
}
