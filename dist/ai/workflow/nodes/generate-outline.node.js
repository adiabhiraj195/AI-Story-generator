import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildOutlinePrompt } from '../../prompts/outline.prompt.js';
import { StoryOutlineSchema } from '../../schemas/outline.schema.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveWriterModelId } from '../../../config/env.js';
/**
 * Normalizes varied LLM outline representations into the strict StoryOutline schema.
 * Handles:
 * - Nested objects: { outline: ... }, { storyOutline: ... }
 * - CamelCase keyMoments -> key_moments
 * - String key_moments -> array
 * - String or missing wordBudget / totalWordBudget
 * - Enforcing 4 to 6 narrative beats (subdivides if < 4, merges if > 6)
 * - Defaulting narrativeArc and paceNotes if missing
 */
export function normalizeOutlineObject(parsed, targetWordCount = 435) {
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }
    const obj = parsed;
    const root = (obj['outline'] ?? obj['storyOutline'] ?? obj);
    let rawBeats = null;
    if (Array.isArray(root['beats'])) {
        rawBeats = root['beats'];
    }
    else if (Array.isArray(root['scenes'])) {
        rawBeats = root['scenes'];
    }
    else if (Array.isArray(root['sceneBeats'])) {
        rawBeats = root['sceneBeats'];
    }
    else if (Array.isArray(root['narrativeBeats'])) {
        rawBeats = root['narrativeBeats'];
    }
    else if (Array.isArray(parsed)) {
        rawBeats = parsed;
    }
    if (!rawBeats || rawBeats.length === 0) {
        return null;
    }
    const totalWordBudget = typeof root['totalWordBudget'] === 'number' && !isNaN(root['totalWordBudget'])
        ? Math.round(root['totalWordBudget'])
        : typeof root['totalWordBudget'] === 'string' && !isNaN(parseInt(root['totalWordBudget'], 10))
            ? parseInt(root['totalWordBudget'], 10)
            : targetWordCount;
    const narrativeArc = String(root['narrativeArc'] ?? root['arc'] ?? root['storyArc'] ?? 'Standard rising tension to climax and resolution.').trim();
    const paceNotes = String(root['paceNotes'] ?? root['pacing'] ?? root['pace_notes'] ?? 'Gradually escalating tension across narrative beats.').trim();
    let beats = rawBeats.map((b, index) => {
        if (typeof b === 'string') {
            return {
                beatNumber: index + 1,
                title: `Beat ${index + 1}`,
                description: b.trim(),
                purpose: 'Narrative progression',
                wordBudget: Math.max(10, Math.round(targetWordCount / rawBeats.length)),
                key_moments: [b.trim().slice(0, 50)],
            };
        }
        const bObj = b && typeof b === 'object' ? b : {};
        const title = String(bObj['title'] ?? bObj['name'] ?? `Beat ${index + 1}`).trim();
        const description = String(bObj['description'] ?? bObj['summary'] ?? bObj['desc'] ?? title).trim();
        const purpose = String(bObj['purpose'] ?? bObj['narrativePurpose'] ?? 'Narrative progression').trim();
        let wordBudget = typeof bObj['wordBudget'] === 'number' && !isNaN(bObj['wordBudget'])
            ? Math.round(bObj['wordBudget'])
            : typeof bObj['wordBudget'] === 'string' && !isNaN(parseInt(bObj['wordBudget'], 10))
                ? parseInt(bObj['wordBudget'], 10)
                : Math.max(10, Math.round(targetWordCount / rawBeats.length));
        if (wordBudget < 10)
            wordBudget = 10;
        const rawMoments = bObj['key_moments'] ?? bObj['keyMoments'] ?? bObj['moments'] ?? bObj['key_points'];
        let key_moments = [];
        if (Array.isArray(rawMoments)) {
            key_moments = rawMoments.map(String).filter((s) => s.trim().length > 0);
        }
        else if (typeof rawMoments === 'string') {
            key_moments = [rawMoments.trim()];
        }
        if (key_moments.length === 0) {
            key_moments = [title, purpose];
        }
        return {
            beatNumber: typeof bObj['beatNumber'] === 'number' ? bObj['beatNumber'] : index + 1,
            title: title || `Beat ${index + 1}`,
            description: description || title,
            purpose: purpose || 'Narrative progression',
            wordBudget,
            key_moments,
        };
    });
    // Ensure 4 to 6 beats (subdivide if < 4, merge if > 6)
    while (beats.length < 4) {
        let maxIdx = 0;
        for (let i = 1; i < beats.length; i++) {
            if ((beats[i]?.wordBudget ?? 0) > (beats[maxIdx]?.wordBudget ?? 0)) {
                maxIdx = i;
            }
        }
        const targetBeat = beats[maxIdx];
        const halfBudget = Math.max(10, Math.floor(targetBeat.wordBudget / 2));
        const newBeat1 = {
            ...targetBeat,
            title: `${targetBeat.title} Part 1`,
            wordBudget: halfBudget,
        };
        const newBeat2 = {
            ...targetBeat,
            title: `${targetBeat.title} Part 2`,
            description: `Continuation of ${targetBeat.description}`,
            wordBudget: Math.max(10, targetBeat.wordBudget - halfBudget),
        };
        beats.splice(maxIdx, 1, newBeat1, newBeat2);
    }
    while (beats.length > 6) {
        const last = beats.pop();
        const prev = beats[beats.length - 1];
        prev.wordBudget += last.wordBudget;
        prev.description += ` ${last.description}`;
        prev.key_moments.push(...last.key_moments);
    }
    // Re-index beat numbers sequentially
    beats = beats.map((b, i) => ({ ...b, beatNumber: i + 1 }));
    return {
        totalWordBudget,
        beats,
        narrativeArc: narrativeArc || 'Rising tension to resolution',
        paceNotes: paceNotes || 'Steady escalation',
    };
}
export function extractOutlineFromResponse(raw, targetWordCount = 435) {
    if (raw === null || raw === undefined) {
        throw new Error('extractOutlineFromResponse received null or undefined input');
    }
    let text;
    if (typeof raw === 'string') {
        text = raw;
    }
    else if (Array.isArray(raw)) {
        text = raw
            .map((item) => (typeof item === 'string' ? item : item?.text ?? ''))
            .join('');
    }
    else if (typeof raw === 'object' && 'text' in raw) {
        text = String(raw.text);
    }
    else {
        text = String(raw);
    }
    const rawJson = extractJsonFromText(text);
    const normalized = normalizeOutlineObject(rawJson, targetWordCount);
    if (normalized) {
        return normalized;
    }
    throw new Error('Could not normalize JSON into valid outline structure');
}
export async function generateOutlineNode(state) {
    logger.info({ generationId: state.generationId }, '[generateOutline] Starting');
    if (!state.storyConcept || !state.selectedHook) {
        throw new WorkflowError('storyConcept and selectedHook are required', 'generateOutline');
    }
    const start = Date.now();
    const baseModel = createGroqModel('outline');
    const model = typeof baseModel.withStructuredOutput === 'function'
        ? baseModel.withStructuredOutput(StoryOutlineSchema, {
            method: 'jsonMode',
            includeRaw: true,
        })
        : baseModel;
    const basePrompt = buildOutlinePrompt(state.request, state.storyConcept, state.selectedHook, state.targetWordCount, state.minimumWords, state.maximumWords);
    let response = null;
    let parsed = null;
    let lastError = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
        attempts = attempt;
        const prompt = attempt === 1
            ? basePrompt
            : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide a complete outline in json format with between 4 and 6 narrative beats, total word budget, narrative arc, and pacing notes.`;
        const input = [
            new SystemMessage('You are a story structure expert. Output a json object adhering to the schema.'),
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
                    parsed = normalizeOutlineObject(structuredResult.parsed, state.targetWordCount);
                    if (parsed)
                        break;
                }
                if (!parsed && structuredResult.raw?.content) {
                    try {
                        parsed = extractOutlineFromResponse(structuredResult.raw.content, state.targetWordCount);
                        if (parsed)
                            break;
                    }
                    catch {
                        // fall through
                    }
                }
            }
            // 2. Direct parsed outline object
            if (!parsed &&
                invokeResult &&
                typeof invokeResult === 'object' &&
                ('beats' in invokeResult || 'totalWordBudget' in invokeResult)) {
                parsed = normalizeOutlineObject(invokeResult, state.targetWordCount);
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
                    parsed = extractOutlineFromResponse(rawText, state.targetWordCount);
                    break;
                }
                catch (parseErr) {
                    lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
                    logger.warn({
                        generationId: state.generationId,
                        attempt,
                        rawContent: rawText.substring(0, 300),
                        error: lastError.message,
                    }, '[generateOutline] Outline parsing failed on attempt');
                }
            }
        }
        catch (invokeErr) {
            lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
            const errObj = invokeErr;
            const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
            if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
                try {
                    parsed = extractOutlineFromResponse(failedGen, state.targetWordCount);
                    if (parsed)
                        break;
                }
                catch {
                    // ignore
                }
            }
            logger.warn({ generationId: state.generationId, attempt, error: lastError.message }, '[generateOutline] Model invocation failed on attempt');
        }
    }
    const latencyMs = Date.now() - start;
    if (!parsed) {
        logger.error({
            generationId: state.generationId,
            attempts,
            lastError: lastError?.message,
        }, '[generateOutline] Failed to parse outline response after all attempts');
        throw new WorkflowError('Failed to parse outline response', 'generateOutline');
    }
    const result = StoryOutlineSchema.safeParse(parsed);
    if (!result.success) {
        logger.error({
            generationId: state.generationId,
            parsed,
            issues: result.error.flatten(),
        }, '[generateOutline] Invalid outline structure');
        throw new WorkflowError(`Invalid outline structure: ${JSON.stringify(result.error.flatten())}`, 'generateOutline');
    }
    const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const totalBudget = result.data.beats.reduce((sum, b) => sum + b.wordBudget, 0);
    logger.info({
        generationId: state.generationId,
        beatCount: result.data.beats.length,
        totalWordBudget: totalBudget,
        latencyMs,
    }, '[generateOutline] Completed');
    return {
        storyOutline: result.data,
        tokenUsage: [
            {
                node: 'generateOutline',
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
//# sourceMappingURL=generate-outline.node.js.map