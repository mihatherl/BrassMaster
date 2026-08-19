// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import {
  accuracyOf,
  loadSkills,
  mergeSessionSkills,
  MIN_ATTEMPTS_TO_JUDGE,
  recordSkills,
  saveSkills,
  tallySession,
  weakestIn,
  type SkillStats,
} from './skills';
import type { SkillKey } from '../exercise/attributes';
import type { NoteJudgement } from '../engine/judge';

afterEach(() => localStorage.clear());

function judgement(noteIndex: number, verdict: NoteJudgement['verdict']): NoteJudgement {
  return { noteIndex, verdict, heldMask: 0, timingOffset: verdict === 'correct' ? 0 : null };
}

function statsOf(entries: Array<[SkillKey, number, number]>): SkillStats {
  return new Map(entries.map(([key, attempts, correct]) => [key, { attempts, correct }]));
}

describe('tallying a run against what made it hard', () => {
  const attributes: SkillKey[][] = [
    ['rhythm:quarter', 'interval:step'],
    ['rhythm:eighth.', 'interval:leap'],
  ];

  it('credits every label of a note that was played correctly', () => {
    const session = tallySession(attributes, [judgement(0, 'correct')]);
    expect(session.get('rhythm:quarter')).toEqual({ attempts: 1, correct: 1 });
    expect(session.get('interval:step')).toEqual({ attempts: 1, correct: 1 });
  });

  it('counts a wrong note as an attempt against every label it carried', () => {
    const session = tallySession(attributes, [judgement(1, 'wrong')]);
    expect(session.get('rhythm:eighth.')).toEqual({ attempts: 1, correct: 0 });
    expect(session.get('interval:leap')).toEqual({ attempts: 1, correct: 0 });
  });

  it('counts a missed note as an attempt too — it was asked and not answered', () => {
    const session = tallySession(attributes, [judgement(0, 'missed')]);
    expect(session.get('rhythm:quarter')).toEqual({ attempts: 1, correct: 0 });
  });

  /*
   * The rule that keeps the tally honest. A note outside the instrument's range
   * and the far side of a tie are never judged, so they never reach here — and
   * a skill must not be blamed for a note nobody was asked to play.
   */
  it('records nothing for a note that was never judged', () => {
    const session = tallySession(attributes, [judgement(0, 'correct')]);
    expect(session.has('rhythm:eighth.')).toBe(false);
    expect(session.has('interval:leap')).toBe(false);
  });

  it('ignores a judgement pointing past the notes it was given', () => {
    expect(() => tallySession(attributes, [judgement(99, 'correct')])).not.toThrow();
    expect(tallySession(attributes, [judgement(99, 'correct')]).size).toBe(0);
  });
});

describe('history across sessions', () => {
  it('decays what is already there, so last night outweighs March', () => {
    const merged = mergeSessionSkills(statsOf([['rhythm:quarter', 10, 10]]), new Map());
    expect(merged.get('rhythm:quarter')!.attempts).toBeLessThan(10);
  });

  it('adds this run to what came before', () => {
    const merged = mergeSessionSkills(
      statsOf([['rhythm:quarter', 10, 8]]),
      statsOf([['rhythm:quarter', 2, 1]]),
    );
    const stat = merged.get('rhythm:quarter')!;
    expect(stat.attempts).toBeGreaterThan(10);
    expect(stat.correct).toBeGreaterThan(8);
  });

  it('caps a tally, so one heroic session cannot outvote every later one', () => {
    const merged = mergeSessionSkills(
      statsOf([['rhythm:quarter', 60, 60]]),
      statsOf([['rhythm:quarter', 100, 100]]),
    );
    expect(merged.get('rhythm:quarter')!.attempts).toBeLessThanOrEqual(60);
  });

  it('keeps a round trip through storage', () => {
    saveSkills('cornet', 'treble', statsOf([['key:-4', 12, 6]]));
    expect(loadSkills('cornet', 'treble').get('key:-4')).toEqual({ attempts: 12, correct: 6 });
  });

  it('keeps instruments and clefs apart', () => {
    recordSkills('cornet', 'treble', statsOf([['key:-4', 5, 5]]));
    expect(loadSkills('eb-bass', 'treble').size).toBe(0);
    expect(loadSkills('cornet', 'bass').size).toBe(0);
  });

  it('starts again rather than throwing on unreadable history', () => {
    localStorage.setItem('brass-trainer:skills:cornet:treble', 'not json');
    expect(loadSkills('cornet', 'treble').size).toBe(0);
  });
});

describe('reading the history back', () => {
  it('says nothing about a bucket it has barely seen', () => {
    const stats = statsOf([['rhythm:quarter', MIN_ATTEMPTS_TO_JUDGE - 1, 0]]);
    expect(accuracyOf(stats, 'rhythm:quarter')).toBeNull();
  });

  /*
   * Null and zero are opposite facts. A coach that confused them would drill
   * the thing the player has never met instead of the thing they keep failing,
   * which is the wrong lesson delivered confidently.
   */
  it('distinguishes never attempted from always wrong', () => {
    const unseen = statsOf([]);
    const failing = statsOf([['rhythm:quarter', 10, 0]]);
    expect(accuracyOf(unseen, 'rhythm:quarter')).toBeNull();
    expect(accuracyOf(failing, 'rhythm:quarter')).toBe(0);
  });

  it('ranks the weakest buckets of one dimension, worst first', () => {
    const stats = statsOf([
      ['key:0', 10, 9],
      ['key:-4', 10, 3],
      ['key:2', 10, 6],
    ]);
    expect(weakestIn(stats, 'key').map((entry) => entry.key)).toEqual(['key:-4', 'key:2', 'key:0']);
  });

  it('never mixes dimensions, so keys are not ranked against rhythms', () => {
    const stats = statsOf([
      ['key:-4', 10, 9],
      ['rhythm:eighth.', 10, 1],
    ]);
    expect(weakestIn(stats, 'key').map((entry) => entry.key)).toEqual(['key:-4']);
  });

  it('leaves out buckets with too little evidence to rank', () => {
    const stats = statsOf([
      ['key:0', 10, 9],
      ['key:-4', 1, 0],
    ]);
    expect(weakestIn(stats, 'key').map((entry) => entry.key)).toEqual(['key:0']);
  });
});
