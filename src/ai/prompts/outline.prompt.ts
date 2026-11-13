import type { StoryConfiguration } from '../schemas/story-config.schema.js';
import type { StoryConcept } from '../schemas/concept.schema.js';
import type { HookCandidate } from '../schemas/hook.schema.js';

export function buildOutlinePrompt(
  config: StoryConfiguration,
  concept: StoryConcept,
  selectedHook: HookCandidate,
  targetWordCount: number,
  minimumWords: number,
  maximumWords: number,
): string {
  const beatCount = config.durationMinutes <= 2 ? 4 : config.durationMinutes <= 4 ? 5 : 6;

  return `You are a story structure expert. Create a compact narrative outline for a ${config.durationMinutes}-minute voiceover story.

STORY CONCEPT:
- Premise: ${concept.premise}
- Protagonist: ${concept.protagonist}
- Motivation: ${concept.motivation}
- Central Conflict: ${concept.centralConflict}
- Stakes: ${concept.stakes}
- Inciting Incident: ${concept.incitingIncident}
- Major Revelation: ${concept.majorRevelation}
- Climax Direction: ${concept.climaxDirection}
- Ending Direction: ${concept.endingDirection}

OPENING HOOK (must be the first line of the story):
"${selectedHook.text}"

CONFIGURATION:
- Genre: ${config.genre}
- Pacing: ${config.pacing}
- Ending Style: ${config.endingStyle.replace(/_/g, ' ')}
- Complexity: ${config.complexity}
- Dialogue: ${config.dialogueIntensity.replace(/_/g, ' ')}

DURATION CONSTRAINTS:
- Target: ${targetWordCount} words (${config.durationMinutes} minutes)
- Minimum: ${minimumWords} words
- Maximum: ${maximumWords} words
- Use EXACTLY ${beatCount} narrative beats
- Sum of all wordBudget values MUST equal approximately ${targetWordCount}

SUGGESTED NARRATIVE PROGRESSION:
1. Hook and immediate situation (opens with the selected hook)
2. Character setup and central conflict
3. Complications and escalation
${beatCount >= 5 ? '4. Major revelation or decisive decision\n5. Climax\n6. Resolution and payoff' : '4. Climax and revelation\n5. Resolution and payoff'}

IMPORTANT:
- Combine beats if the story is short. Do not add extra scenes just to fill space.
- Each beat must serve the narrative — no filler.
- The word budgets MUST add up to approximately ${targetWordCount}.
- Include between 4 and 6 narrative beats with beatNumber, title, description, purpose, wordBudget, and key_moments.
- Provide the overall narrativeArc and paceNotes.`;
}
