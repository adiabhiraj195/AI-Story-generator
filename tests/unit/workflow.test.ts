import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRequestNode } from '../../src/ai/workflow/nodes/validate-request.node.js';
import { generateConceptNode } from '../../src/ai/workflow/nodes/generate-concept.node.js';
import { generateHooksNode } from '../../src/ai/workflow/nodes/generate-hooks.node.js';
import { evaluateHooksNode } from '../../src/ai/workflow/nodes/evaluate-hooks.node.js';
import { generateOutlineNode } from '../../src/ai/workflow/nodes/generate-outline.node.js';
import { writeStoryNode } from '../../src/ai/workflow/nodes/write-story.node.js';
import { evaluateStoryNode, shouldReviseRouter } from '../../src/ai/workflow/nodes/evaluate-story.node.js';
import { reviseStoryNode } from '../../src/ai/workflow/nodes/revise-story.node.js';
import { finalValidationNode } from '../../src/ai/workflow/nodes/final-validation.node.js';
import { formatVoiceoverNode } from '../../src/ai/workflow/nodes/format-voiceover.node.js';
import * as factoryModule from '../../src/ai/models/groq-model.factory.js';
import type { WorkflowState } from '../../src/ai/workflow/state.js';
import type { StoryConfiguration } from '../../src/ai/schemas/story-config.schema.js';

