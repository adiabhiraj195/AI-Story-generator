import { Annotation } from '@langchain/langgraph';
// ---------------------------------------------------------------------------
// Shared workflow state annotation
// ---------------------------------------------------------------------------
export const WorkflowStateAnnotation = Annotation.Root({
    // ── Input ──────────────────────────────────────────────────────────────────
    generationId: Annotation({ default: () => '', reducer: (_, next) => next }),
    request: Annotation({
        default: () => ({}),
        reducer: (_, next) => next,
    }),
    // ── Duration targets (computed by validateRequest) ─────────────────────────
    targetWordCount: Annotation({ default: () => 0, reducer: (_, next) => next }),
    minimumWords: Annotation({ default: () => 0, reducer: (_, next) => next }),
    maximumWords: Annotation({ default: () => 0, reducer: (_, next) => next }),
    // ── Concept & hooks ────────────────────────────────────────────────────────
    storyConcept: Annotation({ default: () => null, reducer: (_, next) => next }),
    hookCandidates: Annotation({ default: () => [], reducer: (_, next) => next }),
    selectedHook: Annotation({ default: () => null, reducer: (_, next) => next }),
    hookEvaluation: Annotation({ default: () => null, reducer: (_, next) => next }),
    // ── Outline & writing ──────────────────────────────────────────────────────
    storyOutline: Annotation({ default: () => null, reducer: (_, next) => next }),
    draftTitle: Annotation({ default: () => '', reducer: (_, next) => next }),
    draftScript: Annotation({ default: () => '', reducer: (_, next) => next }),
    // ── Evaluation & revision ──────────────────────────────────────────────────
    revisionCount: Annotation({ default: () => 0, reducer: (_, next) => next }),
    storyEvaluation: Annotation({ default: () => null, reducer: (_, next) => next }),
    revisionFeedback: Annotation({ default: () => [], reducer: (_, next) => next }),
    // ── Final output ───────────────────────────────────────────────────────────
    finalTitle: Annotation({ default: () => '', reducer: (_, next) => next }),
    finalScript: Annotation({ default: () => '', reducer: (_, next) => next }),
    finalWordCount: Annotation({ default: () => 0, reducer: (_, next) => next }),
    finalDurationSeconds: Annotation({ default: () => 0, reducer: (_, next) => next }),
    approvalStatus: Annotation({
        default: () => 'NEEDS_REVIEW',
        reducer: (_, next) => next,
    }),
    validationPassed: Annotation({ default: () => false, reducer: (_, next) => next }),
    // ── Observability ──────────────────────────────────────────────────────────
    tokenUsage: Annotation({
        default: () => [],
        // Accumulate token entries from each node
        reducer: (existing, incoming) => [...existing, ...incoming],
    }),
    modelMetadata: Annotation({
        default: () => ({}),
        reducer: (existing, incoming) => ({ ...existing, ...incoming }),
    }),
    // ── Error ──────────────────────────────────────────────────────────────────
    error: Annotation({ default: () => null, reducer: (_, next) => next }),
});
//# sourceMappingURL=state.js.map