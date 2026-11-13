import { z } from 'zod';

export const SceneBeatSchema = z.object({
  beatNumber: z.number().int().min(1),
  title: z.string().describe('Short title for this narrative beat'),
  description: z.string().describe('What happens in this beat'),
  purpose: z.string().describe('Narrative purpose (e.g. "Establish conflict")'),
  wordBudget: z.number().int().min(10).describe('Approximate word count for this beat'),
  key_moments: z.array(z.string()).describe('Key moments or beats within this scene'),
});

export const StoryOutlineSchema = z.object({
  totalWordBudget: z.number().int().describe('Sum of all scene word budgets'),
  beats: z.array(SceneBeatSchema).min(4).max(6).describe('4-6 narrative beats'),
  narrativeArc: z.string().describe('Brief description of the overall arc'),
  paceNotes: z.string().describe('Notes on pacing and transitions'),
});

export type SceneBeat = z.infer<typeof SceneBeatSchema>;
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;
