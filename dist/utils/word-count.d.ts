export declare const DEFAULT_DURATION_MINUTES = 4;
export declare const DEFAULT_NARRATION_WPM = 145;
export declare const MIN_DURATION_MINUTES = 2;
export declare const MAX_DURATION_MINUTES = 6;
export declare const MIN_WPM = 120;
export declare const MAX_WPM = 180;
export interface WordCountTargets {
    targetWordCount: number;
    minimumWords: number;
    maximumWords: number;
    estimatedMinutes: number;
}
/**
 * Calculate word-count targets from duration and narration speed.
 * Enforces the absolute 2–6 minute boundary.
 */
export declare function calculateWordCountTargets(durationMinutes: number, narrationWordsPerMinute?: number): WordCountTargets;
/**
 * Count words in a plain text string.
 * Uses a simple whitespace split — deterministic, never trusts LLM reports.
 */
export declare function countWords(text: string): number;
/**
 * Estimate narration duration in seconds from word count.
 */
export declare function estimateDurationSeconds(wordCount: number, wpm?: number): number;
/**
 * Estimate narration duration in minutes from word count.
 */
export declare function estimateDurationMinutes(wordCount: number, wpm?: number): number;
export interface ValidationResult {
    valid: boolean;
    wordCount: number;
    estimatedDurationSeconds: number;
    estimatedDurationMinutes: number;
    tooShort: boolean;
    tooLong: boolean;
    minimumWords: number;
    maximumWords: number;
    targetWordCount: number;
}
/**
 * Validate a script against word-count targets.
 */
export declare function validateScriptLength(script: string, targets: WordCountTargets): ValidationResult;
/**
 * Quick table of expected word counts for all supported durations at default WPM.
 */
export declare const DURATION_TABLE: Record<number, number>;
//# sourceMappingURL=word-count.d.ts.map