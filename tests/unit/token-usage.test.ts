import { describe, it, expect } from 'vitest';
import {
  aggregateTokenUsage,
  extractTokenUsage,
  registerModelPricing,
  getPricing,
  type NodeTokenUsage,
} from '../../src/utils/token-usage.js';

describe('Token Usage and Pricing Observability', () => {
  it('extracts tokens from LangChain standard usage_metadata', () => {
    const response = {
      usage_metadata: {
        input_tokens: 120,
        output_tokens: 280,
        total_tokens: 400,
      },
    };
    const usage = extractTokenUsage(response);
    expect(usage.inputTokens).toBe(120);
    expect(usage.outputTokens).toBe(280);
    expect(usage.totalTokens).toBe(400);
  });

  it('extracts tokens from response_metadata fallback', () => {
    const response = {
      response_metadata: {
        usage: {
          input_tokens: 50,
          output_tokens: 75,
        },
      },
    };
    const usage = extractTokenUsage(response);
    expect(usage.inputTokens).toBe(50);
    expect(usage.outputTokens).toBe(75);
    expect(usage.totalTokens).toBe(125);
  });

  it('aggregates token usage across multiple workflow nodes', () => {
    const entries: NodeTokenUsage[] = [
      {
        node: 'generateConcept',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        modelRole: 'writer',
        inputTokens: 500,
        outputTokens: 300,
        totalTokens: 800,
        latencyMs: 1200,
        calls: 1,
      },
      {
        node: 'generateHooks',
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        modelRole: 'writer',
        inputTokens: 300,
        outputTokens: 150,
        totalTokens: 450,
        latencyMs: 800,
        calls: 1,
      },
      {
        node: 'evaluateHooks',
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        modelRole: 'evaluator',
        inputTokens: 400,
        outputTokens: 100,
        totalTokens: 500,
        latencyMs: 600,
        calls: 1,
      },
    ];

    const aggregated = aggregateTokenUsage(entries);
    expect(aggregated.totalInputTokens).toBe(1200);
    expect(aggregated.totalOutputTokens).toBe(550);
    expect(aggregated.totalTokens).toBe(1750);
    expect(aggregated.totalCalls).toBe(3);
    expect(aggregated.totalLatencyMs).toBe(2600);
    expect(aggregated.byNode).toHaveLength(3);
    expect(aggregated.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('returns estimatedCostUsd as null if a model has no pricing registered', () => {
    const entries: NodeTokenUsage[] = [
      {
        node: 'customNode',
        modelId: 'unknown-custom-model-id',
        modelRole: 'writer',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        latencyMs: 1000,
        calls: 1,
      },
    ];

    const aggregated = aggregateTokenUsage(entries);
    expect(aggregated.totalTokens).toBe(1500);
    expect(aggregated.estimatedCostUsd).toBeNull();
  });

  it('allows registering custom model pricing dynamically', () => {
    registerModelPricing('my-custom-model', {
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.002,
    });

    const pricing = getPricing('my-custom-model');
    expect(pricing).not.toBeNull();
    expect(pricing?.inputPer1kTokens).toBe(0.001);

    const entries: NodeTokenUsage[] = [
      {
        node: 'node1',
        modelId: 'my-custom-model',
        modelRole: 'writer',
        inputTokens: 2000,
        outputTokens: 1000,
        totalTokens: 3000,
        latencyMs: 500,
        calls: 1,
      },
    ];

    const aggregated = aggregateTokenUsage(entries);
    // (2000/1000)*0.001 + (1000/1000)*0.002 = 0.002 + 0.002 = 0.004
    expect(aggregated.estimatedCostUsd).toBe(0.004);
  });
});

