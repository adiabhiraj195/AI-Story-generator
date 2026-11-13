/**
 * Groq Model Registry & Metadata
 *
 * Defines model IDs, capabilities, context windows, and token limits
 * for foundation models served via Groq's high-performance LPU inference platform.
 */
export const GROQ_MODELS = {
    // ─── Meta Llama Models on Groq ───────────────────────────────────────────
    'llama-3.3-70b-versatile': {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'meta',
        contextWindow: 128_000,
        maxOutputTokens: 32_768,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00059, output: 0.00079 },
    },
    'llama-3.1-8b-instant': {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'meta',
        contextWindow: 128_000,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00005, output: 0.00008 },
    },
    'llama-3.2-1b-preview': {
        id: 'llama-3.2-1b-preview',
        name: 'Llama 3.2 1B Preview',
        provider: 'meta',
        contextWindow: 128_000,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00004, output: 0.00004 },
    },
    'llama-3.2-3b-preview': {
        id: 'llama-3.2-3b-preview',
        name: 'Llama 3.2 3B Preview',
        provider: 'meta',
        contextWindow: 128_000,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00006, output: 0.00006 },
    },
    'llama3-70b-8192': {
        id: 'llama3-70b-8192',
        name: 'Llama 3 70B (8k)',
        provider: 'meta',
        contextWindow: 8192,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00059, output: 0.00079 },
    },
    'llama3-8b-8192': {
        id: 'llama3-8b-8192',
        name: 'Llama 3 8B (8k)',
        provider: 'meta',
        contextWindow: 8192,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00005, output: 0.00008 },
    },
    // ─── Mistral Models on Groq ──────────────────────────────────────────────
    'mixtral-8x7b-32768': {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B Instruct (32k)',
        provider: 'mistral',
        contextWindow: 32_768,
        maxOutputTokens: 32_768,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00024, output: 0.00024 },
    },
    // ─── Google Models on Groq ───────────────────────────────────────────────
    'gemma2-9b-it': {
        id: 'gemma2-9b-it',
        name: 'Google Gemma 2 9B Instruct',
        provider: 'google',
        contextWindow: 8192,
        maxOutputTokens: 8192,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.0002, output: 0.0002 },
    },
    // ─── DeepSeek Models on Groq ─────────────────────────────────────────────
    'deepseek-r1-distill-llama-70b': {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 Distill Llama 70B',
        provider: 'deepseek',
        contextWindow: 128_000,
        maxOutputTokens: 16_384,
        defaultTemperature: 0.6,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.00075, output: 0.00099 },
    },
};
/**
 * Returns model metadata if registered, or a fallback metadata object for custom IDs.
 */
export function getModelMetadata(modelId) {
    const existing = GROQ_MODELS[modelId];
    if (existing)
        return existing;
    let provider = 'other';
    if (modelId.includes('llama'))
        provider = 'meta';
    else if (modelId.includes('mixtral') || modelId.includes('mistral'))
        provider = 'mistral';
    else if (modelId.includes('gemma'))
        provider = 'google';
    else if (modelId.includes('deepseek'))
        provider = 'deepseek';
    return {
        id: modelId,
        name: modelId,
        provider,
        contextWindow: 32_768,
        maxOutputTokens: 4096,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        pricingUsdPer1k: { input: 0.0005, output: 0.0008 },
    };
}
//# sourceMappingURL=groq-models.js.map