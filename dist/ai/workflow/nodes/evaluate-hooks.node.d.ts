import { type HookEvaluation } from '../../schemas/hook.schema.js';
import type { WorkflowState } from '../state.js';
export declare function normalizeHookEvaluation(parsed: unknown, maxIndex?: number): HookEvaluation | null;
export declare function evaluateHooksNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=evaluate-hooks.node.d.ts.map