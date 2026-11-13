import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createGroqModel } from '../../models/groq-model.factory.js';
import { buildRevisionPrompt } from '../../prompts/writer.prompt.js';
import { FinalStorySchema } from '../../schemas/final-story.schema.js';
import { countWords } from '../../../utils/word-count.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveWriterModelId } from '../../../config/env.js';
import { extractStoryFromResponse, normalizeStoryObject } from './write-story.node.js';
export async function reviseStoryNode(state) {
    logger.info({ generationId: state.generationId, revisionCount: state.revisionCount }, '[reviseStory] Starting');
    if (!state.storyConcept || !state.selectedHook || !state.storyOutline || !state.draftScript) {
        throw new WorkflowError('Missing required state for revision', 'reviseStory');
    }
    const evaluation = state.storyEvaluation;
    const revisionInstructions = evaluation?.requiredImprovements ?? [
        'Improve overall story quality',
        'Ensure the hook is delivered on',
        'Strengthen the ending',
    ];
    const currentWordCount = countWords(state.draftScript);
    const start = Date.now();
    const baseModel = createGroqModel('revision');
    const model = typeof baseModel.withStructuredOutput === 'function'
        ? baseModel.withStructuredOutput(FinalStorySchema, {
            method: 'jsonMode',
            includeRaw: true,
        })
        : baseModel;
    const basePrompt = buildRevisionPrompt(state.request, state.storyConcept, state.selectedHook, state.storyOutline, state.draftScript, revisionInstructions, state.targetWordCount, state.minimumWords, state.maximumWords, currentWordCount);
    let response = null;
    let parsed = null;
    let lastError = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
        attempts = attempt;
        const prompt = attempt === 1
            ? basePrompt
            : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide the complete revised story in json format with title and script, incorporating the requested improvements.`;
        const input = [
            new SystemMessage('You are a master storyteller. Output a json object adhering to the schema.'),
            new HumanMessage(prompt),
        ];
        try {
            const invokeResult = (await model.invoke(input));
            // 1. Structured output result with { raw, parsed }
            if (invokeResult && typeof invokeResult === 'object' && 'parsed' in invokeResult) {
                const structuredResult = invokeResult;
                if (structuredResult.raw) {
                    response = structuredResult.raw;
                }
                if (structuredResult.parsed) {
                    parsed = normalizeStoryObject(structuredResult.parsed);
                    if (parsed)
                        break;
                }
                if (!parsed && structuredResult.raw?.content) {
                    try {
                        parsed = extractStoryFromResponse(structuredResult.raw.content, state.draftTitle || state.selectedHook.text.slice(0, 40));
                        if (parsed)
                            break;
                    }
                    catch {
                        // fall through
                    }
                }
            }
            // 2. Direct parsed story object
            if (!parsed &&
                invokeResult &&
                typeof invokeResult === 'object' &&
                'script' in invokeResult) {
                parsed = normalizeStoryObject(invokeResult);
                if (parsed)
                    break;
            }
            // 3. Fallback: BaseMessage or text extraction
            const rawMsg = invokeResult &&
                typeof invokeResult === 'object' &&
                ('content' in invokeResult || 'usage_metadata' in invokeResult)
                ? invokeResult
                : response;
            if (rawMsg) {
                response = rawMsg;
            }
            const rawContent = rawMsg?.content;
            const rawText = typeof rawContent === 'string'
                ? rawContent
                : Array.isArray(rawContent)
                    ? rawContent
                        .map((c) => typeof c === 'string'
                        ? c
                        : c && typeof c === 'object' && 'text' in c
                            ? String(c.text)
                            : '')
                        .join('')
                    : typeof invokeResult === 'string'
                        ? invokeResult
                        : String(rawContent ?? '');
            if (rawText.trim().length > 0) {
                try {
                    parsed = extractStoryFromResponse(rawText, state.draftTitle || state.selectedHook.text.slice(0, 40));
                    break;
                }
                catch (parseErr) {
                    lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
                    logger.warn({
                        generationId: state.generationId,
                        attempt,
                        rawContent: rawText.substring(0, 300),
                        error: lastError.message,
                    }, '[reviseStory] Story parsing failed on attempt');
                }
            }
        }
        catch (invokeErr) {
            lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
            const errObj = invokeErr;
            const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
            if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
                try {
                    parsed = extractStoryFromResponse(failedGen, state.draftTitle || state.selectedHook.text.slice(0, 40));
                    if (parsed)
                        break;
                }
                catch {
                    // ignore
                }
            }
            logger.warn({ generationId: state.generationId, attempt, error: lastError.message }, '[reviseStory] Model invocation failed on attempt');
        }
    }
    const latencyMs = Date.now() - start;
    if (!parsed) {
        logger.error({
            generationId: state.generationId,
            attempts,
            lastError: lastError?.message,
        }, '[reviseStory] Failed to parse revision response after all attempts');
        throw new WorkflowError('Failed to parse revision response', 'reviseStory');
    }
    const result = FinalStorySchema.safeParse(parsed);
    if (!result.success) {
        logger.error({
            generationId: state.generationId,
            parsed,
            issues: result.error.flatten(),
        }, '[reviseStory] Invalid revised story structure');
        throw new WorkflowError(`Invalid revised story structure: ${JSON.stringify(result.error.flatten())}`, 'reviseStory');
    }
    const newWordCount = countWords(result.data.script);
    const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    logger.info({
        generationId: state.generationId,
        revisionCount: state.revisionCount + 1,
        previousWordCount: currentWordCount,
        newWordCount,
        latencyMs,
    }, '[reviseStory] Completed');
    return {
        draftTitle: result.data.title,
        draftScript: result.data.script,
        revisionCount: state.revisionCount + 1,
        revisionFeedback: revisionInstructions,
        tokenUsage: [
            {
                node: 'reviseStory',
                modelId: effectiveWriterModelId,
                modelRole: 'writer',
                inputTokens: tokens.inputTokens,
                outputTokens: tokens.outputTokens,
                totalTokens: tokens.totalTokens,
                latencyMs,
                calls: attempts,
            },
        ],
    };
}
//# sourceMappingURL=revise-story.node.js.map