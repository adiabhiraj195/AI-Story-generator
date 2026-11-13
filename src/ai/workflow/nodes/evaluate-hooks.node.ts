import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildHookEvaluationPrompt } from '../../prompts/hook.prompt.js';
import { HookEvaluationSchema, type HookEvaluation } from '../../schemas/hook.schema.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveEvaluatorModelId } from '../../../config/env.js';
import type { WorkflowState } from '../state.js';

export function normalizeHookEvaluation(parsed: unknown, maxIndex = 2): HookEvaluation | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const root = (obj['evaluation'] ?? obj['hookEvaluation'] ?? obj) as Record<string, unknown>;

  const scoresRaw = (root['scores'] && typeof root['scores'] === 'object' ? root['scores'] : {}) as Record<string, unknown>;

  const toScore = (val: unknown, def = 8): number => {
    if (typeof val === 'number' && !isNaN(val)) return Math.min(10, Math.max(1, Math.round(val)));
    if (typeof val === 'string' && !isNaN(parseFloat(val))) return Math.min(10, Math.max(1, Math.round(parseFloat(val))));
    return def;
  };

  const scores = {
    curiosity: toScore(scoresRaw['curiosity']),
    clarity: toScore(scoresRaw['clarity']),
    impact: toScore(scoresRaw['impact']),
    relevance: toScore(scoresRaw['relevance']),
    promiseFulfillment: toScore(scoresRaw['promiseFulfillment'] ?? scoresRaw['promise']),
    narrationQuality: toScore(scoresRaw['narrationQuality'] ?? scoresRaw['narration']),
  };

  const overallScore = typeof root['overallScore'] === 'number' && !isNaN(root['overallScore'])
    ? Math.min(10, Math.max(1, parseFloat(root['overallScore'].toFixed(1))))
    : typeof root['overallScore'] === 'string' && !isNaN(parseFloat(root['overallScore']))
      ? Math.min(10, Math.max(1, parseFloat(parseFloat(root['overallScore']).toFixed(1))))
      : 8.5;

  let rawIdx = root['selectedCandidateIndex'] ?? root['selectedHookIndex'] ?? root['selectedIndex'] ?? root['selectedCandidate'];
  let selectedCandidateIndex = 0;
  if (typeof rawIdx === 'number' && !isNaN(rawIdx)) {
    selectedCandidateIndex = Math.round(rawIdx);
  } else if (typeof rawIdx === 'string' && !isNaN(parseInt(rawIdx, 10))) {
    selectedCandidateIndex = parseInt(rawIdx, 10);
  }

  // Handle 1-indexed LLM responses (e.g. 1, 2, 3 instead of 0, 1, 2)
  if (selectedCandidateIndex > maxIndex && selectedCandidateIndex === maxIndex + 1) {
    selectedCandidateIndex = maxIndex;
  } else if (selectedCandidateIndex > maxIndex) {
    selectedCandidateIndex = Math.min(maxIndex, Math.max(0, selectedCandidateIndex - 1));
  }
  selectedCandidateIndex = Math.max(0, Math.min(maxIndex, selectedCandidateIndex));

  const reasoning = String(root['reasoning'] ?? root['explanation'] ?? 'Selected based on highest curiosity and emotional impact.').trim();

  return {
    scores,
    overallScore,
    selectedCandidateIndex,
    reasoning,
  };
}

