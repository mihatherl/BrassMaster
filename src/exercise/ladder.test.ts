import { describe, expect, it } from 'vitest';
import {
  afterRun,
  DEFAULT_LADDER_ID,
  DEFAULT_MASTERY,
  LADDERS,
  ladderById,
  ladderLength,
  distanceTo,
  progressToward,
  rungOrdinal,
  rungsInLevel,
  levelOf,
  nextRung,
  previousRung,
  masteryFor,
  masteryOf,
  rungFrom,
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

const MASTERY = DEFAULT_MASTERY;
const clean = Array<number>(MASTERY.runsToJudge).fill(MASTERY.promoteAbove);
const dreadful = Array<number>(MASTERY.runsToJudge).fill(MASTERY.demoteBelow - 0.1);

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

describe('the bar for moving, which the course sets', () => {
  const strict = { promoteAbove: 0.95, demoteBelow: 0.8, runsToJudge: 3 };

  it('falls back to the default when nothing overrides it', () => {
    expect(masteryFor(at(FIRST.id, FIRST.tempo.floor))).toEqual(DEFAULT_MASTERY);
  });

  /*
   * The reason this is data rather than a constant: 0.85 across two runs is a
   * strong result on music the player has never seen, and no result at all on
   * a scale they are supposed to have learned. A course of drills has to be
   * able to ask for more.
   */
  it('lets a level ask for a stricter bar than sight-reading needs', () => {
    const level = { ...FIRST, mastery: strict };
    expect(masteryOf(level, LADDER)).toEqual(strict);
    // Two clean runs promote at the default bar and decide nothing at this one,
    // which is the whole difference.
    expect(verdictOn([1, 1], DEFAULT_MASTERY)).toBe('up');
    expect(verdictOn([1, 1], strict)).toBe('stay');
  });

  it('lets a whole course set a bar its levels inherit', () => {
    const ladder = { ...LADDER, mastery: strict };
    expect(masteryOf(FIRST, ladder)).toEqual(strict);
  });

  it('prefers the level’s bar over the course’s, so one step can differ', () => {
    const ladder = { ...LADDER, mastery: strict };
    const lenient = { promoteAbove: 0.7, demoteBelow: 0.4, runsToJudge: 2 };
    expect(masteryOf({ ...FIRST, mastery: lenient }, ladder)).toEqual(lenient);
  });

  it('reads more runs when the course asks for more', () => {
    expect(verdictOn([1, 1, 1], strict)).toBe('up');
  });

  it('holds a player who is close but not clean enough for a strict course', () => {
    expect(verdictOn([0.9, 0.9, 0.9], DEFAULT_MASTERY)).toBe('up');
    expect(verdictOn([0.9, 0.9, 0.9], strict)).toBe('stay');
  });
});

describe('when anything moves at all', () => {
  it('says nothing until there is more than one run to go on', () => {
    expect(verdictOn([1], MASTERY)).toBe('stay');
  });

  it('promotes only when every recent run cleared the bar', () => {
    expect(verdictOn(clean, MASTERY)).toBe('up');
    expect(verdictOn([MASTERY.promoteAbove, MASTERY.promoteAbove - 0.01], MASTERY)).toBe('stay');
  });

  it('demotes only when every recent run fell short', () => {
    expect(verdictOn(dreadful, MASTERY)).toBe('down');
    expect(verdictOn([MASTERY.demoteBelow - 0.1, MASTERY.demoteBelow], MASTERY)).toBe('stay');
  });

  /*
   * The band between the two thresholds is where practice actually happens,
   * and it should be the common case rather than a strip between promotions.
   */
  it('leaves a player alone in the middle, which is most of the time', () => {
    const between = (MASTERY.demoteBelow + MASTERY.promoteAbove) / 2;
    expect(verdictOn(Array<number>(MASTERY.runsToJudge).fill(between), MASTERY)).toBe('stay');
  });

  it('reads only the most recent runs, so an old evening cannot hold anyone back', () => {
    expect(verdictOn([0, 0, ...clean], MASTERY)).toBe('up');
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
    const middle = (MASTERY.demoteBelow + MASTERY.promoteAbove) / 2;
    const { progress, movement } = afterRun(progressAt(FIRST.id, FIRST.tempo.floor, [middle]), middle);
    expect(movement).toBe('stay');
    expect(progress.recent).toHaveLength(MASTERY.runsToJudge);
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
    expect(progress.recent).toHaveLength(MASTERY.runsToJudge);
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
      if (result.movement === 'stay' && progress.recent.length >= MASTERY.runsToJudge) break;
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
      if (result.movement === 'stay' && progress.recent.length >= MASTERY.runsToJudge) break;
      steps++;
    }
    expect(steps).toBeLessThan(500);
    expect(progress.rung.levelId).toBe(FIRST.id);
    expect(progress.rung.tempo).toBe(FIRST.tempo.floor);
  });
});

