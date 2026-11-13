/**
 * Groq Model Discovery & Diagnostic Tool
 *
 * Lists registered Groq foundation models, their context limits, and pricing.
 *
 * Usage:
 *   npx tsx scripts/discover-groq.ts
 *   npm run groq:models
 */

import { GROQ_MODELS } from '../src/ai/models/groq-models.js';
import { env, effectiveGroqModel, effectiveWriterModelId, effectiveEvaluatorModelId } from '../src/config/env.js';

function main(): void {
  const apiKey = env.GROQ_API_KEY ?? process.env['GROQ_API_KEY'];

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║               Groq Models & Architecture Registry            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(` Active Groq Model:     ${effectiveGroqModel}`);
  console.log(` Writer Model:          ${effectiveWriterModelId}`);
  console.log(` Evaluator Model:       ${effectiveEvaluatorModelId}`);
  console.log(
    ` API Key Status:        ${
      apiKey ? `Configured (${apiKey.slice(0, 7)}...***)` : 'MISSING (set GROQ_API_KEY in .env)'
    }`,
  );
  console.log('────────────────────────────────────────────────────────────────\n');

  console.log('Available Models on Groq:');
  console.log('─'.repeat(80));
  console.log(
    'Model ID'.padEnd(32) +
    'Provider'.padEnd(12) +
    'Context'.padEnd(14) +
    'Max Output'.padEnd(14) +
    'Price (In/Out 1k)',
  );
  console.log('─'.repeat(80));

  for (const [id, meta] of Object.entries(GROQ_MODELS)) {
    const isDefault = id === effectiveGroqModel ? ' ★' : '';
    console.log(
      `${(id + isDefault).padEnd(32)}${meta.provider.toUpperCase().padEnd(12)}${`${(meta.contextWindow / 1000).toFixed(0)}k`.padEnd(14)}${`${(meta.maxOutputTokens / 1000).toFixed(0)}k`.padEnd(14)}$$${meta.pricingUsdPer1k.input.toFixed(5)} / $$${meta.pricingUsdPer1k.output.toFixed(5)}`,
    );
  }
  console.log('─'.repeat(80));
  console.log('★ = Default active model');
  console.log('\nTo change the model, update GROQ_MODEL in your .env file.\n');
}

main();
