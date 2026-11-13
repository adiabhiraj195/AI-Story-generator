import { z } from 'zod';

// Load .env automatically if present (Node.js 20.12+)
try {
  process.loadEnvFile?.();
} catch {
  // Ignore if .env is missing (e.g. running in test or container with injected env vars)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const intStr = (defaultVal?: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v !== undefined && v !== '' ? parseInt(v, 10) : defaultVal))
    .pipe(z.number().int().nonnegative());

const boolStr = (defaultVal = false) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultVal;
      return v.toLowerCase() === 'true';
    });

const optionalTrimmedStr = () =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const EnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: intStr(4000),
  HOST: z.string().default('127.0.0.1'),

  // Shared AWS Credentials & Region
  AWS_REGION: z.string().default('us-east-1'),
  AWS_PROFILE: optionalTrimmedStr(),
  AWS_ACCESS_KEY_ID: optionalTrimmedStr(),
  AWS_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  AWS_SESSION_TOKEN: optionalTrimmedStr(),

  // Groq (AI Generation API Keys & Models)
  GROQ_API_KEY: optionalTrimmedStr(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_MODEL_ID: optionalTrimmedStr(),
  GROQ_WRITER_MODEL: optionalTrimmedStr(),
  GROQ_EVALUATOR_MODEL: optionalTrimmedStr(),
  GROQ_WRITER_MAX_TOKENS: intStr(4096),
  GROQ_EVALUATOR_MAX_TOKENS: intStr(2048),

  // Legacy Amazon Bedrock variables (for backward-compatibility)
  BEDROCK_REGION: optionalTrimmedStr(),
  BEDROCK_PROFILE: optionalTrimmedStr(),
  BEDROCK_ACCESS_KEY_ID: optionalTrimmedStr(),
  BEDROCK_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  BEDROCK_SESSION_TOKEN: optionalTrimmedStr(),
  BEDROCK_AWS_ACCESS_KEY_ID: optionalTrimmedStr(),
  BEDROCK_AWS_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  BEDROCK_AWS_SESSION_TOKEN: optionalTrimmedStr(),
  BEDROCK_API_KEY: optionalTrimmedStr(),
  BEDROCK_API_SECRET: optionalTrimmedStr(),
  BEDROCK_MODEL_ID: z.string().default('llama-3.3-70b-versatile'),
  BEDROCK_WRITER_MODEL_ID: optionalTrimmedStr(),
  BEDROCK_EVALUATOR_MODEL_ID: optionalTrimmedStr(),
  BEDROCK_WRITER_MAX_TOKENS: intStr(4096),
  BEDROCK_EVALUATOR_MAX_TOKENS: intStr(2048),

  // DynamoDB (Database API Keys & Configuration)
  DYNAMODB_ENDPOINT: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .pipe(z.string().url().optional()),
  DYNAMODB_ACCESS_KEY_ID: optionalTrimmedStr(),
  DYNAMODB_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  DYNAMODB_SESSION_TOKEN: optionalTrimmedStr(),
  DB_ACCESS_KEY_ID: optionalTrimmedStr(),
  DB_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  DB_SESSION_TOKEN: optionalTrimmedStr(),
  AWS_DYNAMODB_ACCESS_KEY_ID: optionalTrimmedStr(),
  AWS_DYNAMODB_SECRET_ACCESS_KEY: optionalTrimmedStr(),
  AWS_DYNAMODB_SESSION_TOKEN: optionalTrimmedStr(),
  DYNAMODB_STORIES_TABLE: z.string().min(1).default('personal-story-generator-stories'),
  DYNAMODB_PRESETS_TABLE: z.string().min(1).default('personal-story-generator-presets'),
  DYNAMODB_GENERATIONS_TABLE: z.string().min(1).default('personal-story-generator-generations'),

  // LangSmith
  LANGSMITH_TRACING: boolStr(false),
  LANGSMITH_API_KEY: optionalTrimmedStr(),
  LANGCHAIN_API_KEY: optionalTrimmedStr(),
  LANGCHAIN_PROJECT: z.string().default('personal-story-generator'),
});

// ---------------------------------------------------------------------------
// AWS Credentials Interface & Resolvers
// ---------------------------------------------------------------------------

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/**
 * Returns explicit general AWS credentials if configured in environment, otherwise undefined.
 */
export function getAwsCredentials(envConfig: Env = env): AwsCredentials | undefined {
  if (envConfig.AWS_ACCESS_KEY_ID && envConfig.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
      secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
      ...(envConfig.AWS_SESSION_TOKEN ? { sessionToken: envConfig.AWS_SESSION_TOKEN } : {}),
    };
  }
  return undefined;
}