describe('how far it is to a goal', () => {
  it('counts both ends of a level’s band', () => {
    // 60 to 96 in sixes is seven rungs, not six.
    expect(rungsInLevel(FIRST)).toBe((FIRST.tempo.ceiling - FIRST.tempo.floor) / FIRST.tempo.step + 1);
  });

  it('puts the bottom of the ladder at zero and counts up without a gap', () => {
    expect(rungOrdinal(at(FIRST.id, FIRST.tempo.floor))).toBe(0);
    expect(rungOrdinal(at(FIRST.id, FIRST.tempo.floor + FIRST.tempo.step))).toBe(1);
    expect(rungOrdinal(at(SECOND.id, SECOND.tempo.floor))).toBe(rungsInLevel(FIRST));
  });

  /*
   * The property the whole idea rests on: the flattened ordinal has to agree
   * with the sequence `nextRung` actually walks, or a goal would be a distance
   * from somewhere the player never goes.
   */
  it('agrees with the path the ladder actually climbs, rung for rung', () => {
    let rung = at(FIRST.id, FIRST.tempo.floor);
    let expected = 0;
    while (true) {
      expect(rungOrdinal(rung)).toBe(expected);
      const up = nextRung(rung);
      if (!up) break;
      rung = up;
      expected++;
    }
    expect(expected).toBe(ladderLength(LADDER) - 1);
  });

  it('measures a goal above as a positive distance, in rungs and levels', () => {
    const here = at(FIRST.id, FIRST.tempo.floor);
    const goal = at(SECOND.id, SECOND.tempo.floor);
    const distance = distanceTo(here, goal)!;
    expect(distance.rungs).toBe(rungsInLevel(FIRST));
    expect(distance.levels).toBe(1);
    expect(distance.reached).toBe(false);
  });

  it('counts a goal already passed as reached, and says so plainly', () => {
    const here = at(SECOND.id, SECOND.tempo.ceiling);
    const goal = at(FIRST.id, FIRST.tempo.floor);
    const distance = distanceTo(here, goal)!;
    expect(distance.rungs).toBeLessThan(0);
    expect(distance.reached).toBe(true);
  });

  it('treats standing on the goal as reached', () => {
    const here = at(SECOND.id, SECOND.tempo.floor);
    expect(distanceTo(here, here)!.reached).toBe(true);
  });

  /*
   * A rung on a scales course and a rung on a reading course are not a distance
   * apart in any sense a player would recognise. Null is the honest answer, and
   * a screen can say so instead of drawing a meaningless bar.
   */
  it('refuses to measure between two different courses', () => {
    const here = at(FIRST.id, FIRST.tempo.floor);
    expect(distanceTo(here, { ...here, ladderId: 'another-course' })).toBeNull();
  });

  it('measures the way along from where the goal was set, not from the bottom', () => {
    const from = at(SECOND.id, SECOND.tempo.floor);
    const goal = nextRung(nextRung(from)!)!;
    expect(progressToward(from, from, goal)).toBe(0);
    expect(progressToward(from, nextRung(from)!, goal)).toBeCloseTo(0.5);
    expect(progressToward(from, goal, goal)).toBe(1);
  });

  it('never reports more than finished, however far past the goal they go', () => {
    const from = at(FIRST.id, FIRST.tempo.floor);
    const goal = nextRung(from)!;
    expect(progressToward(from, at(LAST.id, LAST.tempo.ceiling), goal)).toBe(1);
  });

  it('carries the goal across a promotion rather than dropping it', () => {
    const goal = at(LAST.id, LAST.tempo.ceiling);
    const start = { rung: at(FIRST.id, FIRST.tempo.floor), recent: [1], goal };
    const { progress } = afterRun(start, 1);
    expect(progress.goal).toEqual(goal);
  });
});
