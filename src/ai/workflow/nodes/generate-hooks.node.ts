import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildHookPrompt } from '../../prompts/hook.prompt.js';
import { HookCandidatesSchema, type HookCandidate } from '../../schemas/hook.schema.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveWriterModelId } from '../../../config/env.js';
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
export function normalizeHookCandidates(parsed: unknown, defaultStyle = 'mysterious'): unknown {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  let list: unknown[] | null = null;

  if (Array.isArray(parsed)) {
    list = parsed;
  } else {
    const obj = parsed as Record<string, unknown>;
    const candidateArray =
      obj['candidates'] ??
      obj['hooks'] ??
      obj['hookCandidates'] ??
      obj['items'] ??
      obj['data'];

    if (Array.isArray(candidateArray)) {
      list = candidateArray;
    } else {
      const values = Object.values(obj);
      if (
        values.length > 0 &&
        typeof values[0] === 'object' &&
        values[0] !== null &&
        ('text' in (values[0] as Record<string, unknown>) || 'hook' in (values[0] as Record<string, unknown>))
      ) {
        list = values;
      }
    }
  }

  if (!list) {
    return parsed;
  }

  const normalized: HookCandidate[] = list.map((item) => {
    if (typeof item === 'string') {
      const text = item.trim();
      const words = text.split(/\s+/).filter(Boolean);
      return {
        text,
        wordCount: words.length,
        style: defaultStyle,
        questionRaised: 'What happens next?',
        hookType: defaultStyle,
      };
    }

    if (item && typeof item === 'object') {
      const c = item as Record<string, unknown>;
      const text = String(c['text'] ?? c['hook'] ?? c['content'] ?? '').trim();
      const words = text.split(/\s+/).filter(Boolean);

      let wordCount = words.length;
      if (typeof c['wordCount'] === 'number' && !isNaN(c['wordCount'])) {
        wordCount = Math.round(c['wordCount']);
      } else if (typeof c['wordCount'] === 'string') {
        const parsedCount = parseInt(c['wordCount'], 10);
        if (!isNaN(parsedCount) && parsedCount > 0) {
          wordCount = parsedCount;
        }
      }

      return {
        text,
        wordCount: wordCount > 0 ? wordCount : words.length,
        style: String(c['style'] ?? c['hookType'] ?? defaultStyle),
        questionRaised: String(c['questionRaised'] ?? c['question'] ?? 'What happens next?'),
        hookType: String(c['hookType'] ?? c['style'] ?? defaultStyle),
      };
    }

    return {
      text: String(item ?? ''),
      wordCount: 10,
      style: defaultStyle,
      questionRaised: 'What happens next?',
      hookType: defaultStyle,
    };
  });

  // Ensure exactly 3 candidates (trim if > 3, pad if < 3)
  let finalCandidates = normalized;
  if (finalCandidates.length > 3) {
    finalCandidates = finalCandidates.slice(0, 3);
  } else if (finalCandidates.length === 2 && finalCandidates[0]) {
    finalCandidates = [finalCandidates[0], finalCandidates[1]!, finalCandidates[0]];
  } else if (finalCandidates.length === 1 && finalCandidates[0]) {
    finalCandidates = [finalCandidates[0], finalCandidates[0], finalCandidates[0]];
  }

  return { candidates: finalCandidates };
}

