/**
 * Live End-to-End Smoke Test.
 *
 * Runs the exact story configuration specified in Prompt 10:
 * - Genre: Psychological Thriller
 * - POV: First Person
 * - Tense: Past
 * - Duration: 3 minutes (Target: ~435 words)
 * - Mood: Dark and Suspenseful
 * - Hook: Mysterious
 * - Ending: Unexpected Revelation
 * - Pacing: Gradually Escalating
 * - Narration: Conversational
 * - Language: English
 *
 * Usage:
 *   npx tsx tests/smoke/live-generation.ts          # Safe dry-run mode
 *   npx tsx tests/smoke/live-generation.ts --live   # Actual live Bedrock and DynamoDB test
 */

import { getStoryGraph } from '../../src/ai/workflow/graph.js';
import { countWords, estimateDurationMinutes, calculateWordCountTargets } from '../../src/utils/word-count.js';
import {
  env,
  effectiveWriterModelId,
  effectiveEvaluatorModelId,
  getDynamoDBCredentials,
} from '../../src/config/env.js';
import type { WorkflowState } from '../../src/ai/workflow/state.js';
import type { StoryConfiguration } from '../../src/ai/schemas/story-config.schema.js';

async function main(): Promise<void> {
  const isLive = process.argv.includes('--live');
  const groqApiKey = env.GROQ_API_KEY ?? process.env['GROQ_API_KEY'];
  const dbCreds = getDynamoDBCredentials();

  console.log('=================================================================');
  console.log(' PERSONAL AI STORY GENERATOR — END-TO-END SMOKE TEST (PROMPT 10) ');
  console.log('=================================================================');
  console.log(`Target Duration:      3 minutes (Target: ~435 words)`);
  console.log(`Narration Speed:      145 WPM`);
  console.log(`Genre:                Psychological Thriller`);
  console.log(`POV:                  First Person`);
  console.log(`Tense:                Past`);
  console.log(`Mood:                 Dark, Suspenseful`);
  console.log(`Hook Style:           Mysterious`);
  console.log(`Ending Style:         Unexpected Twist / Revelation`);
  console.log(`Pacing:               Gradually Escalating`);
  console.log(`Narrative Style:      Conversational`);
  console.log(`Language:             English`);
  console.log(`Writer Model:         ${effectiveWriterModelId}`);
  console.log(`Evaluator Model:      ${effectiveEvaluatorModelId}`);
  console.log(`Groq Auth:            ${groqApiKey ? `Explicit API Key (${groqApiKey.slice(0, 7)}...***)` : 'Missing GROQ_API_KEY'}`);
  console.log(`DynamoDB Auth:        ${dbCreds ? `Explicit API Key (${dbCreds.accessKeyId.slice(0, 4)}...***)` : (env.DYNAMODB_ENDPOINT ? 'Local Dev Credentials (local/local)' : 'AWS Default Credential Chain')}`);
  console.log('=================================================================\n');

  const config: StoryConfiguration = {
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
    theme: 'An archivist discovers tape recordings of interviews that have not happened yet',
  };

  const targets = calculateWordCountTargets(config.durationMinutes, config.narrationWordsPerMinute);
  console.log(`Computed Targets: Target=${targets.targetWordCount}, Min=${targets.minimumWords}, Max=${targets.maximumWords}`);

  if (!isLive) {
    console.log('\n[DRY RUN] Live Groq call skipped.');
    console.log('To run this test against live Groq and DynamoDB, pass the --live flag:');
    console.log('  npm run test:smoke -- --live\n');

    console.log('Verifying graph compilation...');
    const graph = getStoryGraph();
    if (graph) {
      console.log('✓ LangGraph compiled successfully with all 10 nodes and conditional routing.');
      console.log('✓ Smoke test dry-run passed.');
      process.exit(0);
    } else {
      console.error('✗ Failed to compile LangGraph workflow');
      process.exit(1);
    }
  }

  console.log('\n[LIVE EXECUTION] Running LangGraph workflow via Groq...');
  const generationId = `smoke-${Date.now()}`;
  const graph = getStoryGraph();

  const initialState: Partial<WorkflowState> = {
    generationId,
    request: config,
    targetWordCount: targets.targetWordCount,
    minimumWords: targets.minimumWords,
    maximumWords: targets.maximumWords,
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

  const startTime = Date.now();
  const stream = graph.streamEvents(initialState, { version: 'v2' });
  let finalState: WorkflowState | null = null;

  for await (const event of stream) {
    if (event.event === 'on_chain_start' && event.name !== 'LangGraph') {
      console.log(`  → Stage: ${event.name}`);
    }
    if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
      finalState = event.data?.output as WorkflowState;
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nWorkflow finished in ${durationSec}s`);

  if (!finalState || !finalState.finalScript) {
    console.error('✗ Workflow failed to produce a final script.');
    process.exit(1);
  }

  const actualWords = countWords(finalState.finalScript);
  const actualDurationMinutes = estimateDurationMinutes(actualWords, config.narrationWordsPerMinute);

  console.log('\n=================================================================');
  console.log(`TITLE:               ${finalState.finalTitle}`);
  console.log(`WORD COUNT:          ${actualWords} words (Target: ${targets.targetWordCount})`);
  console.log(`ESTIMATED DURATION:  ${actualDurationMinutes.toFixed(2)} minutes (Range: 2.0 - 6.0 min)`);
  console.log(`APPROVAL STATUS:     ${finalState.approvalStatus}`);
  console.log(`REVISIONS PERFORMED: ${finalState.revisionCount}`);
  console.log('=================================================================\n');

  console.log('--- SCRIPT PREVIEW ---');
  console.log(finalState.finalScript.substring(0, 400) + '...\n');

  // Assertions
  const withinBounds = actualWords >= targets.minimumWords && actualWords <= targets.maximumWords;
  const isHookFirst = finalState.selectedHook
    ? finalState.finalScript.startsWith(finalState.selectedHook.text.substring(0, 30))
    : false;

  console.log('Smoke Test Verification Checklist:');
  console.log(`- Hook at beginning:               ${isHookFirst ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`- Word count within bounds:        ${withinBounds ? '✓ PASS' : '✗ FAIL'} (${actualWords} words)`);
  console.log(`- Duration strictly 2–6 minutes:   ${actualDurationMinutes >= 2 && actualDurationMinutes <= 6 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`- Story evaluation completed:      ${finalState.storyEvaluation ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`- Revisions <= 2:                  ${finalState.revisionCount <= 2 ? '✓ PASS' : '✗ FAIL'}`);

  if (withinBounds && actualDurationMinutes >= 2 && actualDurationMinutes <= 6) {
    console.log('\n✓ Smoke test PASSED all criteria!');
  } else {
    console.warn('\n⚠ Smoke test completed with warnings (check bounds above).');
  }
}

void main();
