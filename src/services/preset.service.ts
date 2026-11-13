import { StoryPresetRepository } from '../repositories/preset.repository.js';
import { BUILT_IN_PRESETS } from '../ai/schemas/presets.data.js';
import { logger } from '../utils/logger.js';
import type { StoryPreset, UpdatePresetInput } from '../domain/preset.types.js';
import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';

export class PresetService {
  private readonly repo = new StoryPresetRepository();

  async seedSystemPresets(): Promise<void> {
    logger.info('[PresetService] Seeding system presets');
    for (const preset of BUILT_IN_PRESETS) {
      await this.repo.upsertSystemPreset({
        presetId: preset.presetId,
        name: preset.name,
        description: preset.description,
        configuration: preset.configuration,
        isSystemPreset: true,
      });
    }
    logger.info('[PresetService] System presets seeded');
  }

  async create(
    name: string,
    description: string,
    configuration: Partial<StoryConfiguration>,
  ): Promise<StoryPreset> {
    return this.repo.create({ name, description, configuration, isSystemPreset: false });
  }

  async findById(presetId: string): Promise<StoryPreset> {
    return this.repo.findById(presetId);
  }

  async update(presetId: string, updates: UpdatePresetInput): Promise<StoryPreset> {
    return this.repo.update(presetId, updates);
  }

  async delete(presetId: string): Promise<void> {
    return this.repo.delete(presetId);
  }

  async list(options?: { limit?: number | undefined; lastKey?: Record<string, unknown> | undefined }) {
    return this.repo.listRecent(options);
  }
}
