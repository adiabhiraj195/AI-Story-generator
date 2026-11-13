import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env, getDynamoDBCredentials, type AwsCredentials } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let _client: DynamoDBDocumentClient | null = null;

/**
 * Returns a singleton DynamoDBDocumentClient.
 * Uses explicit DynamoDB/AWS credentials if configured in environment.
 * When DYNAMODB_ENDPOINT is set and no credentials are provided, connects to local DynamoDB with dev credentials.
 * Otherwise uses the AWS default credential provider chain.
 */
export function getDynamoDBClient(customCredentials?: AwsCredentials): DynamoDBDocumentClient {
  if (_client && !customCredentials) return _client;

  const credentials = customCredentials ?? getDynamoDBCredentials();

  const rawClient = new DynamoDBClient({
    region: env.AWS_REGION,
    ...(env.DYNAMODB_ENDPOINT ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),
    ...(credentials
      ? { credentials }
      : env.DYNAMODB_ENDPOINT
        ? {
            credentials: {
              // Local DynamoDB default credentials when no explicit keys provided
              accessKeyId: 'local',
              secretAccessKey: 'local',
            },
          }
        : {}),
  });

  const docClient = DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });

  if (!customCredentials) {
    _client = docClient;
  }

  logger.info(
    {
      region: env.AWS_REGION,
      endpoint: env.DYNAMODB_ENDPOINT ?? 'AWS',
      hasExplicitCredentials: Boolean(credentials),
      accessKeyIdPrefix: credentials ? `${credentials.accessKeyId.slice(0, 4)}...` : undefined,
    },
    '[dynamodb] Client initialised',
  );

  return docClient;
}

/** Reset singleton (used in tests). */
export function resetDynamoDBClient(): void {
  _client = null;
}
