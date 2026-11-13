import type { WorkflowState } from '../state.js';
/**
 * Normalizes diverse LLM output variations into the canonical HookCandidates structure.
 * Handles:
 * - Bare arrays: [ { text: "..." }, ... ]
 * - Alternative keys: { hooks: [...] }, { hookCandidates: [...] }, { items: [...] }
 * - Word count calculation if missing or string
 * - Defaulting missing metadata (style, questionRaised, hookType)
 * - Array length normalization (ensuring exactly 3 candidates)
 */
export declare function normalizeHookCandidates(parsed: unknown, defaultStyle?: string): unknown;
export declare function generateHooksNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=generate-hooks.node.d.ts.map