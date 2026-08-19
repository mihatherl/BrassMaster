import { describe, expect, it } from 'vitest';
import {
  afterRun,
  DEMOTE_BELOW,
  nextRung,
  previousRung,
  PROMOTE_ABOVE,
  rungFrom,
  RUNS_TO_JUDGE,
  sameRung,
  TEMPO_CEILING,
  TEMPO_FLOOR,
  TEMPO_STEP,
  verdictOn,
  type Progress,
} from './ladder';
import { DIFFICULTIES } from './difficulty';

const EASIEST = DIFFICULTIES[0].id;
const HARDEST = DIFFICULTIES[DIFFICULTIES.length - 1].id;
const SECOND = DIFFICULTIES[1].id;

/** Two runs at the same accuracy — the least that can move anything. */
const clean = Array<number>(RUNS_TO_JUDGE).fill(PROMOTE_ABOVE);
const dreadful = Array<number>(RUNS_TO_JUDGE).fill(DEMOTE_BELOW - 0.1);

function progressAt(difficultyId: string, tempo: number, recent: number[] = []): Progress {
  return { rung: rungFrom(difficultyId, tempo), recent };
}

describe('where a player starts', () => {
  it('opens where they already practise, not at the bottom', () => {
    const rung = rungFrom(SECOND, 96);
    expect(rung.difficultyId).toBe(SECOND);
    expect(rung.tempo).toBe(96);
  });

  it('snaps a tempo onto the grid, so every rung is reachable from every other', () => {
    expect(rungFrom(EASIEST, 95).tempo % TEMPO_STEP).toBe(TEMPO_FLOOR % TEMPO_STEP);
  });

  it('clamps a tempo outside the ladder to its ends', () => {
    expect(rungFrom(EASIEST, 20).tempo).toBe(TEMPO_FLOOR);
    expect(rungFrom(EASIEST, 220).tempo).toBe(TEMPO_CEILING);
  });

  /*
   * A store from a future version, or one edited by hand. Treating an unknown
   * difficulty as the easiest asks too little rather than dropping a player
   * into music they cannot read — the safe direction to be wrong in.
   */
  it('falls back to the easiest difficulty rather than trusting an unknown one', () => {
    expect(rungFrom('no-such-difficulty', 90).difficultyId).toBe(EASIEST);
  });
});

describe('which single thing moves', () => {
  it('raises the tempo before it touches the difficulty', () => {
    const up = nextRung(rungFrom(EASIEST, 90))!;
    expect(up.difficultyId).toBe(EASIEST);
    expect(up.tempo).toBe(96);
  });

  it('moves up a difficulty only at the tempo ceiling, and drops the tempo back', () => {
    const up = nextRung(rungFrom(EASIEST, TEMPO_CEILING))!;
    expect(up.difficultyId).toBe(SECOND);
    expect(up.tempo).toBe(TEMPO_FLOOR);
  });

  it('lowers the tempo before it eases the difficulty', () => {
    const down = previousRung(rungFrom(SECOND, 90))!;
    expect(down.difficultyId).toBe(SECOND);
    expect(down.tempo).toBe(84);
  });

  it('moves down a difficulty only at the tempo floor, and returns the tempo to the ceiling', () => {
    const down = previousRung(rungFrom(SECOND, TEMPO_FLOOR))!;
    expect(down.difficultyId).toBe(EASIEST);
    expect(down.tempo).toBe(TEMPO_CEILING);
  });

  it('has nowhere above the hardest music at the fastest tempo', () => {
    expect(nextRung(rungFrom(HARDEST, TEMPO_CEILING))).toBeNull();
  });

  it('has nowhere below the easiest music at the slowest tempo', () => {
    expect(previousRung(rungFrom(EASIEST, TEMPO_FLOOR))).toBeNull();
  });

  /*
   * The rule the whole design rests on: if one thing changed and accuracy
   * moved, the cause is known. Two things changing at once would make the
   * history useless for saying *why* a player is stuck.
   */
  it('never changes difficulty and tempo in the same step', () => {
    const rungs = [
      rungFrom(EASIEST, TEMPO_FLOOR),
      rungFrom(EASIEST, 96),
      rungFrom(SECOND, TEMPO_CEILING),
      rungFrom(HARDEST, TEMPO_FLOOR),
    ];
    for (const rung of rungs) {
      for (const moved of [nextRung(rung), previousRung(rung)]) {
        if (!moved) continue;
        const changedDifficulty = moved.difficultyId !== rung.difficultyId;
        const changedTempo = moved.tempo !== rung.tempo;
        // A difficulty change resets the tempo to the far end by design, so the
        // rule is about *intent*: one of the two is the step being taken.
        expect(changedDifficulty !== changedTempo || changedDifficulty).toBe(true);
        expect(changedDifficulty && moved.tempo !== TEMPO_FLOOR && moved.tempo !== TEMPO_CEILING).toBe(false);
      }
    }
  });
});

