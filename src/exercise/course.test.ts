import { describe, expect, it } from 'vitest';
import {
  AXIS_MATERIALS,
  COURSES,
  courseById,
  courseLength,
  DEFAULT_MASTERY,
  DEFAULT_RULE,
  distanceTo,
  levelOf,
  masteryOf,
  noteRun,
  positionFrom,
  positionLabel,
  positionOrdinal,
  progressToward,
  readCourse,
  ruleFor,
  runFor,
  segmentsOf,
  startOf,
  step,
  stepBack,
  stepForward,
  stepsInLevel,
  suggestionOn,
  type AxisId,
  type Course,
  type LevelKind,
  type Progress,
} from './course';
import { COMMON_KEYS_DOCUMENT } from './courses/common-keys';
import { DIFFICULTIES } from './difficulty';

/**
 * A small, well-formed OLD-FORMAT document — tempo bands, `advance`,
 * `pinned` — frozen deliberately: it is the read-forward suite's fixture,
 * and it must stay in the shape files on players' phones were written in.
 */
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

/** A new-format document: axes, header scalars, rules. */
function timelineDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'timeline-course',
    name: 'A timeline course',
    blurb: 'For the axes tests.',
    schemaVersion: 1,
    levels: [
      {
        id: 'one',
        name: 'Level one',
        base: { kind: 'phrases', difficultyId: 'easy' },
        axes: [
          {
            axis: 'tempo',
            divisions: [
              { at: 0, value: 60 },
              { at: 0.4, value: 66 },
              { at: 0.8, value: 72 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function read(document: Record<string, unknown>): Course {
  const course = readCourse(document);
  if ('error' in course) throw new Error(course.error);
  return course;
}

function errorOf(document: Record<string, unknown>): string {
  const course = readCourse(document);
  if (!('error' in course)) throw new Error('expected a refusal');
  return course.error;
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
    const course = read(
      doc({
        futureField: 'from a newer version',
        levels: [
          {
            id: 'one',
            name: 'Level one',
            feel: { swing: 0.66 }, // a later phase's field
            base: { kind: 'phrases', difficultyId: 'easy', swing: 0.66 },
            tempo: { floor: 60, ceiling: 84, step: 6 },
          },
        ],
      }),
    );
    expect(course.levels).toHaveLength(1);
    expect('feel' in course.levels[0]).toBe(false);
  });

  it('keeps the author key optional, which rhythm material will need', () => {
    const course = read(doc());
    expect(course.levels[0].base.fifths).toBe(-1);
    expect(course.levels[1].base.fifths).toBeUndefined();
  });

  /*
   * Refusals are whole-document and loud: a course silently missing its third
   * level is worse than no course.
   */
  it('refuses a level naming a difficulty the generator does not know', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[0].base = {
      kind: 'drills',
      difficultyId: 'grade-9',
    };
    expect(readCourse(bad)).toHaveProperty('error');
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
    const position = { courseId: course.id, levelId: 'gone', segment: 999 };
    expect(levelOf(position).id).toBe(course.levels[0].id);
  });
});

describe('reading an old document forward', () => {
  /*
   * The read-forward ruling of 2026-08-29: files written for the band format
   * keep working, because the band was always an axis wearing older clothes.
   */
  it('turns a tempo band into a tempo axis, one division per step', () => {
    const course = read(doc());
    const level = course.levels[0];
    expect(level.axes).toHaveLength(1);
    expect(level.axes![0].axis).toBe('tempo');
    expect(level.axes![0].divisions.map((d) => d.value)).toEqual([60, 66, 72, 78, 84]);
    expect(level.segments.map((s) => s.values.tempo)).toEqual([60, 66, 72, 78, 84]);
  });

  it('snaps a misaligned tempo ceiling down onto the step grid, as ever', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[0].tempo = { floor: 60, ceiling: 87, step: 6 };
    const course = read(bad);
    const tempos = course.levels[0].segments.map((s) => s.values.tempo);
    expect(tempos[tempos.length - 1]).toBe(84);
  });

  it('still refuses a band that is not usable', () => {
    const bad = doc();
    (bad.levels as Record<string, unknown>[])[0].tempo = { floor: 84, ceiling: 60, step: 6 };
    expect(errorOf(bad)).toContain('tempo band');
  });

  it('reads pinned into header scalars, the level over the course', () => {
    const course = read(
      doc({
        pinned: { metronomeEnabled: true },
        levels: [
          {
            ...(doc().levels as Record<string, unknown>[])[0],
            pinned: { conductorEnabled: false },
          },
        ],
      }),
    );
    expect(course.levels[0].metronomeEnabled).toBe(true);
    expect(course.levels[0].conductorEnabled).toBe(false);
  });

  it('translates advance into the level default rule, and drops carryEvidence', () => {
    const course = read(
      doc({
        advance: { afterBars: 12, windowBars: 6, accuracyAbove: 0.9, carryEvidence: true },
      }),
    );
    const rule = ruleFor(startOf(course), course);
    expect(rule).toEqual({ minBars: 12, score: { atLeast: 0.9, overBars: 6 } });
    expect('carryEvidence' in rule).toBe(false);
  });

  it('keeps its old leniency for a malformed legacy advance', () => {
    const course = read(doc({ advance: { afterBars: -3, windowBars: 'four' } }));
    expect(ruleFor(startOf(course), course)).toEqual(DEFAULT_RULE);
  });

  it('maps a stored tempo position onto the segment it meant', () => {
    const course = read(doc());
    // Exact figures land exactly; a figure off the old grid lands on the
    // last segment at or below it; rubbish clamps to the ends.
    expect(positionFrom(course.id, 'one', { tempo: 72 }, course).segment).toBe(2);
    expect(positionFrom(course.id, 'one', { tempo: 74 }, course).segment).toBe(2);
    expect(positionFrom(course.id, 'one', { tempo: 999 }, course).segment).toBe(4);
    expect(positionFrom(course.id, 'one', { tempo: 12 }, course).segment).toBe(0);
  });

  it('sends a stored tempo to the start of a level with no tempo axis', () => {
    const course = read(timelineDoc({ levels: [{ id: 'one', name: 'One', base: { kind: 'phrases', difficultyId: 'easy' } }] }));
    expect(positionFrom(course.id, 'one', { tempo: 72 }, course).segment).toBe(0);
  });
});

describe('the trichotomy: pinned, progressing, or the player’s', () => {
  it('refuses a parameter that is both pinned and moved on an axis', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].tempo = 66;
    expect(errorOf(bad)).toContain('both sets tempo and moves it on an axis');
  });

  it('refuses the same for a base parameter, range', () => {
    const bad = timelineDoc();
    const level = (bad.levels as Record<string, unknown>[])[0];
    (level.base as Record<string, unknown>).range = { low: 60, high: 72 };
    level.axes = [
      {
        axis: 'range',
        divisions: [
          { at: 0, value: { low: 60, high: 67 } },
          { at: 0.5, value: { low: 60, high: 72 } },
        ],
      },
    ];
    expect(errorOf(bad)).toContain('both sets range and moves it on an axis');
  });

  it('refuses an old tempo band alongside a declared tempo axis', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].tempo = { floor: 60, ceiling: 84, step: 6 };
    expect(errorOf(bad)).toContain('both sets tempo and moves it on an axis');
  });

  it('reads a header scalar as a pin, reaching the run', () => {
    const document = timelineDoc();
    const level = (document.levels as Record<string, unknown>[])[0];
    level.metronomeEnabled = false;
    level.fingerings = 'never';
    const course = read(document);
    const run = runFor(startOf(course), course);
    expect(run.metronomeEnabled).toBe(false);
    expect(run.fingerings).toBe('never');
  });

  it('refuses a known header scalar wearing an unusable value', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].fingerings = 'sometimes';
    expect(errorOf(bad)).toContain('fingerings');
  });

  it('leaves an absent parameter to the player: no pin, no value on the run', () => {
    const course = read(timelineDoc());
    const run = runFor(startOf(course), course);
    expect(run.metronomeEnabled).toBeUndefined();
    expect(run.fifths).toBeUndefined();
  });
});

