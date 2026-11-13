import type { StoryConfiguration } from '../schemas/story-config.schema.js';
import type { StoryConcept } from '../schemas/concept.schema.js';
export declare function buildHookPrompt(config: StoryConfiguration, concept: StoryConcept): string;
export declare function buildHookEvaluationPrompt(candidates: Array<{
    text: string;
    wordCount: number;
    style: string;
    questionRaised: string;
    hookType: string;
}>, concept: StoryConcept): string;
//# sourceMappingURL=hook.prompt.d.ts.map