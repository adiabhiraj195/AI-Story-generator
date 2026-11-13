import type { WorkflowState } from '../state.js';
/**
 * Node 10: formatVoiceover
 * Deterministic formatting — no LLM call.
 * Improves paragraph breaks and dialogue formatting for spoken narration.
 * Preserves all story events and meaning.
 */
export declare function formatVoiceoverNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=format-voiceover.node.d.ts.map