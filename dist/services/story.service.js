import { StoryRepository } from '../repositories/story.repository.js';
export class StoryService {
    repo = new StoryRepository();
    async findById(storyId) {
        return this.repo.findById(storyId);
    }
    async listRecent(options) {
        return this.repo.listRecent(options);
    }
    async delete(storyId) {
        // Verify exists first (throws NotFoundError if missing)
        await this.repo.findById(storyId);
        return this.repo.delete(storyId);
    }
}
//# sourceMappingURL=story.service.js.map