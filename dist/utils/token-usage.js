// ---------------------------------------------------------------------------
// Token usage tracking and cost estimation
// ---------------------------------------------------------------------------
const PRICING_REGISTRY = {
    // ─── Groq Models ───────────────────────────────────────────────────────────
    'llama-3.3-70b-versatile': {
        inputPer1kTokens: 0.00059,
        outputPer1kTokens: 0.00079,
    },
    'llama-3.1-8b-instant': {
        inputPer1kTokens: 0.00005,
        outputPer1kTokens: 0.00008,
    },
    'llama-3.2-1b-preview': {
        inputPer1kTokens: 0.00004,
        outputPer1kTokens: 0.00004,
    },
    'llama-3.2-3b-preview': {
        inputPer1kTokens: 0.00006,
        outputPer1kTokens: 0.00006,
    },
    'llama3-70b-8192': {
        inputPer1kTokens: 0.00059,
        outputPer1kTokens: 0.00079,
    },
    'llama3-8b-8192': {
        inputPer1kTokens: 0.00005,
        outputPer1kTokens: 0.00008,
    },
    'mixtral-8x7b-32768': {
        inputPer1kTokens: 0.00024,
        outputPer1kTokens: 0.00024,
    },
    'gemma2-9b-it': {
        inputPer1kTokens: 0.0002,
        outputPer1kTokens: 0.0002,
    },
    'deepseek-r1-distill-llama-70b': {
        inputPer1kTokens: 0.00075,
        outputPer1kTokens: 0.00099,
    },
    // ─── Bedrock Models (Legacy Reference) ────────────────────────────────────
    'anthropic.claude-3-sonnet-20240229-v1:0': {
        inputPer1kTokens: 0.003,
        outputPer1kTokens: 0.015,
    },
    'anthropic.claude-3-haiku-20240307-v1:0': {
        inputPer1kTokens: 0.00025,
        outputPer1kTokens: 0.00125,
    },
    'anthropic.claude-3-5-sonnet-20241022-v2:0': {
        inputPer1kTokens: 0.003,
        outputPer1kTokens: 0.015,
    },
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0': {
        inputPer1kTokens: 0.003,
        outputPer1kTokens: 0.015,
    },
    'anthropic.claude-3-5-haiku-20241022-v1:0': {
        inputPer1kTokens: 0.001,
        outputPer1kTokens: 0.005,
    },
    'us.anthropic.claude-3-5-haiku-20241022-v1:0': {
        inputPer1kTokens: 0.001,
        outputPer1kTokens: 0.005,
    },
    'amazon.nova-pro-v1:0': {
        inputPer1kTokens: 0.0008,
        outputPer1kTokens: 0.0032,
    },
    'us.amazon.nova-pro-v1:0': {
        inputPer1kTokens: 0.0008,
        outputPer1kTokens: 0.0032,
    },
    'amazon.nova-lite-v1:0': {
        inputPer1kTokens: 0.00006,
        outputPer1kTokens: 0.00024,
    },
    'us.amazon.nova-lite-v1:0': {
        inputPer1kTokens: 0.00006,
        outputPer1kTokens: 0.00024,
    },
    'amazon.nova-micro-v1:0': {
        inputPer1kTokens: 0.000035,
        outputPer1kTokens: 0.00014,
    },
    'us.amazon.nova-micro-v1:0': {
        inputPer1kTokens: 0.000035,
        outputPer1kTokens: 0.00014,
    },
    'meta.llama3-3-70b-instruct-v1:0': {
        inputPer1kTokens: 0.00072,
        outputPer1kTokens: 0.00072,
    },
    'us.meta.llama3-3-70b-instruct-v1:0': {
        inputPer1kTokens: 0.00072,
        outputPer1kTokens: 0.00072,
    },
    'meta.llama3-2-3b-instruct-v1:0': {
        inputPer1kTokens: 0.00015,
        outputPer1kTokens: 0.00015,
    },
    'us.meta.llama3-2-3b-instruct-v1:0': {
        inputPer1kTokens: 0.00015,
        outputPer1kTokens: 0.00015,
    },
    'meta.llama3-1-8b-instruct-v1:0': {
        inputPer1kTokens: 0.00022,
        outputPer1kTokens: 0.00022,
    },
    'us.meta.llama3-1-8b-instruct-v1:0': {
        inputPer1kTokens: 0.00022,
        outputPer1kTokens: 0.00022,
    },
};
export function registerModelPricing(modelId, pricing) {
    PRICING_REGISTRY[modelId] = pricing;
}
export function getPricing(modelId) {
    return PRICING_REGISTRY[modelId] ?? null;
}
function calculateCostForEntry(entry) {
    const pricing = getPricing(entry.modelId);
    if (!pricing)
        return null;
    const inputCost = (entry.inputTokens / 1000) * pricing.inputPer1kTokens;
    const outputCost = (entry.outputTokens / 1000) * pricing.outputPer1kTokens;
    return inputCost + outputCost;
}
/**
 * Aggregate token usage across all workflow nodes.
 * Returns estimatedCostUsd as null if any model has no registered pricing.
 */
export function aggregateTokenUsage(entries) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCalls = 0;
    let totalLatencyMs = 0;
    let totalCostUsd = 0;
    for (const entry of entries) {
        totalInputTokens += entry.inputTokens;
        totalOutputTokens += entry.outputTokens;
        totalCalls += entry.calls;
        totalLatencyMs += entry.latencyMs;
        const entryCost = calculateCostForEntry(entry);
        if (entryCost === null) {
            totalCostUsd = null; // Unknown pricing — entire cost becomes unknown
        }
        else if (totalCostUsd !== null) {
            totalCostUsd += entryCost;
        }
    }
    return {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCalls,
        totalLatencyMs,
        byNode: entries,
        estimatedCostUsd: totalCostUsd !== null ? Math.round(totalCostUsd * 1_000_000) / 1_000_000 : null,
    };
}
/**
 * Extract token metadata from a LangChain AIMessage response.
 * Normalises different provider response formats.
 */
export function extractTokenUsage(response) {
    // Prefer usage_metadata (LangChain standard)
    if (response.usage_metadata) {
        const input = response.usage_metadata.input_tokens ?? 0;
        const output = response.usage_metadata.output_tokens ?? 0;
        return { inputTokens: input, outputTokens: output, totalTokens: input + output };
    }
    // Fallback: response_metadata.usage (some providers)
    if (response.response_metadata?.usage) {
        const input = response.response_metadata.usage.input_tokens ?? 0;
        const output = response.response_metadata.usage.output_tokens ?? 0;
        return { inputTokens: input, outputTokens: output, totalTokens: input + output };
    }
    // Fallback: OpenAI-style tokenUsage
    if (response.response_metadata?.tokenUsage) {
        const input = response.response_metadata.tokenUsage.promptTokens ?? 0;
        const output = response.response_metadata.tokenUsage.completionTokens ?? 0;
        return { inputTokens: input, outputTokens: output, totalTokens: input + output };
    }
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}
//# sourceMappingURL=token-usage.js.map