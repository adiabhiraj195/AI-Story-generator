import type { WorkflowState } from '../state.js';
/**
 * Node 9: finalValidation
 * Deterministic TypeScript validation — no LLM call.
 * Validates word count, duration, and derives final approval status.
 */
export declare function finalValidationNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=final-validation.node.d.ts.map