import { type StoryOutline } from '../../schemas/outline.schema.js';
import type { WorkflowState } from '../state.js';
/**
 * Normalizes varied LLM outline representations into the strict StoryOutline schema.
 * Handles:
 * - Nested objects: { outline: ... }, { storyOutline: ... }
 * - CamelCase keyMoments -> key_moments
 * - String key_moments -> array
 * - String or missing wordBudget / totalWordBudget
 * - Enforcing 4 to 6 narrative beats (subdivides if < 4, merges if > 6)
 * - Defaulting narrativeArc and paceNotes if missing
 */
export declare function normalizeOutlineObject(parsed: unknown, targetWordCount?: number): StoryOutline | null;
export declare function extractOutlineFromResponse(raw: unknown, targetWordCount?: number): StoryOutline;
export declare function generateOutlineNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=generate-outline.node.d.ts.map