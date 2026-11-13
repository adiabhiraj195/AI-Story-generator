import type { StoryConfiguration } from '../schemas/story-config.schema.js';
import type { StoryConcept } from '../schemas/concept.schema.js';
import type { HookCandidate } from '../schemas/hook.schema.js';
import type { StoryOutline } from '../schemas/outline.schema.js';
export declare function buildWriterPrompt(config: StoryConfiguration, concept: StoryConcept, selectedHook: HookCandidate, outline: StoryOutline, targetWordCount: number, minimumWords: number, maximumWords: number): string;
export declare function buildRevisionPrompt(config: StoryConfiguration, concept: StoryConcept, selectedHook: HookCandidate, outline: StoryOutline, currentScript: string, revisionInstructions: string[], targetWordCount: number, minimumWords: number, maximumWords: number, currentWordCount: number): string;
//# sourceMappingURL=writer.prompt.d.ts.map