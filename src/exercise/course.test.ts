import { describe, expect, it } from 'vitest';
import {
  advanceFor,
  COURSES,
  DEFAULT_ADVANCE,
  pinnedFor,
  prescribedRun,
  courseById,
  courseLength,
  DEFAULT_MASTERY,
  distanceTo,
  levelOf,
  masteryOf,
  noteRun,
  positionFrom,
  positionLabel,
  positionOrdinal,
  progressToward,
  readCourse,
  startOf,
  step,
  stepBack,
  stepForward,
  stepsInLevel,
  suggestionOn,
  type Course,
  type Progress,
} from './course';
import { COMMON_KEYS_DOCUMENT } from './courses/common-keys';
import { DIFFICULTIES } from './difficulty';

/** A small, well-formed document the reader tests mutate one fault at a time. */
function doc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test-course',
    name: 'A course',
    blurb: 'For the tests.',
    schemaVersion: 1,
    levels: [
      {
        id: 'one',
        name: 'Level one',
        base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
        tempo: { floor: 60, ceiling: 84, step: 6 },
      },
      {
        id: 'two',
        name: 'Level two',
        base: { kind: 'phrases', difficultyId: 'easy' },
        tempo: { floor: 66, ceiling: 90, step: 6 },
      },
    ],
    ...overrides,
  };
}

function read(overrides: Record<string, unknown> = {}): Course {
  const course = readCourse(doc(overrides));
  if ('error' in course) throw new Error(course.error);
  return course;
}

describe('reading a course document', () => {
  it('reads the bundled course through the same door a user file will use', () => {
    const course = readCourse(COMMON_KEYS_DOCUMENT);
    expect('error' in course).toBe(false);
    expect(COURSES.some((c) => c.id === (course as Course).id)).toBe(true);
  });

  /*
   * The ratified forward-tolerance rule: a course written by a newer version
   * degrades rather than dies. Unknown fields at every depth are ignored.
   */
  it('ignores fields it does not know, at the course and at the level', () => {
    const course = read({
      futureField: 'from a newer version',
      levels: [
        {
          id: 'one',
          name: 'Level one',
          axes: { rhythm: ['son-clave'] }, // a later phase's field
          base: { kind: 'phrases', difficultyId: 'easy', swing: 0.66 },
          tempo: { floor: 60, ceiling: 84, step: 6 },
        },
      ],
    });
    expect(course.levels).toHaveLength(1);
    expect('axes' in course.levels[0]).toBe(false);
  });

  it('keeps the author key optional, which rhythm material will need', () => {
    const course = read();
    expect(course.levels[0].base.fifths).toBe(-1);
    expect(course.levels[1].base.fifths).toBeUndefined();
  });

  /*
   * Refusals are whole-document and loud: a course silently missing its third
   * level is worse than no course.
   */
  it('refuses a level naming a difficulty the generator does not know', () => {
    const course = readCourse(
      doc({ levels: [{ ...(doc().levels as Record<string, unknown>[])[0], base: { kind: 'drills', difficultyId: 'grade-9' } }] }),
    );
    expect(course).toHaveProperty('error');
  });

  it('refuses a drill that does not exist', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[0].base = {
      kind: 'drills',
      drillId: 'diminished-run',
      difficultyId: 'easy',
    };
    expect(readCourse(bad)).toHaveProperty('error');
  });

  it('refuses repeated level ids, which would make a position ambiguous', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[1].id = 'one';
    expect(readCourse(bad)).toHaveProperty('error');
  });

  it('refuses a document with no schemaVersion, which files must carry', () => {
    const bad = doc();
    delete bad.schemaVersion;
    expect(readCourse(bad)).toHaveProperty('error');
  });

  /*
   * The one normalisation: a ceiling off the step grid is an authoring slip,
   * and every position calculation divides by the step — so it is snapped
   * down rather than trusted or refused.
   */
  it('snaps a misaligned tempo ceiling down onto the step grid', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[0].tempo = { floor: 60, ceiling: 87, step: 6 };
    const course = readCourse(bad) as Course;
    expect(course.levels[0].tempo.ceiling).toBe(84);
  });

  it('points every bundled level at a difficulty the generator knows', () => {
    const known = new Set(DIFFICULTIES.map((d) => d.id));
    for (const course of COURSES) {
      for (const level of course.levels) expect(known.has(level.base.difficultyId)).toBe(true);
    }
  });

  it('falls back to the first course rather than failing on an unknown one', () => {
    expect(courseById('never-heard-of-it').id).toBe(COURSES[0].id);
  });

  it('falls back to the first level rather than failing on an unknown one', () => {
    const course = COURSES[0];
    const position = { courseId: course.id, levelId: 'gone', tempo: 999 };
    expect(levelOf(position).id).toBe(course.levels[0].id);
  });
});

