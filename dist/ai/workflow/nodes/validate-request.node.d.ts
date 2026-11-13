import type { WorkflowState } from '../state.js';
/**
 * Node 1: validateRequest
 * Validates the incoming configuration, normalises it, and computes duration targets.
 * No LLM call.
 */
export declare function validateRequestNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=validate-request.node.d.ts.map