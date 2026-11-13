import type { StoryPreset, CreatePresetInput, UpdatePresetInput } from '../domain/preset.types.js';
export interface ListPresetsOptions {
    limit?: number | undefined;
    lastKey?: Record<string, unknown> | undefined;
    includeSystem?: boolean | undefined;
}
export interface ListPresetsResult {
    items: StoryPreset[];
    lastKey?: Record<string, unknown> | undefined;
}
export declare class StoryPresetRepository {
    private readonly table;
    create(input: Omit<CreatePresetInput, 'presetId'>): Promise<StoryPreset>;
    upsertSystemPreset(input: CreatePresetInput): Promise<StoryPreset>;
    findById(presetId: string): Promise<StoryPreset>;
    update(presetId: string, updates: UpdatePresetInput): Promise<StoryPreset>;
    delete(presetId: string): Promise<void>;
    listRecent(options?: ListPresetsOptions): Promise<ListPresetsResult>;
}
//# sourceMappingURL=preset.repository.d.ts.map