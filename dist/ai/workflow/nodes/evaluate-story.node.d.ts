import { type StoryEvaluation } from '../../schemas/evaluation.schema.js';
import { type ValidationResult } from '../../../utils/word-count.js';
import type { WorkflowState } from '../state.js';
export declare function normalizeStoryEvaluation(parsed: unknown, durationValidation: ValidationResult): StoryEvaluation | null;
export declare function extractEvaluationFromResponse(raw: unknown, durationValidation: ValidationResult): StoryEvaluation;
export declare function evaluateStoryNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
/**
 * Conditional routing: shouldRevise
 * Returns the next node name based on evaluation result.
 */
export declare function shouldReviseRouter(state: WorkflowState): string;
//# sourceMappingURL=evaluate-story.node.d.ts.map