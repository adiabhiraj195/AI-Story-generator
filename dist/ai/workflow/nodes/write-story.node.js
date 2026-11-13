import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildWriterPrompt } from '../../prompts/writer.prompt.js';
import { FinalStorySchema } from '../../schemas/final-story.schema.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveWriterModelId } from '../../../config/env.js';
export function normalizeStoryObject(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }
    const obj = parsed;
    const rawTitle = obj['title'] ??
        obj['storyTitle'] ??
        obj['name'] ??
        obj['heading'];
    const rawScript = obj['script'] ??
        obj['story'] ??
        obj['text'] ??
        obj['content'] ??
        obj['draft'] ??
        obj['storyScript'] ??
        obj['narration'];
    if (typeof rawScript === 'string' && rawScript.trim().length >= 50) {
        const title = typeof rawTitle === 'string' && rawTitle.trim().length > 0
            ? rawTitle.trim()
            : 'The Voiceover Story';
        return { title, script: rawScript.trim() };
    }
    return null;
}
function extractStoryByRegex(str) {
    const titleMatch = str.match(/"(?:title|storyTitle|name)":\s*"([^"]+)"/i);
    const title = titleMatch?.[1]?.trim() ?? 'The Voiceover Story';
    const scriptKeyMatch = str.search(/"(?:script|story|text|content|draft)":\s*"/i);
    if (scriptKeyMatch !== -1) {
        const afterKey = str.substring(scriptKeyMatch);
        const colonIndex = afterKey.indexOf(':');
        if (colonIndex !== -1) {
            const firstQuote = afterKey.indexOf('"', colonIndex);
            if (firstQuote !== -1) {
                const remaining = afterKey.substring(firstQuote + 1);
                const lastBrace = remaining.lastIndexOf('}');
                const searchRegion = lastBrace !== -1 ? remaining.substring(0, lastBrace) : remaining;
                const lastQuote = searchRegion.lastIndexOf('"');
                if (lastQuote !== -1) {
                    let script = searchRegion.substring(0, lastQuote);
                    script = script
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\')
                        .trim();
                    if (script.length >= 50) {
                        return { title, script };
                    }
                }
            }
        }
    }
    return null;
}
function extractStoryFromPlainText(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0)
        return null;
    let title = 'The Voiceover Story';
    let scriptStartIndex = 0;
    const firstLine = lines[0] ?? '';
    const titlePrefixMatch = firstLine.match(/^(?:#+\s*|\*\*(?:Title:?\s*)?\*\*|Title:\s*)(.*)$/i);
    if (titlePrefixMatch?.[1] && titlePrefixMatch[1].trim().length > 0) {
        title = titlePrefixMatch[1].replace(/[*#]/g, '').trim();
        scriptStartIndex = 1;
    }
    else if (lines.length > 1 && firstLine.length < 60 && !firstLine.endsWith('.')) {
        title = firstLine.replace(/[*#]/g, '').trim();
        scriptStartIndex = 1;
    }
    const scriptLines = lines.slice(scriptStartIndex);
    const script = scriptLines.join('\n\n').trim();
    if (script.length >= 50) {
        return { title, script };
    }
    if (text.length >= 50) {
        return { title, script: text.trim() };
    }
    return null;
}
/**
 * Robust extractor for story generation output.
 * Handles:
 * - Proper JSON with escaped newlines and quotes
 * - JSON with unescaped literal newlines in "script"
 * - JSON with unescaped dialogue quotes
 * - Alternative keys (story, text, content, draft)
 * - Raw markdown / plain text story fallback
 */
export function extractStoryFromResponse(raw, defaultTitle = 'The Voiceover Story') {
    if (raw === null || raw === undefined) {
        throw new Error('extractStoryFromResponse received null or undefined input');
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
    let cleaned = text.trim();
    // 1. Remove thinking / reasoning blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    // 2. Strip outer markdown fences if wrapping the whole text
    const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch?.[1]) {
        cleaned = fenceMatch[1].trim();
    }
    // 3. Try standard JSON extraction using extractJsonFromText
    try {
        const rawJson = extractJsonFromText(cleaned);
        const normalized = normalizeStoryObject(rawJson);
        if (normalized)
            return normalized;
    }
    catch {
        // Continue with regex and plain text fallback
    }
    // 4. Try regex extraction of "title" and "script"
    const regexExtracted = extractStoryByRegex(cleaned);
    if (regexExtracted)
        return regexExtracted;
    // 5. Try plain text / markdown fallback
    const plainExtracted = extractStoryFromPlainText(cleaned);
    if (plainExtracted) {
        if (!plainExtracted.title || plainExtracted.title === 'The Voiceover Story') {
            plainExtracted.title = defaultTitle;
        }
        return plainExtracted;
    }
    throw new Error('Failed to parse writer response into valid story structure');
}
export async function writeStoryNode(state) {
    logger.info({ generationId: state.generationId }, '[writeStory] Starting');
    if (!state.storyConcept || !state.selectedHook || !state.storyOutline) {
        throw new WorkflowError('storyConcept, selectedHook, and storyOutline are required', 'writeStory');
    }
    const start = Date.now();
    const baseModel = createGroqModel('writer');
    const model = typeof baseModel.withStructuredOutput === 'function'
        ? baseModel.withStructuredOutput(FinalStorySchema, {
            method: 'jsonMode',
            includeRaw: true,
        })
        : baseModel;
    const basePrompt = buildWriterPrompt(state.request, state.storyConcept, state.selectedHook, state.storyOutline, state.targetWordCount, state.minimumWords, state.maximumWords);
    let response = null;
    let parsed = null;
    let lastError = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
        attempts = attempt;
        const prompt = attempt === 1
            ? basePrompt
            : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Please provide the complete story in json format with title and script, meeting all duration and writing requirements.`;
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
                        parsed = extractStoryFromResponse(structuredResult.raw.content, state.selectedHook.text.slice(0, 40));
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
                    parsed = extractStoryFromResponse(rawText, state.selectedHook.text.slice(0, 40));
                    break;
                }
                catch (parseErr) {
                    lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
                    logger.warn({
                        generationId: state.generationId,
                        attempt,
                        rawContent: rawText.substring(0, 300),
                        error: lastError.message,
                    }, '[writeStory] Story parsing failed on attempt');
                }
            }
        }
        catch (invokeErr) {
            lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
            const errObj = invokeErr;
            const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
            if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
                try {
                    parsed = extractStoryFromResponse(failedGen, state.selectedHook.text.slice(0, 40));
                    if (parsed)
                        break;
                }
                catch {
                    // ignore
                }
            }
            logger.warn({ generationId: state.generationId, attempt, error: lastError.message }, '[writeStory] Model invocation failed on attempt');
        }
    }
    const latencyMs = Date.now() - start;
    if (!parsed) {
        logger.error({
            generationId: state.generationId,
            attempts,
            lastError: lastError?.message,
        }, '[writeStory] Failed to parse writer response after all attempts');
        throw new WorkflowError('Failed to parse writer response', 'writeStory');
    }
    const result = FinalStorySchema.safeParse(parsed);
    if (!result.success) {
        logger.error({
            generationId: state.generationId,
            parsed,
            issues: result.error.flatten(),
        }, '[writeStory] Invalid story structure');
        throw new WorkflowError(`Invalid story structure: ${JSON.stringify(result.error.flatten())}`, 'writeStory');
    }
    const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    logger.info({ generationId: state.generationId, title: result.data.title, scriptLength: result.data.script.length, latencyMs }, '[writeStory] Completed');
    return {
        draftTitle: result.data.title,
        draftScript: result.data.script,
        tokenUsage: [
            {
                node: 'writeStory',
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
//# sourceMappingURL=write-story.node.js.map