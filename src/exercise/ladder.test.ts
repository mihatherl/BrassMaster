import { describe, expect, it } from 'vitest';
import {
  afterRun,
  DEFAULT_LADDER_ID,
  DEMOTE_BELOW,
  LADDERS,
  ladderById,
  levelOf,
  nextRung,
  previousRung,
  PROMOTE_ABOVE,
  rungFrom,
  RUNS_TO_JUDGE,
  sameRung,
  verdictOn,
  type Progress,
  type Rung,
} from './ladder';
import { DIFFICULTIES } from './difficulty';

const LADDER = ladderById(DEFAULT_LADDER_ID);
const FIRST = LADDER.levels[0];
const SECOND = LADDER.levels[1];
const LAST = LADDER.levels[LADDER.levels.length - 1];

const clean = Array<number>(RUNS_TO_JUDGE).fill(PROMOTE_ABOVE);
const dreadful = Array<number>(RUNS_TO_JUDGE).fill(DEMOTE_BELOW - 0.1);

const at = (levelId: string, tempo: number): Rung => rungFrom(DEFAULT_LADDER_ID, levelId, tempo);

function progressAt(levelId: string, tempo: number, recent: number[] = []): Progress {
  return { rung: at(levelId, tempo), recent };
}

describe('a ladder as data', () => {
  it('offers at least the app’s own, easiest first', () => {
    expect(LADDERS.length).toBeGreaterThan(0);
    expect(LADDER.levels.length).toBeGreaterThan(1);
  });

  /*
   * Every rung has to be reachable from its neighbours, which needs the ceiling
   * to sit on the grid the step walks. A ceiling off the grid would leave a
   * final short step — harmless in itself, but it would make the top rung a
   * special case every later calculation has to remember.
   */
  it('puts every level’s ceiling on its own step grid', () => {
    for (const ladder of LADDERS) {
      for (const level of ladder.levels) {
        const { floor, ceiling, step } = level.tempo;
        expect(ceiling).toBeGreaterThan(floor);
        expect((ceiling - floor) % step).toBe(0);
      }
    }
  });

  it('gives each level its own band, rising as the music gets harder', () => {
    expect(SECOND.tempo.floor).toBeGreaterThan(FIRST.tempo.floor);
    expect(SECOND.tempo.ceiling).toBeGreaterThan(FIRST.tempo.ceiling);
  });

  it('points every level at a difficulty the generator knows', () => {
    const known = new Set(DIFFICULTIES.map((difficulty) => difficulty.id));
    for (const ladder of LADDERS) {
      for (const level of ladder.levels) expect(known.has(level.difficultyId)).toBe(true);
    }
  });

  /*
   * A ladder removed between versions, or one a future version wrote, must
   * leave the player somewhere they can practise rather than on a screen that
   * cannot render.
   */
  it('falls back to the default rather than failing on an unknown ladder', () => {
    expect(ladderById('no-such-ladder').id).toBe(DEFAULT_LADDER_ID);
  });

  it('falls back to the easiest level rather than failing on an unknown one', () => {
    expect(levelOf({ ladderId: DEFAULT_LADDER_ID, levelId: 'no-such-level', tempo: 90 }).id).toBe(
      FIRST.id,
    );
  });
});

describe('where a player starts', () => {
  it('opens where they already practise, not at the bottom', () => {
    const tempo = SECOND.tempo.floor + SECOND.tempo.step;
    const rung = at(SECOND.id, tempo);
    expect(rung.levelId).toBe(SECOND.id);
    expect(rung.tempo).toBe(tempo);
  });

  it('snaps a tempo onto the level’s grid', () => {
    expect(at(FIRST.id, FIRST.tempo.floor + 1).tempo).toBe(FIRST.tempo.floor);
  });

  it('clamps a tempo outside the level’s band to its ends', () => {
    expect(at(FIRST.id, 20).tempo).toBe(FIRST.tempo.floor);
    expect(at(FIRST.id, 400).tempo).toBe(FIRST.tempo.ceiling);
  });
});