describe('LangGraph Story Workflow Nodes (Mocked Groq)', () => {
  const mockConfig: StoryConfiguration = {
    genre: 'psychological_thriller',
    pov: 'first_person',
    tense: 'past',
    durationMinutes: 3,
    narrationWordsPerMinute: 145,
    mood: ['dark', 'suspenseful'],
    hookStyle: 'mysterious',
    endingStyle: 'unexpected_twist',
    pacing: 'gradually_escalating',
    complexity: 'moderate',
    dialogueIntensity: 'balanced',
    narrativeStyle: 'conversational',
    language: 'English',
  };

  const initialTestState: WorkflowState = {
    generationId: 'test-gen-001',
    request: mockConfig,
    targetWordCount: 435,
    minimumWords: 413,
    maximumWords: 457,
    storyConcept: null,
    hookCandidates: [],
    selectedHook: null,
    hookEvaluation: null,
    storyOutline: null,
    draftTitle: '',
    draftScript: '',
    revisionCount: 0,
    storyEvaluation: null,
    revisionFeedback: [],
    finalTitle: '',
    finalScript: '',
    finalWordCount: 0,
    finalDurationSeconds: 0,
    approvalStatus: 'NEEDS_REVIEW',
    validationPassed: false,
    tokenUsage: [],
    modelMetadata: {},
    error: null,
  };

  const mockInvoke = vi.fn();
  const mockWithStructuredOutput = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithStructuredOutput.mockImplementation(() => ({
      invoke: mockInvoke,
    }));
    vi.spyOn(factoryModule, 'createGroqModel').mockImplementation(() => ({
      invoke: mockInvoke,
      withStructuredOutput: mockWithStructuredOutput,
    } as unknown as ReturnType<typeof factoryModule.createGroqModel>));
  });

  it('1. validateRequestNode calculates correct word-count bounds without calling LLM', async () => {
    const result = await validateRequestNode(initialTestState);
    expect(result.targetWordCount).toBe(435);
    expect(result.minimumWords).toBe(Math.max(2 * 145, Math.floor(435 * 0.95))); // 413
    expect(result.maximumWords).toBe(Math.min(6 * 145, Math.ceil(435 * 1.05)));  // 457
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('2. generateConceptNode calls Groq and validates concept', async () => {
    const mockConcept = {
      premise: 'A watchmaker discovers an antique clock that predicts the exact deaths of his customers.',
      protagonist: 'Arthur Pendelton, an aging horologist.',
      motivation: 'To prevent his own daughter from dying as predicted.',
      setting: 'A dimly lit workshop in late autumn London.',
      centralConflict: 'The clock has just begun ticking down for his estranged daughter.',
      stakes: 'His daughter lives or dies within twenty-four hours.',
      incitingIncident: 'A customer dies outside his shop precisely when the clock chimes.',
      majorRevelation: 'Arthur himself built the mechanism fifty years ago while grief-stricken.',
      emotionalJourney: 'Curiosity to mounting dread to tragic acceptance.',
      climaxDirection: 'Arthur dismantles the mainspring with his bare hands as the clock strikes.',
      endingDirection: 'The clock stops, saving his daughter at the cost of his own life.',
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(mockConcept),
      usage_metadata: { input_tokens: 300, output_tokens: 200 },
    });

    const result = await generateConceptNode(initialTestState);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyConcept).toBeDefined();
    expect(result.storyConcept?.protagonist).toContain('Arthur');
    expect(result.tokenUsage).toHaveLength(1);
    expect(result.tokenUsage?.[0]?.node).toBe('generateConcept');
  });

  it('2b. generateConceptNode handles structured output with includeRaw format', async () => {
    const mockConcept = {
      premise: 'A watchmaker discovers an antique clock that predicts the exact deaths of his customers.',
      protagonist: 'Arthur Pendelton, an aging horologist.',
      motivation: 'To prevent his own daughter from dying as predicted.',
      setting: 'A dimly lit workshop in late autumn London.',
      centralConflict: 'The clock has just begun ticking down for his estranged daughter.',
      stakes: 'His daughter lives or dies within twenty-four hours.',
      incitingIncident: 'A customer dies outside his shop precisely when the clock chimes.',
      majorRevelation: 'Arthur himself built the mechanism fifty years ago while grief-stricken.',
      emotionalJourney: 'Curiosity to mounting dread to tragic acceptance.',
      climaxDirection: 'Arthur dismantles the mainspring with his bare hands as the clock strikes.',
      endingDirection: 'The clock stops, saving his daughter at the cost of his own life.',
    };

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 310, output_tokens: 195 },
      },
      parsed: mockConcept,
    });

    const result = await generateConceptNode(initialTestState);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyConcept).toBeDefined();
    expect(result.storyConcept?.protagonist).toContain('Arthur');
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(310);
    expect(result.tokenUsage?.[0]?.outputTokens).toBe(195);
  });

  it('3. generateHooksNode generates 3 hook candidates', async () => {
    const concept = {
      premise: 'Test premise',
      protagonist: 'Arthur',
      motivation: 'Save daughter',
      setting: 'London',
      centralConflict: 'Clock ticking',
      stakes: 'Life or death',
      incitingIncident: 'First death',
      majorRevelation: 'He built it',
      emotionalJourney: 'Dread to hope',
      climaxDirection: 'Break clock',
      endingDirection: 'Sacrifice',
    };

    const mockHooks = {
      candidates: [
        {
          text: 'The clock on my workbench did not measure hours; it counted heartbeats until sudden death.',
          wordCount: 15,
          style: 'mysterious',
          questionRaised: 'Whose heartbeats is it counting?',
          hookType: 'mysterious',
        },
        {
          text: 'Three men entered my repair shop today, and all three were dead before twilight.',
          wordCount: 14,
          style: 'shocking',
          questionRaised: 'How did they die?',
          hookType: 'shocking',
        },
        {
          text: 'I always knew the brass pendulum would swing, but I never expected it to point at me.',
          wordCount: 17,
          style: 'impossible_situation',
          questionRaised: 'Why does the pendulum point at him?',
          hookType: 'intriguing',
        },
      ],
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(mockHooks),
      usage_metadata: { input_tokens: 250, output_tokens: 180 },
    });

    const stateWithConcept = { ...initialTestState, storyConcept: concept };
    const result = await generateHooksNode(stateWithConcept);
    expect(result.hookCandidates).toHaveLength(3);
    expect(result.hookCandidates?.[0]?.text).toContain('workbench');
  });

  it('3b. generateHooksNode handles <think> reasoning tags and trailing commas', async () => {
    const concept = {
      premise: 'Test premise',
      protagonist: 'Arthur',
      motivation: 'Save daughter',
      setting: 'London',
      centralConflict: 'Clock ticking',
      stakes: 'Life or death',
      incitingIncident: 'First death',
      majorRevelation: 'He built it',
      emotionalJourney: 'Dread to hope',
      climaxDirection: 'Break clock',
      endingDirection: 'Sacrifice',
    };

    const rawWithThink = `<think>
Thinking about 3 opening hooks for Arthur...
We need JSON formatted like: { "candidates": [...] }
Candidate 1: Workbench heartbeats.
</think>
\`\`\`json
{
  "candidates": [
    {
      "text": "The clock on my workbench did not measure hours; it counted heartbeats.",
      "wordCount": 12,
      "style": "mysterious",
      "questionRaised": "Whose heartbeats?",
      "hookType": "mysterious",
    },
    {
      "text": "Three men entered my repair shop today, and all three were dead before twilight.",
      "wordCount": 14,
      "style": "shocking",
      "questionRaised": "How did they die?",
      "hookType": "shocking",
    },
    {
      "text": "I always knew the brass pendulum would swing, but I never expected it to point at me.",
      "wordCount": 17,
      "style": "impossible_situation",
      "questionRaised": "Why does it point at him?",
      "hookType": "intriguing",
    },
  ],
}
\`\`\``;

    mockInvoke.mockResolvedValueOnce({
      content: rawWithThink,
      usage_metadata: { input_tokens: 300, output_tokens: 220 },
    });

    const stateWithConcept = { ...initialTestState, storyConcept: concept };
    const result = await generateHooksNode(stateWithConcept);
    expect(result.hookCandidates).toHaveLength(3);
    expect(result.hookCandidates?.[0]?.text).toContain('workbench');
  });

  it('3c. generateHooksNode normalizes bare array and alternative keys like { hooks: [...] }', async () => {
    const concept = {
      premise: 'Test premise',
      protagonist: 'Arthur',
      motivation: 'Save daughter',
      setting: 'London',
      centralConflict: 'Clock ticking',
      stakes: 'Life or death',
      incitingIncident: 'First death',
      majorRevelation: 'He built it',
      emotionalJourney: 'Dread to hope',
      climaxDirection: 'Break clock',
      endingDirection: 'Sacrifice',
    };

    const alternativeResponse = {
      hooks: [
        {
          text: 'The antique pendulum began swinging in reverse, unspooling sixty years of carefully buried crimes.',
          wordCount: 14,
          style: 'mysterious',
          questionRaised: 'What crimes?',
          hookType: 'mysterious',
        },
        {
          text: 'Every clock in London struck midnight at once, except the one counting down my final hour.',
          wordCount: 16,
          style: 'shocking',
          questionRaised: 'Who is counting down?',
          hookType: 'shocking',
        },
        {
          text: 'I built the mechanism to save my daughter, but it demanded my heartbeat as payment.',
          wordCount: 15,
          style: 'dramatic',
          questionRaised: 'Will he pay?',
          hookType: 'dramatic',
        },
      ],
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(alternativeResponse),
      usage_metadata: { input_tokens: 280, output_tokens: 190 },
    });

    const stateWithConcept = { ...initialTestState, storyConcept: concept };
    const result = await generateHooksNode(stateWithConcept);
    expect(result.hookCandidates).toHaveLength(3);
    expect(result.hookCandidates?.[0]?.text).toContain('pendulum');
  });

  it('3d. generateHooksNode retries once if first attempt fails to parse and succeeds on attempt 2', async () => {
    const concept = {
      premise: 'Test premise',
      protagonist: 'Arthur',
      motivation: 'Save daughter',
      setting: 'London',
      centralConflict: 'Clock ticking',
      stakes: 'Life or death',
      incitingIncident: 'First death',
      majorRevelation: 'He built it',
      emotionalJourney: 'Dread to hope',
      climaxDirection: 'Break clock',
      endingDirection: 'Sacrifice',
    };

    // Attempt 1: Completely invalid non-JSON output
    mockInvoke.mockResolvedValueOnce({
      content: 'Here are some hook ideas: 1. A clock that ticks. 2. A watch that stops.',
      usage_metadata: { input_tokens: 200, output_tokens: 50 },
    });

    // Attempt 2: Clean valid JSON output
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        candidates: [
          { text: 'Hook number one line text here.', wordCount: 6, style: 'm', questionRaised: 'q', hookType: 'm' },
          { text: 'Hook number two line text here.', wordCount: 6, style: 'm', questionRaised: 'q', hookType: 'm' },
          { text: 'Hook number three line text here.', wordCount: 6, style: 'm', questionRaised: 'q', hookType: 'm' },
        ],
      }),
      usage_metadata: { input_tokens: 250, output_tokens: 150 },
    });

    const stateWithConcept = { ...initialTestState, storyConcept: concept };
    const result = await generateHooksNode(stateWithConcept);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.hookCandidates).toHaveLength(3);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.tokenUsage?.[0]?.calls).toBe(2);
  });

  it('3e. generateHooksNode handles structured output with includeRaw format', async () => {
    const concept = {
      premise: 'Test premise',
      protagonist: 'Arthur',
      motivation: 'Save daughter',
      setting: 'London',
      centralConflict: 'Clock ticking',
      stakes: 'Life or death',
      incitingIncident: 'First death',
      majorRevelation: 'He built it',
      emotionalJourney: 'Dread to hope',
      climaxDirection: 'Break clock',
      endingDirection: 'Sacrifice',
    };

    const mockHooks = {
      candidates: [
        { text: 'Hook number one line text here.', wordCount: 6, style: 'mysterious', questionRaised: 'q1', hookType: 'mysterious' },
        { text: 'Hook number two line text here.', wordCount: 6, style: 'mysterious', questionRaised: 'q2', hookType: 'mysterious' },
        { text: 'Hook number three line text here.', wordCount: 6, style: 'mysterious', questionRaised: 'q3', hookType: 'mysterious' },
      ],
    };

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 275, output_tokens: 165 },
      },
      parsed: mockHooks,
    });

    const stateWithConcept = { ...initialTestState, storyConcept: concept };
    const result = await generateHooksNode(stateWithConcept);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.hookCandidates).toHaveLength(3);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(275);
    expect(result.tokenUsage?.[0]?.outputTokens).toBe(165);
  });

  it('4. evaluateHooksNode scores candidates and selects the best one', async () => {
    const candidates = [
      {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats until sudden death.',
        wordCount: 15,
        style: 'mysterious',
        questionRaised: 'Whose heartbeats is it counting?',
        hookType: 'mysterious',
      },
      {
        text: 'Hook two text here for testing.',
        wordCount: 6,
        style: 'shocking',
        questionRaised: 'Question?',
        hookType: 'shocking',
      },
      {
        text: 'Hook three text here for testing.',
        wordCount: 6,
        style: 'emotional',
        questionRaised: 'Question?',
        hookType: 'emotional',
      },
    ];

    const mockEval = {
      scores: {
        curiosity: 9,
        clarity: 9,
        impact: 9,
        relevance: 10,
        promiseFulfillment: 9,
        narrationQuality: 9,
      },
      overallScore: 9.2,
      selectedCandidateIndex: 0,
      reasoning: 'Candidate 0 immediately hooks the listener with vivid imagery.',
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(mockEval),
      usage_metadata: { input_tokens: 350, output_tokens: 150 },
    });

    const stateWithHooks = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      hookCandidates: candidates,
    };

    const result = await evaluateHooksNode(stateWithHooks);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.selectedHook).toEqual(candidates[0]);
    expect(result.hookEvaluation?.overallScore).toBe(9.2);
  });

  it('4b. evaluateHooksNode handles structured output with includeRaw format', async () => {
    const candidates = [
      {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats until sudden death.',
        wordCount: 15,
        style: 'mysterious',
        questionRaised: 'Whose heartbeats is it counting?',
        hookType: 'mysterious',
      },
      {
        text: 'Hook two text here for testing.',
        wordCount: 6,
        style: 'shocking',
        questionRaised: 'Question?',
        hookType: 'shocking',
      },
    ];

    const mockEval = {
      scores: {
        curiosity: 9,
        clarity: 9,
        impact: 9,
        relevance: 10,
        promiseFulfillment: 9,
        narrationQuality: 9,
      },
      overallScore: 9.2,
      selectedCandidateIndex: 0,
      reasoning: 'Candidate 0 creates the strongest opening hook.',
    };

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 340, output_tokens: 140 },
      },
      parsed: mockEval,
    });

    const stateWithHooks = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      hookCandidates: candidates,
    };

    const result = await evaluateHooksNode(stateWithHooks);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.selectedHook).toEqual(candidates[0]);
    expect(result.hookEvaluation?.overallScore).toBe(9.2);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(340);
  });

  it('5. generateOutlineNode creates 4-6 beats respecting duration budget', async () => {
    const mockOutline = {
      totalWordBudget: 435,
      beats: [
        { beatNumber: 1, title: 'The Ticking Warning', description: 'Opening scene', purpose: 'Hook', wordBudget: 75, key_moments: ['Hook delivered'] },
        { beatNumber: 2, title: 'The Revelation', description: 'Arthur inspects the clock', purpose: 'Setup', wordBudget: 85, key_moments: ['Finds daughter name'] },
        { beatNumber: 3, title: 'Escalation', description: 'The clock speeds up', purpose: 'Escalation', wordBudget: 90, key_moments: ['Tension rises'] },
        { beatNumber: 4, title: 'The Confrontation', description: 'Arthur fights time', purpose: 'Climax', wordBudget: 110, key_moments: ['Smashes gear'] },
        { beatNumber: 5, title: 'Quiet Silence', description: 'The aftermath', purpose: 'Resolution', wordBudget: 75, key_moments: ['Silence falls'] },
      ],
      narrativeArc: 'Tension rising to sacrifice',
      paceNotes: 'Fast acceleration in beat 3',
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(mockOutline),
      usage_metadata: { input_tokens: 400, output_tokens: 300 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats.',
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Whose?',
        hookType: 'mysterious',
      },
    };

    const result = await generateOutlineNode(state);
    expect(result.storyOutline?.beats).toHaveLength(5);
    expect(result.storyOutline?.totalWordBudget).toBe(435);
  });

  it('5b. generateOutlineNode normalizes camelCase keyMoments, nested objects, and enforces 4-6 beats', async () => {
    // Nested inside { outline: ... }, uses camelCase keyMoments, string wordBudget, and only 3 beats (under min 4)
    const nestedRaw = `<think>
Creating outline...
</think>
\`\`\`json
{
  "outline": {
    "totalWordBudget": "435",
    "beats": [
      { "beatNumber": 1, "title": "B1", "description": "D1", "purpose": "Hook", "wordBudget": "150", "keyMoments": ["Hook delivered"] },
      { "beatNumber": 2, "title": "B2", "description": "D2", "purpose": "Escalation", "wordBudget": "150", "keyMoments": ["Tension rises"] },
      { "beatNumber": 3, "title": "B3", "description": "D3", "purpose": "Climax", "wordBudget": "135", "keyMoments": ["Clock broken"] }
    ],
    "arc": "Rising arc",
    "pacing": "Fast pace"
  }
}
\`\`\``;

    mockInvoke.mockResolvedValueOnce({
      content: nestedRaw,
      usage_metadata: { input_tokens: 380, output_tokens: 280 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats.',
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Whose?',
        hookType: 'mysterious',
      },
    };

    const result = await generateOutlineNode(state);
    // Normalized to at least 4 beats
    expect(result.storyOutline?.beats.length).toBeGreaterThanOrEqual(4);
    expect(result.storyOutline?.beats.length).toBeLessThanOrEqual(6);
    expect(result.storyOutline?.beats[0]?.key_moments).toBeDefined();
    expect(result.storyOutline?.narrativeArc).toBe('Rising arc');
  });

  it('5c. generateOutlineNode retries once if first attempt is unparseable', async () => {
    // Attempt 1: Malformed output
    mockInvoke.mockResolvedValueOnce({
      content: 'Here is an outline: Beat 1, Beat 2...',
      usage_metadata: { input_tokens: 300, output_tokens: 40 },
    });

    // Attempt 2: Clean valid JSON
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
          { beatNumber: 2, title: 'B2', description: 'D2', purpose: 'P2', wordBudget: 100, key_moments: ['M2'] },
          { beatNumber: 3, title: 'B3', description: 'D3', purpose: 'P3', wordBudget: 115, key_moments: ['M3'] },
          { beatNumber: 4, title: 'B4', description: 'D4', purpose: 'P4', wordBudget: 120, key_moments: ['M4'] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      }),
      usage_metadata: { input_tokens: 350, output_tokens: 250 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats.',
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Whose?',
        hookType: 'mysterious',
      },
    };

    const result = await generateOutlineNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyOutline?.beats).toHaveLength(4);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.tokenUsage?.[0]?.calls).toBe(2);
  });

  it('5d. generateOutlineNode handles structured output with includeRaw format', async () => {
    const mockOutline = {
      totalWordBudget: 435,
      beats: [
        { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
        { beatNumber: 2, title: 'B2', description: 'D2', purpose: 'P2', wordBudget: 100, key_moments: ['M2'] },
        { beatNumber: 3, title: 'B3', description: 'D3', purpose: 'P3', wordBudget: 115, key_moments: ['M3'] },
        { beatNumber: 4, title: 'B4', description: 'D4', purpose: 'P4', wordBudget: 120, key_moments: ['M4'] },
      ],
      narrativeArc: 'Arc',
      paceNotes: 'Pace',
    };

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 390, output_tokens: 270 },
      },
      parsed: mockOutline,
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'The clock on my workbench did not measure hours; it counted heartbeats.',
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Whose?',
        hookType: 'mysterious',
      },
    };

    const result = await generateOutlineNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyOutline?.beats).toHaveLength(4);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(390);
  });

  it('6. writeStoryNode generates story with opening hook as first sentence', async () => {
    const hookText = 'The clock on my workbench did not measure hours; it counted heartbeats.';
    const scriptBody = Array(420).fill('word').join(' ');
    const fullScript = `${hookText}\n\n${scriptBody}`;

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        title: 'The Ticking Death',
        script: fullScript,
      }),
      usage_metadata: { input_tokens: 800, output_tokens: 600 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: hookText,
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
          { beatNumber: 2, title: 'B2', description: 'D2', purpose: 'P2', wordBudget: 100, key_moments: ['M2'] },
          { beatNumber: 3, title: 'B3', description: 'D3', purpose: 'P3', wordBudget: 115, key_moments: ['M3'] },
          { beatNumber: 4, title: 'B4', description: 'D4', purpose: 'P4', wordBudget: 120, key_moments: ['M4'] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
    };

    const result = await writeStoryNode(state);
    expect(result.draftTitle).toBe('The Ticking Death');
    expect(result.draftScript).toContain(hookText);
  });

  it('6b. writeStoryNode handles JSON with raw unescaped newlines and dialogue quotes', async () => {
    const hookText = 'The clock on my workbench did not measure hours; it counted heartbeats.';
    const rawWithNewlines = `{
      "title": "A Watchmaker Tale",
      "script": "${hookText}

I stood over the workbench in silence. \\"Who made this?\\" I whispered into the darkness.

The clock ticked faster, answering my question with dread."
    }`;

    mockInvoke.mockResolvedValueOnce({
      content: rawWithNewlines,
      usage_metadata: { input_tokens: 600, output_tokens: 400 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: hookText,
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
    };

    const result = await writeStoryNode(state);
    expect(result.draftTitle).toBe('A Watchmaker Tale');
    expect(result.draftScript).toContain(hookText);
  });

  it('6c. writeStoryNode handles markdown response fallback', async () => {
    const hookText = 'The clock on my workbench did not measure hours; it counted heartbeats.';
    const markdownResponse = `# The Midnight Watchmaker

${hookText}

Arthur watched the pendulum slice through the dim candlelight of the workshop. Sixty years of clockmaking had taught him that machines do not lie, but this brass pocket watch defied everything he knew.`;

    mockInvoke.mockResolvedValueOnce({
      content: markdownResponse,
      usage_metadata: { input_tokens: 600, output_tokens: 400 },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: hookText,
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
    };

    const result = await writeStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.draftTitle).toBe('The Midnight Watchmaker');
    expect(result.draftScript).toContain(hookText);
  });

  it('6d. writeStoryNode handles structured output with includeRaw format', async () => {
    const hookText = 'The clock on my workbench did not measure hours; it counted heartbeats.';
    const scriptBody = Array(420).fill('word').join(' ');
    const fullScript = `${hookText}\n\n${scriptBody}`;

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 780, output_tokens: 580 },
      },
      parsed: {
        title: 'Structured Output Story',
        script: fullScript,
      },
    });

    const state = {
      ...initialTestState,
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: hookText,
        wordCount: 11,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: ['M1'] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
    };

    const result = await writeStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.draftTitle).toBe('Structured Output Story');
    expect(result.draftScript).toContain(hookText);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(780);
  });

  it('7. evaluateStoryNode evaluates quality scores and overrides duration deterministically', async () => {
    const words = Array(435).fill('word').join(' ');
    const mockEval = {
      scores: {
        hook: 9,
        engagement: 8,
        pacing: 8,
        characterDevelopment: 8,
        coherence: 9,
        emotionalImpact: 8,
        climax: 8,
        endingSatisfaction: 9,
        voiceoverQuality: 9,
        configurationAdherence: 9,
      },
      overallScore: 8.5,
      strengths: ['Compelling hook and great ending'],
      weaknesses: [],
      specificIssues: [],
      requiredImprovements: [],
      hookDelivered: true,
      approvalStatus: 'APPROVED',
    };

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify(mockEval),
      usage_metadata: { input_tokens: 600, output_tokens: 300 },
    });

    const state = {
      ...initialTestState,
      draftScript: words,
    };

    const result = await evaluateStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyEvaluation?.approvalStatus).toBe('APPROVED');
    expect(result.storyEvaluation?.durationValidation.wordCount).toBe(435);
    expect(result.storyEvaluation?.durationValidation.withinBounds).toBe(true);
  });

  it('7b. evaluateStoryNode handles unescaped quotes in strengths and markdown review fallback', async () => {
    const words = Array(435).fill('word').join(' ');
    const rawWithQuotes = `{
      "scores": { "hook": 9, "engagement": 8, "pacing": 8, "characterDevelopment": 8, "coherence": 9, "emotionalImpact": 8, "climax": 8, "endingSatisfaction": 9, "voiceoverQuality": 9, "configurationAdherence": 9 },
      "overallScore": 8.5,
      "strengths": [
        "Strong hook: \\"The clock did not measure hours\\" creates mystery."
      ],
      "weaknesses": ["Pacing dips slightly"],
      "specificIssues": [],
      "requiredImprovements": [],
      "hookDelivered": true,
      "approvalStatus": "APPROVED"
    }`;

    mockInvoke.mockResolvedValueOnce({
      content: rawWithQuotes,
      usage_metadata: { input_tokens: 500, output_tokens: 250 },
    });

    const state = {
      ...initialTestState,
      draftScript: words,
    };

    const result = await evaluateStoryNode(state);
    expect(result.storyEvaluation?.approvalStatus).toBe('APPROVED');
    expect(result.storyEvaluation?.scores.hook).toBe(9);
  });

  it('7c. evaluateStoryNode parses markdown evaluation fallback', async () => {
    const words = Array(435).fill('word').join(' ');
    const markdownReview = `### Scores
- Hook: 9/10
- Engagement: 8/10
- Pacing: 8/10
- Character Development: 8/10
- Coherence: 9/10
- Emotional Impact: 8/10
- Climax: 8/10
- Ending Satisfaction: 9/10
- Voiceover Quality: 9/10
- Configuration Adherence: 9/10

Overall Score: 8.5/10

### Strengths
- Vivid opening hook and strong conclusion

### Weaknesses
- None

### Approval Status: APPROVED`;

    mockInvoke.mockResolvedValueOnce({
      content: markdownReview,
      usage_metadata: { input_tokens: 500, output_tokens: 250 },
    });

    const state = {
      ...initialTestState,
      draftScript: words,
    };

    const result = await evaluateStoryNode(state);
    expect(result.storyEvaluation?.approvalStatus).toBe('APPROVED');
    expect(result.storyEvaluation?.scores.hook).toBe(9);
  });

  it('7d. evaluateStoryNode handles structured output with includeRaw format', async () => {
    const words = Array(435).fill('word').join(' ');
    const mockEval = {
      scores: {
        hook: 9,
        engagement: 8,
        pacing: 8,
        characterDevelopment: 8,
        coherence: 9,
        emotionalImpact: 8,
        climax: 8,
        endingSatisfaction: 9,
        voiceoverQuality: 9,
        configurationAdherence: 9,
      },
      overallScore: 8.5,
      strengths: ['Structured output hook evaluation'],
      weaknesses: [],
      specificIssues: [],
      requiredImprovements: [],
      hookDelivered: true,
      approvalStatus: 'APPROVED',
    };

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 520, output_tokens: 180 },
      },
      parsed: mockEval,
    });

    const state = {
      ...initialTestState,
      draftScript: words,
    };

    const result = await evaluateStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.storyEvaluation?.approvalStatus).toBe('APPROVED');
    expect(result.storyEvaluation?.scores.hook).toBe(9);
    expect(result.storyEvaluation?.durationValidation.wordCount).toBe(435);
    expect(result.storyEvaluation?.durationValidation.withinBounds).toBe(true);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(520);
    expect(result.tokenUsage?.[0]?.outputTokens).toBe(180);
  });

  it('7e. evaluateStoryNode handles direct parsed object from structured output', async () => {
    const words = Array(435).fill('word').join(' ');
    const mockEval = {
      scores: {
        hook: 8,
        engagement: 8,
        pacing: 8,
        characterDevelopment: 8,
        coherence: 8,
        emotionalImpact: 8,
        climax: 8,
        endingSatisfaction: 8,
        voiceoverQuality: 8,
        configurationAdherence: 8,
      },
      overallScore: 8.0,
      strengths: ['Consistent story delivery'],
      weaknesses: [],
      specificIssues: [],
      requiredImprovements: [],
      hookDelivered: true,
      approvalStatus: 'APPROVED',
    };

    mockInvoke.mockResolvedValueOnce(mockEval);

    const state = {
      ...initialTestState,
      draftScript: words,
    };

    const result = await evaluateStoryNode(state);
    expect(result.storyEvaluation?.approvalStatus).toBe('APPROVED');
    expect(result.storyEvaluation?.scores.hook).toBe(8);
    expect(result.storyEvaluation?.durationValidation.wordCount).toBe(435);
  });

  it('8. shouldReviseRouter routes conditionally and respects maximum 2 revisions', () => {
    // Approved -> finalValidation
    const approvedState = {
      ...initialTestState,
      revisionCount: 0,
      storyEvaluation: {
        approvalStatus: 'APPROVED',
      } as unknown as WorkflowState['storyEvaluation'],
    };
    expect(shouldReviseRouter(approvedState)).toBe('finalValidation');

    // Needs revision with count 0 -> reviseStory
    const needsRevisionState0 = {
      ...initialTestState,
      revisionCount: 0,
      storyEvaluation: {
        approvalStatus: 'NEEDS_REVISION',
      } as unknown as WorkflowState['storyEvaluation'],
    };
    expect(shouldReviseRouter(needsRevisionState0)).toBe('reviseStory');

    // Needs revision with count 1 -> reviseStory
    const needsRevisionState1 = {
      ...initialTestState,
      revisionCount: 1,
      storyEvaluation: {
        approvalStatus: 'NEEDS_REVISION',
      } as unknown as WorkflowState['storyEvaluation'],
    };
    expect(shouldReviseRouter(needsRevisionState1)).toBe('reviseStory');

    // Needs revision with count 2 (limit reached) -> finalValidation (prevents infinite loop!)
    const needsRevisionState2 = {
      ...initialTestState,
      revisionCount: 2,
      storyEvaluation: {
        approvalStatus: 'NEEDS_REVISION',
      } as unknown as WorkflowState['storyEvaluation'],
    };
    expect(shouldReviseRouter(needsRevisionState2)).toBe('finalValidation');
  });

  it('9. reviseStoryNode increments revisionCount and updates draft script', async () => {
    const revisedScript = Array(435).fill('revisedWord').join(' ');

    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        title: 'Revised Title',
        script: revisedScript,
      }),
      usage_metadata: { input_tokens: 700, output_tokens: 500 },
    });

    const state = {
      ...initialTestState,
      revisionCount: 0,
      draftTitle: 'Old Title',
      draftScript: 'Old script text',
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'Hook line.',
        wordCount: 2,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: [] },
          { beatNumber: 2, title: 'B2', description: 'D2', purpose: 'P2', wordBudget: 100, key_moments: [] },
          { beatNumber: 3, title: 'B3', description: 'D3', purpose: 'P3', wordBudget: 100, key_moments: [] },
          { beatNumber: 4, title: 'B4', description: 'D4', purpose: 'P4', wordBudget: 135, key_moments: [] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
      storyEvaluation: {
        requiredImprovements: ['Tighten pacing in scene 2'],
      } as unknown as WorkflowState['storyEvaluation'],
    };

    const result = await reviseStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.revisionCount).toBe(1);
    expect(result.draftTitle).toBe('Revised Title');
    expect(result.draftScript).toBe(revisedScript);
  });

  it('9b. reviseStoryNode handles structured output with includeRaw format', async () => {
    const revisedScript = Array(435).fill('revisedStructuredWord').join(' ');

    mockInvoke.mockResolvedValueOnce({
      raw: {
        content: '',
        usage_metadata: { input_tokens: 720, output_tokens: 510 },
      },
      parsed: {
        title: 'Structured Revised Title',
        script: revisedScript,
      },
    });

    const state = {
      ...initialTestState,
      revisionCount: 0,
      draftTitle: 'Old Title',
      draftScript: 'Old script text',
      storyConcept: {
        premise: 'P', protagonist: 'A', motivation: 'M', setting: 'S', centralConflict: 'C',
        stakes: 'St', incitingIncident: 'I', majorRevelation: 'R', emotionalJourney: 'E',
        climaxDirection: 'Cl', endingDirection: 'En',
      },
      selectedHook: {
        text: 'Hook line.',
        wordCount: 2,
        style: 'mysterious',
        questionRaised: 'Q',
        hookType: 'mysterious',
      },
      storyOutline: {
        totalWordBudget: 435,
        beats: [
          { beatNumber: 1, title: 'B1', description: 'D1', purpose: 'P1', wordBudget: 100, key_moments: [] },
        ],
        narrativeArc: 'Arc',
        paceNotes: 'Pace',
      },
      storyEvaluation: {
        requiredImprovements: ['Tighten pacing in scene 2'],
      } as unknown as WorkflowState['storyEvaluation'],
    };

    const result = await reviseStoryNode(state);
    expect(mockWithStructuredOutput).toHaveBeenCalled();
    expect(result.revisionCount).toBe(1);
    expect(result.draftTitle).toBe('Structured Revised Title');
    expect(result.draftScript).toBe(revisedScript);
    expect(result.tokenUsage?.[0]?.inputTokens).toBe(720);
  });

  it('10. finalValidationNode determines final approval and rejects out-of-range stories', async () => {
    // In-range script with passing scores -> APPROVED
    const goodScript = Array(435).fill('word').join(' ');
    const stateGood = {
      ...initialTestState,
      draftTitle: 'Good Story',
      draftScript: goodScript,
      storyEvaluation: {
        scores: {
          hook: 8,
          endingSatisfaction: 8,
          coherence: 8,
          voiceoverQuality: 8,
          engagement: 8,
          pacing: 8,
          characterDevelopment: 8,
          emotionalImpact: 8,
          climax: 8,
          configurationAdherence: 8,
        },
      } as unknown as WorkflowState['storyEvaluation'],
    };

    const resultGood = await finalValidationNode(stateGood);
    expect(resultGood.approvalStatus).toBe('APPROVED');
    expect(resultGood.validationPassed).toBe(true);

    // Too short script (out of bounds) -> NEEDS_REVIEW even with high scores
    const shortScript = Array(200).fill('word').join(' ');
    const stateShort = {
      ...stateGood,
      draftScript: shortScript,
    };

    const resultShort = await finalValidationNode(stateShort);
    expect(resultShort.approvalStatus).toBe('NEEDS_REVIEW');
    expect(resultShort.validationPassed).toBe(false);
  });

  it('11. formatVoiceoverNode cleanly formats paragraphs without altering core content', async () => {
    const rawScript = 'Paragraph 1 here.\n\nParagraph 2 here with some dialogue.\n\nParagraph 3.';
    const state = {
      ...initialTestState,
      finalScript: rawScript,
      finalTitle: 'Final Title',
    };

    const result = await formatVoiceoverNode(state);
    expect(result.finalScript).toBeDefined();
    expect(result.finalWordCount).toBeGreaterThan(0);
    expect(result.finalDurationSeconds).toBeGreaterThan(0);
  });
});

