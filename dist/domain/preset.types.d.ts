import type { StoryConfiguration } from '../ai/schemas/story-config.schema.js';
export interface StoryPreset {
    presetId: string;
    name: string;
    description: string;
    configuration: Partial<StoryConfiguration>;
    isSystemPreset: boolean;
    createdAt: string;
    updatedAt: string;
    GSI1PK: string;
    GSI1SK: string;
}
export type CreatePresetInput = Omit<StoryPreset, 'createdAt' | 'updatedAt' | 'GSI1PK' | 'GSI1SK'>;
export type UpdatePresetInput = {
    name?: string | undefined;
    description?: string | undefined;
    configuration?: Partial<StoryConfiguration> | undefined;
};
//# sourceMappingURL=preset.types.d.ts.map