describe('which single thing moves', () => {
  it('raises the tempo before it touches the level', () => {
    const up = nextRung(at(FIRST.id, FIRST.tempo.floor))!;
    expect(up.levelId).toBe(FIRST.id);
    expect(up.tempo).toBe(FIRST.tempo.floor + FIRST.tempo.step);
  });

  it('moves up a level only at that level’s ceiling, and starts at the next one’s floor', () => {
    const up = nextRung(at(FIRST.id, FIRST.tempo.ceiling))!;
    expect(up.levelId).toBe(SECOND.id);
    expect(up.tempo).toBe(SECOND.tempo.floor);
  });

  it('lowers the tempo before it eases the level', () => {
    const down = previousRung(at(SECOND.id, SECOND.tempo.ceiling))!;
    expect(down.levelId).toBe(SECOND.id);
    expect(down.tempo).toBe(SECOND.tempo.ceiling - SECOND.tempo.step);
  });

  it('moves down a level only at the floor, and returns to the one below’s ceiling', () => {
    const down = previousRung(at(SECOND.id, SECOND.tempo.floor))!;
    expect(down.levelId).toBe(FIRST.id);
    expect(down.tempo).toBe(FIRST.tempo.ceiling);
  });

  it('has nowhere above the hardest level at its ceiling', () => {
    expect(nextRung(at(LAST.id, LAST.tempo.ceiling))).toBeNull();
  });

  it('has nowhere below the easiest level at its floor', () => {
    expect(previousRung(at(FIRST.id, FIRST.tempo.floor))).toBeNull();
  });

  /*
   * The rule the whole design rests on: if one thing changed and accuracy
   * moved, the cause is known.
   *
   * A level change must reset the tempo — there is no other tempo to be at in a
   * new band — so the rule is stated as its two halves: a tempo step never
   * changes the level, and a level step always lands on an end of the new band
   * rather than somewhere in the middle of it.
   */
  it('never treats a tempo step as a level change, or lands a level change mid-band', () => {
    for (const level of LADDER.levels) {
      for (const tempo of [level.tempo.floor, level.tempo.floor + level.tempo.step, level.tempo.ceiling]) {
        for (const moved of [nextRung(at(level.id, tempo)), previousRung(at(level.id, tempo))]) {
          if (!moved) continue;
          if (moved.levelId === level.id) {
            expect(Math.abs(moved.tempo - tempo)).toBe(level.tempo.step);
            continue;
          }
          const band = levelOf(moved).tempo;
          expect([band.floor, band.ceiling]).toContain(moved.tempo);
        }
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
    const { progress, movement } = afterRun(progressAt(FIRST.id, FIRST.tempo.floor, [1]), 1);
    expect(movement).toBe('up');
    expect(progress.rung.tempo).toBe(FIRST.tempo.floor + FIRST.tempo.step);
  });

  it('clears the evidence when the rung changes, so new music is judged fresh', () => {
    const { progress } = afterRun(progressAt(FIRST.id, FIRST.tempo.floor, [1]), 1);
    expect(progress.recent).toEqual([]);
  });

  it('keeps the evidence while the player stays put', () => {
    const middle = (DEMOTE_BELOW + PROMOTE_ABOVE) / 2;
    const { progress, movement } = afterRun(progressAt(FIRST.id, FIRST.tempo.floor, [middle]), middle);
    expect(movement).toBe('stay');
    expect(progress.recent).toHaveLength(RUNS_TO_JUDGE);
  });

  it('does not mutate what it was given', () => {
    const start = progressAt(FIRST.id, FIRST.tempo.floor, [1]);
    const before = [...start.recent];
    afterRun(start, 1);
    expect(start.recent).toEqual(before);
    expect(start.rung.tempo).toBe(FIRST.tempo.floor);
  });

  /*
   * At the top there is nowhere to go, and the screen must not be told
   * otherwise — a promotion for a rung that did not change would be the app
   * congratulating someone for nothing.
   */
  it('reports no movement at the top of the ladder, and keeps the evidence', () => {
    const { progress, movement } = afterRun(progressAt(LAST.id, LAST.tempo.ceiling, [1]), 1);
    expect(movement).toBe('stay');
    expect(sameRung(progress.rung, at(LAST.id, LAST.tempo.ceiling))).toBe(true);
    expect(progress.recent).toHaveLength(RUNS_TO_JUDGE);
  });

  it('reports no movement at the bottom of the ladder', () => {
    const { progress, movement } = afterRun(progressAt(FIRST.id, FIRST.tempo.floor, [0]), 0);
    expect(movement).toBe('stay');
    expect(sameRung(progress.rung, at(FIRST.id, FIRST.tempo.floor))).toBe(true);
  });

  it('climbs the whole ladder without ever getting stuck', () => {
    let progress = progressAt(FIRST.id, FIRST.tempo.floor);
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
    expect(progress.rung.levelId).toBe(LAST.id);
    expect(progress.rung.tempo).toBe(LAST.tempo.ceiling);
  });

  it('falls the whole way back down without getting stuck', () => {
    let progress = progressAt(LAST.id, LAST.tempo.ceiling);
    let steps = 0;
    while (steps < 500) {
      const result = afterRun(progress, 0);
      progress = result.progress;
      if (result.movement === 'stay' && progress.recent.length >= RUNS_TO_JUDGE) break;
      steps++;
    }
    expect(steps).toBeLessThan(500);
    expect(progress.rung.levelId).toBe(FIRST.id);
    expect(progress.rung.tempo).toBe(FIRST.tempo.floor);
  });
});
