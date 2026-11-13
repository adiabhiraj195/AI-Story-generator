import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { env, getDynamoDBCredentials } from '../src/config/env.js';
import { PresetService } from '../src/services/preset.service.js';
import { BUILT_IN_PRESETS } from '../src/ai/schemas/presets.data.js';

interface TableDefinition {
  name: string;
  hashKey: string;
}

const tablesToCreate: TableDefinition[] = [
  { name: env.DYNAMODB_STORIES_TABLE, hashKey: 'storyId' },
  { name: env.DYNAMODB_PRESETS_TABLE, hashKey: 'presetId' },
  { name: env.DYNAMODB_GENERATIONS_TABLE, hashKey: 'generationId' },
];

async function createTableIfNotExists(client: DynamoDBClient, def: TableDefinition): Promise<void> {
  try {
    console.log(`Checking/Creating table "${def.name}"...`);
    await client.send(
      new CreateTableCommand({
        TableName: def.name,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: def.hashKey, AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: def.hashKey, KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      })
    );
    console.log(`✓ Table "${def.name}" created successfully.`);
  } catch (err) {
    if (err instanceof ResourceInUseException || (err as { name?: string }).name === 'ResourceInUseException') {
      console.log(`ℹ Table "${def.name}" already exists.`);
    } else {
      throw err;
    }
  }
}

async function waitForTable(client: DynamoDBClient, tableName: string): Promise<void> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await client.send(new DescribeTableCommand({ TableName: tableName }));
      if (res.Table?.TableStatus === 'ACTIVE') {
        return;
      }
    } catch {
      // Wait and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main(): Promise<void> {
  const endpoint = env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
  const region = env.AWS_REGION || 'eu-north-1';
  const credentials = getDynamoDBCredentials() ?? {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  };

  console.log('=== DynamoDB Local Setup & Seeding ===');
  console.log(`Endpoint:   ${endpoint}`);
  console.log(`Region:     ${region}`);

  const rawClient = new DynamoDBClient({
    region,
    endpoint,
    credentials,
  });

  for (const table of tablesToCreate) {
    await createTableIfNotExists(rawClient, table);
    await waitForTable(rawClient, table.name);
  }

  console.log('\n=== Seeding Built-in Presets ===');
  const presetService = new PresetService();
  await presetService.seedSystemPresets();
  console.log(`✓ Successfully seeded ${BUILT_IN_PRESETS.length} presets into "${env.DYNAMODB_PRESETS_TABLE}":`);
  for (const preset of BUILT_IN_PRESETS) {
    console.log(`  - [${preset.presetId}] ${preset.name} (${preset.configuration.genre})`);
  }
  console.log('\n✓ DynamoDB Local setup and seeding completed successfully!');
}

main().catch((err) => {
  console.error('✗ Setup failed:', err);
  process.exit(1);
});
