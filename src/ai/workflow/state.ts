import { Annotation } from '@langchain/langgraph';
import type { StoryConfiguration } from '../schemas/story-config.schema.js';
import type { StoryConcept } from '../schemas/concept.schema.js';
import type { HookCandidate, HookEvaluation } from '../schemas/hook.schema.js';
import type { StoryOutline } from '../schemas/outline.schema.js';
import type { StoryEvaluation } from '../schemas/evaluation.schema.js';
import type { NodeTokenUsage } from '../../utils/token-usage.js';

// ---------------------------------------------------------------------------
// Shared workflow state annotation
// ---------------------------------------------------------------------------

export const WorkflowStateAnnotation = Annotation.Root({
  // ── Input ──────────────────────────────────────────────────────────────────
  generationId: Annotation<string>({ default: () => '', reducer: (_, next) => next }),
  request: Annotation<StoryConfiguration>({
    default: () => ({}) as StoryConfiguration,
    reducer: (_, next) => next,
  }),

  // ── Duration targets (computed by validateRequest) ─────────────────────────
  targetWordCount: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  minimumWords: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  maximumWords: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),

  // ── Concept & hooks ────────────────────────────────────────────────────────
  storyConcept: Annotation<StoryConcept | null>({ default: () => null, reducer: (_, next) => next }),
  hookCandidates: Annotation<HookCandidate[]>({ default: () => [], reducer: (_, next) => next }),
  selectedHook: Annotation<HookCandidate | null>({ default: () => null, reducer: (_, next) => next }),
  hookEvaluation: Annotation<HookEvaluation | null>({ default: () => null, reducer: (_, next) => next }),

  // ── Outline & writing ──────────────────────────────────────────────────────
  storyOutline: Annotation<StoryOutline | null>({ default: () => null, reducer: (_, next) => next }),
  draftTitle: Annotation<string>({ default: () => '', reducer: (_, next) => next }),
  draftScript: Annotation<string>({ default: () => '', reducer: (_, next) => next }),

  // ── Evaluation & revision ──────────────────────────────────────────────────
  revisionCount: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  storyEvaluation: Annotation<StoryEvaluation | null>({ default: () => null, reducer: (_, next) => next }),
  revisionFeedback: Annotation<string[]>({ default: () => [], reducer: (_, next) => next }),

  // ── Final output ───────────────────────────────────────────────────────────
  finalTitle: Annotation<string>({ default: () => '', reducer: (_, next) => next }),
  finalScript: Annotation<string>({ default: () => '', reducer: (_, next) => next }),
  finalWordCount: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  finalDurationSeconds: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  approvalStatus: Annotation<'APPROVED' | 'NEEDS_REVIEW'>({
    default: () => 'NEEDS_REVIEW',
    reducer: (_, next) => next,
  }),
  validationPassed: Annotation<boolean>({ default: () => false, reducer: (_, next) => next }),

  // ── Observability ──────────────────────────────────────────────────────────
  tokenUsage: Annotation<NodeTokenUsage[]>({
    default: () => [],
    // Accumulate token entries from each node
    reducer: (existing, incoming) => [...existing, ...incoming],
  }),
  modelMetadata: Annotation<Record<string, unknown>>({
    default: () => ({}),
    reducer: (existing, incoming) => ({ ...existing, ...incoming }),
  }),

  // ── Error ──────────────────────────────────────────────────────────────────
  error: Annotation<string | null>({ default: () => null, reducer: (_, next) => next }),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;
