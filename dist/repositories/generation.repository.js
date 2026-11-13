import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDynamoDBClient } from '../infrastructure/aws/dynamodb.client.js';
import { env } from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
export class GenerationRepository {
    table = env.DYNAMODB_GENERATIONS_TABLE;
    async create(input) {
        const now = new Date().toISOString();
        const job = {
            ...input,
            generationId: uuidv4(),
            revisionCount: 0,
            createdAt: now,
            updatedAt: now,
            GSI1PK: 'GEN',
            GSI1SK: now,
        };
        await getDynamoDBClient().send(new PutCommand({
            TableName: this.table,
            Item: job,
            ConditionExpression: 'attribute_not_exists(generationId)',
        }));
        logger.info({ generationId: job.generationId }, '[GenerationRepository] Created job');
        return job;
    }
    async findById(generationId) {
        const result = await getDynamoDBClient().send(new GetCommand({ TableName: this.table, Key: { generationId } }));
        if (!result.Item)
            throw new NotFoundError('GenerationJob', generationId);
        return result.Item;
    }
    async updateStatus(generationId, status, stage, extra) {
        const now = new Date().toISOString();
        const updates = {
            status,
            currentStage: stage,
            updatedAt: now,
            ...extra,
        };
        if (status === 'COMPLETED' || status === 'FAILED') {
            updates['completedAt'] = now;
        }
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        for (const [key, value] of Object.entries(updates)) {
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
        }
        await getDynamoDBClient().send(new UpdateCommand({
            TableName: this.table,
            Key: { generationId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
    }
    async updateTokenUsage(generationId, tokenUsage) {
        await getDynamoDBClient().send(new UpdateCommand({
            TableName: this.table,
            Key: { generationId },
            UpdateExpression: 'SET #tokenUsage = :tokenUsage, #updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#tokenUsage': 'tokenUsage', '#updatedAt': 'updatedAt' },
            ExpressionAttributeValues: {
                ':tokenUsage': tokenUsage,
                ':updatedAt': new Date().toISOString(),
            },
        }));
    }
    async listRecent(options = {}) {
        const { limit = 20, lastKey } = options;
        const result = await getDynamoDBClient().send(new QueryCommand({
            TableName: this.table,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': 'GEN' },
            ScanIndexForward: false,
            Limit: limit,
            ExclusiveStartKey: lastKey,
        }));
        return {
            items: (result.Items ?? []),
            lastKey: result.LastEvaluatedKey,
        };
    }
    /** Find stale PROCESSING jobs (older than staleThresholdMs, default 10 min) */
    async findStaleProcessingJobs(staleThresholdMs = 10 * 60 * 1000) {
        const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();
        const result = await getDynamoDBClient().send(new QueryCommand({
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
        }));
        return (result.Items ?? []);
    }
    /** Find PENDING jobs for recovery on startup */
    async findPendingJobs(limit = 10) {
        const result = await getDynamoDBClient().send(new QueryCommand({
            TableName: this.table,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            FilterExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':pk': 'GEN', ':pending': 'PENDING' },
            ScanIndexForward: true, // Oldest first for recovery
            Limit: limit,
        }));
        return (result.Items ?? []);
    }
    async delete(generationId) {
        await getDynamoDBClient().send(new DeleteCommand({ TableName: this.table, Key: { generationId } }));
    }
}
//# sourceMappingURL=generation.repository.js.map