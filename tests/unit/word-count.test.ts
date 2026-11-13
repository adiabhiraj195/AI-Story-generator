import { describe, it, expect } from 'vitest';
import {
  calculateWordCountTargets,
  countWords,
  estimateDurationSeconds,
  estimateDurationMinutes,
  validateScriptLength,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_NARRATION_WPM,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  DURATION_TABLE,
} from '../../src/utils/word-count.js';

describe('Word Count and Duration Calculations', () => {
  it('has correct default constants', () => {
    expect(DEFAULT_DURATION_MINUTES).toBe(4);
    expect(DEFAULT_NARRATION_WPM).toBe(145);
    expect(MIN_DURATION_MINUTES).toBe(2);
    expect(MAX_DURATION_MINUTES).toBe(6);
  });

  it('matches the global target word counts at default 145 WPM', () => {
    expect(DURATION_TABLE[2]).toBe(290);
    expect(DURATION_TABLE[3]).toBe(435);
    expect(DURATION_TABLE[4]).toBe(580);
    expect(DURATION_TABLE[5]).toBe(725);
    expect(DURATION_TABLE[6]).toBe(870);

    for (let minutes = 2; minutes <= 6; minutes++) {
      const targets = calculateWordCountTargets(minutes, 145);
      expect(targets.targetWordCount).toBe(minutes * 145);
    }
  });

  it('enforces 5% tolerance with absolute 2-6 minute boundary constraints', () => {
    // 2 minutes target = 290 words
    // minimumWords = Math.max(2 * 145, Math.floor(290 * 0.95)) = Math.max(290, 275) = 290
    // maximumWords = Math.min(6 * 145, Math.ceil(290 * 1.05)) = Math.min(870, 305) = 305
    const targets2 = calculateWordCountTargets(2, 145);
    expect(targets2.targetWordCount).toBe(290);
    expect(targets2.minimumWords).toBe(290);
    expect(targets2.maximumWords).toBe(305);

    // 4 minutes target = 580 words
    // minimumWords = Math.max(290, Math.floor(580 * 0.95)) = Math.max(290, 551) = 551
    // maximumWords = Math.min(870, Math.ceil(580 * 1.05)) = Math.min(870, 609) = 609
    const targets4 = calculateWordCountTargets(4, 145);
    expect(targets4.targetWordCount).toBe(580);
    expect(targets4.minimumWords).toBe(551);
    expect(targets4.maximumWords).toBe(609);

    // 6 minutes target = 870 words
    // minimumWords = Math.max(290, Math.floor(870 * 0.95)) = Math.max(290, 826) = 826
    // maximumWords = Math.min(870, Math.ceil(870 * 1.05)) = Math.min(870, 914) = 870
    const targets6 = calculateWordCountTargets(6, 145);
    expect(targets6.targetWordCount).toBe(870);
    expect(targets6.minimumWords).toBe(826);
    expect(targets6.maximumWords).toBe(870);
  });

  it('clamps durations outside 2-6 minutes in calculateWordCountTargets', () => {
    const under = calculateWordCountTargets(1, 145);
    expect(under.targetWordCount).toBe(290);
    expect(under.estimatedMinutes).toBe(2);

    const over = calculateWordCountTargets(10, 145);
    expect(over.targetWordCount).toBe(870);
    expect(over.estimatedMinutes).toBe(6);
  });

  it('supports custom narration speed (WPM)', () => {
    // 3 minutes at 160 WPM = 480 words
    const targets = calculateWordCountTargets(3, 160);
    expect(targets.targetWordCount).toBe(480);
    expect(targets.minimumWords).toBe(Math.max(2 * 160, Math.floor(480 * 0.95)));
    expect(targets.maximumWords).toBe(Math.min(6 * 160, Math.ceil(480 * 1.05)));
  });

  it('counts words accurately and deterministically', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('  One   two   three \n four \t five  ')).toBe(5);
  });

  it('calculates duration in seconds and minutes from word count', () => {
    expect(estimateDurationSeconds(290, 145)).toBe(120);
    expect(estimateDurationMinutes(290, 145)).toBe(2);
    expect(estimateDurationSeconds(580, 145)).toBe(240);
    expect(estimateDurationMinutes(580, 145)).toBe(4);
  });

  it('validates script length within acceptable boundaries', () => {
    const targets = calculateWordCountTargets(4, 145); // min 551, max 609, target 580

    const validScript = Array(580).fill('word').join(' ');
    const validResult = validateScriptLength(validScript, targets);
    expect(validResult.valid).toBe(true);
    expect(validResult.tooShort).toBe(false);
    expect(validResult.tooLong).toBe(false);

    const shortScript = Array(500).fill('word').join(' ');
    const shortResult = validateScriptLength(shortScript, targets);
    expect(shortResult.valid).toBe(false);
    expect(shortResult.tooShort).toBe(true);

    const longScript = Array(650).fill('word').join(' ');
    const longResult = validateScriptLength(longScript, targets);
    expect(longResult.valid).toBe(false);
    expect(longResult.tooLong).toBe(true);
  });
});

