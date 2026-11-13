import { StoryRepository } from '../repositories/story.repository.js';
import type { Story } from '../domain/story.types.js';

export class StoryService {
  private readonly repo = new StoryRepository();

  async findById(storyId: string): Promise<Story> {
    return this.repo.findById(storyId);
  }

  async listRecent(options?: { limit?: number | undefined; lastKey?: Record<string, unknown> | undefined }) {
    return this.repo.listRecent(options);
  }

  async delete(storyId: string): Promise<void> {
    // Verify exists first (throws NotFoundError if missing)
    await this.repo.findById(storyId);
    return this.repo.delete(storyId);
  }
}
