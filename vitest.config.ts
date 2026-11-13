import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.types.ts'],
    },
    // Ensure env vars are set for tests
    env: {
      NODE_ENV: 'test',
      PORT: '4001',
      HOST: '127.0.0.1',
      AWS_REGION: 'us-east-1',
      BEDROCK_REGION: 'us-east-1',
      BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      BEDROCK_WRITER_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      BEDROCK_EVALUATOR_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
      BEDROCK_WRITER_MAX_TOKENS: '3000',
      BEDROCK_EVALUATOR_MAX_TOKENS: '2000',
      DYNAMODB_STORIES_TABLE: 'test-stories',
      DYNAMODB_PRESETS_TABLE: 'test-presets',
      DYNAMODB_GENERATIONS_TABLE: 'test-generations',
      LANGSMITH_TRACING: 'false',
      LANGCHAIN_PROJECT: 'personal-story-generator-test',
    },
  },
});
