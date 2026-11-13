// ---------------------------------------------------------------------------
// Duration & word-count utilities (single source of truth)
// ---------------------------------------------------------------------------
export const DEFAULT_DURATION_MINUTES = 4;
export const DEFAULT_NARRATION_WPM = 145;
export const MIN_DURATION_MINUTES = 2;
export const MAX_DURATION_MINUTES = 6;
export const MIN_WPM = 120;
export const MAX_WPM = 180;
/**
 * Calculate word-count targets from duration and narration speed.
 * Enforces the absolute 2–6 minute boundary.
 */
export function calculateWordCountTargets(durationMinutes, narrationWordsPerMinute = DEFAULT_NARRATION_WPM) {
    const clampedDuration = Math.max(MIN_DURATION_MINUTES, Math.min(MAX_DURATION_MINUTES, durationMinutes));
    const targetWordCount = Math.round(clampedDuration * narrationWordsPerMinute);
    const minimumWords = Math.max(MIN_DURATION_MINUTES * narrationWordsPerMinute, Math.floor(targetWordCount * 0.95));
    const maximumWords = Math.min(MAX_DURATION_MINUTES * narrationWordsPerMinute, Math.ceil(targetWordCount * 1.05));
    return {
        targetWordCount,
        minimumWords,
        maximumWords,
        estimatedMinutes: clampedDuration,
    };
}
/**
 * Count words in a plain text string.
 * Uses a simple whitespace split — deterministic, never trusts LLM reports.
 */
export function countWords(text) {
    if (!text || text.trim().length === 0)
        return 0;
    return text.trim().split(/\s+/).length;
}
/**
 * Estimate narration duration in seconds from word count.
 */
export function estimateDurationSeconds(wordCount, wpm = DEFAULT_NARRATION_WPM) {
    return Math.round((wordCount / wpm) * 60);
}
/**
 * Estimate narration duration in minutes from word count.
 */
export function estimateDurationMinutes(wordCount, wpm = DEFAULT_NARRATION_WPM) {
    return wordCount / wpm;
}
/**
 * Validate a script against word-count targets.
 */
export function validateScriptLength(script, targets) {
    const wordCount = countWords(script);
    const durationSec = estimateDurationSeconds(wordCount);
    const durationMin = estimateDurationMinutes(wordCount);
    const tooShort = wordCount < targets.minimumWords;
    const tooLong = wordCount > targets.maximumWords;
    return {
        valid: !tooShort && !tooLong,
        wordCount,
        estimatedDurationSeconds: durationSec,
        estimatedDurationMinutes: durationMin,
        tooShort,
        tooLong,
        minimumWords: targets.minimumWords,
        maximumWords: targets.maximumWords,
        targetWordCount: targets.targetWordCount,
    };
}
/**
 * Quick table of expected word counts for all supported durations at default WPM.
 */
export const DURATION_TABLE = {
    2: 2 * DEFAULT_NARRATION_WPM, // 290
    3: 3 * DEFAULT_NARRATION_WPM, // 435
    4: 4 * DEFAULT_NARRATION_WPM, // 580
    5: 5 * DEFAULT_NARRATION_WPM, // 725
    6: 6 * DEFAULT_NARRATION_WPM, // 870
};
//# sourceMappingURL=word-count.js.map