import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { type AwsCredentials } from '../../config/env.js';
/**
 * Returns a singleton DynamoDBDocumentClient.
 * Uses explicit DynamoDB/AWS credentials if configured in environment.
 * When DYNAMODB_ENDPOINT is set and no credentials are provided, connects to local DynamoDB with dev credentials.
 * Otherwise uses the AWS default credential provider chain.
 */
export declare function getDynamoDBClient(customCredentials?: AwsCredentials): DynamoDBDocumentClient;
/** Reset singleton (used in tests). */
export declare function resetDynamoDBClient(): void;
//# sourceMappingURL=dynamodb.client.d.ts.map