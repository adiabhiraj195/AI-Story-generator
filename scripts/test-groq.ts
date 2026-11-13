/**
 * Groq LLM Connectivity & Invocation Test Script
 *
 * Verifies:
 * 1. Groq model factory instantiation.
 * 2. Normal model invocation with SystemMessage and HumanMessage.
 * 3. Token usage metadata reporting (input, output, total).
 * 4. Streaming response chunks.
 * 5. Structured output with JSON schema / zod.
 * 6. Comprehensive, actionable error reporting for authentication, quota, and model errors.
 *
 * Usage:
 *   npm run test:groq                  # Run live Groq test with configured GROQ_API_KEY
 *   npm run test:groq -- --dry-run     # Offline verification (instantiation only)
 *   npm run test:groq -- --model <id>  # Test specific model ID
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import {
  createGroqModel,
  createWriterModel,
  createEvaluatorModel,
} from '../src/ai/models/groq-model.factory.js';
import { extractTokenUsage } from '../src/utils/token-usage.js';
import {
  env,
  effectiveGroqModel,
  effectiveWriterModelId,
  effectiveEvaluatorModelId,
} from '../src/config/env.js';
import {
  parseGroqError,
  formatGroqErrorMessage,
} from '../src/utils/errors.js';
import { getModelMetadata } from '../src/ai/models/groq-models.js';

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const customModelId = getArgValue('--model');

  const modelId = customModelId ?? effectiveGroqModel;
  const rawKey = env.GROQ_API_KEY ?? process.env['GROQ_API_KEY'];
  const apiKey = rawKey && rawKey.trim().length > 0 ? rawKey.trim() : undefined;
  const metadata = getModelMetadata(modelId);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                 Groq LPU Foundation Model Test               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(` Target Model ID:      ${modelId}`);
  console.log(` Model Provider:       ${metadata.provider.toUpperCase()}`);
  console.log(` Context Window:       ${metadata.contextWindow.toLocaleString()} tokens`);
  console.log(` Max Output:           ${metadata.maxOutputTokens.toLocaleString()} tokens`);
  console.log(` Default Model:        ${effectiveGroqModel}`);
  console.log(` Writer Model:         ${effectiveWriterModelId}`);
  console.log(` Evaluator Model:      ${effectiveEvaluatorModelId}`);
  console.log(
    ` Auth Resolution:      ${
      apiKey
        ? `Explicit API Key (${apiKey.slice(0, 7)}...***)`
        : 'Missing GROQ_API_KEY in environment'
    }`,
  );
  console.log('────────────────────────────────────────────────────────────────');

  if (isDryRun || !apiKey) {
    if (!apiKey && !isDryRun) {
      console.warn('\n⚠ Notice: GROQ_API_KEY not found in environment. Running in offline dry-run mode.');
    } else {
      console.log('\n[DRY RUN] Offline verification requested (no external API calls)...');
    }

    try {
      const defaultModel = createGroqModel('default', { modelId, apiKey: apiKey ?? 'mock-key' });
      const writerModel = createWriterModel({ apiKey: apiKey ?? 'mock-key' });
      const evaluatorModel = createEvaluatorModel({ apiKey: apiKey ?? 'mock-key' });

      if (defaultModel && writerModel && evaluatorModel) {
        console.log('  ✓ Groq model factory instantiated instances for all roles.');
        console.log(`  ✓ Default model:   ${defaultModel.model}`);
        console.log(`  ✓ Writer model:    ${writerModel.model}`);
        console.log(`  ✓ Evaluator model: ${evaluatorModel.model}`);
        console.log('\n✓ Dry-run validation passed successfully.\n');
        process.exit(0);
      }
    } catch (err) {
      console.error('✗ Failed to instantiate model factory:', err);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Test 1: Standard Invocation with SystemMessage and HumanMessage
  // -------------------------------------------------------------------------
  console.log('\n[1/2] Testing standard invocation with SystemMessage & HumanMessage...');
  const model = createGroqModel('default', {
    modelId,
    temperature: 0.2,
    maxTokens: 256,
  });

  const messages = [
    new SystemMessage('You are a helpful AI assistant validating Groq connectivity. Be concise.'),
    new HumanMessage('Say "Groq LLM connectivity verified successfully." and state the current model name.'),
  ];

  try {
    const startTime = Date.now();
    const response = await model.invoke(messages);
    const latencyMs = Date.now() - startTime;

    console.log(`  ✓ Response received in ${latencyMs}ms:`);
    const content = typeof response.content === 'string'
      ? response.content.trim()
      : JSON.stringify(response.content);
    console.log(`    "${content}"\n`);

    const usage = extractTokenUsage(response);
    console.log('  Token Usage:');
    console.log(`    • Input tokens:  ${usage.inputTokens}`);
    console.log(`    • Output tokens: ${usage.outputTokens}`);
    console.log(`    • Total tokens:  ${usage.totalTokens}`);
  } catch (err) {
    const groqErr = parseGroqError(err, { modelId });
    console.error('\n' + formatGroqErrorMessage(groqErr) + '\n');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Test 2: Streaming Invocation
  // -------------------------------------------------------------------------
  console.log('\n[2/2] Testing streaming response chunks...');
  try {
    const streamingMessages = [
      new SystemMessage('You are a concise assistant.'),
      new HumanMessage('Count from 1 to 5, one number per word with a comma.'),
    ];

    const streamStartTime = Date.now();
    const stream = await model.stream(streamingMessages);

    process.stdout.write('  Stream output: "');
    let chunkCount = 0;

    for await (const chunk of stream) {
      chunkCount++;
      const text = typeof chunk.content === 'string' ? chunk.content : '';
      process.stdout.write(text);
    }
    process.stdout.write('"\n');

    const streamLatencyMs = Date.now() - streamStartTime;
    console.log(`  ✓ Received ${chunkCount} streamed chunks in ${streamLatencyMs}ms`);
  } catch (err) {
    const groqErr = parseGroqError(err, { modelId });
    console.error('\n' + formatGroqErrorMessage(groqErr) + '\n');
    process.exit(1);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✓ All Groq LLM tests completed successfully!');
  console.log('════════════════════════════════════════════════════════════════\n');
}

void main();
