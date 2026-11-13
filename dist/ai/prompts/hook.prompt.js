export function buildHookPrompt(config, concept) {
    return `You are a master storyteller specialising in opening hooks for voiceover narratives.

STORY CONCEPT:
- Premise: ${concept.premise}
- Protagonist: ${concept.protagonist}
- Central Conflict: ${concept.centralConflict}
- Emotional Journey: ${concept.emotionalJourney}

HOOK REQUIREMENTS:
- Style: ${config.hookStyle.replace(/_/g, ' ')}
- Genre: ${config.genre}
- Mood: ${config.mood.join(', ')}
- POV: ${config.pov.replace(/_/g, ' ')}
- Tense: ${config.tense}
- Language: ${config.language}

Create exactly 3 opening hook candidates.
Each hook MUST:
- Be 7-24 words long (3-10 seconds of narration at 145 WPM)
- Create immediate curiosity
- Establish a clear question the listener wants answered
- Be directly relevant to the actual story — no bait-and-switch
- Sound completely natural when spoken aloud
- Match the ${config.hookStyle.replace(/_/g, ' ')} hook style`;
}
export function buildHookEvaluationPrompt(candidates, concept) {
    const candidateList = candidates
        .map((c, i) => `Candidate ${i}: "${c.text}" (${c.wordCount} words, ${c.style})`)
        .join('\n');
    return `You are a story quality evaluator. Evaluate these three opening hook candidates and select the best one.

STORY PREMISE: ${concept.premise}
STORY CONFLICT: ${concept.centralConflict}

HOOK CANDIDATES:
${candidateList}

Evaluate each candidate on:
- curiosity (1-10): Does it make you want to know what happens?
- clarity (1-10): Is it immediately understandable?
- impact (1-10): Does it create emotional or narrative impact?
- relevance (1-10): Does it relate directly to the actual story?
- promiseFulfillment (1-10): Does it promise something the story will actually deliver?
- narrationQuality (1-10): Does it sound natural when spoken aloud?

Select the SINGLE best candidate across all three based on overall quality.
Provide scores for each dimension, an overall score, the index of the selected candidate (0, 1, or 2), and detailed reasoning.`;
}
//# sourceMappingURL=hook.prompt.js.map