describe('where a course begins', () => {
  /*
   * The ladder opened "where the player already practises", inferred from
   * settings. An authored course starts at its start — the author's order is
   * the progression — and the forward button is how anyone skips ahead.
   */
  it('starts at the first level, at its floor', () => {
    const course = COURSES[0];
    const start = startOf(course);
    expect(start.levelId).toBe(course.levels[0].id);
    expect(start.tempo).toBe(course.levels[0].tempo.floor);
    expect(positionLabel(start)).toBe('1.1');
  });

  it('snaps and clamps a stored tempo onto the level grid', () => {
    const course = COURSES[0];
    const level = course.levels[0];
    expect(positionFrom(course.id, level.id, level.tempo.floor + 2).tempo).toBe(level.tempo.floor);
    expect(positionFrom(course.id, level.id, 999).tempo).toBe(level.tempo.ceiling);
  });
});

describe('the player-owned stepping', () => {
  const course = COURSES[0];
  const first = course.levels[0];
  const second = course.levels[1];
  const last = course.levels[course.levels.length - 1];

  it('raises the tempo before it touches the level', () => {
    const next = stepForward(startOf(course))!;
    expect(next.levelId).toBe(first.id);
    expect(next.tempo).toBe(first.tempo.floor + first.tempo.step);
  });

  it('moves up a level only at the ceiling, and starts at the next floor', () => {
    const atCeiling = { courseId: course.id, levelId: first.id, tempo: first.tempo.ceiling };
    const next = stepForward(atCeiling)!;
    expect(next.levelId).toBe(second.id);
    expect(next.tempo).toBe(second.tempo.floor);
  });

  it('lowers the tempo before it eases the level, and mirrors the join', () => {
    const start = { courseId: course.id, levelId: second.id, tempo: second.tempo.floor };
    const back = stepBack(start)!;
    expect(back.levelId).toBe(first.id);
    expect(back.tempo).toBe(first.tempo.ceiling);
  });

  it('has nowhere above the top or below the bottom', () => {
    expect(stepForward({ courseId: course.id, levelId: last.id, tempo: last.tempo.ceiling })).toBeNull();
    expect(stepBack(startOf(course))).toBeNull();
  });

  it('walks the whole course one step at a time, never skipping or repeating', () => {
    let position = startOf(course);
    const seen = [positionOrdinal(position)];
    for (let guard = 0; guard < 500; guard++) {
      const next = stepForward(position);
      if (!next) break;
      seen.push(positionOrdinal(next));
      position = next;
    }
    expect(seen).toHaveLength(courseLength(course));
    expect(seen).toEqual(seen.map((_, i) => i));
  });

  it('labels the position level.step, one-based on both sides', () => {
    const third = course.levels[2];
    const position = {
      courseId: course.id,
      levelId: third.id,
      tempo: third.tempo.floor + third.tempo.step,
    };
    expect(positionLabel(position)).toBe('3.2');
  });
});

