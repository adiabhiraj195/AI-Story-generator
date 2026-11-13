import { validateScriptLength } from '../../../utils/word-count.js';
import { APPROVAL_THRESHOLDS } from '../../schemas/evaluation.schema.js';
import { logger } from '../../../utils/logger.js';
/**
 * Node 9: finalValidation
 * Deterministic TypeScript validation — no LLM call.
 * Validates word count, duration, and derives final approval status.
 */
export async function finalValidationNode(state) {
    logger.info({ generationId: state.generationId }, '[finalValidation] Starting');
    const script = state.draftScript;
    const title = state.draftTitle;
    if (!script) {
        throw new Error('draftScript is required for finalValidation');
    }
    const targets = {
        targetWordCount: state.targetWordCount,
        minimumWords: state.minimumWords,
        maximumWords: state.maximumWords,
        estimatedMinutes: state.request.durationMinutes,
    };
    const durationValidation = validateScriptLength(script, targets);
    const evaluation = state.storyEvaluation;
    // Determine approval status
    let approvalStatus = 'NEEDS_REVIEW';
    if (evaluation) {
        const { scores } = evaluation;
        const thresholdsPass = scores.hook >= APPROVAL_THRESHOLDS.hook &&
            scores.endingSatisfaction >= APPROVAL_THRESHOLDS.endingSatisfaction &&
            scores.coherence >= APPROVAL_THRESHOLDS.coherence &&
            scores.voiceoverQuality >= APPROVAL_THRESHOLDS.voiceoverQuality &&
            scores.engagement >= APPROVAL_THRESHOLDS.default &&
            scores.pacing >= APPROVAL_THRESHOLDS.default &&
            scores.characterDevelopment >= APPROVAL_THRESHOLDS.default &&
            scores.emotionalImpact >= APPROVAL_THRESHOLDS.default &&
            scores.climax >= APPROVAL_THRESHOLDS.default &&
            scores.configurationAdherence >= APPROVAL_THRESHOLDS.default;
        if (thresholdsPass && durationValidation.valid) {
            approvalStatus = 'APPROVED';
        }
    }
    logger.info({
        generationId: state.generationId,
        wordCount: durationValidation.wordCount,
        estimatedDurationSeconds: durationValidation.estimatedDurationSeconds,
        validDuration: durationValidation.valid,
        approvalStatus,
    }, '[finalValidation] Completed');
    return {
        finalTitle: title,
        finalScript: script,
        finalWordCount: durationValidation.wordCount,
        finalDurationSeconds: durationValidation.estimatedDurationSeconds,
        approvalStatus,
        validationPassed: durationValidation.valid,
    };
}
//# sourceMappingURL=final-validation.node.js.map