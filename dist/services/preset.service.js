import { StoryPresetRepository } from '../repositories/preset.repository.js';
import { BUILT_IN_PRESETS } from '../ai/schemas/presets.data.js';
import { logger } from '../utils/logger.js';
export class PresetService {
    repo = new StoryPresetRepository();
    async seedSystemPresets() {
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
    async create(name, description, configuration) {
        return this.repo.create({ name, description, configuration, isSystemPreset: false });
    }
    async findById(presetId) {
        return this.repo.findById(presetId);
    }
    async update(presetId, updates) {
        return this.repo.update(presetId, updates);
    }
    async delete(presetId) {
        return this.repo.delete(presetId);
    }
    async list(options) {
        return this.repo.listRecent(options);
    }
}
//# sourceMappingURL=preset.service.js.map