describe('the refuse-by-name matrix', () => {
  /** One well-formed division per axis, to make each axis readable at all. */
  const GOOD_DIVISION: Record<AxisId, unknown> = {
    tempo: 66,
    fifths: -1,
    bars: 8,
    cycles: 4,
    themeCount: 2,
    range: { low: 60, high: 72 },
    span: 12,
    register: 'middle',
    metre: [3, 4],
    intervals: { intervals: [{ interval: 3, weight: 2 }] },
    metronomeEnabled: true,
    conductorEnabled: false,
    fingerings: 'always',
    playbackMode: 'off',
    readingMode: 'paged',
  };
  const KINDS: readonly LevelKind[] = ['drills', 'phrases', 'themes'];

  it('refuses every axis on every material it is not meaningful for, by name', () => {
    for (const [axis, kinds] of Object.entries(AXIS_MATERIALS) as [AxisId, readonly LevelKind[]][]) {
      for (const kind of KINDS) {
        const document = timelineDoc();
        const level = (document.levels as Record<string, unknown>[])[0];
        level.base = {
          kind,
          difficultyId: 'easy',
          ...(kind === 'drills' ? { drillId: 'major-scale' } : {}),
        };
        level.axes = [{ axis, divisions: [{ at: 0, value: GOOD_DIVISION[axis] }] }];
        const verdict = readCourse(document);
        if (kinds.includes(kind)) {
          expect(verdict, `${axis} on ${kind}`).not.toHaveProperty('error');
        } else {
          expect(verdict).toHaveProperty(
            'error',
            `course "timeline-course" level 1 has a ${axis} axis, which a ${kind} level cannot play`,
          );
        }
      }
    }
  });

  it('refuses the header twin on the wrong material too', () => {
    const bad = timelineDoc();
    const level = (bad.levels as Record<string, unknown>[])[0];
    level.base = { kind: 'themes', difficultyId: 'easy', range: { low: 60, high: 72 } };
    level.axes = [];
    expect(errorOf(bad)).toContain('sets range, which a themes level cannot play');
  });

  it('refuses register on a level that is not drills, no longer dropping it', () => {
    const bad = doc();
    ((bad.levels as Record<string, unknown>[])[1].base as Record<string, unknown>).register = 'high';
    expect(errorOf(bad)).toContain('sets register, which a phrases level cannot play');
  });
});

