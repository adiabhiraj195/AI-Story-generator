import { z } from 'zod';

export const StoryConceptSchema = z.object({
  premise: z.string().describe('Core story premise in 1-2 sentences'),
  protagonist: z.string().describe('Protagonist name and key traits'),
  motivation: z.string().describe('What drives the protagonist'),
  setting: z.string().describe('Time, place and atmosphere'),
  centralConflict: z.string().describe('The main conflict or problem'),
  stakes: z.string().describe('What is at risk if the protagonist fails'),
  incitingIncident: z.string().describe('The event that starts the story'),
  majorRevelation: z.string().describe('A key revelation or twist'),
  emotionalJourney: z.string().describe('The emotional arc of the story'),
  climaxDirection: z.string().describe('How the climax should unfold'),
  endingDirection: z.string().describe('How the story should resolve'),
});

export type StoryConcept = z.infer<typeof StoryConceptSchema>;
