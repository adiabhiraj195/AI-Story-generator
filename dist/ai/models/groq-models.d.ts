/**
 * Groq Model Registry & Metadata
 *
 * Defines model IDs, capabilities, context windows, and token limits
 * for foundation models served via Groq's high-performance LPU inference platform.
 */
export type ModelProvider = 'meta' | 'mistral' | 'google' | 'deepseek' | 'other';
export interface ModelMetadata {
    id: string;
    name: string;
    provider: ModelProvider;
    contextWindow: number;
    maxOutputTokens: number;
    defaultTemperature: number;
    supportsStreaming: boolean;
    supportsToolCalling: boolean;
    supportsStructuredOutput: boolean;
    pricingUsdPer1k: {
        input: number;
        output: number;
    };
}
export declare const GROQ_MODELS: Record<string, ModelMetadata>;
/**
 * Returns model metadata if registered, or a fallback metadata object for custom IDs.
 */
export declare function getModelMetadata(modelId: string): ModelMetadata;
//# sourceMappingURL=groq-models.d.ts.map