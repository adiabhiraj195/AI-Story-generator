import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnvSchema,
  getAwsCredentials,
  getBedrockCredentials,
  getDynamoDBCredentials,
  type Env,
} from '../../src/config/env.js';
import { createGroqModel } from '../../src/ai/models/groq-model.factory.js';
import { getDynamoDBClient, resetDynamoDBClient } from '../../src/infrastructure/aws/dynamodb.client.js';

describe('Environment Variables & Explicit API Keys Configuration', () => {
  beforeEach(() => {
    resetDynamoDBClient();
    vi.clearAllMocks();
  });

  describe('EnvSchema & Credential Resolvers', () => {
    it('normalizes empty strings to undefined to prevent invalid AWS credentials', () => {
      const parsed = EnvSchema.parse({
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '   ',
        BEDROCK_ACCESS_KEY_ID: '',
        DYNAMODB_ACCESS_KEY_ID: '',
      });

      expect(parsed.AWS_ACCESS_KEY_ID).toBeUndefined();
      expect(parsed.AWS_SECRET_ACCESS_KEY).toBeUndefined();
      expect(parsed.BEDROCK_ACCESS_KEY_ID).toBeUndefined();
      expect(parsed.DYNAMODB_ACCESS_KEY_ID).toBeUndefined();

      expect(getAwsCredentials(parsed)).toBeUndefined();
      expect(getBedrockCredentials(parsed)).toBeUndefined();
      expect(getDynamoDBCredentials(parsed)).toBeUndefined();
    });

    it('resolves general AWS credentials when provided', () => {
      const config: Env = EnvSchema.parse({
        AWS_ACCESS_KEY_ID: 'AKIA_GLOBAL_TEST',
        AWS_SECRET_ACCESS_KEY: 'SECRET_GLOBAL_TEST',
        AWS_SESSION_TOKEN: 'TOKEN_GLOBAL_TEST',
      });

      const creds = getAwsCredentials(config);
      expect(creds).toEqual({
        accessKeyId: 'AKIA_GLOBAL_TEST',
        secretAccessKey: 'SECRET_GLOBAL_TEST',
        sessionToken: 'TOKEN_GLOBAL_TEST',
      });

      // Bedrock and DynamoDB should fall back to general AWS credentials
      expect(getBedrockCredentials(config)).toEqual(creds);
      expect(getDynamoDBCredentials(config)).toEqual(creds);
    });

    it('allows dedicated Bedrock API keys to override general AWS keys', () => {
      const config: Env = EnvSchema.parse({
        AWS_ACCESS_KEY_ID: 'AKIA_GLOBAL',
        AWS_SECRET_ACCESS_KEY: 'SECRET_GLOBAL',
        BEDROCK_ACCESS_KEY_ID: 'AKIA_BEDROCK_CUSTOM',
        BEDROCK_SECRET_ACCESS_KEY: 'SECRET_BEDROCK_CUSTOM',
        BEDROCK_SESSION_TOKEN: 'TOKEN_BEDROCK_CUSTOM',
      });

      const bedrockCreds = getBedrockCredentials(config);
      expect(bedrockCreds).toEqual({
        accessKeyId: 'AKIA_BEDROCK_CUSTOM',
        secretAccessKey: 'SECRET_BEDROCK_CUSTOM',
        sessionToken: 'TOKEN_BEDROCK_CUSTOM',
      });

      // DynamoDB still uses the global AWS credentials
      const dbCreds = getDynamoDBCredentials(config);
      expect(dbCreds?.accessKeyId).toBe('AKIA_GLOBAL');
    });

    it('allows dedicated DynamoDB API keys (DYNAMODB_ or DB_) to override general AWS keys', () => {
      const config: Env = EnvSchema.parse({
        AWS_ACCESS_KEY_ID: 'AKIA_GLOBAL',
        AWS_SECRET_ACCESS_KEY: 'SECRET_GLOBAL',
        DYNAMODB_ACCESS_KEY_ID: 'AKIA_DYNAMO_CUSTOM',
        DYNAMODB_SECRET_ACCESS_KEY: 'SECRET_DYNAMO_CUSTOM',
      });

      const dbCreds = getDynamoDBCredentials(config);
      expect(dbCreds).toEqual({
        accessKeyId: 'AKIA_DYNAMO_CUSTOM',
        secretAccessKey: 'SECRET_DYNAMO_CUSTOM',
      });

      // Bedrock still uses the global AWS credentials
      const bedrockCreds = getBedrockCredentials(config);
      expect(bedrockCreds?.accessKeyId).toBe('AKIA_GLOBAL');
    });

    it('supports DB_ACCESS_KEY_ID alias for database credentials', () => {
      const config: Env = EnvSchema.parse({
        DB_ACCESS_KEY_ID: 'AKIA_DB_ALIAS',
        DB_SECRET_ACCESS_KEY: 'SECRET_DB_ALIAS',
      });

      const dbCreds = getDynamoDBCredentials(config);
      expect(dbCreds).toEqual({
        accessKeyId: 'AKIA_DB_ALIAS',
        secretAccessKey: 'SECRET_DB_ALIAS',
      });
    });

    it('supports BEDROCK_AWS_ACCESS_KEY_ID and BEDROCK_API_KEY aliases', () => {
      const config1: Env = EnvSchema.parse({
        BEDROCK_AWS_ACCESS_KEY_ID: 'AKIA_AWS_BEDROCK',
        BEDROCK_AWS_SECRET_ACCESS_KEY: 'SECRET_AWS_BEDROCK',
      });
      expect(getBedrockCredentials(config1)?.accessKeyId).toBe('AKIA_AWS_BEDROCK');

      const config2: Env = EnvSchema.parse({
        BEDROCK_API_KEY: 'AKIA_BEDROCK_KEY',
        BEDROCK_API_SECRET: 'SECRET_BEDROCK_KEY',
      });
      expect(getBedrockCredentials(config2)?.accessKeyId).toBe('AKIA_BEDROCK_KEY');
    });

    it('supports AWS_PROFILE and BEDROCK_PROFILE for official AWS credential provider chain', () => {
      const config1: Env = EnvSchema.parse({
        AWS_PROFILE: 'bedrock-dev',
      });
      expect(config1.AWS_PROFILE).toBe('bedrock-dev');
      expect(config1.BEDROCK_PROFILE).toBeUndefined();

      const config2: Env = EnvSchema.parse({
        AWS_PROFILE: 'default',
        BEDROCK_PROFILE: 'custom-bedrock-profile',
      });
      expect(config2.AWS_PROFILE).toBe('default');
      expect(config2.BEDROCK_PROFILE).toBe('custom-bedrock-profile');
    });
  });

  describe('Groq Model Factory & Configuration', () => {
    it('instantiates ChatGroq using configured model', () => {
      const model = createGroqModel('default', {
        modelId: 'llama-3.3-70b-versatile',
        apiKey: 'gsk_test_api_key_12345',
      });

      expect(model).toBeDefined();
      expect(model.model).toBe('llama-3.3-70b-versatile');
      expect(model.apiKey).toBe('gsk_test_api_key_12345');
    });

    it('passes custom parameters into ChatGroq when creating model', () => {
      const model = createGroqModel('writer', {
        apiKey: 'gsk_writer_key',
        temperature: 0.85,
        maxTokens: 3000,
      });

      expect(model).toBeDefined();
      expect(model.model).toBeDefined();
      expect(model.temperature).toBe(0.85);
      expect(model.maxTokens).toBe(3000);
    });

    it('passes custom credentials explicitly into getDynamoDBClient', () => {
      const explicitCreds = {
        accessKeyId: 'AKIA_DB_TEST_EXPLICIT',
        secretAccessKey: 'SECRET_DB_TEST_EXPLICIT',
      };

      const client = getDynamoDBClient(explicitCreds);
      expect(client).toBeDefined();
      expect(typeof client.send).toBe('function');
    });
  });
});

