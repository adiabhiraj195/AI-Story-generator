import type { StoryPreset, UpdatePresetInput } from '../domain/preset.types.js';
import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';
export declare class PresetService {
    private readonly repo;
    seedSystemPresets(): Promise<void>;
    create(name: string, description: string, configuration: Partial<StoryConfiguration>): Promise<StoryPreset>;
    findById(presetId: string): Promise<StoryPreset>;
    update(presetId: string, updates: UpdatePresetInput): Promise<StoryPreset>;
    delete(presetId: string): Promise<void>;
    list(options?: {
        limit?: number | undefined;
        lastKey?: Record<string, unknown> | undefined;
    }): Promise<import("../repositories/preset.repository.js").ListPresetsResult>;
}
//# sourceMappingURL=preset.service.d.ts.map