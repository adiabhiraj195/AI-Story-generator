import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createGroqModel, extractJsonFromText } from '../../models/groq-model.factory.js';
import { buildEvaluatorPrompt } from '../../prompts/evaluator.prompt.js';
import { StoryEvaluationSchema, StoryEvaluationOutputSchema, } from '../../schemas/evaluation.schema.js';
import { validateScriptLength } from '../../../utils/word-count.js';
import { extractTokenUsage } from '../../../utils/token-usage.js';
import { WorkflowError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { effectiveEvaluatorModelId } from '../../../config/env.js';
function repairUnescapedQuotesInJson(str) {
    // Fix unescaped quotes inside array elements (e.g. ["Quote: "text" in story"])
    return str.replace(/("(?:strengths|weaknesses|specificIssues|requiredImprovements|issues|improvements)"\s*:\s*\[)([\s\S]*?)(\])/gi, (_match, prefix, content, suffix) => {
        const repairedContent = content
            .split('\n')
            .map((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('",')) {
                const inner = trimmed.slice(1, -2).replace(/(?<!\\)"/g, '\\"');
                return `"${inner}",`;
            }
            else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                const inner = trimmed.slice(1, -1).replace(/(?<!\\)"/g, '\\"');
                return `"${inner}"`;
            }
            return line;
        })
            .join('\n');
        return `${prefix}${repairedContent}${suffix}`;
    });
}
function parseEvaluationFromMarkdown(text, durationValidation) {
    const findScore = (key, def = 8) => {
        const regex = new RegExp(`(?:${key})[\\s*:]+(\\d+(?:\\.\\d+)?)`, 'i');
        const match = text.match(regex);
        if (match?.[1]) {
            const parsed = parseFloat(match[1]);
            if (!isNaN(parsed))
                return Math.min(10, Math.max(1, Math.round(parsed)));
        }
        return def;
    };
    const scores = {
        hook: findScore('hook'),
        engagement: findScore('engagement'),
        pacing: findScore('pacing'),
        characterDevelopment: findScore('character(?:Development)?'),
        coherence: findScore('coherence'),
        emotionalImpact: findScore('emotional(?:Impact)?'),
        climax: findScore('climax'),
        endingSatisfaction: findScore('ending(?:Satisfaction)?'),
        voiceoverQuality: findScore('voiceover(?:Quality)?'),
        configurationAdherence: findScore('configuration(?:Adherence)?|adherence'),
    };
    const scoreValues = Object.values(scores);
    const overallScore = parseFloat((scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length).toFixed(1));
    const extractList = (header) => {
        const regex = new RegExp(`(?:###?\\s*|\\*\\*)${header}[:\\*\\*\\s]*\\n([\\s\\S]*?)(?=(?:###|\\*\\*[A-Z]|Approval|Status|$))`, 'i');
        const match = text.match(regex);
        if (match?.[1]) {
            return match[1]
                .split('\n')
                .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
                .filter((l) => l.length > 0);
        }
        return [];
    };
    const strengths = extractList('Strengths');
    const weaknesses = extractList('Weaknesses');
    const specificIssues = extractList('Specific\\s*Issues');
    const requiredImprovements = extractList('Required\\s*Improvements');
    let hookDelivered = true;
    const hookDeliveredMatch = text.match(/hookDelivered[:\s*]+(true|false|yes|no)/i);
    if (hookDeliveredMatch?.[1]) {
        hookDelivered = ['true', 'yes'].includes(hookDeliveredMatch[1].toLowerCase());
    }
    let approvalStatus = 'NEEDS_REVISION';
    const statusMatch = text.match(/(?:approvalStatus|status|approval)[:\s*]+(APPROVED|NEEDS_REVISION|NEEDS_REVIEW)/i);
    if (statusMatch?.[1]) {
        approvalStatus = statusMatch[1].toUpperCase();
    }
    else if (overallScore >= 7.5 && durationValidation.valid && scores.hook >= 8 && scores.endingSatisfaction >= 8) {
        approvalStatus = 'APPROVED';
    }
    return {
        scores,
        overallScore,
        strengths: strengths.length > 0 ? strengths : ['Compelling hook and clear narrative tone.'],
        weaknesses,
        specificIssues,
        requiredImprovements,
        hookDelivered,
        durationValidation: {
            wordCount: durationValidation.wordCount,
            estimatedMinutes: parseFloat(durationValidation.estimatedDurationMinutes.toFixed(2)),
            withinBounds: durationValidation.valid,
        },
        approvalStatus,
    };
}
export function normalizeStoryEvaluation(parsed, durationValidation) {
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }
    const obj = parsed;
    const root = (obj['evaluation'] ?? obj['storyEvaluation'] ?? obj);
    const scoresRaw = (root['scores'] && typeof root['scores'] === 'object' ? root['scores'] : {});
    const toScore = (val, def = 8) => {
        if (typeof val === 'number' && !isNaN(val))
            return Math.min(10, Math.max(1, Math.round(val)));
        if (typeof val === 'string' && !isNaN(parseFloat(val)))
            return Math.min(10, Math.max(1, Math.round(parseFloat(val))));
        return def;
    };
    const scores = {
        hook: toScore(scoresRaw['hook']),
        engagement: toScore(scoresRaw['engagement']),
        pacing: toScore(scoresRaw['pacing']),
        characterDevelopment: toScore(scoresRaw['characterDevelopment'] ?? scoresRaw['character']),
        coherence: toScore(scoresRaw['coherence']),
        emotionalImpact: toScore(scoresRaw['emotionalImpact'] ?? scoresRaw['emotion']),
        climax: toScore(scoresRaw['climax']),
        endingSatisfaction: toScore(scoresRaw['endingSatisfaction'] ?? scoresRaw['ending']),
        voiceoverQuality: toScore(scoresRaw['voiceoverQuality'] ?? scoresRaw['voiceover']),
        configurationAdherence: toScore(scoresRaw['configurationAdherence'] ?? scoresRaw['adherence']),
    };
    const overallScore = typeof root['overallScore'] === 'number' && !isNaN(root['overallScore'])
        ? Math.min(10, Math.max(1, parseFloat(root['overallScore'].toFixed(1))))
        : typeof root['overallScore'] === 'string' && !isNaN(parseFloat(root['overallScore']))
            ? Math.min(10, Math.max(1, parseFloat(parseFloat(root['overallScore']).toFixed(1))))
            : 8.0;
    const toArray = (val) => {
        if (Array.isArray(val))
            return val.map(String).filter((s) => s.trim().length > 0);
        if (typeof val === 'string' && val.trim().length > 0)
            return [val.trim()];
        return [];
    };
    const strengths = toArray(root['strengths'] ?? root['positives']);
    const weaknesses = toArray(root['weaknesses'] ?? root['negatives']);
    const specificIssues = toArray(root['specificIssues'] ?? root['issues']);
    const requiredImprovements = toArray(root['requiredImprovements'] ?? root['improvements']);
    let hookDelivered = true;
    if (typeof root['hookDelivered'] === 'boolean') {
        hookDelivered = root['hookDelivered'];
    }
    else if (typeof root['hookDelivered'] === 'string') {
        hookDelivered = root['hookDelivered'].toLowerCase() !== 'false';
    }
    let approvalStatus = 'NEEDS_REVISION';
    const rawStatus = String(root['approvalStatus'] ?? root['status'] ?? '').toUpperCase();
    if (rawStatus === 'APPROVED') {
        approvalStatus = 'APPROVED';
    }
    else if (rawStatus === 'NEEDS_REVIEW') {
        approvalStatus = 'NEEDS_REVIEW';
    }
    else if (rawStatus === 'NEEDS_REVISION') {
        approvalStatus = 'NEEDS_REVISION';
    }
    else if (overallScore >= 7.5 && durationValidation.valid && scores.hook >= 8 && scores.endingSatisfaction >= 8) {
        approvalStatus = 'APPROVED';
    }
    return {
        scores,
        overallScore,
        strengths,
        weaknesses,
        specificIssues,
        requiredImprovements,
        hookDelivered,
        durationValidation: {
            wordCount: durationValidation.wordCount,
            estimatedMinutes: parseFloat(durationValidation.estimatedDurationMinutes.toFixed(2)),
            withinBounds: durationValidation.valid,
        },
        approvalStatus,
    };
}
export function extractEvaluationFromResponse(raw, durationValidation) {
    if (raw === null || raw === undefined) {
        throw new Error('extractEvaluationFromResponse received null or undefined input');
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
    // 3. Try standard JSON extraction
    try {
        const rawJson = extractJsonFromText(cleaned);
        const normalized = normalizeStoryEvaluation(rawJson, durationValidation);
        if (normalized)
            return normalized;
    }
    catch {
        // Continue with regex-repaired JSON
    }
    // 4. Try with repaired quotes inside arrays
    try {
        const repaired = repairUnescapedQuotesInJson(cleaned);
        const rawJson = extractJsonFromText(repaired);
        const normalized = normalizeStoryEvaluation(rawJson, durationValidation);
        if (normalized)
            return normalized;
    }
    catch {
        // Continue with markdown fallback
    }
    // 5. Try markdown fallback
    const fromMarkdown = parseEvaluationFromMarkdown(cleaned, durationValidation);
    if (fromMarkdown) {
        return fromMarkdown;
    }
    throw new Error('Could not parse story evaluation from LLM response');
}
export async function evaluateStoryNode(state) {
    logger.info({ generationId: state.generationId, revisionCount: state.revisionCount }, '[evaluateStory] Starting');
    const script = state.draftScript;
    if (!script) {
        throw new WorkflowError('draftScript is required for evaluation', 'evaluateStory');
    }
    // Deterministic word count — never trusts LLM reporting
    const targets = {
        targetWordCount: state.targetWordCount,
        minimumWords: state.minimumWords,
        maximumWords: state.maximumWords,
        estimatedMinutes: state.request.durationMinutes,
    };
    const durationValidation = validateScriptLength(script, targets);
    logger.info({
        generationId: state.generationId,
        wordCount: durationValidation.wordCount,
        estimatedMinutes: durationValidation.estimatedDurationMinutes.toFixed(2),
        withinBounds: durationValidation.valid,
    }, '[evaluateStory] Duration validation');
    const start = Date.now();
    const baseModel = createGroqModel('evaluator');
    const model = typeof baseModel.withStructuredOutput === 'function'
        ? baseModel.withStructuredOutput(StoryEvaluationOutputSchema, {
            method: 'jsonMode',
            includeRaw: true,
        })
        : baseModel;
    const basePrompt = buildEvaluatorPrompt(state.request, script, durationValidation);
    let response = null;
    let parsed = null;
    let lastError = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
        attempts = attempt;
        const prompt = attempt === 1
            ? basePrompt
            : `${basePrompt}\n\nIMPORTANT: The previous output could not be validated. Ensure a complete, accurate evaluation in json format matching all required evaluation criteria.`;
        const input = [
            new SystemMessage('You are a professional story quality evaluator. Output a json object adhering to the schema.'),
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
                    parsed = normalizeStoryEvaluation(structuredResult.parsed, durationValidation);
                    if (parsed)
                        break;
                }
                if (!parsed && structuredResult.raw?.content) {
                    try {
                        parsed = extractEvaluationFromResponse(structuredResult.raw.content, durationValidation);
                        if (parsed)
                            break;
                    }
                    catch {
                        // fall through
                    }
                }
            }
            // 2. Direct parsed evaluation object (e.g. from mock or direct structured invoke)
            if (!parsed &&
                invokeResult &&
                typeof invokeResult === 'object' &&
                ('scores' in invokeResult || 'overallScore' in invokeResult)) {
                parsed = normalizeStoryEvaluation(invokeResult, durationValidation);
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
                    parsed = extractEvaluationFromResponse(rawText, durationValidation);
                    if (parsed)
                        break;
                }
                catch (parseErr) {
                    lastError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
                    logger.warn({
                        generationId: state.generationId,
                        attempt,
                        rawContent: rawText.substring(0, 300),
                        error: lastError.message,
                    }, '[evaluateStory] Story evaluation parsing failed on attempt');
                }
            }
        }
        catch (invokeErr) {
            lastError = invokeErr instanceof Error ? invokeErr : new Error(String(invokeErr));
            const errObj = invokeErr;
            const failedGen = errObj?.error?.error?.failed_generation ?? errObj?.failed_generation;
            if (typeof failedGen === 'string' && failedGen.trim().length > 0) {
                try {
                    parsed = extractEvaluationFromResponse(failedGen, durationValidation);
                    if (parsed)
                        break;
                }
                catch {
                    // ignore
                }
            }
            logger.warn({ generationId: state.generationId, attempt, error: lastError.message }, '[evaluateStory] Model invocation failed on attempt');
        }
    }
    const latencyMs = Date.now() - start;
    if (!parsed) {
        logger.error({
            generationId: state.generationId,
            attempts,
            lastError: lastError?.message,
        }, '[evaluateStory] Failed to parse evaluation response after all attempts');
        throw new WorkflowError('Failed to parse evaluation response', 'evaluateStory');
    }
    const result = StoryEvaluationSchema.safeParse(parsed);
    if (!result.success) {
        logger.error({
            generationId: state.generationId,
            parsed,
            issues: result.error.flatten(),
        }, '[evaluateStory] Invalid evaluation structure');
        throw new WorkflowError(`Invalid evaluation structure: ${JSON.stringify(result.error.flatten())}`, 'evaluateStory');
    }
    const tokens = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    logger.info({
        generationId: state.generationId,
        overallScore: result.data.overallScore,
        approvalStatus: result.data.approvalStatus,
        hookScore: result.data.scores.hook,
        endingScore: result.data.scores.endingSatisfaction,
        latencyMs,
    }, '[evaluateStory] Completed');
    return {
        storyEvaluation: result.data,
        tokenUsage: [
            {
                node: 'evaluateStory',
                modelId: effectiveEvaluatorModelId,
                modelRole: 'evaluator',
                inputTokens: tokens.inputTokens,
                outputTokens: tokens.outputTokens,
                totalTokens: tokens.totalTokens,
                latencyMs,
                calls: attempts,
            },
        ],
    };
}
/**
 * Conditional routing: shouldRevise
 * Returns the next node name based on evaluation result.
 */
export function shouldReviseRouter(state) {
    const evaluation = state.storyEvaluation;
    if (!evaluation)
        return 'finalValidation';
    const isApproved = evaluation.approvalStatus === 'APPROVED';
    const revisionLimitReached = state.revisionCount >= 2;
    if (isApproved || revisionLimitReached) {
        return 'finalValidation';
    }
    return 'reviseStory';
}
//# sourceMappingURL=evaluate-story.node.js.map