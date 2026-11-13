import type { Story, CreateStoryInput } from '../domain/story.types.js';
export interface ListStoriesOptions {
    limit?: number | undefined;
    lastKey?: Record<string, unknown> | undefined;
}
export interface ListStoriesResult {
    items: Story[];
    lastKey?: Record<string, unknown> | undefined;
}
export declare class StoryRepository {
    private readonly table;
    create(input: Omit<CreateStoryInput, 'storyId'>): Promise<Story>;
    findById(storyId: string): Promise<Story>;
    update(storyId: string, updates: Partial<Story>): Promise<Story>;
    delete(storyId: string): Promise<void>;
    listRecent(options?: ListStoriesOptions): Promise<ListStoriesResult>;
}
//# sourceMappingURL=story.repository.d.ts.map