import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDynamoDBClient } from '../infrastructure/aws/dynamodb.client.js';
import { env } from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { GenerationJob, CreateGenerationInput, GenerationStatus, GenerationStage } from '../domain/generation.types.js';
import type { AggregatedTokenUsage } from '../utils/token-usage.js';

export interface ListGenerationsOptions {
  limit?: number | undefined;
  lastKey?: Record<string, unknown> | undefined;
}

export interface ListGenerationsResult {
  items: GenerationJob[];
  lastKey?: Record<string, unknown> | undefined;
}

export class GenerationRepository {
  private readonly table = env.DYNAMODB_GENERATIONS_TABLE;

  async create(input: Omit<CreateGenerationInput, 'generationId'>): Promise<GenerationJob> {
    const now = new Date().toISOString();
    const job: GenerationJob = {
      ...input,
      generationId: uuidv4(),
      revisionCount: 0,
      createdAt: now,
      updatedAt: now,
      GSI1PK: 'GEN',
      GSI1SK: now,
    };

    await getDynamoDBClient().send(
      new PutCommand({
        TableName: this.table,
        Item: job,
        ConditionExpression: 'attribute_not_exists(generationId)',
      }),
    );

    logger.info({ generationId: job.generationId }, '[GenerationRepository] Created job');
    return job;
  }

  async findById(generationId: string): Promise<GenerationJob> {
    const result = await getDynamoDBClient().send(
      new GetCommand({ TableName: this.table, Key: { generationId } }),
    );

    if (!result.Item) throw new NotFoundError('GenerationJob', generationId);
    return result.Item as GenerationJob;
  }

  async updateStatus(
    generationId: string,
    status: GenerationStatus,
    stage: GenerationStage,
    extra?: Partial<GenerationJob>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      currentStage: stage,
      updatedAt: now,
      ...extra,
    };

    if (status === 'COMPLETED' || status === 'FAILED') {
      updates['completedAt'] = now;
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    await getDynamoDBClient().send(
      new UpdateCommand({
        TableName: this.table,
        Key: { generationId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
  }

  async updateTokenUsage(generationId: string, tokenUsage: AggregatedTokenUsage): Promise<void> {
    await getDynamoDBClient().send(
      new UpdateCommand({
        TableName: this.table,
        Key: { generationId },
        UpdateExpression: 'SET #tokenUsage = :tokenUsage, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#tokenUsage': 'tokenUsage', '#updatedAt': 'updatedAt' },
        ExpressionAttributeValues: {
          ':tokenUsage': tokenUsage,
          ':updatedAt': new Date().toISOString(),
        },
      }),
    );
  }

  async listRecent(options: ListGenerationsOptions = {}): Promise<ListGenerationsResult> {
    const { limit = 20, lastKey } = options;

    const result = await getDynamoDBClient().send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'GEN' },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey as Record<string, unknown> | undefined,
      }),
    );

    return {
      items: (result.Items ?? []) as GenerationJob[],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  }

  /** Find stale PROCESSING jobs (older than staleThresholdMs, default 10 min) */
  async findStaleProcessingJobs(staleThresholdMs = 10 * 60 * 1000): Promise<GenerationJob[]> {
    const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();

    const result = await getDynamoDBClient().send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :cutoff',
        FilterExpression: '#status = :processing',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pk': 'GEN',
          ':cutoff': cutoff,
          ':processing': 'PROCESSING',
        },
        ScanIndexForward: false,
        Limit: 100,
      }),
    );

    return (result.Items ?? []) as GenerationJob[];
  }

  /** Find PENDING jobs for recovery on startup */
  async findPendingJobs(limit = 10): Promise<GenerationJob[]> {
    const result = await getDynamoDBClient().send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':pk': 'GEN', ':pending': 'PENDING' },
        ScanIndexForward: true, // Oldest first for recovery
        Limit: limit,
      }),
    );

    return (result.Items ?? []) as GenerationJob[];
  }

  async delete(generationId: string): Promise<void> {
    await getDynamoDBClient().send(
      new DeleteCommand({ TableName: this.table, Key: { generationId } }),
    );
  }
}
