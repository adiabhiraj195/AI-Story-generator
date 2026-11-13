import { SystemMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildConceptPrompt } from '../../prompts/concept.prompt.js';
import { StoryConceptSchema, type StoryConcept } from '../../schemas/concept.schema.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveWriterModelId } from '../../../config/env.js';
import type { WorkflowState } from '../state.js';

export function normalizeConceptObject(parsed: unknown): StoryConcept | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const root = (obj['concept'] ?? obj['storyConcept'] ?? obj) as Record<string, unknown>;

  const getField = (...keys: string[]): string => {
    for (const k of keys) {
      if (root[k] !== undefined && root[k] !== null) {
        if (typeof root[k] === 'object') {
          const innerObj = root[k] as Record<string, unknown>;
          const name = innerObj['name'] ?? innerObj['character'] ?? '';
          const traits = Array.isArray(innerObj['traits']) ? innerObj['traits'].join(', ') : (innerObj['traits'] ?? '');
          const combined = [name, traits].filter(Boolean).join(' - ');
          if (combined) return combined;
        }
        return String(root[k]).trim();
      }
    }
    const lowerMap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(root)) {
      lowerMap[k.toLowerCase().replace(/[\s_-]/g, '')] = v;
    }
    for (const k of keys) {
      const cleanK = k.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerMap[cleanK] !== undefined && lowerMap[cleanK] !== null) {
        if (typeof lowerMap[cleanK] === 'object') {
          const innerObj = lowerMap[cleanK] as Record<string, unknown>;
          const name = innerObj['name'] ?? innerObj['character'] ?? '';
          const traits = Array.isArray(innerObj['traits']) ? innerObj['traits'].join(', ') : (innerObj['traits'] ?? '');
          const combined = [name, traits].filter(Boolean).join(' - ');
          if (combined) return combined;
        }
        return String(lowerMap[cleanK]).trim();
      }
    }
    return '';
  };

  const premise = getField('premise', 'storyPremise', 'summary');
  const protagonist = getField('protagonist', 'character', 'mainCharacter') || 'Protagonist';
  const motivation = getField('motivation', 'goal') || 'To overcome the central obstacle';
  const setting = getField('setting', 'world') || 'A compelling setting';
  const centralConflict = getField('centralConflict', 'conflict', 'mainConflict') || 'A critical conflict';
  const stakes = getField('stakes', 'risk') || 'High personal stakes';
  const incitingIncident = getField('incitingIncident', 'trigger', 'startingEvent') || 'A catalyst event';
  const majorRevelation = getField('majorRevelation', 'twist', 'revelation') || 'A startling revelation';
  const emotionalJourney = getField('emotionalJourney', 'emotionalArc', 'arc') || 'Tension to resolution';
  const climaxDirection = getField('climaxDirection', 'climax') || 'A decisive confrontation';
  const endingDirection = getField('endingDirection', 'ending', 'resolution') || 'A complete resolution';

  if (premise.length >= 5) {
    return {
      premise,
      protagonist,
      motivation,
      setting,
      centralConflict,
      stakes,
      incitingIncident,
      majorRevelation,
      emotionalJourney,
      climaxDirection,
      endingDirection,
    };
  }

  return null;
}

export async function generateConceptNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  logger.info({ generationId: state.generationId }, '[generateConcept] Starting');
  const start = Date.now();

  const baseModel = createGroqModel('concept');
  const model =
    typeof baseModel.withStructuredOutput === 'function'
      ? baseModel.withStructuredOutput(StoryConceptSchema, {
          method: 'jsonMode',
          includeRaw: true,
        })
      : baseModel;
  const basePrompt = buildConceptPrompt(state.request, state.targetWordCount);

  let response: BaseMessage | null = null;
  let parsed: StoryConcept | null = null;
  let lastError: Error | null = null;
  let attempts = 0;
  let structuredModelFailed = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide a complete creative concept in json format with all required fields.`;

    const input = [
      new SystemMessage('You are a creative story architect. Output a json object adhering to the schema.'),
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
          parsed = normalizeConceptObject(structuredResult.parsed);
          if (parsed) break;
        }
        if (!parsed && structuredResult.raw?.content) {
          try {
            const rawJson = extractJsonFromText(structuredResult.raw.content);
            parsed = normalizeConceptObject(rawJson);
            if (parsed) break;
          } catch {
            // fall through
          }
        }
      }

      // 2. Direct parsed concept object
      if (
        !parsed &&
        invokeResult &&
        typeof invokeResult === 'object' &&
        ('premise' in invokeResult || 'Premise' in invokeResult)
      ) {
        parsed = normalizeConceptObject(invokeResult);
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
          parsed = normalizeConceptObject(rawJson);
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
            '[generateConcept] Concept parsing failed on attempt',
          );
        }
      } else {
        structuredModelFailed = true;
        lastError = new Error('Model returned empty content');
        logger.warn(
          { generationId: state.generationId, attempt },
          '[generateConcept] Model returned empty content on attempt',
        );
      }
    } catch (invokeErr: unknown) {
      lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));

      const errMsg = lastError.message || '';
      if (errMsg.includes('Failed to parse') || errMsg.includes('Unexpected end of JSON')) {
        structuredModelFailed = true;
        logger.warn(
          { generationId: state.generationId, attempt, error: errMsg },
          '[generateConcept] Structured output parser failed — will retry with raw model',
        );
        continue;
      }

      const errObj = invokeErr as { error?: { error?: { failed_generation?: string } }; failed_generation?: string } | undefined;
      const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
      if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
        try {
          const rawJson = extractJsonFromText(failedGen);
          parsed = normalizeConceptObject(rawJson);
          if (parsed) break;
        } catch {
          // ignore
        }
      }
      logger.warn(
        { generationId: state.generationId, attempt, error: lastError.message },
        '[generateConcept] Model invocation failed on attempt',
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
      '[generateConcept] Failed to parse concept response after all attempts',
    );
    throw new WorkflowError('Failed to parse concept response', 'generateConcept');
  }

  const result = StoryConceptSchema.safeParse(parsed);
  if (!result.success) {
    logger.error(
      {
        generationId: state.generationId,
        parsed,
        issues: result.error.flatten(),
      },
      '[generateConcept] Invalid concept structure',
    );
    throw new WorkflowError(
      `Invalid concept structure: ${JSON.stringify(result.error.flatten())}`,
      'generateConcept',
    );
  }

  const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  logger.info({ generationId: state.generationId, premise: result.data.premise, latencyMs }, '[generateConcept] Completed');

  return {
    storyConcept: result.data,
    tokenUsage: [
      {
        node: 'generateConcept',
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