describe('when anything moves at all', () => {
  it('says nothing until there is more than one run to go on', () => {
    expect(verdictOn([1])).toBe('stay');
  });

  it('promotes only when every recent run cleared the bar', () => {
    expect(verdictOn(clean)).toBe('up');
    expect(verdictOn([PROMOTE_ABOVE, PROMOTE_ABOVE - 0.01])).toBe('stay');
  });

  it('demotes only when every recent run fell short', () => {
    expect(verdictOn(dreadful)).toBe('down');
    expect(verdictOn([DEMOTE_BELOW - 0.1, DEMOTE_BELOW])).toBe('stay');
  });

  /*
   * The band between the two thresholds is where practice actually happens,
   * and it should be the common case rather than a strip between promotions.
   */
  it('leaves a player alone in the middle, which is most of the time', () => {
    const between = (DEMOTE_BELOW + PROMOTE_ABOVE) / 2;
    expect(verdictOn(Array<number>(RUNS_TO_JUDGE).fill(between))).toBe('stay');
  });

  it('reads only the most recent runs, so an old evening cannot hold anyone back', () => {
    expect(verdictOn([0, 0, ...clean])).toBe('up');
  });
});

describe('folding a run into where the player is', () => {
  it('moves up once, and only once, however good the runs were', () => {
    const start = progressAt(EASIEST, 90, [1]);
    const { progress, movement } = afterRun(start, 1);
    expect(movement).toBe('up');
    expect(progress.rung.tempo).toBe(96);
  });

  it('clears the evidence when the rung changes, so new music is judged fresh', () => {
    const { progress } = afterRun(progressAt(EASIEST, 90, [1]), 1);
    expect(progress.recent).toEqual([]);
  });

  it('keeps the evidence while the player stays put', () => {
    const middle = (DEMOTE_BELOW + PROMOTE_ABOVE) / 2;
    const { progress, movement } = afterRun(progressAt(EASIEST, 90, [middle]), middle);
    expect(movement).toBe('stay');
    expect(progress.recent).toHaveLength(RUNS_TO_JUDGE);
  });

  it('does not mutate what it was given', () => {
    const start = progressAt(EASIEST, 90, [1]);
    const before = [...start.recent];
    afterRun(start, 1);
    expect(start.recent).toEqual(before);
    expect(start.rung.tempo).toBe(90);
  });

  /*
   * At the top there is nowhere to go, and the screen must not be told
   * otherwise — a promotion animation for a rung that did not change would be
   * the app congratulating someone for nothing.
   */
  it('reports no movement at the top of the ladder, and keeps the evidence', () => {
    const { progress, movement } = afterRun(progressAt(HARDEST, TEMPO_CEILING, [1]), 1);
    expect(movement).toBe('stay');
    expect(sameRung(progress.rung, rungFrom(HARDEST, TEMPO_CEILING))).toBe(true);
    expect(progress.recent).toHaveLength(RUNS_TO_JUDGE);
  });

  it('reports no movement at the bottom of the ladder', () => {
    const { progress, movement } = afterRun(progressAt(EASIEST, TEMPO_FLOOR, [0]), 0);
    expect(movement).toBe('stay');
    expect(sameRung(progress.rung, rungFrom(EASIEST, TEMPO_FLOOR))).toBe(true);
  });

  it('climbs the whole ladder without ever getting stuck', () => {
    let progress = progressAt(EASIEST, TEMPO_FLOOR);
    let steps = 0;
    // Generous bound: if the ladder ever fails to terminate this catches it
    // rather than hanging the suite.
    while (steps < 500) {
      const result = afterRun(progress, 1);
      progress = result.progress;
      if (result.movement === 'stay' && progress.recent.length >= RUNS_TO_JUDGE) break;
      steps++;
    }
    expect(steps).toBeLessThan(500);
    expect(progress.rung.difficultyId).toBe(HARDEST);
    expect(progress.rung.tempo).toBe(TEMPO_CEILING);
  });
});
