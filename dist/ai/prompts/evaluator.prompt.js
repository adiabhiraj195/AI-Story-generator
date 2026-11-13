export function buildEvaluatorPrompt(config, script, durationValidation) {
    const wordCount = durationValidation.wordCount;
    const durationMin = durationValidation.estimatedDurationMinutes.toFixed(1);
    const withinBounds = durationValidation.valid;
    return `You are a professional story quality evaluator. Critically evaluate this ${config.durationMinutes}-minute voiceover story.

STORY TO EVALUATE:
---
${script}
---

CONFIGURATION REQUIREMENTS:
- Genre: ${config.genre}
- POV: ${config.pov.replace(/_/g, ' ')}
- Tense: ${config.tense}
- Mood: ${config.mood.join(', ')}
- Hook Style: ${config.hookStyle.replace(/_/g, ' ')}
- Ending Style: ${config.endingStyle.replace(/_/g, ' ')}
- Pacing: ${config.pacing}
- Narrative Style: ${config.narrativeStyle.replace(/_/g, ' ')}

DURATION MEASUREMENT (objective — do not override these numbers):
- Word count: ${wordCount} words
- Estimated duration: ${durationMin} minutes
- Within bounds (${durationValidation.minimumWords}–${durationValidation.maximumWords} words): ${withinBounds}

SCORE each dimension 1–10:
- hook: Does the opening immediately create curiosity? Does it sound natural as the first line?
- engagement: Does the story maintain interest throughout?
- pacing: Is the story well-paced for its length?
- characterDevelopment: Are characters believable for a ${config.durationMinutes}-minute story?
- coherence: Is the story logically consistent?
- emotionalImpact: Does it deliver the intended emotional experience?
- climax: Is the climax satisfying and earned?
- endingSatisfaction: Does the ending feel complete? (Must match ${config.endingStyle.replace(/_/g, ' ')} style)
- voiceoverQuality: Does it sound natural narrated aloud? Good sentence rhythm?
- configurationAdherence: Does it match the requested genre, mood, pov, tense?

APPROVAL THRESHOLDS (all must be met for APPROVED):
- hook >= 8
- endingSatisfaction >= 8
- coherence >= 7
- voiceoverQuality >= 7
- All other dimensions >= 7
- Duration within bounds

Also verify: does the story actually deliver on what the opening hook promises? (hookDelivered: true/false)

Approval options:
- "APPROVED": All thresholds met
- "NEEDS_REVISION": Some thresholds not met, story can be improved
- "NEEDS_REVIEW": Multiple critical failures, human review recommended`;
}
//# sourceMappingURL=evaluator.prompt.js.map