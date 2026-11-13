import type { StoryConfiguration } from '../schemas/story-config.schema.js';
import type { StoryConcept } from '../schemas/concept.schema.js';
import type { HookCandidate } from '../schemas/hook.schema.js';
import type { StoryOutline } from '../schemas/outline.schema.js';

export function buildWriterPrompt(
  config: StoryConfiguration,
  concept: StoryConcept,
  selectedHook: HookCandidate,
  outline: StoryOutline,
  targetWordCount: number,
  minimumWords: number,
  maximumWords: number,
): string {
  const beatList = outline.beats
    .map(
      (b) =>
        `Beat ${b.beatNumber} — ${b.title} (~${b.wordBudget} words): ${b.description}`,
    )
    .join('\n');

  return `You are a master storyteller writing a ${config.durationMinutes}-minute voiceover story. Write with the voice of an engaging narrator.

OPENING HOOK (MUST be the exact first line of your story):
"${selectedHook.text}"

STORY CONCEPT:
- Protagonist: ${concept.protagonist}
- Motivation: ${concept.motivation}
- Setting: ${concept.setting}
- Central Conflict: ${concept.centralConflict}
- Stakes: ${concept.stakes}
- Inciting Incident: ${concept.incitingIncident}
- Major Revelation: ${concept.majorRevelation}
- Climax: ${concept.climaxDirection}
- Ending: ${concept.endingDirection}

NARRATIVE OUTLINE:
${beatList}

CONFIGURATION:
- Genre: ${config.genre}
- POV: ${config.pov.replace(/_/g, ' ')}
- Tense: ${config.tense}
- Mood: ${config.mood.join(', ')}
- Pacing: ${config.pacing}
- Dialogue: ${config.dialogueIntensity.replace(/_/g, ' ')}
- Narrative Style: ${config.narrativeStyle.replace(/_/g, ' ')}
- Ending Style: ${config.endingStyle.replace(/_/g, ' ')}
- Language: ${config.language}
${config.protagonistDescription ? `- Protagonist Details: ${config.protagonistDescription}` : ''}
${config.characterRelationships ? `- Character Relationships: ${config.characterRelationships}` : ''}
${config.setting ? `- Setting Details: ${config.setting}` : ''}
${config.additionalInstructions ? `- Additional Instructions: ${config.additionalInstructions}` : ''}

WRITING REQUIREMENTS:
1. The VERY FIRST LINE must be the exact hook: "${selectedHook.text}"
2. Establish the protagonist and situation within the first 60 words
3. Introduce the central conflict early
4. Build tension progressively — follow the outline beats
5. Use natural, conversational narration — avoid purple prose
6. Include meaningful dialogue where it serves the story
7. Avoid unnecessary subplots or characters
8. Avoid long descriptions — keep the pacing tight
9. Deliver a COMPLETE ending — the story must feel resolved
10. Write in ${config.pov.replace(/_/g, ' ')}, ${config.tense} tense
11. Sound natural when narrated aloud — good sentence rhythm

DURATION CONSTRAINTS (CRITICAL):
- Target: ${targetWordCount} words
- Acceptable range: ${minimumWords}–${maximumWords} words
- This is a ${config.durationMinutes}-minute story — do NOT write 8, 10, or 15 minutes of content
- If going long: cut descriptions and subplots — NOT the ending
- Do NOT use filler to reach word count

OUTPUT REQUIREMENTS:
- Provide an engaging title and the complete story script starting with the exact hook.
- Use paragraph breaks to structure the narration cleanly.`;
}

export function buildRevisionPrompt(
  config: StoryConfiguration,
  concept: StoryConcept,
  selectedHook: HookCandidate,
  outline: StoryOutline,
  currentScript: string,
  revisionInstructions: string[],
  targetWordCount: number,
  minimumWords: number,
  maximumWords: number,
  currentWordCount: number,
): string {
  const durationAdjustment =
    currentWordCount < minimumWords
      ? `The script is TOO SHORT (${currentWordCount} words). Expand to reach at least ${minimumWords} words by strengthening character motivation, developing important consequences, and expanding necessary narrative moments. Do NOT add filler.`
      : currentWordCount > maximumWords
        ? `The script is TOO LONG (${currentWordCount} words). Trim to under ${maximumWords} words by removing repetitive content, shortening descriptions, and consolidating scenes. Preserve essential conflict and resolution.`
        : `Current word count (${currentWordCount}) is within the acceptable range. Focus on quality improvements.`;

  return `You are revising a ${config.durationMinutes}-minute voiceover story. Make targeted improvements while preserving the core narrative.

ORIGINAL STORY:
---
${currentScript}
---

REQUIRED IMPROVEMENTS:
${revisionInstructions.map((r, i) => `${i + 1}. ${r}`).join('\n')}

DURATION ADJUSTMENT:
${durationAdjustment}

PRESERVE UNCHANGED:
- Opening hook (must remain the first line): "${selectedHook.text}"
- Protagonist: ${concept.protagonist}
- POV: ${config.pov.replace(/_/g, ' ')}
- Tense: ${config.tense}
- Central conflict: ${concept.centralConflict}
- Ending style: ${config.endingStyle.replace(/_/g, ' ')}
- Core story events

IMPROVE ONLY:
- Weak sections identified in the feedback
- Pacing issues
- Unclear character motivations
- Hook promise delivery
- Ending satisfaction

DURATION CONSTRAINTS:
- Target: ${targetWordCount} words
- Acceptable range: ${minimumWords}–${maximumWords} words

OUTPUT REQUIREMENTS:
- Provide the story title and the complete revised story script.
- Use paragraph breaks to structure the narration cleanly.`;
}
