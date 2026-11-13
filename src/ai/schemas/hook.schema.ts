import { z } from 'zod';

export const HookCandidateSchema = z.object({
  text: z.string().describe('The hook sentence(s) — 7-24 words, narration-ready'),
  wordCount: z.number().int().describe('Number of words in the hook'),
  style: z.string().describe('Hook style/technique used'),
  questionRaised: z.string().describe('The curiosity question this hook creates'),
  hookType: z.string().describe('Type of hook (e.g. mysterious, shocking, emotional)'),
});

export const HookCandidatesSchema = z.object({
  candidates: z.array(HookCandidateSchema).length(3).describe('Exactly three hook candidates'),
});

export const HookEvaluationSchema = z.object({
  scores: z.object({
    curiosity: z.number().min(1).max(10),
    clarity: z.number().min(1).max(10),
    impact: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
    promiseFulfillment: z.number().min(1).max(10),
    narrationQuality: z.number().min(1).max(10),
  }),
  overallScore: z.number().min(1).max(10),
  selectedCandidateIndex: z.number().int().min(0).max(2).describe('Index of the best hook (0, 1, or 2)'),
  reasoning: z.string(),
});

export type HookCandidate = z.infer<typeof HookCandidateSchema>;
export type HookCandidates = z.infer<typeof HookCandidatesSchema>;
export type HookEvaluation = z.infer<typeof HookEvaluationSchema>;
