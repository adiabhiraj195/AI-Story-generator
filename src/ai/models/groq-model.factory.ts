import { ChatGroq } from '@langchain/groq';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import {
  env,
  effectiveGroqModel,
  effectiveWriterModelId,
  effectiveEvaluatorModelId,
} from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { parseGroqError } from '../../utils/errors.js';
import { getModelMetadata } from './groq-models.js';

// ---------------------------------------------------------------------------
// Model configuration
// ---------------------------------------------------------------------------

export interface ModelConfig {
  modelId: string;
  apiKey?: string | undefined;
  temperature: number;
  maxTokens: number;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  streaming?: boolean | undefined;
}

export type ModelRole = 'default' | 'writer' | 'evaluator' | 'concept' | 'hooks' | 'outline' | 'revision';

const ROLE_CONFIGS: Record<ModelRole, Partial<ModelConfig>> = {
  default: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  concept: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  hooks: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  outline: {
    temperature: 0.7,
    maxTokens: 4096,
  },
  writer: {
    temperature: 0.85,
    maxTokens: env.GROQ_WRITER_MAX_TOKENS ?? 4096,
  },
  evaluator: {
    temperature: 0.1,
    maxTokens: env.GROQ_EVALUATOR_MAX_TOKENS ?? 2048,
  },
  revision: {
    temperature: 0.75,
    maxTokens: env.GROQ_WRITER_MAX_TOKENS ?? 4096,
  },
};

function getModelIdForRole(role: ModelRole): string {
  if (role === 'evaluator') return effectiveEvaluatorModelId;
  if (role === 'writer' || role === 'revision') return effectiveWriterModelId;
  if (role === 'concept' || role === 'hooks' || role === 'outline') return effectiveWriterModelId;
  return effectiveGroqModel;
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create a ChatGroq instance for a given role.
 *
 * Uses:
 * 1. Explicit apiKey if provided via overrides / options.
 * 2. GROQ_API_KEY environment variable.
 */
export function createGroqModel(
  role: ModelRole = 'default',
  overrides?: Partial<ModelConfig>,
): ChatGroq {
  const roleDefaults = ROLE_CONFIGS[role] ?? ROLE_CONFIGS.default;
  const modelId = overrides?.modelId ?? getModelIdForRole(role);
  const rawKey =
    overrides?.apiKey ??
    env.GROQ_API_KEY ??
    process.env['GROQ_API_KEY'];
  const apiKey =
    rawKey && rawKey.trim().length > 0
      ? rawKey.trim()
      : 'gsk_placeholder_api_key_for_offline_validation';
  const temperature = overrides?.temperature ?? roleDefaults.temperature ?? 0.7;
  const maxTokens = overrides?.maxTokens ?? roleDefaults.maxTokens ?? 2048;
  const maxRetries = overrides?.maxRetries ?? 2;
  const metadata = getModelMetadata(modelId);

  const isRealKey = apiKey !== 'gsk_placeholder_api_key_for_offline_validation';

  logger.debug(
    {
      role,
      modelId,
      temperature,
      maxTokens,
      hasApiKey: isRealKey,
      apiKeyPrefix: isRealKey ? `${apiKey.slice(0, 7)}...` : undefined,
      provider: metadata.provider,
    },
    '[groq] Creating model instance',
  );

  return new ChatGroq({
    model: modelId,
    apiKey,
    temperature,
    maxTokens,
    maxRetries,
    ...(overrides?.timeoutMs ? { timeout: overrides.timeoutMs } : {}),
    ...(overrides?.streaming !== undefined ? { streaming: overrides.streaming } : {}),
  });
}

/**
 * Create a writer model instance.
 */
export function createWriterModel(overrides?: Partial<ModelConfig>): ChatGroq {
  return createGroqModel('writer', overrides);
}

/**
 * Create an evaluator model instance.
 */
export function createEvaluatorModel(overrides?: Partial<ModelConfig>): ChatGroq {
  return createGroqModel('evaluator', overrides);
}

/**
 * Safely invoke a Groq model with robust, informative error handling.
 */
export async function invokeGroqSafely(
  model: ChatGroq,
  input: BaseLanguageModelInput,
  options?: Parameters<ChatGroq['invoke']>[1],
) {
  try {
    return await model.invoke(input, options);
  } catch (err) {
    const groqErr = parseGroqError(err, {
      modelId: model.model,
    });
    logger.error(
      {
        modelId: model.model,
        errorCode: groqErr.errorCode,
        isRetryable: groqErr.isRetryable,
        err: groqErr.message,
      },
      '[groq] Model invocation failed',
    );
    throw groqErr;
  }
}

/**
 * Attempt structured output via withStructuredOutput.
 * Falls back gracefully if the model doesn't support tool-based structured output.
 */
export function withStructuredOutputSafe(
  model: ChatGroq,
  schema: Parameters<ChatGroq['withStructuredOutput']>[0],
  config?: Parameters<ChatGroq['withStructuredOutput']>[1],
) {
  try {
    return model.withStructuredOutput(schema, config);
  } catch (err) {
    logger.warn({ err }, '[groq] withStructuredOutput not supported — will use JSON fallback');
    throw err;
  }
}

function autoCloseJson(str: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let closed = str;
  if (inString) {
    closed += '"';
  }
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') closed += '}';
    else if (last === '[') closed += ']';
  }

  return closed.replace(/,(\s*[}\]])/g, '$1');
}