describe('reading axes', () => {
  it('refuses an axis the app does not know', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].axes = [
      { axis: 'feel', divisions: [{ at: 0, value: 'swung' }] },
    ];
    expect(errorOf(bad)).toContain('an axis the app does not know');
  });

  it('refuses an axis declared twice', () => {
    const bad = timelineDoc();
    const axes = (bad.levels as Record<string, unknown>[])[0].axes as unknown[];
    (bad.levels as Record<string, unknown>[])[0].axes = [...axes, ...axes];
    expect(errorOf(bad)).toContain('declares the tempo axis twice');
  });

  it('refuses an axis with no divisions, or not starting at the start', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].axes = [{ axis: 'tempo', divisions: [] }];
    expect(errorOf(bad)).toContain('has no divisions');

    const late = timelineDoc();
    (late.levels as Record<string, unknown>[])[0].axes = [
      { axis: 'tempo', divisions: [{ at: 0.2, value: 60 }] },
    ];
    expect(errorOf(late)).toContain('does not begin at the start');
  });

  it('refuses divisions out of order or outside the level', () => {
    const disordered = timelineDoc();
    (disordered.levels as Record<string, unknown>[])[0].axes = [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.6, value: 72 },
          { at: 0.4, value: 66 },
        ],
      },
    ];
    expect(errorOf(disordered)).toContain('divisions out of order');

    const outside = timelineDoc();
    (outside.levels as Record<string, unknown>[])[0].axes = [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 1.2, value: 72 },
        ],
      },
    ];
    expect(errorOf(outside)).toContain('outside the level');
  });

  it('refuses a division whose value is not what the axis carries', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].axes = [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.5, value: 'faster' },
        ],
      },
    ];
    expect(errorOf(bad)).toContain('a division that is not a conducted tempo');
  });

  it('allows a division that restates the value — an authored reset shape', () => {
    const document = timelineDoc();
    (document.levels as Record<string, unknown>[])[0].axes = [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.3, value: 66 },
          { at: 0.6, value: 60 },
          { at: 0.8, value: 66 },
        ],
      },
    ];
    const course = read(document);
    expect(course.levels[0].segments.map((s) => s.values.tempo)).toEqual([60, 66, 60, 66]);
  });

  it('derives segments across axes: a division on any axis splits them all', () => {
    const document = timelineDoc();
    const level = (document.levels as Record<string, unknown>[])[0];
    level.axes = [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.5, value: 72 },
        ],
      },
      {
        axis: 'readingMode',
        divisions: [
          { at: 0, value: 'scrolling' },
          { at: 0.75, value: 'paged' },
        ],
      },
    ];
    const course = read(document);
    const segments = course.levels[0].segments;
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.values.tempo)).toEqual([60, 72, 72]);
    expect(segments.map((s) => s.values.readingMode)).toEqual(['scrolling', 'scrolling', 'paged']);
  });

  it('gives a level with no axes one segment — a legitimate thing to want', () => {
    const course = read(
      timelineDoc({
        levels: [{ id: 'one', name: 'One', base: { kind: 'phrases', difficultyId: 'easy' } }],
      }),
    );
    expect(course.levels[0].segments).toHaveLength(1);
    expect(stepsInLevel(course.levels[0])).toBe(1);
  });
});

