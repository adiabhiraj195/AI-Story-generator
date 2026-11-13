import { z } from 'zod';

export const EvaluationScoresSchema = z.object({
  hook: z.number().min(1).max(10).describe('Opening hook quality'),
  engagement: z.number().min(1).max(10).describe('Overall engagement'),
  pacing: z.number().min(1).max(10).describe('Story pacing'),
  characterDevelopment: z.number().min(1).max(10).describe('Character depth'),
  coherence: z.number().min(1).max(10).describe('Story coherence and logic'),
  emotionalImpact: z.number().min(1).max(10).describe('Emotional resonance'),
  climax: z.number().min(1).max(10).describe('Climax effectiveness'),
  endingSatisfaction: z.number().min(1).max(10).describe('Ending satisfaction'),
  voiceoverQuality: z.number().min(1).max(10).describe('Narration readability'),
  configurationAdherence: z.number().min(1).max(10).describe('Adherence to requested configuration'),
});

export const StoryEvaluationOutputSchema = z.object({
  scores: EvaluationScoresSchema.describe('Evaluation scores across all narrative dimensions (1-10)'),
  overallScore: z.number().min(1).max(10).describe('Overall story quality score from 1.0 to 10.0'),
  strengths: z.array(z.string()).describe('Key strengths of the story'),
  weaknesses: z.array(z.string()).describe('Areas that need improvement'),
  specificIssues: z.array(z.string()).describe('Specific issues or problems found in the text'),
  requiredImprovements: z.array(z.string()).describe('Concrete improvements required for approval'),
  hookDelivered: z.boolean().describe('Whether the story fulfills the promise of the opening hook'),
  approvalStatus: z.enum(['APPROVED', 'NEEDS_REVISION', 'NEEDS_REVIEW']).describe('Approval status based on evaluation thresholds'),
  durationValidation: z
    .object({
      wordCount: z.number().int().describe('Total word count'),
      estimatedMinutes: z.number().describe('Estimated narration duration in minutes'),
      withinBounds: z.boolean().describe('Whether duration is within acceptable target bounds'),
    })
    .optional()
    .describe('Objective duration validation measurements'),
});

export const StoryEvaluationSchema = StoryEvaluationOutputSchema.extend({
  durationValidation: z.object({
    wordCount: z.number().int().describe('Total word count'),
    estimatedMinutes: z.number().describe('Estimated narration duration in minutes'),
    withinBounds: z.boolean().describe('Whether duration is within acceptable target bounds'),
  }),
});

export const RevisionFeedbackSchema = z.object({
  targetWeaknesses: z.array(z.string()).describe('Specific weaknesses to address'),
  revisionInstructions: z.array(z.string()).describe('Concrete revision instructions'),
  preserveElements: z.array(z.string()).describe('Elements to preserve unchanged'),
  priorityFixes: z.array(z.string()).describe('Highest priority fixes'),
  durationAdjustment: z
    .enum(['shorten', 'lengthen', 'none'])
    .describe('Whether the duration needs adjustment'),
});

export type EvaluationScores = z.infer<typeof EvaluationScoresSchema>;
export type StoryEvaluationOutput = z.infer<typeof StoryEvaluationOutputSchema>;
export type StoryEvaluation = z.infer<typeof StoryEvaluationSchema>;
export type RevisionFeedback = z.infer<typeof RevisionFeedbackSchema>;

// Approval thresholds
export const APPROVAL_THRESHOLDS = {
  hook: 8,
  endingSatisfaction: 8,
  coherence: 7,
  voiceoverQuality: 7,
  default: 7,
} as const;
