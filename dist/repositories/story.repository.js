import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDynamoDBClient } from '../infrastructure/aws/dynamodb.client.js';
import { env } from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
export class StoryRepository {
    table = env.DYNAMODB_STORIES_TABLE;
    async create(input) {
        const now = new Date().toISOString();
        const story = {
            ...input,
            storyId: uuidv4(),
            createdAt: now,
            updatedAt: now,
            GSI1PK: 'STORY',
            GSI1SK: now,
        };
        await getDynamoDBClient().send(new PutCommand({
            TableName: this.table,
            Item: story,
            ConditionExpression: 'attribute_not_exists(storyId)',
        }));
        logger.info({ storyId: story.storyId }, '[StoryRepository] Created story');
        return story;
    }
    async findById(storyId) {
        const result = await getDynamoDBClient().send(new GetCommand({ TableName: this.table, Key: { storyId } }));
        if (!result.Item)
            throw new NotFoundError('Story', storyId);
        return result.Item;
    }
    async update(storyId, updates) {
        const now = new Date().toISOString();
        const updateExpressions = ['#updatedAt = :updatedAt'];
        const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
        const expressionAttributeValues = { ':updatedAt': now };
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'storyId')
                continue;
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
        }
        const result = await getDynamoDBClient().send(new UpdateCommand({
            TableName: this.table,
            Key: { storyId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(storyId)',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async delete(storyId) {
        await getDynamoDBClient().send(new DeleteCommand({
            TableName: this.table,
            Key: { storyId },
            ConditionExpression: 'attribute_exists(storyId)',
        }));
        logger.info({ storyId }, '[StoryRepository] Deleted story');
    }
    async listRecent(options = {}) {
        const { limit = 20, lastKey } = options;
        const result = await getDynamoDBClient().send(new QueryCommand({
            TableName: this.table,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': 'STORY' },
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
//# sourceMappingURL=story.repository.js.map