describe('the progression rules', () => {
  it('uses the level default where no override stands, and DEFAULT_RULE where nothing does', () => {
    const course = read(timelineDoc());
    expect(ruleFor(startOf(course), course)).toEqual(DEFAULT_RULE);

    const withDefault = timelineDoc();
    (withDefault.levels as Record<string, unknown>[])[0].rules = { minBars: 4 };
    const ruled = read(withDefault);
    expect(ruleFor(startOf(ruled), ruled)).toEqual({ minBars: 4 });
  });

  it('applies a per-segment override at its boundary and nowhere else', () => {
    const document = timelineDoc();
    const level = (document.levels as Record<string, unknown>[])[0];
    level.rules = { minBars: 2 };
    level.segmentRules = [{ at: 0.4, minBars: 6, score: { atLeast: 0.9, overBars: 2 } }];
    const course = read(document);
    const start = startOf(course);
    expect(ruleFor(start, course)).toEqual({ minBars: 2 });
    expect(ruleFor({ ...start, segment: 1 }, course)).toEqual({
      minBars: 6,
      score: { atLeast: 0.9, overBars: 2 },
    });
    expect(ruleFor({ ...start, segment: 2 }, course)).toEqual({ minBars: 2 });
  });

  it('refuses a segment rule where no segment begins', () => {
    const bad = timelineDoc();
    (bad.levels as Record<string, unknown>[])[0].segmentRules = [{ at: 0.5, minBars: 4 }];
    expect(errorOf(bad)).toBe(
      'course "timeline-course" level 1 has a segment rule at 50%, where no segment begins',
    );
  });

  it('refuses a malformed rule rather than silently gating at the default', () => {
    const badLevel = timelineDoc();
    (badLevel.levels as Record<string, unknown>[])[0].rules = { minBars: -3 };
    expect(errorOf(badLevel)).toContain('progression rule that is not usable');

    const badSegment = timelineDoc();
    (badSegment.levels as Record<string, unknown>[])[0].segmentRules = [
      { at: 0.4, minBars: 4, score: { atLeast: 2, overBars: 0 } },
    ];
    expect(errorOf(badSegment)).toContain('segment rule that is not usable');
  });
});

describe('what a position prescribes', () => {
  it('prescribes a run from a position: the base, the header pins, the segment', () => {
    const document = timelineDoc();
    const level = (document.levels as Record<string, unknown>[])[0];
    level.conductorEnabled = true;
    const course = read(document);
    const start = startOf(course);
    expect(runFor(start, course)).toEqual({
      kind: 'phrases',
      difficultyId: 'easy',
      conductorEnabled: true,
      tempo: 60,
      levelId: 'one',
    });
    expect(runFor({ ...start, segment: 2 }, course).tempo).toBe(72);
  });

  it('carries a segment’s non-tempo values onto the run', () => {
    const document = timelineDoc();
    const level = (document.levels as Record<string, unknown>[])[0];
    level.axes = [
      {
        axis: 'range',
        divisions: [
          { at: 0, value: { low: 60, high: 67 } },
          { at: 0.5, value: { low: 60, high: 72 } },
        ],
      },
    ];
    const course = read(document);
    const start = startOf(course);
    expect(runFor(start, course).range).toEqual({ low: 60, high: 67 });
    expect(runFor({ ...start, segment: 1 }, course).range).toEqual({ low: 60, high: 72 });
  });
});

