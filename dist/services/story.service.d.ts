import type { Story } from '../domain/story.types.js';
export declare class StoryService {
    private readonly repo;
    findById(storyId: string): Promise<Story>;
    listRecent(options?: {
        limit?: number | undefined;
        lastKey?: Record<string, unknown> | undefined;
    }): Promise<import("../repositories/story.repository.js").ListStoriesResult>;
    delete(storyId: string): Promise<void>;
}
//# sourceMappingURL=story.service.d.ts.map