export async function evaluateHooksNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  logger.info({ generationId: state.generationId }, '[evaluateHooks] Starting');

  if (!state.storyConcept || state.hookCandidates.length === 0) {
    throw new WorkflowError('storyConcept and hookCandidates are required', 'evaluateHooks');
  }

  const start = Date.now();
  const baseModel = createGroqModel('evaluator');
  const model =
    typeof baseModel.withStructuredOutput === 'function'
      ? baseModel.withStructuredOutput(HookEvaluationSchema, {
          method: 'jsonMode',
          includeRaw: true,
        })
      : baseModel;
  const basePrompt = buildHookEvaluationPrompt(state.hookCandidates, state.storyConcept);

  let response: BaseMessage | null = null;
  let parsed: HookEvaluation | null = null;
  let lastError: Error | null = null;
  let attempts = 0;
  let structuredModelFailed = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide a complete evaluation in json format with scores for each dimension, overallScore, selectedCandidateIndex (0, 1, or 2), and reasoning.`;

    const input = [
      new SystemMessage('You are a story quality evaluator. Output a json object adhering to the schema.'),
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
          parsed = normalizeHookEvaluation(structuredResult.parsed, state.hookCandidates.length - 1);
          if (parsed) break;
        }
        if (!parsed && structuredResult.raw?.content) {
          try {
            const rawJson = extractJsonFromText(structuredResult.raw.content);
            parsed = normalizeHookEvaluation(rawJson, state.hookCandidates.length - 1);
            if (parsed) break;
          } catch {
            // fall through
          }
        }
      }

      // 2. Direct parsed hook evaluation object
      if (
        !parsed &&
        invokeResult &&
        typeof invokeResult === 'object' &&
        ('scores' in invokeResult || 'overallScore' in invokeResult)
      ) {
        parsed = normalizeHookEvaluation(invokeResult, state.hookCandidates.length - 1);
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
          parsed = normalizeHookEvaluation(rawJson, state.hookCandidates.length - 1);
          if (parsed) break;
        } catch (parseErr) {
          lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
          logger.warn(
            {
              generationId: state.generationId,
              attempt,
              rawContent: rawText.substring(0, 300),
              error: lastError.message,
            },
            '[evaluateHooks] Hook evaluation parsing failed on attempt',
          );
        }
      } else {
        structuredModelFailed = true;
        lastError = new Error('Model returned empty content');
        logger.warn(
          { generationId: state.generationId, attempt },
          '[evaluateHooks] Model returned empty content on attempt',
        );
      }
    } catch (invokeErr: unknown) {
      lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));

      const errMsg = lastError.message || '';
      if (errMsg.includes('Failed to parse') || errMsg.includes('Unexpected end of JSON')) {
        structuredModelFailed = true;
        logger.warn(
          { generationId: state.generationId, attempt, error: errMsg },
          '[evaluateHooks] Structured output parser failed — will retry with raw model',
        );
        continue;
      }

      const errObj = invokeErr as { error?: { error?: { failed_generation?: string } }; failed_generation?: string } | undefined;
      const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
      if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
        try {
          const rawJson = extractJsonFromText(failedGen);
          parsed = normalizeHookEvaluation(rawJson, state.hookCandidates.length - 1);
          if (parsed) break;
        } catch {
          // ignore
        }
      }
      logger.warn(
        { generationId: state.generationId, attempt, error: lastError.message },
        '[evaluateHooks] Model invocation failed on attempt',
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
      '[evaluateHooks] Failed to parse hook evaluation response after all attempts',
    );
    throw new WorkflowError('Failed to parse hook evaluation response', 'evaluateHooks');
  }

  const result = HookEvaluationSchema.safeParse(parsed);
  if (!result.success) {
    logger.error(
      {
        generationId: state.generationId,
        parsed,
        issues: result.error.flatten(),
      },
      '[evaluateHooks] Invalid hook evaluation structure',
    );
    throw new WorkflowError(
      `Invalid hook evaluation structure: ${JSON.stringify(result.error.flatten())}`,
      'evaluateHooks',
    );
  }

  const selectedIndex = result.data.selectedCandidateIndex;
  const selectedCandidate = state.hookCandidates[selectedIndex];
  if (!selectedCandidate) {
    throw new WorkflowError(`Selected hook index ${selectedIndex} is out of bounds`, 'evaluateHooks');
  }

  const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  logger.info(
    {
      generationId: state.generationId,
      selectedIndex,
      overallScore: result.data.overallScore,
      selectedHook: selectedCandidate.text,
      latencyMs,
    },
    '[evaluateHooks] Completed',
  );

  return {
    hookEvaluation: result.data,
    selectedHook: selectedCandidate,
    tokenUsage: [
      {
        node: 'evaluateHooks',
        modelId: effectiveEvaluatorModelId,
        modelRole: 'evaluator',
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        latencyMs,
        calls: attempts,
      },
    ],
  };
}