export async function generateHooksNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  logger.info({ generationId: state.generationId }, '[generateHooks] Starting');

  if (!state.storyConcept) {
    throw new WorkflowError('storyConcept is required', 'generateHooks');
  }

  const start = Date.now();
  const baseModel = createGroqModel('hooks');
  const model =
    typeof baseModel.withStructuredOutput === 'function'
      ? baseModel.withStructuredOutput(HookCandidatesSchema, {
          method: 'jsonMode',
          includeRaw: true,
        })
      : baseModel;
  const basePrompt = buildHookPrompt(state.request, state.storyConcept);

  let response: BaseMessage | null = null;
  let parsed: unknown = null;
  let lastError: Error | null = null;
  let attempts = 0;
  let structuredModelFailed = false;

  // Up to 3 attempts with corrective prompt if parsing fails
  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide exactly 3 opening hook candidates in json format.`;

    const input = [
      new SystemMessage('You are an expert storyteller. Output a json object adhering to the schema.'),
      new HumanMessage(prompt),
    ];

    const useRawFallback = structuredModelFailed || attempt >= 3;
    const activeModel = useRawFallback
      ? baseModel.bind({ response_format: { type: 'json_object' } })
      : model;

    try {
      const invokeResult = (await activeModel.invoke(input)) as
        | { raw?: BaseMessage; parsed?: unknown }
        | BaseMessage
        | unknown;

      // 1. Structured output result with { raw, parsed }
      if (invokeResult && typeof invokeResult === 'object' && 'parsed' in invokeResult) {
        const structuredResult = invokeResult as { raw?: BaseMessage; parsed?: unknown };
        if (structuredResult.raw) {
          response = structuredResult.raw;
        }
        if (structuredResult.parsed) {
          parsed = normalizeHookCandidates(structuredResult.parsed, state.request.hookStyle);
          if (parsed) break;
        }
        if (!parsed && structuredResult.raw?.content) {
          try {
            const rawJson = extractJsonFromText(structuredResult.raw.content);
            parsed = normalizeHookCandidates(rawJson, state.request.hookStyle);
            if (parsed) break;
          } catch {
            // fall through
          }
        }
      }

      // 2. Direct parsed hook candidates object or array
      if (
        !parsed &&
        invokeResult &&
        typeof invokeResult === 'object' &&
        ('candidates' in invokeResult || 'hooks' in invokeResult || Array.isArray(invokeResult))
      ) {
        parsed = normalizeHookCandidates(invokeResult, state.request.hookStyle);
        if (parsed) break;
      }

      // 3. Fallback: BaseMessage or text extraction
      const rawMsg: BaseMessage | null =
        invokeResult &&
        typeof invokeResult === 'object' &&
        ('content' in invokeResult || 'usage_metadata' in invokeResult)
          ? (invokeResult as BaseMessage)
          : response;

      if (rawMsg) {
        response = rawMsg;
      }

      const rawContent = rawMsg?.content;
      const rawText =
        typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? (rawContent as unknown[])
                .map((c: unknown) =>
                  typeof c === 'string'
                    ? c
                    : c && typeof c === 'object' && 'text' in c
                      ? String((c as { text: unknown }).text)
                      : '',
                )
                .join('')
            : typeof invokeResult === 'string'
              ? invokeResult
              : String(rawContent ?? '');

      if (rawText.trim().length > 0) {
        try {
          const rawJson = extractJsonFromText(rawText);
          parsed = normalizeHookCandidates(rawJson, state.request.hookStyle);
          break; // Successfully extracted and normalized
        } catch (parseErr) {
          lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
          logger.warn(
            {
              generationId: state.generationId,
              attempt,
              rawContent: rawText.substring(0, 300),
              error: lastError.message,
            },
            '[generateHooks] JSON parsing failed on attempt',
          );
        }
      } else {
        structuredModelFailed = true;
        lastError = new Error('Model returned empty content');
        logger.warn(
          { generationId: state.generationId, attempt },
          '[generateHooks] Model returned empty content on attempt',
        );
      }
    } catch (invokeErr: unknown) {
      lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));

      const errMsg = lastError.message || '';
      if (errMsg.includes('Failed to parse') || errMsg.includes('Unexpected end of JSON')) {
        structuredModelFailed = true;
        logger.warn(
          { generationId: state.generationId, attempt, error: errMsg },
          '[generateHooks] Structured output parser failed — will retry with raw model',
        );
        continue;
      }

      const errObj = invokeErr as { error?: { error?: { failed_generation?: string } }; failed_generation?: string } | undefined;
      const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
      if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
        try {
          const rawJson = extractJsonFromText(failedGen);
          parsed = normalizeHookCandidates(rawJson, state.request.hookStyle);
          if (parsed) break;
        } catch {
          // ignore
        }
      }
      logger.warn(
        { generationId: state.generationId, attempt, error: lastError.message },
        '[generateHooks] Model invocation failed on attempt',
      );
    }
  }

  const latencyMs = Date.now() - start;

  if (!parsed) {
    logger.error(
      {
        generationId: state.generationId,
        attempts,
        lastError: lastError?.message,
      },
      '[generateHooks] Failed to parse hooks response after all attempts',
    );
    throw new WorkflowError('Failed to parse hooks response', 'generateHooks');
  }

  const result = HookCandidatesSchema.safeParse(parsed);
  if (!result.success) {
    logger.error(
      {
        generationId: state.generationId,
        parsed,
        issues: result.error.flatten(),
      },
      '[generateHooks] Invalid hooks structure',
    );
    throw new WorkflowError(
      `Invalid hooks structure: ${JSON.stringify(result.error.flatten())}`,
      'generateHooks',
    );
  }

  const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  logger.info(
    { generationId: state.generationId, hookCount: result.data.candidates.length, latencyMs },
    '[generateHooks] Completed',
  );

  return {
    hookCandidates: result.data.candidates,
    tokenUsage: [
      {
        node: 'generateHooks',
        modelId: effectiveWriterModelId,
        modelRole: 'writer',
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        latencyMs,
        calls: attempts,
      },
    ],
  };
}
