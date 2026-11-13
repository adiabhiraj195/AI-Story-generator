/**
 * Seed built-in system presets into DynamoDB.
 *
 * Usage:
 *   npx tsx scripts/seed-presets.ts
 */

import { PresetService } from '../src/services/preset.service.js';
import { BUILT_IN_PRESETS } from '../src/ai/schemas/presets.data.js';
import { env, getDynamoDBCredentials } from '../src/config/env.js';

async function main(): Promise<void> {
  const dbCreds = getDynamoDBCredentials();
  console.log('=== Seeding Built-in Presets into DynamoDB ===');
  console.log(`Region:               ${env.AWS_REGION}`);
  console.log(`Endpoint:             ${env.DYNAMODB_ENDPOINT ?? 'AWS Real DynamoDB'}`);
  console.log(`DynamoDB Auth:        ${dbCreds ? `Explicit API Key (${dbCreds.accessKeyId.slice(0, 4)}...***)` : (env.DYNAMODB_ENDPOINT ? 'Local Dev Credentials (local/local)' : 'AWS Default Credential Chain')}`);
  console.log(`Found ${BUILT_IN_PRESETS.length} presets to seed.`);

  const presetService = new PresetService();
  try {
    await presetService.seedSystemPresets();
    console.log('✓ Successfully seeded all built-in presets:');
    for (const preset of BUILT_IN_PRESETS) {
      console.log(`  - [${preset.presetId}] ${preset.name} (${preset.configuration.genre}, ${preset.configuration.durationMinutes} min)`);
    }
  } catch (err) {
    console.error('✗ Failed to seed presets:', err);
    process.exit(1);
  }
}

void main();