function escapeControlCharsInJsonStrings(str: string): string {
  let inString = false;
  let escape = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      result += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      result += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Attempts to parse JSON string, applying repairs for common LLM syntax issues:
 * unescaped string newlines, comments, trailing commas, single-quotes, and unclosed brackets.
 */
export function parseJsonWithRepairs(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    // Attempt 1: Handle unescaped newlines/tabs inside string literals
    const escaped = escapeControlCharsInJsonStrings(str);
    try {
      return JSON.parse(escaped);
    } catch {
      // Attempt 2: Strip comments and trailing commas
      const repaired = escaped
        .replace(/(^|[^\\])\/\/.*$/gm, '$1')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();

      try {
        return JSON.parse(repaired);
      } catch {
        // Attempt 3: Auto-close truncated JSON
        try {
          const autoClosed = autoCloseJson(repaired);
          return JSON.parse(autoClosed);
        } catch {
          // Attempt 4: Convert Python-style single quotes to double quotes
          try {
            const doubleQuoted = repaired
              .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
              .replace(/,(\s*[}\]])/g, '$1');
            return JSON.parse(doubleQuoted);
          } catch {
            // Re-throw with cleaned string attempt
            return JSON.parse(repaired);
          }
        }
      }
    }
  }
}

/**
 * Parse JSON from an LLM text or message response with robust error recovery.
 * Handles:
 * - Non-string / message array inputs
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Thinking/reasoning tags (<think>...</think>, <thought>...</thought>)
 * - Trailing commas before closing brackets/braces
 * - Comments (// and /* *\/)
 * - Truncated JSON structures (auto-closing open strings & brackets)
 * - Single-quoted Python-style JSON dicts
 */
export function extractJsonFromText(raw: unknown): unknown {
  if (raw === null || raw === undefined) {
    throw new Error('extractJsonFromText received null or undefined input');
  }

  let text: string;
  if (typeof raw === 'string') {
    text = raw;
  } else if (Array.isArray(raw)) {
    text = raw
      .map((item) => (typeof item === 'string' ? item : (item as { text?: string })?.text ?? ''))
      .join('');
  } else if (typeof raw === 'object' && 'text' in (raw as Record<string, unknown>)) {
    text = String((raw as { text: unknown }).text);
  } else {
    text = String(raw);
  }

  let cleaned = text.trim();

  // 1. Remove thinking / reasoning blocks emitted by CoT / reasoning models
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  // 2. Extract content from markdown code fences if present
  const fenceMatches = [...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  if (fenceMatches.length > 0) {
    for (const match of fenceMatches) {
      const block = match[1]?.trim();
      if (block && (block.startsWith('{') || block.startsWith('['))) {
        try {
          return parseJsonWithRepairs(block);
        } catch {
          // Try next fence block or fall through
        }
      }
    }
  }

  // 3. Try to locate outermost matching JSON boundaries ({ ... } or [ ... ])
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let isObject = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const endChar = isObject ? '}' : ']';
    const lastIdx = cleaned.lastIndexOf(endChar);
    if (lastIdx > startIdx) {
      const candidate = cleaned.substring(startIdx, lastIdx + 1);
      try {
        return parseJsonWithRepairs(candidate);
      } catch {
        // Fall back to general parse
      }
    }
  }

  return parseJsonWithRepairs(cleaned);
}

// ---------------------------------------------------------------------------
// Backward-compatibility aliases
// ---------------------------------------------------------------------------
export const createBedrockModel = createGroqModel;
export const createModel = createGroqModel;
export const invokeBedrockSafely = invokeGroqSafely;
