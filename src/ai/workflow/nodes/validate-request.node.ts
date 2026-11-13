import { calculateWordCountTargets } from '../../../utils/word-count.js';
import { StoryConfigurationSchema } from '../../schemas/story-config.schema.js';
import { ValidationError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import type { WorkflowState } from '../state.js';

/**
 * Node 1: validateRequest
 * Validates the incoming configuration, normalises it, and computes duration targets.
 * No LLM call.
 */
export async function validateRequestNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  logger.info({ generationId: state.generationId }, '[validateRequest] Starting');

  const parseResult = StoryConfigurationSchema.safeParse(state.request);
  if (!parseResult.success) {
    const issues = parseResult.error.flatten().fieldErrors;
    throw new ValidationError('Invalid story configuration', issues);
  }

  const config = parseResult.data;
  const targets = calculateWordCountTargets(config.durationMinutes, config.narrationWordsPerMinute);

  logger.info(
    {
      generationId: state.generationId,
      durationMinutes: config.durationMinutes,
      targetWordCount: targets.targetWordCount,
      minimumWords: targets.minimumWords,
      maximumWords: targets.maximumWords,
    },
    '[validateRequest] Completed',
  );

  return {
    request: config,
    targetWordCount: targets.targetWordCount,
    minimumWords: targets.minimumWords,
    maximumWords: targets.maximumWords,
  };
}
