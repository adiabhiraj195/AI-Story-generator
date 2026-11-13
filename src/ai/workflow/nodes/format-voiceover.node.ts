import { countWords, estimateDurationSeconds } from '../../../utils/word-count.js';
import { logger } from '../../../utils/logger.js';
import type { WorkflowState } from '../state.js';

/**
 * Node 10: formatVoiceover
 * Deterministic formatting — no LLM call.
 * Improves paragraph breaks and dialogue formatting for spoken narration.
 * Preserves all story events and meaning.
 */
export async function formatVoiceoverNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  logger.info({ generationId: state.generationId }, '[formatVoiceover] Starting');

  const script = state.finalScript || state.draftScript;
  const title = state.finalTitle || state.draftTitle;

  if (!script) throw new Error('No script available for voiceover formatting');

  const formatted = formatForVoiceover(script, state.request.narrationWordsPerMinute);
  const wordCount = countWords(formatted);
  const durationSeconds = estimateDurationSeconds(wordCount, state.request.narrationWordsPerMinute);

  logger.info(
    { generationId: state.generationId, wordCount, durationSeconds },
    '[formatVoiceover] Completed',
  );

  return {
    finalScript: formatted,
    finalTitle: title,
    finalWordCount: wordCount,
    finalDurationSeconds: durationSeconds,
  };
}

/**
 * Deterministic voiceover formatting rules:
 * 1. Normalise whitespace and line endings
 * 2. Ensure paragraphs are separated by double newlines
 * 3. Format dialogue on its own line
 * 4. Trim leading/trailing whitespace
 * 5. Break overly long paragraphs (>150 words) into 2 chunks
 */
function formatForVoiceover(script: string, _wpm: number): string {
  // Normalise CRLF and multiple blank lines
  let text = script.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  const formatted = paragraphs.map((para) => {
    para = para.trim();
    if (!para) return null;

    // Break very long paragraphs at a sentence boundary around the halfway mark
    const words = para.split(/\s+/);
    if (words.length > 150) {
      const midpoint = Math.floor(words.length / 2);
      let splitAt = midpoint;

      // Find nearest sentence end near the midpoint
      for (let i = midpoint; i < Math.min(midpoint + 20, words.length); i++) {
        const word = words[i];
        if (word && /[.!?]$/.test(word)) {
          splitAt = i + 1;
          break;
        }
      }

      const part1 = words.slice(0, splitAt).join(' ');
      const part2 = words.slice(splitAt).join(' ');
      return [part1, part2].filter(Boolean).join('\n\n');
    }

    return para;
  });

  return formatted.filter((p): p is string => p !== null).join('\n\n');
}