/**
 * Resolves Amazon Bedrock credentials.
 * Prioritises explicit Bedrock keys, falling back to general AWS keys.
 * Returns undefined if neither is configured (allowing AWS default credential chain).
 */
export function getBedrockCredentials(envConfig: Env = env): AwsCredentials | undefined {
  const accessKeyId =
    envConfig.BEDROCK_ACCESS_KEY_ID ??
    envConfig.BEDROCK_AWS_ACCESS_KEY_ID ??
    envConfig.BEDROCK_API_KEY ??
    envConfig.AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    envConfig.BEDROCK_SECRET_ACCESS_KEY ??
    envConfig.BEDROCK_AWS_SECRET_ACCESS_KEY ??
    envConfig.BEDROCK_API_SECRET ??
    envConfig.AWS_SECRET_ACCESS_KEY;

  const sessionToken =
    envConfig.BEDROCK_SESSION_TOKEN ??
    envConfig.BEDROCK_AWS_SESSION_TOKEN ??
    envConfig.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }
  return undefined;
}

/**
 * Resolves DynamoDB credentials.
 * Prioritises explicit DynamoDB/DB keys, falling back to general AWS keys.
 * Returns undefined if neither is configured (allowing local default or AWS credential chain).
 */
export function getDynamoDBCredentials(envConfig: Env = env): AwsCredentials | undefined {
  const accessKeyId =
    envConfig.DYNAMODB_ACCESS_KEY_ID ??
    envConfig.DB_ACCESS_KEY_ID ??
    envConfig.AWS_DYNAMODB_ACCESS_KEY_ID ??
    envConfig.AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    envConfig.DYNAMODB_SECRET_ACCESS_KEY ??
    envConfig.DB_SECRET_ACCESS_KEY ??
    envConfig.AWS_DYNAMODB_SECRET_ACCESS_KEY ??
    envConfig.AWS_SECRET_ACCESS_KEY;

  const sessionToken =
    envConfig.DYNAMODB_SESSION_TOKEN ??
    envConfig.DB_SESSION_TOKEN ??
    envConfig.AWS_DYNAMODB_SESSION_TOKEN ??
    envConfig.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Parse & export
// ---------------------------------------------------------------------------

export function parseEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    console.error('[config] Invalid environment variables:', JSON.stringify(formatted, null, 2));
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();

// Synchronize AWS Profile & Region into process.env if provided
if (env.AWS_PROFILE && !process.env['AWS_PROFILE']) {
  process.env['AWS_PROFILE'] = env.AWS_PROFILE;
}
if (env.AWS_REGION && !process.env['AWS_REGION']) {
  process.env['AWS_REGION'] = env.AWS_REGION;
}
if (env.AWS_REGION && !process.env['AWS_DEFAULT_REGION']) {
  process.env['AWS_DEFAULT_REGION'] = env.AWS_REGION;
}

// Synchronize LangSmith / LangChain API key into process.env if present
if (env.LANGSMITH_API_KEY && !process.env['LANGCHAIN_API_KEY']) {
  process.env['LANGCHAIN_API_KEY'] = env.LANGSMITH_API_KEY;
}

// Synchronize Groq API key into process.env if present
if (env.GROQ_API_KEY && !process.env['GROQ_API_KEY']) {
  process.env['GROQ_API_KEY'] = env.GROQ_API_KEY;
}

// Derived: effective Groq configuration
export const effectiveGroqModel = env.GROQ_MODEL_ID ?? env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// Derived: effective model IDs (fall back to GROQ_MODEL)
export const effectiveWriterModelId =
  env.GROQ_WRITER_MODEL ??
  (env.BEDROCK_WRITER_MODEL_ID ? env.BEDROCK_WRITER_MODEL_ID : effectiveGroqModel);

export const effectiveEvaluatorModelId =
  env.GROQ_EVALUATOR_MODEL ??
  (env.BEDROCK_EVALUATOR_MODEL_ID ? env.BEDROCK_EVALUATOR_MODEL_ID : effectiveGroqModel);

// Backward-compatibility: effective AWS Bedrock configuration
export const effectiveBedrockRegion = env.BEDROCK_REGION ?? env.AWS_REGION;
export const effectiveBedrockProfile = env.BEDROCK_PROFILE ?? env.AWS_PROFILE;

export type Env = z.infer<typeof EnvSchema>;
