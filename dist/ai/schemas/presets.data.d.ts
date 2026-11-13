import type { StoryConfiguration } from '../schemas/story-config.schema.js';
export interface BuiltInPreset {
    presetId: string;
    name: string;
    description: string;
    configuration: Partial<StoryConfiguration>;
    isSystemPreset: true;
}
export declare const BUILT_IN_PRESETS: BuiltInPreset[];
//# sourceMappingURL=presets.data.d.ts.map