describe('the suggestion, which moves nobody', () => {
  it('says nothing until there are enough runs to go on', () => {
    expect(suggestionOn([0.95], DEFAULT_MASTERY)).toBe('stay');
  });

  it('suggests up only when every recent run cleared the bar', () => {
    expect(suggestionOn([0.9, 0.95], DEFAULT_MASTERY)).toBe('up');
    expect(suggestionOn([0.9, 0.7], DEFAULT_MASTERY)).toBe('stay');
  });

  it('suggests down only when every recent run fell short', () => {
    expect(suggestionOn([0.4, 0.5], DEFAULT_MASTERY)).toBe('down');
    expect(suggestionOn([0.4, 0.7], DEFAULT_MASTERY)).toBe('stay');
  });

  /*
   * The ratified ruling, as a test: however good the runs, the position does
   * not move. `afterRun` in the ladder this replaced would have promoted here.
   */
  it('never moves the player, however strong the evidence', () => {
    const start: Progress = { position: startOf(COURSES[0]), recent: [0.98] };
    const { progress, suggestion } = noteRun(start, 0.99);
    expect(suggestion).toBe('up');
    expect(progress.position).toEqual(start.position);
  });

  it('clears the evidence when the player steps, because it was about the old step', () => {
    const moved = step({ position: startOf(COURSES[0]), recent: [0.9, 0.95] }, 'forward');
    expect(moved.recent).toEqual([]);
  });

  it('changes nothing when a step presses against the end of the course', () => {
    const at: Progress = { position: startOf(COURSES[0]), recent: [0.5] };
    const unmoved = step(at, 'back');
    expect(unmoved.position).toEqual(at.position);
    expect(unmoved.recent).toEqual([0.5]);
  });

  it('prefers the level bar over the course bar over the default', () => {
    const strict = { promoteAbove: 0.95, demoteBelow: 0.8, runsToJudge: 3 };
    const course = read({ mastery: strict });
    expect(masteryOf(course.levels[0], course)).toEqual(strict);
    const perLevel = read({
      mastery: strict,
      levels: [
        {
          ...(doc().levels as Record<string, unknown>[])[0],
          mastery: { promoteAbove: 0.7, demoteBelow: 0.5, runsToJudge: 2 },
        },
      ],
    });
    expect(masteryOf(perLevel.levels[0], perLevel).promoteAbove).toBe(0.7);
  });
});

describe('the author rule and the pins', () => {
  it('resolves the progression rule level over course over default', () => {
    const custom = { afterBars: 12, windowBars: 6, accuracyAbove: 0.9 };
    const course = read({ advance: custom });
    expect(advanceFor(startOf(course), course)).toEqual(custom);
    expect(advanceFor(startOf(read()))).toEqual(DEFAULT_ADVANCE);
  });

  it('reads carryEvidence, and its absence means reset-at-every-step', () => {
    const carried = read({
      advance: { afterBars: 4, windowBars: 2, accuracyAbove: 0.8, carryEvidence: true },
    });
    expect(advanceFor(startOf(carried), carried).carryEvidence).toBe(true);
    expect(advanceFor(startOf(read()), read()).carryEvidence).toBeUndefined();
  });

  it('ignores a malformed rule rather than refusing the course, like the bar', () => {
    const course = read({ advance: { afterBars: -3, windowBars: 'four' } });
    expect(advanceFor(startOf(course), course)).toEqual(DEFAULT_ADVANCE);
  });

  it('reads pins and resolves them level over course', () => {
    const course = read({
      pinned: { metronomeEnabled: true },
      levels: [
        {
          ...(doc().levels as Record<string, unknown>[])[0],
          pinned: { conductorEnabled: false },
        },
      ],
    });
    expect(pinnedFor(startOf(course), course)).toEqual({ conductorEnabled: false });
  });

  it('prescribes a run from a position: the base, the tempo, the pins', () => {
    const course = read({ pinned: { metronomeEnabled: true } });
    const run = prescribedRun(startOf(course), course);
    expect(run).toEqual({
      kind: 'drills',
      drillId: 'major-scale',
      difficultyId: 'easy',
      fifths: -1,
      tempo: 60,
      levelId: 'one',
      metronomeEnabled: true,
    });
  });
});

describe('goals over the course', () => {
  const course = COURSES[0];

  it('measures distance in the steps the buttons actually walk', () => {
    const from = startOf(course);
    const to = {
      courseId: course.id,
      levelId: course.levels[1].id,
      tempo: course.levels[1].tempo.floor,
    };
    const distance = distanceTo(from, to)!;
    expect(distance.steps).toBe(stepsInLevel(course.levels[0]));
    expect(distance.levels).toBe(1);
    expect(distance.reached).toBe(false);
  });

  it('refuses a distance across two courses rather than inventing one', () => {
    const from = startOf(course);
    expect(distanceTo(from, { ...from, courseId: 'another' })).toBeNull();
  });

  it('measures progress from where the aiming started, not the bottom', () => {
    const from = startOf(course);
    const goal = {
      courseId: course.id,
      levelId: course.levels[1].id,
      tempo: course.levels[1].tempo.floor,
    };
    const halfway = stepForward(stepForward(from)!)!;
    const along = progressToward(from, halfway, goal)!;
    expect(along).toBeGreaterThan(0);
    expect(along).toBeLessThan(1);
    expect(progressToward(from, goal, goal)).toBe(1);
  });
});
