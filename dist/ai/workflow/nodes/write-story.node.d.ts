import type { WorkflowState } from '../state.js';
export declare function normalizeStoryObject(parsed: unknown): {
    title: string;
    script: string;
} | null;
/**
 * Robust extractor for story generation output.
 * Handles:
 * - Proper JSON with escaped newlines and quotes
 * - JSON with unescaped literal newlines in "script"
 * - JSON with unescaped dialogue quotes
 * - Alternative keys (story, text, content, draft)
 * - Raw markdown / plain text story fallback
 */
export declare function extractStoryFromResponse(raw: unknown, defaultTitle?: string): {
    title: string;
    script: string;
};
export declare function writeStoryNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=write-story.node.d.ts.map