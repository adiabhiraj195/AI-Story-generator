import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDynamoDBClient } from '../infrastructure/aws/dynamodb.client.js';
import { env } from '../config/env.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
export class StoryPresetRepository {
    table = env.DYNAMODB_PRESETS_TABLE;
    async create(input) {
        const now = new Date().toISOString();
        const preset = {
            ...input,
            presetId: uuidv4(),
            createdAt: now,
            updatedAt: now,
            GSI1PK: 'PRESET',
            GSI1SK: now,
        };
        await getDynamoDBClient().send(new PutCommand({
            TableName: this.table,
            Item: preset,
            ConditionExpression: 'attribute_not_exists(presetId)',
        }));
        logger.info({ presetId: preset.presetId }, '[PresetRepository] Created preset');
        return preset;
    }
    async upsertSystemPreset(input) {
        const now = new Date().toISOString();
        const preset = {
            ...input,
            createdAt: now,
            updatedAt: now,
            GSI1PK: 'PRESET',
            GSI1SK: now,
        };
        await getDynamoDBClient().send(new PutCommand({ TableName: this.table, Item: preset }));
        return preset;
    }
    async findById(presetId) {
        const result = await getDynamoDBClient().send(new GetCommand({ TableName: this.table, Key: { presetId } }));
        if (!result.Item)
            throw new NotFoundError('StoryPreset', presetId);
        return result.Item;
    }
    async update(presetId, updates) {
        const existing = await this.findById(presetId);
        if (existing.isSystemPreset)
            throw new ConflictError('Cannot update a system preset');
        const now = new Date().toISOString();
        const updateExpressions = ['#updatedAt = :updatedAt'];
        const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
        const expressionAttributeValues = { ':updatedAt': now };
        for (const [key, value] of Object.entries(updates)) {
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
        }
        const result = await getDynamoDBClient().send(new UpdateCommand({
            TableName: this.table,
            Key: { presetId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(presetId)',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async delete(presetId) {
        const existing = await this.findById(presetId);
        if (existing.isSystemPreset)
            throw new ConflictError('Cannot delete a system preset');
        await getDynamoDBClient().send(new DeleteCommand({ TableName: this.table, Key: { presetId } }));
        logger.info({ presetId }, '[PresetRepository] Deleted preset');
    }
    async listRecent(options = {}) {
        const { limit = 50, lastKey } = options;
        const result = await getDynamoDBClient().send(new QueryCommand({
            TableName: this.table,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': 'PRESET' },
            ScanIndexForward: false,
            Limit: limit,
            ExclusiveStartKey: lastKey,
        }));
        return {
            items: (result.Items ?? []),
            lastKey: result.LastEvaluatedKey,
        };
    }
}
//# sourceMappingURL=preset.repository.js.map