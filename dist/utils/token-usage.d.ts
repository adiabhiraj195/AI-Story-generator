export interface NodeTokenUsage {
    node: string;
    modelId: string;
    modelRole: 'writer' | 'evaluator' | 'default';
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    calls: number;
}
export interface AggregatedTokenUsage {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCalls: number;
    totalLatencyMs: number;
    byNode: NodeTokenUsage[];
    estimatedCostUsd: number | null;
}
export interface ModelPricing {
    inputPer1kTokens: number;
    outputPer1kTokens: number;
}
export declare function registerModelPricing(modelId: string, pricing: ModelPricing): void;
export declare function getPricing(modelId: string): ModelPricing | null;
/**
 * Aggregate token usage across all workflow nodes.
 * Returns estimatedCostUsd as null if any model has no registered pricing.
 */
export declare function aggregateTokenUsage(entries: NodeTokenUsage[]): AggregatedTokenUsage;
/**
 * Extract token metadata from a LangChain AIMessage response.
 * Normalises different provider response formats.
 */
export declare function extractTokenUsage(response: {
    usage_metadata?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
    };
    response_metadata?: {
        usage?: {
            input_tokens?: number;
            output_tokens?: number;
        };
        tokenUsage?: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
        };
    };
}): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};
//# sourceMappingURL=token-usage.d.ts.map