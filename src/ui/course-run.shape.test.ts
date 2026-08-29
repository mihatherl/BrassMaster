/**
 * What a course run asks the generator for, beyond the settings.
 *
 * `horizonBars: 0` is the substantive half and the reason this file exists:
 * with no paper past the committed end, `chosenBeats` and `totalBeats` meet,
 * nothing draws grey, no *Continue* is offered, and the run ends where the
 * author said — out to the results screen, to repeat or move on. That is the
 * chunking driver a course never had.
 */

import { describe, expect, it } from 'vitest';
import { runShapeOf, type CourseRun } from './course-run';

const run = (over: Partial<CourseRun> = {}): CourseRun => ({
  kind: 'drills',
  difficultyId: 'easy',
  tempo: 80,
  levelId: 'l',
  ...over,
});

describe('the shape of a course run', () => {
  it('ends where the level ends, offering no continuation', () => {
    expect(runShapeOf(run()).horizonBars).toBe(0);
  });

  it('leaves the horizon alone where the author asked for endless', () => {
    // Undefined, not a number: the caller falls back to `HORIZON_BARS`, so a
    // stamina level gets exactly the free-play behaviour rather than this
    // file's opinion of how much paper is generous.
    expect(runShapeOf(run({ endless: true })).horizonBars).toBeUndefined();
  });

  it('carries only the unit the level actually set', () => {
    expect(runShapeOf(run({ cycles: 6 }))).toEqual({ cycles: 6, horizonBars: 0 });
    expect(runShapeOf(run({ kind: 'phrases', bars: 24 }))).toEqual({ bars: 24, horizonBars: 0 });
    expect(runShapeOf(run({ kind: 'themes', themeCount: 2 }))).toEqual({
      themeCount: 2,
      horizonBars: 0,
    });
  });

  it('says nothing about length where the level said nothing', () => {
    // So `buildFrom` falls through to `defaultLengthFor`, which is still the
    // right answer for a level whose author did not care.
    const shape = runShapeOf(run());
    expect(shape.bars).toBeUndefined();
    expect(shape.cycles).toBeUndefined();
    expect(shape.themeCount).toBeUndefined();
  });
});

describe('the generator knobs a course sets that are not settings', () => {
  it('carries the drill span and the interval pool into the shape', () => {
    expect(runShapeOf(run({ spanSemitones: 12 })).spanSemitones).toBe(12);
    const pool = { intervals: [{ interval: 3, weight: 2 }], degrees: [1, 2, 3] };
    expect(runShapeOf(run({ kind: 'phrases', intervals: pool })).intervals).toEqual(pool);
  });

  it('says nothing about them where the level said nothing', () => {
    const shape = runShapeOf(run());
    expect(shape.spanSemitones).toBeUndefined();
    expect(shape.intervals).toBeUndefined();
  });
});
