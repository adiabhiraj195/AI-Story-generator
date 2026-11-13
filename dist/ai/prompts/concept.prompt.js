export function buildConceptPrompt(config, targetWordCount) {
    const durationLabel = `${config.durationMinutes}-minute (approximately ${targetWordCount} words)`;
    const moodList = config.mood.join(', ');
    const emotionalJourney = config.emotionalJourney ?? 'not specified';
    return `You are a creative story architect. Generate a detailed creative concept for a ${durationLabel} voiceover story.

STORY CONFIGURATION:
- Genre: ${config.genre}
- POV: ${config.pov.replace(/_/g, ' ')}
- Tense: ${config.tense}
- Mood: ${moodList}
- Emotional Journey: ${emotionalJourney.replace(/_/g, ' ')}
- Pacing: ${config.pacing}
- Complexity: ${config.complexity}
- Ending Style: ${config.endingStyle.replace(/_/g, ' ')}
- Narrative Style: ${config.narrativeStyle.replace(/_/g, ' ')}
- Language: ${config.language}
${config.audience ? `- Target Audience: ${config.audience}` : ''}
${config.theme ? `- Theme/Premise: ${config.theme}` : ''}
${config.customPremise ? `- Custom Premise: ${config.customPremise}` : ''}
${config.protagonistDescription ? `- Protagonist: ${config.protagonistDescription}` : ''}
${config.setting ? `- Setting: ${config.setting}` : ''}
${config.additionalInstructions ? `- Additional Instructions: ${config.additionalInstructions}` : ''}

CRITICAL DURATION CONSTRAINT:
This story must be EXACTLY ${config.durationMinutes} minutes when narrated at ${config.narrationWordsPerMinute} words per minute.
Target: approximately ${targetWordCount} words.
Do NOT design a concept that would require a longer story.
Prioritize ONE compelling central narrative. Avoid multiple subplots.

Generate a creative concept with these elements in JSON format:
- premise: Core story premise in 1-2 sentences
- protagonist: Name and 2-3 key character traits as a single descriptive string
- motivation: What drives the protagonist — keep it simple and relatable
- setting: Time, place and atmosphere in 1 sentence
- centralConflict: The main conflict — one clear problem
- stakes: What is at risk — keep it personal and immediate
- incitingIncident: The specific event that starts the story
- majorRevelation: A key twist or revelation that recontextualises the story
- emotionalJourney: The emotional arc from beginning to end
- climaxDirection: How the climax should unfold in 1-2 sentences
- endingDirection: How the story should resolve — consistent with ${config.endingStyle.replace(/_/g, ' ')} ending`;
}
//# sourceMappingURL=concept.prompt.js.map