describe('where a course begins', () => {
  it('starts at the first level, at its first segment', () => {
    const course = COURSES[0];
    const start = startOf(course);
    expect(start.levelId).toBe(course.levels[0].id);
    expect(start.segment).toBe(0);
    expect(positionLabel(start)).toBe('1.1');
  });

  it('clamps a stored segment onto the level', () => {
    const course = COURSES[0];
    const level = course.levels[0];
    expect(positionFrom(course.id, level.id, { segment: 999 }).segment).toBe(
      level.segments.length - 1,
    );
    expect(positionFrom(course.id, level.id, { segment: -3 }).segment).toBe(0);
  });
});

describe('the player-owned stepping', () => {
  const course = COURSES[0];
  const first = course.levels[0];
  const second = course.levels[1];
  const last = course.levels[course.levels.length - 1];

  it('moves one segment before it touches the level', () => {
    const next = stepForward(startOf(course))!;
    expect(next.levelId).toBe(first.id);
    expect(next.segment).toBe(1);
  });

  it('moves up a level only past the last segment, and starts at the next start', () => {
    const atEnd = { courseId: course.id, levelId: first.id, segment: first.segments.length - 1 };
    const next = stepForward(atEnd)!;
    expect(next.levelId).toBe(second.id);
    expect(next.segment).toBe(0);
  });

  it('eases back within the level first, and mirrors the join', () => {
    const start = { courseId: course.id, levelId: second.id, segment: 0 };
    const back = stepBack(start)!;
    expect(back.levelId).toBe(first.id);
    expect(back.segment).toBe(first.segments.length - 1);
  });

  it('has nowhere above the top or below the bottom', () => {
    expect(
      stepForward({ courseId: course.id, levelId: last.id, segment: last.segments.length - 1 }),
    ).toBeNull();
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

  it('labels the position level.segment, one-based on both sides', () => {
    const third = course.levels[2];
    const position = { courseId: course.id, levelId: third.id, segment: 1 };
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
    const course = read(doc({ mastery: strict }));
    expect(masteryOf(course.levels[0], course)).toEqual(strict);
    const perLevel = read(
      doc({
        mastery: strict,
        levels: [
          {
            ...(doc().levels as Record<string, unknown>[])[0],
            mastery: { promoteAbove: 0.7, demoteBelow: 0.5, runsToJudge: 2 },
          },
        ],
      }),
    );
    expect(masteryOf(perLevel.levels[0], perLevel).promoteAbove).toBe(0.7);
  });
});

describe('segmentsOf, which the editor draws with', () => {
  it('derives one segment from no axes, carrying the rule it was given', () => {
    const segments = segmentsOf([], { minBars: 3 });
    expect(segments).toHaveLength(1);
    expect(segments[0].at).toBe(0);
    expect(segments[0].rule).toEqual({ minBars: 3 });
  });

  it('merges boundaries that coincide across axes', () => {
    const segments = segmentsOf([
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.5, value: 72 },
        ],
      },
      {
        axis: 'metronomeEnabled',
        divisions: [
          { at: 0, value: true },
          { at: 0.5, value: false },
        ],
      },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[1].values).toEqual({ tempo: 72, metronomeEnabled: false });
  });
});

describe('goals over the course', () => {
  const course = COURSES[0];

  it('measures distance in the steps the buttons actually walk', () => {
    const from = startOf(course);
    const to = { courseId: course.id, levelId: course.levels[1].id, segment: 0 };
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
    const goal = { courseId: course.id, levelId: course.levels[1].id, segment: 0 };
    const halfway = stepForward(stepForward(from)!)!;
    const along = progressToward(from, halfway, goal)!;
    expect(along).toBeGreaterThan(0);
    expect(along).toBeLessThan(1);
    expect(progressToward(from, goal, goal)).toBe(1);
  });
});
