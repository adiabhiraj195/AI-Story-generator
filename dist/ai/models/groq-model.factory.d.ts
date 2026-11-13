import { ChatGroq } from '@langchain/groq';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
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
/**
 * Create a ChatGroq instance for a given role.
 *
 * Uses:
 * 1. Explicit apiKey if provided via overrides / options.
 * 2. GROQ_API_KEY environment variable.
 */
export declare function createGroqModel(role?: ModelRole, overrides?: Partial<ModelConfig>): ChatGroq;
/**
 * Create a writer model instance.
 */
export declare function createWriterModel(overrides?: Partial<ModelConfig>): ChatGroq;
/**
 * Create an evaluator model instance.
 */
export declare function createEvaluatorModel(overrides?: Partial<ModelConfig>): ChatGroq;
/**
 * Safely invoke a Groq model with robust, informative error handling.
 */
export declare function invokeGroqSafely(model: ChatGroq, input: BaseLanguageModelInput, options?: Parameters<ChatGroq['invoke']>[1]): Promise<import("@langchain/core/messages").AIMessageChunk>;
/**
 * Attempt structured output via withStructuredOutput.
 * Falls back gracefully if the model doesn't support tool-based structured output.
 */
export declare function withStructuredOutputSafe(model: ChatGroq, schema: Parameters<ChatGroq['withStructuredOutput']>[0], config?: Parameters<ChatGroq['withStructuredOutput']>[1]): import("@langchain/core/runnables").Runnable<BaseLanguageModelInput, {
    raw: import("@langchain/core/messages").BaseMessage;
    parsed: Record<string, any>;
}, import("@langchain/core/runnables").RunnableConfig<Record<string, any>>>;
/**
 * Attempts to parse JSON string, applying repairs for common LLM syntax issues:
 * unescaped string newlines, comments, trailing commas, single-quotes, and unclosed brackets.
 */
export declare function parseJsonWithRepairs(str: string): unknown;
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
export declare function extractJsonFromText(raw: unknown): unknown;
export declare const createBedrockModel: typeof createGroqModel;
export declare const createModel: typeof createGroqModel;
export declare const invokeBedrockSafely: typeof invokeGroqSafely;
//# sourceMappingURL=groq-model.factory.d.ts.map