/**
 * A course: an authored, ordered list of levels, and what a player does there.
 *
 * The rulings this file answers to are `docs/course-plan.md` (ratified
 * 2026-08-26) and `docs/level-axes-plan.md` (ratified 2026-08-29). Three
 * parts: the **author** owns what is practised and in what order; the
 * **machine** varies the work within a level and *suggests* when the player
 * is ready for more; and the **player** decides — position moves only when
 * they press forward or back. Nothing in this file moves anyone.
 *
 * ## The timeline (2026-08-29)
 *
 * A level is not one run — it is a small space, and the app walks the player
 * through it. The walk is a **timeline**: each axis a level moves is a step
 * function over the level's progression, the author places the divisions,
 * and a **segment** is the space between two consecutive divisions taken
 * across all axes at once. Position in a level is a segment index; forward
 * and back move one segment. Percentages are an authoring device — what is
 * stored and stepped is the ordered segment list, derived here once.
 *
 * ## The trichotomy (ruled 2026-08-29, superseding the composite support axis)
 *
 * Every axis-capable parameter is in exactly one of three states:
 *
 *  - **absent** — the player's own setting stands, or the gate asks
 *    (the key question of v2.57.0 is this state for `fifths`);
 *  - **a header scalar** — pinned by the author, shown locked at the gate
 *    with "Set by the course" (the tempo lock of v2.59.0 is this state);
 *  - **an axis** — it progresses across segments.
 *
 * Never more than one. A document that both pins a parameter and moves it on
 * an axis is refused by name, because the two would disagree about what
 * plays and the picture must match the music. There is no composite
 * "support" axis: each help setting (metronome, conductor, fingerings,
 * playback, reading mode) is individually header-level or its own axis —
 * one axis moves one thing, which is `ladder.ts`'s oldest law, and the same
 * argument that kept difficulty from being an axis at all.
 *
 * ## Why courses are documents
 *
 * A course is read from a plain document by `readCourse`, and the bundled
 * course goes through the same reader a user's file does — so the format
 * cannot quietly grow a field the reader does not honour. The reading is
 * forward-tolerant by ratified rule: unknown fields are ignored, never
 * refused, because a course written by a newer version should degrade rather
 * than die. What *is* refused, loudly, is a document whose levels cannot be
 * trusted — a course silently missing its third level is worse than no
 * course. And a **known** field with an unusable value is refused too, by
 * name: a field the app quietly ignores is worse than an absent one (the
 * length-unit ruling of v2.60.0, generalised here to every axis).
 *
 * Old documents read forward: a `tempo: {floor, ceiling, step}` band becomes
 * a tempo axis with one division per step; `pinned` becomes header scalars;
 * `advance` becomes the level's default progression rule. `carryEvidence`
 * is dropped — evidence is per-segment by construction now, which is what
 * it was invented to approximate.
 */

import { DIFFICULTIES, type IntervalPool } from './difficulty';
import { DRILLS, type DrillId, type PatternRegister } from './generate';
import type { ExerciseKind } from './types';
import type { FingeringMode } from './hints';
import type { PlaybackMode } from '../engine/session';
import type { ReadingMode } from '../render/surface';
import { OFFERED_METRES } from '../domain/metre';
import { COMMON_KEYS_DOCUMENT } from './courses/common-keys';

/**
 * What kind of run a level asks for. `imported` is deliberately absent for
 * now — course-carried MusicXML is course-plan phase 4, not this one.
 */
export type LevelKind = Exclude<ExerciseKind, 'imported'>;

const KINDS: readonly LevelKind[] = ['drills', 'phrases', 'themes'];

/**
 * Whether a material needs a difficulty at all. Every current kind does;
 * `rhythm-plan.md` wants a material without one, and this table is the whole
 * of what that change will touch — one entry, no schema bump, no stored-file
 * migration.
 */
const NEEDS_DIFFICULTY: Record<LevelKind, boolean> = {
  drills: true,
  phrases: true,
  themes: true,
};

/**
 * The length unit each material measures itself in — and only that unit.
 * A `cycles` on a sight-reading level is not a harmless extra: the generator
 * would ignore it and the author would believe it, which is the exact
 * failure the reader exists to prevent. Exported so the editor offers the
 * same unit the reader will accept, rather than mirroring this map and
 * drifting.
 */
export const LENGTH_UNIT_FOR: Record<LevelKind, 'bars' | 'cycles' | 'themeCount'> = {
  drills: 'cycles',
  phrases: 'bars',
  themes: 'themeCount',
};

/* ------------------------------------------------------------------ */
/* Axes — the timeline's vocabulary                                    */
/* ------------------------------------------------------------------ */

/**
 * Every axis a level may move. The name doubles as the parameter name of the
 * header scalar, because the trichotomy is about one parameter wearing one
 * of three states — the only exception is `span`, whose header scalar is
 * `base.spanSemitones` (the field says its unit; the axis reads better
 * short).
 */
export type AxisId =
  | 'tempo'
  | 'fifths'
  | 'bars'
  | 'cycles'
  | 'themeCount'
  | 'range'
  | 'span'
  | 'register'
  | 'metre'
  | 'intervals'
  | 'metronomeEnabled'
  | 'conductorEnabled'
  | 'fingerings'
  | 'playbackMode'
  | 'readingMode';

/**
 * One division on an axis: the value that begins at `at`.
 *
 * `at` is a fraction of the level's progression, 0 to 1 — an authoring
 * device, displayed as a percentage, never a runtime unit. The reader turns
 * divisions into segments once; nothing downstream reads a fraction.
 */
export interface AxisDivision {
  at: number;
  value: unknown;
}

/** An axis: a step function over the level, first division at the start. */
export interface Axis {
  axis: AxisId;
  divisions: readonly AxisDivision[];
}

/**
 * The author's progression rule for a segment — the drawing's two figures.
 * After `minBars` bars played in the segment, and (where `score` is set)
 * with every one of the last `overBars` bars at or above `atLeast`, the
 * music pauses and a countdown offers the next segment, beside a Stay here
 * button — the machine announces and the player disposes. `score` absent is
 * the drawing's own "n/a": time served is the whole test.
 *
 * The whole-window shape is deliberate and survives from `Advance`: every
 * bar clean, not a good average — a player found the average version offers
 * a step on the strength of bars that predate the work.
 */
export interface SegmentRule {
  minBars: number;
  score?: { atLeast: number; overBars: number };
}

/**
 * Provisional like the mastery bar, and under the same law: measured, not
 * argued about, and not tuned before a real course has been played through.
 * The exact figures `DEFAULT_ADVANCE` carried, translated.
 */
export const DEFAULT_RULE: SegmentRule = {
  minBars: 8,
  score: { atLeast: 0.85, overBars: 4 },
};

/**
 * Every axis-capable parameter, as a segment resolves them. Only parameters
 * the level actually moves appear on a segment; header scalars and absences
 * resolve in `runFor`.
 */
export interface SegmentValues {
  tempo?: number;
  fifths?: number;
  bars?: number;
  cycles?: number;
  themeCount?: number;
  range?: { low: number; high: number };
  spanSemitones?: number;
  register?: PatternRegister;
  metre?: readonly [number, number];
  intervals?: IntervalPool;
  metronomeEnabled?: boolean;
  conductorEnabled?: boolean;
  fingerings?: FingeringMode;
  playbackMode?: PlaybackMode;
  readingMode?: ReadingMode;
}

/** One segment: where it begins, what is in force there, and the rule. */
export interface Segment {
  /** The boundary that begins this segment, as authored (fraction 0..1). */
  at: number;
  values: SegmentValues;
  rule: SegmentRule;
}

/** Two boundaries closer than this are the same boundary. */
const AT_EPSILON = 1e-9;

/* Per-axis validation: what a value must be, said once, used for the header
 * scalar and every division alike. `read` returns the parsed value or
 * undefined for refusal; `describe` finishes the error sentence. */
interface AxisSpec {
  /** The segment/settings field the axis writes. */
  field: keyof SegmentValues;
  /** Where the header scalar lives. */
  home: 'base' | 'level';
  kinds: readonly LevelKind[];
  read: (value: unknown) => SegmentValues[keyof SegmentValues] | undefined;
  describe: string;
}

const ALL_KINDS = KINDS;

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function readFifthsValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= 7
    ? value
    : undefined;
}

function readTempoValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readRangeValue(value: unknown): { low: number; high: number } | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { low, high } = value as Record<string, unknown>;
  if (
    typeof low !== 'number' ||
    typeof high !== 'number' ||
    !Number.isInteger(low) ||
    !Number.isInteger(high) ||
    high < low
  ) {
    return undefined;
  }
  return { low, high };
}

function readMetreValue(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [beatsPerBar, beatUnit] = value as unknown[];
  const offered = OFFERED_METRES.find(([b, u]) => b === beatsPerBar && u === beatUnit);
  return offered ? [offered[0], offered[1]] : undefined;
}

function readIntervalsValue(value: unknown): IntervalPool | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { intervals, degrees } = value as Record<string, unknown>;
  if (!Array.isArray(intervals) || intervals.length === 0) return undefined;
  const pool: IntervalPool = { intervals: [] };
  for (const entry of intervals) {
    if (typeof entry !== 'object' || entry === null) return undefined;
    const { interval, weight } = entry as Record<string, unknown>;
    if (
      typeof interval !== 'number' ||
      !Number.isInteger(interval) ||
      interval < 1 ||
      typeof weight !== 'number' ||
      !(weight > 0)
    ) {
      return undefined;
    }
    pool.intervals.push({ interval, weight });
  }
  if (degrees !== undefined) {
    if (!Array.isArray(degrees) || degrees.length === 0) return undefined;
    for (const degree of degrees) {
      if (typeof degree !== 'number' || !Number.isInteger(degree) || degree < 1 || degree > 7) {
        return undefined;
      }
    }
    pool.degrees = degrees as number[];
  }
  return pool;
}

function readBooleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/* Exhaustive in both directions: a mode added to the union fails to compile
 * here until the reader knows it, and a typo cannot enter the record. */
const REGISTER_VALUES: Record<PatternRegister, true> = { low: true, middle: true, high: true };
const FINGERING_VALUES: Record<FingeringMode, true> = { always: true, trouble: true, never: true };
const PLAYBACK_VALUES: Record<PlaybackMode, true> = { off: true, reference: true };
const READING_VALUES: Record<ReadingMode, true> = { scrolling: true, paged: true };

function readNamed<T extends string>(values: Record<T, true>) {
  return (value: unknown): T | undefined =>
    typeof value === 'string' && value in values ? (value as T) : undefined;
}

const AXES: Record<AxisId, AxisSpec> = {
  tempo: {
    field: 'tempo',
    home: 'level',
    kinds: ALL_KINDS,
    read: readTempoValue,
    describe: 'a conducted tempo in beats per minute',
  },
  fifths: {
    field: 'fifths',
    home: 'base',
    kinds: ALL_KINDS,
    read: readFifthsValue,
    describe: 'a key on the circle of fifths',
  },
  bars: {
    field: 'bars',
    home: 'base',
    kinds: ['phrases'],
    read: readPositiveInteger,
    describe: 'a whole number of bars',
  },
  cycles: {
    field: 'cycles',
    home: 'base',
    kinds: ['drills'],
    read: readPositiveInteger,
    describe: 'a whole number of cycles',
  },
  themeCount: {
    field: 'themeCount',
    home: 'base',
    kinds: ['themes'],
    read: readPositiveInteger,
    describe: 'a whole number of tunes',
  },
  range: {
    field: 'range',
    home: 'base',
    kinds: ['phrases'],
    read: readRangeValue,
    describe: 'a low and a high written note',
  },
  span: {
    field: 'spanSemitones',
    home: 'base',
    kinds: ['drills'],
    read: readPositiveInteger,
    describe: 'a whole number of semitones',
  },
  register: {
    field: 'register',
    home: 'base',
    kinds: ['drills'],
    read: readNamed(REGISTER_VALUES),
    describe: 'a register the app knows',
  },
  metre: {
    field: 'metre',
    home: 'base',
    kinds: ['phrases', 'themes'],
    read: readMetreValue,
    describe: 'a metre the app offers',
  },
  intervals: {
    field: 'intervals',
    home: 'base',
    kinds: ['phrases'],
    read: readIntervalsValue,
    describe: 'a usable interval pool',
  },
  metronomeEnabled: {
    field: 'metronomeEnabled',
    home: 'level',
    kinds: ALL_KINDS,
    read: readBooleanValue,
    describe: 'on or off',
  },
  conductorEnabled: {
    field: 'conductorEnabled',
    home: 'level',
    kinds: ALL_KINDS,
    read: readBooleanValue,
    describe: 'on or off',
  },
  fingerings: {
    field: 'fingerings',
    home: 'level',
    kinds: ALL_KINDS,
    read: readNamed(FINGERING_VALUES),
    describe: 'a fingering mode the app knows',
  },
  playbackMode: {
    field: 'playbackMode',
    home: 'level',
    kinds: ALL_KINDS,
    read: readNamed(PLAYBACK_VALUES),
    describe: 'a playback mode the app knows',
  },
  readingMode: {
    field: 'readingMode',
    home: 'level',
    kinds: ALL_KINDS,
    read: readNamed(READING_VALUES),
    describe: 'a reading mode the app knows',
  },
};

const AXIS_IDS = Object.keys(AXES) as readonly AxisId[];

/**
 * Which materials each axis is meaningful for — the v2.60.0 length-unit rule
 * generalised, and exported so the editor offers only what the reader will
 * accept. A range axis on a drills level is refused by name, not ignored.
 */
export const AXIS_MATERIALS: Record<AxisId, readonly LevelKind[]> = Object.fromEntries(
  AXIS_IDS.map((id) => [id, AXES[id].kinds]),
) as Record<AxisId, readonly LevelKind[]>;

/**
 * The ordered segment list a set of axes derives: boundaries are the union
 * of every axis's division points, each segment carries the value in force
 * per axis (the step function, read left) and the rule that begins at its
 * boundary — the override where the author placed one, the level default
 * everywhere else. No axes derives one segment, which is a legitimate thing
 * to want: a level that is one prescription, end to end.
 *
 * Exported because the editor must draw with the same derivation the app
 * steps by — two derivations would let the table disagree with the music.
 */
export function segmentsOf(
  axes: readonly Axis[],
  rule: SegmentRule = DEFAULT_RULE,
  overrides: readonly ({ at: number } & SegmentRule)[] = [],
): Segment[] {
  const boundaries: number[] = [0];
  for (const axis of axes) {
    for (const division of axis.divisions) {
      if (!boundaries.some((at) => Math.abs(at - division.at) < AT_EPSILON)) {
        boundaries.push(division.at);
      }
    }
  }
  boundaries.sort((a, b) => a - b);

  return boundaries.map((at) => {
    const values: Record<string, unknown> = {};
    for (const axis of axes) {
      const spec = AXES[axis.axis];
      let inForce: unknown;
      for (const division of axis.divisions) {
        if (division.at <= at + AT_EPSILON) inForce = division.value;
      }
      if (inForce !== undefined) values[spec.field] = inForce;
    }
    const override = overrides.find((entry) => Math.abs(entry.at - at) < AT_EPSILON);
    return {
      at,
      values: values as SegmentValues,
      rule: override
        ? { minBars: override.minBars, ...(override.score ? { score: override.score } : {}) }
        : rule,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Mastery — the suggestion bar's figures, untouched by the timeline   */
/* ------------------------------------------------------------------ */

/**
 * How well, and for how long, before the bar suggests anything.
 *
 * Part of the course rather than a constant, because the right bar depends on
 * what is being practised: 0.85 across two runs is a strong result on unseen
 * music and a weak one on a scale. **The defaults are provisional and should
 * be measured, not argued about** — the plan forbids tuning them before a
 * real course has been played through.
 */
export interface Mastery {
  /** Every one of the recent runs at or above this suggests moving on. */
  promoteAbove: number;
  /** Every one of them below this suggests easing back. */
  demoteBelow: number;
  /** How many recent runs are read. Fewer than this suggests nothing. */
  runsToJudge: number;
}

export const DEFAULT_MASTERY: Mastery = {
  promoteAbove: 0.85,
  demoteBelow: 0.6,
  runsToJudge: 2,
};

/* ------------------------------------------------------------------ */
/* The document's shapes                                               */
/* ------------------------------------------------------------------ */

/**
 * The run a level prescribes — the author's half of the bargain.
 *
 * These are settings overrides, named rather than a free-form
 * `Partial<Settings>` so the reader can validate every field it honours and
 * ignore every field it does not. Each is a **header scalar** — the pinned
 * state of the trichotomy; absent means the player's own setting stands (or
 * the gate asks, for `fifths`); the same parameter on an axis instead means
 * it progresses. `fifths` optional by the ratified ruling of 2026-08-26.
 */
export interface LevelBase {
  kind: LevelKind;
  /** Which of the generator's difficulties writes the music. */
  difficultyId: string;
  /** Which drill, where `kind` is `drills`. Absent means the major scale. */
  drillId?: DrillId;
  /** Written key on the circle of fifths, where the author names one. */
  fifths?: number;
  /** Where a pattern sits in the instrument, where the author cares. */
  register?: PatternRegister;
  /** How long a run is, in the material's own unit (the v2.60.0 ruling). */
  bars?: number;
  cycles?: number;
  themeCount?: number;
  /** Written compass for sight-reading, where the author narrows it. */
  range?: { low: number; high: number };
  /** How far above the tonic a drill reaches, overriding the difficulty's. */
  spanSemitones?: number;
  /** Written time signature, where the author names one. */
  metre?: readonly [number, number];
  /** What intervals a sight-reading line is drawn from. */
  intervals?: IntervalPool;
}

export interface CourseLevel {
  id: string;
  /** What the player is told they are on: "F major, the shape". */
  name: string;
  /** The author's words: why this level, what to watch for. */
  note?: string;
  base: LevelBase;
  /** Pinned tempo — the header scalar. Absent + no tempo axis = player's dial. */
  tempo?: number;
  /** Pinned support settings, flat on the level; absent leaves the player's. */
  metronomeEnabled?: boolean;
  conductorEnabled?: boolean;
  fingerings?: FingeringMode;
  playbackMode?: PlaybackMode;
  readingMode?: ReadingMode;
  /** The timeline. Absent or empty is one segment — a legitimate thing to want. */
  axes?: readonly Axis[];
  /** The progression rule for every segment that does not set its own. */
  rules?: SegmentRule;
  /** Sparse overrides, keyed by the boundary that begins the segment. */
  segmentRules?: readonly ({ at: number } & SegmentRule)[];
  /** Overrides the course's bar for this level alone. */
  mastery?: Mastery;
  /**
   * Whether the music carries on past the level's length, offering *Continue*
   * rather than ending the run. **Absent means no** (ruled 2026-08-29): in a
   * course the author owns the length of a run; a stamina level says so.
   */
  endless?: boolean;
  /** Derived by the reader: the ordered walk the buttons actually take. */
  readonly segments: readonly Segment[];
}

export interface Course {
  id: string;
  name: string;
  blurb: string;
  /**
   * The document format's version, ratified as forward-tolerant: readers
   * ignore unknown fields rather than refusing the file, so this exists for
   * the day a change cannot be ignored, not for gatekeeping.
   */
  schemaVersion: number;
  /** Easiest first. The author's order IS the progression. */
  levels: readonly CourseLevel[];
  /** The bar for every level that does not set its own. */
  mastery?: Mastery;
}

/**
 * Where a player stands: a course, a level, and a segment of that level's
 * timeline. The whole of what the forward and back buttons move.
 */
export interface Position {
  courseId: string;
  levelId: string;
  /** Index into the level's derived segment list, from 0. */
  segment: number;
}

/* ------------------------------------------------------------------ */
/* Reading a document                                                  */
/* ------------------------------------------------------------------ */

const DIFFICULTY_IDS = new Set(DIFFICULTIES.map((d) => d.id));
const DRILL_IDS = new Set<string>(DRILLS.map((d) => d.id));

/**
 * A new-format progression rule. `null` for malformed — refused by the
 * caller, unlike the old `readAdvance`'s silent drop: a rule the reader
 * ignored would silently gate a segment at the default, which is the exact
 * "quietly ignores" failure the reader exists to prevent.
 */
function readRule(value: unknown): SegmentRule | null {
  if (typeof value !== 'object' || value === null) return null;
  const { minBars, score } = value as Record<string, unknown>;
  if (typeof minBars !== 'number' || !Number.isInteger(minBars) || minBars < 1) return null;
  const rule: SegmentRule = { minBars };
  if (score !== undefined) {
    if (typeof score !== 'object' || score === null) return null;
    const { atLeast, overBars } = score as Record<string, unknown>;
    if (
      typeof atLeast !== 'number' ||
      !(atLeast > 0 && atLeast <= 1) ||
      typeof overBars !== 'number' ||
      !Number.isInteger(overBars) ||
      overBars < 1
    ) {
      return null;
    }
    rule.score = { atLeast, overBars };
  }
  return rule;
}

/**
 * An old document's `advance`, translated into the rule it always meant:
 * after `afterBars` bars, with the last `windowBars` all at or above
 * `accuracyAbove`. Legacy leniency preserved — a malformed one is dropped,
 * as `readAdvance` always dropped it, because refusing would kill stored
 * files that read clean for weeks. `carryEvidence` is dropped with the
 * translation: evidence is per-segment by construction now.
 */
function ruleFromLegacyAdvance(value: unknown): SegmentRule | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { afterBars, windowBars, accuracyAbove } = value as Record<string, unknown>;
  if (
    typeof afterBars !== 'number' ||
    typeof windowBars !== 'number' ||
    typeof accuracyAbove !== 'number' ||
    !(afterBars >= 1) ||
    !(windowBars >= 1) ||
    !(accuracyAbove > 0 && accuracyAbove <= 1)
  ) {
    return undefined;
  }
  return {
    minBars: Math.round(afterBars),
    score: { atLeast: accuracyAbove, overBars: Math.round(windowBars) },
  };
}

/** An old document's `pinned`, kept lenient for the same reason. */
function legacyPinned(value: unknown): { metronomeEnabled?: boolean; conductorEnabled?: boolean } {
  if (typeof value !== 'object' || value === null) return {};
  const { metronomeEnabled, conductorEnabled } = value as Record<string, unknown>;
  return {
    ...(typeof metronomeEnabled === 'boolean' ? { metronomeEnabled } : {}),
    ...(typeof conductorEnabled === 'boolean' ? { conductorEnabled } : {}),
  };
}

function readMastery(value: unknown): Mastery | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { promoteAbove, demoteBelow, runsToJudge } = value as Record<string, unknown>;
  if (
    typeof promoteAbove !== 'number' ||
    typeof demoteBelow !== 'number' ||
    typeof runsToJudge !== 'number' ||
    !(promoteAbove > demoteBelow) ||
    !(runsToJudge >= 1)
  ) {
    return undefined;
  }
  return { promoteAbove, demoteBelow, runsToJudge: Math.round(runsToJudge) };
}

/**
 * An old document's tempo band, become the axis it always was: one division
 * per step, evenly spaced, the ceiling snapped down onto the grid exactly as
 * the old reader snapped it (an authoring slip, not a meaning — and every
 * read-forward axis is exact because of it).
 */
function axisFromLegacyBand(band: Record<string, unknown>): Axis | null {
  const { floor, ceiling, step } = band;
  if (
    typeof floor !== 'number' ||
    typeof ceiling !== 'number' ||
    typeof step !== 'number' ||
    step <= 0 ||
    ceiling < floor
  ) {
    return null;
  }
  const steps = Math.floor((ceiling - floor) / step);
  const count = steps + 1;
  const divisions: AxisDivision[] = [];
  for (let i = 0; i < count; i += 1) {
    divisions.push({ at: i / count, value: floor + i * step });
  }
  return { axis: 'tempo', divisions };
}

/* ------------------------------------------------------------------ */
/* Course defaults — said once, for every level that does not say it    */
/* ------------------------------------------------------------------ */

/**
 * Parameters a course may default that are not axis-capable: the material
 * itself, its difficulty and its drill. A level that omits them takes the
 * course's, which is what stops a twelve-level scales course repeating
 * "drills / major scale / easy" twelve times.
 */
const PLAIN_DEFAULTS = ['kind', 'difficultyId', 'drillId'] as const;

/** Whether a scope states a parameter at all — as a scalar or as an axis. */
function states(
  scope: { fields: Record<string, unknown>; base: Record<string, unknown>; axes: unknown[] },
  axisId: AxisId,
): boolean {
  const spec = AXES[axisId];
  const scalar = spec.home === 'base' ? scope.base[spec.field] : scope.fields[spec.field];
  if (scalar !== undefined) return true;
  return scope.axes.some(
    (axis) =>
      typeof axis === 'object' &&
      axis !== null &&
      (axis as Record<string, unknown>).axis === axisId,
  );
}

/**
 * A level with the course's defaults filled in — the whole of inheritance,
 * done here on the plain document so that **nothing downstream knows about
 * it**. `readCourse` hands out levels that already say everything they
 * play; `runFor`, the segments, the stepping and the gate are untouched.
 *
 * The rule is one line: **a level that states a parameter states it
 * entirely.** A scalar at the level overrides an axis at the course and
 * the other way about, because the trichotomy is per parameter and a
 * parameter is pinned, progressing, or the player's — inheriting half of
 * one would be a fourth state nobody could read off the page.
 *
 * Two things deliberately do not inherit: a level's `name` and `note`,
 * which are what a level *is*, and its `segmentRules`, which are keyed to
 * boundaries that only exist once a level's own axes are in. The default
 * progression rule (`rules`) does inherit, and is the useful half anyway.
 *
 * Exported because the editor shows what a level inherits and offers to
 * override it — and two implementations of this would eventually disagree
 * about what the player is actually playing.
 */
export function resolveLevelDocument(
  doc: Record<string, unknown>,
  rawLevel: Record<string, unknown>,
): Record<string, unknown> {
  const courseBase = (doc.base ?? {}) as Record<string, unknown>;
  const levelBase = (rawLevel.base ?? {}) as Record<string, unknown>;
  const courseAxes = Array.isArray(doc.axes) ? (doc.axes as unknown[]) : [];
  const levelAxes = Array.isArray(rawLevel.axes) ? (rawLevel.axes as unknown[]) : [];
  // The old course-wide `pinned` is a pair of scalar defaults wearing an
  // older name, so it joins the course's own fields rather than a branch.
  const courseFields: Record<string, unknown> = { ...legacyPinned(doc.pinned), ...doc };
  const course = { fields: courseFields, base: courseBase, axes: courseAxes };
  // A level's own legacy `pinned` is a statement too, or a course default
  // would out-rank the very thing it was written to be overridden by.
  const level = {
    fields: { ...legacyPinned(rawLevel.pinned), ...rawLevel } as Record<string, unknown>,
    base: levelBase,
    axes: levelAxes,
  };

  const kind = (levelBase.kind ?? courseBase.kind) as LevelKind | undefined;
  /** A default only reaches levels whose material can play it. */
  const playable = (axisId: AxisId) =>
    kind !== undefined && AXIS_MATERIALS[axisId].includes(kind);

  const base: Record<string, unknown> = { ...levelBase };
  const fields: Record<string, unknown> = { ...rawLevel };
  const axes: unknown[] = [...levelAxes];

  for (const key of PLAIN_DEFAULTS) {
    if (base[key] === undefined && courseBase[key] !== undefined) base[key] = courseBase[key];
  }

  for (const axisId of AXIS_IDS) {
    if (states(level, axisId) || !states(course, axisId) || !playable(axisId)) continue;
    const spec = AXES[axisId];
    const scalar =
      spec.home === 'base' ? courseBase[spec.field] : courseFields[spec.field];
    if (scalar !== undefined) {
      if (spec.home === 'base') base[spec.field] = scalar;
      else fields[spec.field] = scalar;
      continue;
    }
    const inherited = courseAxes.find(
      (axis) =>
        typeof axis === 'object' &&
        axis !== null &&
        (axis as Record<string, unknown>).axis === axisId,
    );
    if (inherited) axes.push(inherited);
  }

  if (fields.rules === undefined && doc.rules !== undefined) fields.rules = doc.rules;
  if (fields.endless === undefined && doc.endless !== undefined) fields.endless = doc.endless;
  // Never inherited: a level's own identity, and rules keyed to boundaries
  // that only exist once this level's axes are counted in.
  delete (fields as { segmentRules?: unknown }).segmentRules;
  return {
    ...fields,
    ...(rawLevel.segmentRules !== undefined ? { segmentRules: rawLevel.segmentRules } : {}),
    base,
    ...(axes.length ? { axes } : {}),
  };
}

/**
 * A course from a plain document, or a sentence saying why not.
 *
 * Unknown fields are ignored at every depth (the forward-tolerance ruling);
 * a level the reader cannot trust refuses the whole document (a course
 * silently missing a level is worse than none). Known fields with unusable
 * values are refused by name. The derived segment list is computed here,
 * once, so the editor and the player step the same walk.
 */
export function readCourse(raw: unknown): Course | { error: string } {
  if (typeof raw !== 'object' || raw === null) return { error: 'not a course document' };
  const doc = raw as Record<string, unknown>;
  const { id, name, blurb, schemaVersion, levels } = doc;
  if (typeof id !== 'string' || !id) return { error: 'a course needs an id' };
  if (typeof name !== 'string' || !name) return { error: `course "${id}" has no name` };
  if (typeof schemaVersion !== 'number') return { error: `course "${id}" has no schemaVersion` };
  if (!Array.isArray(levels) || levels.length === 0) {
    return { error: `course "${id}" has no levels` };
  }

  // Old course-level defaults, read forward into each level that lacks its
  // own — the same road every default now travels.
  const coursePinned = legacyPinned(doc.pinned);
  const courseLegacyRule = ruleFromLegacyAdvance(doc.advance);

  /*
   * The course's own defaults answer to the trichotomy as a level does: a
   * parameter is pinned, progressing, or left to whoever is below. Both at
   * once here would be resolved silently in the levels, which is the one
   * thing this reader exists not to do.
   */
  const courseBase = (doc.base ?? {}) as Record<string, unknown>;
  const courseAxes = Array.isArray(doc.axes) ? (doc.axes as unknown[]) : [];
  const courseScope: { fields: Record<string, unknown>; base: Record<string, unknown>; axes: unknown[] } =
    { fields: { ...coursePinned, ...doc }, base: courseBase, axes: courseAxes };
  for (const axisId of AXIS_IDS) {
    const spec = AXES[axisId];
    const scalar =
      spec.home === 'base' ? courseBase[spec.field] : courseScope.fields[spec.field];
    const axis = courseAxes.some(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry as Record<string, unknown>).axis === axisId,
    );
    if (scalar !== undefined && axis) {
      return {
        error: `course "${id}" both sets ${axisId} and moves it on an axis — a parameter is pinned or progresses, not both`,
      };
    }
  }

  /** The materials the levels turn out to be, for the check after them. */
  const kinds = new Set<LevelKind>();

  const read: CourseLevel[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of levels.entries()) {
    const where = `course "${id}" level ${index + 1}`;
    if (typeof entry !== 'object' || entry === null) return { error: `${where} is not a level` };
    /*
     * The course's defaults are filled in HERE, on the plain document, so
     * everything below — and everything downstream of this reader — sees a
     * level that says the whole of what it plays.
     */
    const level = resolveLevelDocument(doc, entry as Record<string, unknown>);
    if (typeof level.id !== 'string' || !level.id) return { error: `${where} has no id` };
    if (seen.has(level.id)) return { error: `${where} repeats the id "${level.id}"` };
    seen.add(level.id);
    if (typeof level.name !== 'string' || !level.name) return { error: `${where} has no name` };

    const base = level.base as Record<string, unknown> | undefined;
    if (typeof base !== 'object' || base === null) return { error: `${where} has no base` };
    const kind = base.kind as LevelKind;
    if (!KINDS.includes(kind)) {
      return { error: `${where} asks for unknown material "${String(base.kind)}"` };
    }
    kinds.add(kind);
    if (NEEDS_DIFFICULTY[kind]) {
      if (typeof base.difficultyId !== 'string' || !DIFFICULTY_IDS.has(base.difficultyId)) {
        return { error: `${where} names a difficulty the generator does not know` };
      }
    }
    if (base.drillId !== undefined && !DRILL_IDS.has(String(base.drillId))) {
      return { error: `${where} names a drill that does not exist` };
    }

    /*
     * The wrong length unit keeps its original, better sentence — it earned
     * it, and the editor quotes these verbatim.
     */
    const unit = LENGTH_UNIT_FOR[kind];
    for (const other of ['bars', 'cycles', 'themeCount'] as const) {
      if (other !== unit && base[other] !== undefined) {
        return {
          error: `${where} sets ${other}, which a ${kind} level does not measure itself in — use ${unit}`,
        };
      }
    }
    if (base[unit] !== undefined && readPositiveInteger(base[unit]) === undefined) {
      return { error: `${where} has a length that is not a whole number of ${unit}` };
    }
    if (base.fifths !== undefined && readFifthsValue(base.fifths) === undefined) {
      return { error: `${where} has a key off the circle of fifths` };
    }

    /*
     * Read-forward, before the trichotomy is judged: the old shapes become
     * the new states they always meant.
     */
    const axes: Axis[] = [];
    let bandAxis: Axis | null = null;
    let headerTempo: number | undefined;
    if (typeof level.tempo === 'object' && level.tempo !== null) {
      bandAxis = axisFromLegacyBand(level.tempo as Record<string, unknown>);
      if (!bandAxis) return { error: `${where} has no usable tempo band` };
    } else if (level.tempo !== undefined) {
      const tempo = readTempoValue(level.tempo);
      if (tempo === undefined) {
        return { error: `${where} sets tempo, which must be ${AXES.tempo.describe}` };
      }
      headerTempo = tempo;
    }
    const pinned = { ...coursePinned, ...legacyPinned(level.pinned) };

    /* The declared axes, each validated against the same table that
     * validates its header twin. */
    const declared = level.axes;
    if (declared !== undefined && !Array.isArray(declared)) {
      return { error: `${where} has axes that are not a list` };
    }
    for (const rawAxis of (declared ?? []) as unknown[]) {
      if (typeof rawAxis !== 'object' || rawAxis === null) {
        return { error: `${where} has an entry in axes that is not an axis` };
      }
      const { axis: axisId, divisions } = rawAxis as Record<string, unknown>;
      if (typeof axisId !== 'string' || !(axisId in AXES)) {
        return { error: `${where} has an axis the app does not know: "${String(axisId)}"` };
      }
      const spec = AXES[axisId as AxisId];
      if (!spec.kinds.includes(kind)) {
        return { error: `${where} has a ${axisId} axis, which a ${kind} level cannot play` };
      }
      if (axes.some((existing) => existing.axis === axisId)) {
        return { error: `${where} declares the ${axisId} axis twice` };
      }
      if (!Array.isArray(divisions) || divisions.length === 0) {
        return { error: `${where}'s ${axisId} axis has no divisions` };
      }
      const readDivisions: AxisDivision[] = [];
      let previousAt = -1;
      for (const [divisionIndex, rawDivision] of (divisions as unknown[]).entries()) {
        if (typeof rawDivision !== 'object' || rawDivision === null) {
          return { error: `${where}'s ${axisId} axis has a division that is not a division` };
        }
        const { at, value } = rawDivision as Record<string, unknown>;
        if (typeof at !== 'number' || !Number.isFinite(at) || at < 0 || at >= 1) {
          return { error: `${where}'s ${axisId} axis has a division outside the level` };
        }
        if (divisionIndex === 0 && at > AT_EPSILON) {
          return { error: `${where}'s ${axisId} axis does not begin at the start` };
        }
        if (at <= previousAt + AT_EPSILON && divisionIndex > 0) {
          return { error: `${where}'s ${axisId} axis has divisions out of order` };
        }
        previousAt = at;
        const parsed = spec.read(value);
        if (parsed === undefined) {
          return { error: `${where}'s ${axisId} axis has a division that is not ${spec.describe}` };
        }
        readDivisions.push({ at: divisionIndex === 0 ? 0 : at, value: parsed });
      }
      axes.push({ axis: axisId as AxisId, divisions: readDivisions });
    }

    /*
     * The read-forward band joins the declared axes last, so a document
     * carrying both an old band and a new tempo axis is refused as the
     * trichotomy violation it is — the band is a pinned-era shape saying
     * "tempo", not a second axis to deduplicate.
     */
    if (bandAxis) {
      if (axes.some((existing) => existing.axis === 'tempo')) {
        return {
          error: `${where} both sets tempo and moves it on an axis — a parameter is pinned or progresses, not both`,
        };
      }
      axes.unshift(bandAxis);
    }

    /*
     * The trichotomy's one law with teeth: pinned or progressing, never
     * both. Checked against the parsed axes so a read-forward band trips it
     * exactly as a declared axis does.
     */
    const scalarOf = (axisId: AxisId): unknown => {
      const spec = AXES[axisId];
      if (axisId === 'tempo') return headerTempo;
      if (spec.home === 'base') return base[spec.field];
      if (axisId === 'metronomeEnabled' || axisId === 'conductorEnabled') {
        return level[spec.field] ?? pinned[axisId];
      }
      return level[spec.field];
    };
    for (const axis of axes) {
      if (scalarOf(axis.axis) !== undefined) {
        return {
          error: `${where} both sets ${axis.axis} and moves it on an axis — a parameter is pinned or progresses, not both`,
        };
      }
    }

    /* Header scalars validated through the same table as divisions. */
    const readBase: LevelBase = {
      kind,
      difficultyId: String(base.difficultyId ?? ''),
      ...(base.drillId !== undefined ? { drillId: base.drillId as DrillId } : {}),
      ...(base.fifths !== undefined ? { fifths: base.fifths as number } : {}),
      ...(base[unit] !== undefined ? { [unit]: base[unit] as number } : {}),
    };
    for (const axisId of ['range', 'span', 'register', 'metre', 'intervals'] as const) {
      const spec = AXES[axisId];
      const value = base[spec.field];
      if (value === undefined) continue;
      if (!spec.kinds.includes(kind)) {
        return { error: `${where} sets ${String(spec.field)}, which a ${kind} level cannot play` };
      }
      const parsed = spec.read(value);
      if (parsed === undefined) {
        return { error: `${where} sets ${String(spec.field)}, which must be ${spec.describe}` };
      }
      (readBase as unknown as Record<string, unknown>)[spec.field] = parsed;
    }
    const supportScalars: Record<string, unknown> = {};
    for (const axisId of [
      'metronomeEnabled',
      'conductorEnabled',
      'fingerings',
      'playbackMode',
      'readingMode',
    ] as const) {
      const spec = AXES[axisId];
      const value = scalarOf(axisId);
      if (value === undefined) continue;
      const parsed = spec.read(value);
      if (parsed === undefined) {
        return { error: `${where} sets ${axisId}, which must be ${spec.describe}` };
      }
      supportScalars[axisId] = parsed;
    }

    /* The rules: the level default, then the sparse per-segment overrides —
     * each refused rather than dropped, because an ignored rule silently
     * gates a segment at the default. Legacy `advance` keeps its leniency. */
    let levelRule: SegmentRule | undefined;
    if (level.rules !== undefined) {
      const rule = readRule(level.rules);
      if (!rule) return { error: `${where} has a progression rule that is not usable` };
      levelRule = rule;
    } else {
      levelRule = ruleFromLegacyAdvance(level.advance) ?? courseLegacyRule;
    }

    const overrides: ({ at: number } & SegmentRule)[] = [];
    if (level.segmentRules !== undefined) {
      if (!Array.isArray(level.segmentRules)) {
        return { error: `${where} has segment rules that are not a list` };
      }
      for (const rawOverride of level.segmentRules as unknown[]) {
        if (typeof rawOverride !== 'object' || rawOverride === null) {
          return { error: `${where} has a segment rule that is not usable` };
        }
        const { at } = rawOverride as Record<string, unknown>;
        if (typeof at !== 'number' || !Number.isFinite(at)) {
          return { error: `${where} has a segment rule that names no boundary` };
        }
        const rule = readRule(rawOverride);
        if (!rule) return { error: `${where} has a segment rule that is not usable` };
        overrides.push({ at, ...rule });
      }
    }

    const segments = segmentsOf(axes, levelRule ?? DEFAULT_RULE, overrides);
    for (const override of overrides) {
      if (!segments.some((segment) => Math.abs(segment.at - override.at) < AT_EPSILON)) {
        return {
          error: `${where} has a segment rule at ${Math.round(override.at * 100)}%, where no segment begins`,
        };
      }
    }

    read.push({
      id: level.id,
      name: level.name,
      ...(typeof level.note === 'string' && level.note ? { note: level.note } : {}),
      base: readBase,
      ...(headerTempo !== undefined ? { tempo: headerTempo } : {}),
      ...supportScalars,
      ...(axes.length ? { axes } : {}),
      ...(levelRule ? { rules: levelRule } : {}),
      ...(overrides.length ? { segmentRules: overrides } : {}),
      ...(readMastery(level.mastery) ? { mastery: readMastery(level.mastery)! } : {}),
      ...(level.endless === true ? { endless: true } : {}),
      segments,
    });
  }

  /*
   * A default every level happens to override is fine — that is what a
   * default is for. A default no level's material *could* play is a
   * mistake, and silence about it is the failure this reader exists to
   * prevent.
   */
  for (const axisId of AXIS_IDS) {
    if (!states(courseScope, axisId)) continue;
    if (![...kinds].some((kind) => AXIS_MATERIALS[axisId].includes(kind))) {
      return { error: `course "${id}" defaults ${axisId}, which no level in it can play` };
    }
  }

  return {
    id,
    name,
    blurb: typeof blurb === 'string' ? blurb : '',
    schemaVersion,
    levels: read,
    ...(readMastery(doc.mastery) ? { mastery: readMastery(doc.mastery)! } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* The registry                                                        */
/* ------------------------------------------------------------------ */

/**
 * The bundled courses, each put through the reader a user's file will one day
 * face — so the bundled format and the read format cannot drift apart. A
 * bundled document that fails to read is a build fault (there is a test), but
 * at runtime it is dropped with a complaint rather than crashing a practice
 * app over a curriculum.
 */
/** The documents the bundled courses are read from, for export round-trips. */
export const BUNDLED_DOCUMENTS: readonly unknown[] = [COMMON_KEYS_DOCUMENT];

export const COURSES: readonly Course[] = BUNDLED_DOCUMENTS.flatMap((doc) => {
  const course = readCourse(doc);
  if ('error' in course) {
    console.error(`bundled course refused: ${course.error}`);
    return [];
  }
  return [course];
});

/**
 * Courses the player imported, read from their stored documents each time.
 *
 * A function rather than a constant because the store changes while the app
 * runs — an import adds one, a delete removes one — and a snapshot taken at
 * module load would show yesterday's list. Reading is cheap at this scale,
 * and every document goes through `readCourse`, so a stored file a newer
 * version wrote degrades exactly as a fresh import would. Wired by
 * `storage/course.ts`, which owns the keys; a build with no store (tests
 * without the hook) simply has no user courses.
 */
let userDocuments: (() => unknown[]) | null = null;

export function provideUserDocuments(read: () => unknown[]): void {
  userDocuments = read;
}

export function allCourses(): readonly Course[] {
  const user = (userDocuments?.() ?? []).flatMap((doc) => {
    const course = readCourse(doc);
    return 'error' in course ? [] : [course];
  });
  // Bundled first, and a user course wearing a bundled id loses: the bundled
  // course is the one support conversations can reason about.
  const ids = new Set(COURSES.map((course) => course.id));
  return [...COURSES, ...user.filter((course) => !ids.has(course.id))];
}

/**
 * A course by id, falling back to the first bundled one. Never throws: a
 * stored id from a course that has since been removed must leave the player
 * somewhere they can practise rather than on a screen that cannot render.
 */
export function courseById(id: string): Course {
  return allCourses().find((course) => course.id === id) ?? COURSES[0];
}

export function levelOf(position: Position): CourseLevel {
  const course = courseById(position.courseId);
  // The FIRST level is the safe direction to be wrong in — an authored course
  // starts at its start, and its easiest material is wherever the author put
  // the beginning.
  return course.levels.find((level) => level.id === position.levelId) ?? course.levels[0];
}

function levelIndex(course: Course, levelId: string): number {
  const index = course.levels.findIndex((level) => level.id === levelId);
  return index === -1 ? 0 : index;
}

function levelIn(course: Course, levelId: string): CourseLevel {
  return course.levels.find((level) => level.id === levelId) ?? course.levels[0];
}

function clampSegment(level: CourseLevel, segment: number): number {
  const index = Math.round(segment);
  return Math.min(level.segments.length - 1, Math.max(0, index));
}

/**
 * A trustworthy position from possibly-stale parts: the level looked up, the
 * segment clamped onto its timeline. What every stored position goes through
 * on the way in, so nothing can stand on a step the course cannot step off.
 *
 * A position stored before the timeline carried a tempo instead of a
 * segment; passed here, it lands on the last segment whose tempo is at or
 * below the stored figure — exact for any read-forward band (those axes are
 * monotone), and the safe *earlier* side of the join for a re-authored one.
 * No tempo axis at all means the stored figure says nothing: the start.
 */
export function positionFrom(
  courseId: string,
  levelId: string,
  at: { segment?: number; tempo?: number },
  course = courseById(courseId),
): Position {
  const level = course.levels[levelIndex(course, levelId)];
  if (typeof at.segment === 'number' && Number.isFinite(at.segment)) {
    return { courseId: course.id, levelId: level.id, segment: clampSegment(level, at.segment) };
  }
  if (typeof at.tempo === 'number' && Number.isFinite(at.tempo)) {
    let segment = 0;
    for (const [index, candidate] of level.segments.entries()) {
      const tempo = candidate.values.tempo;
      if (tempo !== undefined && tempo <= at.tempo + AT_EPSILON) segment = index;
    }
    return { courseId: course.id, levelId: level.id, segment };
  }
  return { courseId: course.id, levelId: level.id, segment: 0 };
}

/**
 * Where a course begins: its first level's first segment. The ladder used to
 * open "where the player already practises", inferred from their settings —
 * that reasoning died with authored courses, because the author's order is
 * the progression and the start of a curriculum is the start. The forward
 * button is how an experienced player skips ahead, and it is theirs.
 */
export function startOf(course: Course): Position {
  return { courseId: course.id, levelId: course.levels[0].id, segment: 0 };
}

export function samePosition(a: Position, b: Position): boolean {
  return a.courseId === b.courseId && a.levelId === b.levelId && a.segment === b.segment;
}

/* ------------------------------------------------------------------ */
/* Stepping — the player's buttons                                     */
/* ------------------------------------------------------------------ */

/** The next segment up, or null at the top of the course. */
export function stepForward(position: Position): Position | null {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];
  const segment = clampSegment(level, position.segment);

  if (segment < level.segments.length - 1) {
    return { courseId: course.id, levelId: level.id, segment: segment + 1 };
  }
  // The level's last segment is cleared: on to the next level, at its start.
  const above = course.levels[index + 1];
  return above ? { courseId: course.id, levelId: above.id, segment: 0 } : null;
}

/** The next segment down, or null at the bottom. */
export function stepBack(position: Position): Position | null {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];
  const segment = clampSegment(level, position.segment);

  if (segment > 0) {
    return { courseId: course.id, levelId: level.id, segment: segment - 1 };
  }
  const below = course.levels[index - 1];
  return below
    ? { courseId: course.id, levelId: below.id, segment: below.segments.length - 1 }
    : null;
}

/**
 * The position as the player reads it: level.segment, one-based on both
 * sides — the third level's second segment is "3.2". The ratified stepping
 * ruling asked for exactly this decimal, and it is display only: nothing
 * parses it back.
 */
export function positionLabel(position: Position): string {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];
  return `${index + 1}.${clampSegment(level, position.segment) + 1}`;
}

/* ------------------------------------------------------------------ */
/* What a position prescribes                                          */
/* ------------------------------------------------------------------ */

/**
 * The progression rule in force at a position: the segment's own — an
 * override where the author placed one, the level default everywhere else.
 * Evidence toward it is per-segment by construction; there is no carry
 * switch, because the timeline made the thing it approximated.
 */
export function ruleFor(position: Position, course = courseById(position.courseId)): SegmentRule {
  const level = levelIn(course, position.levelId);
  return level.segments[clampSegment(level, position.segment)].rule;
}

/**
 * The run a position prescribes, in the plain settings words that cross the
 * seam into `App` (structurally `CourseRun` — see `ui/course-run.ts`, which
 * deliberately imports nothing from here). The level's base, its header
 * scalars, and the segment's values — a pure union, because the trichotomy
 * refused any document in which they could disagree.
 *
 * The one function both the opening run and every step go through, ruled so
 * after the pinned wiring was found half-dead (a pin only reached the gate
 * on a step, never on Start, because Start built the run by hand).
 */
export function runFor(position: Position, course = courseById(position.courseId)) {
  const level = levelIn(course, position.levelId);
  const segment = level.segments[clampSegment(level, position.segment)];
  return {
    // `base` brings the material and its length; `endless` lives on the
    // level because it shapes the run rather than the music.
    ...level.base,
    ...(level.endless ? { endless: true } : {}),
    ...(level.tempo !== undefined ? { tempo: level.tempo } : {}),
    ...(level.metronomeEnabled !== undefined ? { metronomeEnabled: level.metronomeEnabled } : {}),
    ...(level.conductorEnabled !== undefined ? { conductorEnabled: level.conductorEnabled } : {}),
    ...(level.fingerings !== undefined ? { fingerings: level.fingerings } : {}),
    ...(level.playbackMode !== undefined ? { playbackMode: level.playbackMode } : {}),
    ...(level.readingMode !== undefined ? { readingMode: level.readingMode } : {}),
    ...segment.values,
    levelId: level.id,
  };
}

/* ------------------------------------------------------------------ */
/* The suggestion — the machine's opinion, moving nothing              */
/* ------------------------------------------------------------------ */

export type Suggestion = 'up' | 'down' | 'stay';

/**
 * The bar in force at a level: its own, else its course's, else the default.
 * Resolved rather than stored, so changing a course's bar moves every level
 * that had not overridden it.
 */
export function masteryOf(level: CourseLevel, course: Course): Mastery {
  return level.mastery ?? course.mastery ?? DEFAULT_MASTERY;
}

export function masteryFor(position: Position): Mastery {
  return masteryOf(levelOf(position), courseById(position.courseId));
}

/**
 * What the last few runs at one step say — and *say* is the whole of it.
 *
 * Reads only the most recent `runsToJudge`, and answers `stay` until there
 * are that many: a verdict on one run is a verdict on an evening's mood, and
 * the ratified rule is that the bar degrades honestly when there is no data —
 * two runs in, it shows nothing rather than a guess.
 */
export function suggestionOn(recent: readonly number[], mastery: Mastery): Suggestion {
  if (recent.length < mastery.runsToJudge) return 'stay';
  const judged = recent.slice(-mastery.runsToJudge);
  if (judged.every((accuracy) => accuracy >= mastery.promoteAbove)) return 'up';
  if (judged.every((accuracy) => accuracy < mastery.demoteBelow)) return 'down';
  return 'stay';
}

export interface Progress {
  position: Position;
  /**
   * What the player is aiming at: a position in the same course. A marker,
   * not a ceiling — reaching it is worth saying; it stops nothing.
   */
  goal?: Position;
  /**
   * The position the goal was set from, which is what a progress bar measures
   * out of. Without it, a goal two steps above a strong player would read as
   * nearly done before they had played anything.
   */
  goalSetAt?: Position;
  /**
   * Accuracies at the current step, oldest first. Cleared whenever the player
   * steps, because evidence is about a step and carrying it across would
   * judge new work by how the old went.
   */
  recent: number[];
}

/**
 * One run's result, folded into the evidence — and the machine's suggestion,
 * which is all it is. **This used to move the player** (`afterRun`, in the
 * ladder this file replaced); the ratification of 2026-08-26 ended that: the
 * suggestion bar shows this verdict beside forward and back buttons that are
 * the player's, and position changes only through them.
 */
export function noteRun(
  progress: Progress,
  accuracy: number,
): { progress: Progress; suggestion: Suggestion } {
  const mastery = masteryFor(progress.position);
  const recent = [...progress.recent, accuracy].slice(-mastery.runsToJudge);
  return {
    progress: { ...progress, recent },
    suggestion: suggestionOn(recent, mastery),
  };
}

/**
 * The player pressed forward or back. Evidence clears with the move — it was
 * about the step being left — and pressing against an end of the course
 * changes nothing rather than erasing what was learned where they stand.
 */
export function step(progress: Progress, direction: 'forward' | 'back'): Progress {
  const moved =
    direction === 'forward' ? stepForward(progress.position) : stepBack(progress.position);
  if (!moved) return progress;
  return { ...progress, position: moved, recent: [] };
}

/* ------------------------------------------------------------------ */
/* Distance and goals                                                  */
/* ------------------------------------------------------------------ */

/** How many segments a level holds. Never zero: no axes is one segment. */
export function stepsInLevel(level: CourseLevel): number {
  return level.segments.length;
}

/** Every step of a course, end to end. */
export function courseLength(course: Course): number {
  return course.levels.reduce((total, level) => total + stepsInLevel(level), 0);
}

/**
 * A position's place in the whole course, counting from 0 at the start.
 * Flattening is what makes a goal answerable: two positions differing on two
 * axes cannot be subtracted, but their places in the one sequence the buttons
 * actually walk can be.
 */
export function positionOrdinal(position: Position): number {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];
  const below = course.levels
    .slice(0, index)
    .reduce((total, earlier) => total + stepsInLevel(earlier), 0);
  return below + clampSegment(level, position.segment);
}

export interface Distance {
  /** Steps from here to there: positive while the goal is still above. */
  steps: number;
  /** Level changes in between, signed the same way. */
  levels: number;
  /** Whether the goal is met — reached *or passed*. */
  reached: boolean;
}

/**
 * How far from one position to another, or null when they are not comparable.
 * Null for two different courses, deliberately: inventing a number would be
 * worse than admitting there is none, and a screen given null should say the
 * goal belongs to another course rather than draw an empty bar.
 */
export function distanceTo(from: Position, to: Position): Distance | null {
  if (from.courseId !== to.courseId) return null;
  const course = courseById(from.courseId);
  const steps = positionOrdinal(to) - positionOrdinal(from);
  return {
    steps,
    levels: levelIndex(course, to.levelId) - levelIndex(course, from.levelId),
    reached: steps <= 0,
  };
}

/**
 * How far along the way to a goal, from 0 to 1 — measured from where the
 * player *started aiming*, not from the bottom of the course, which would
 * show a strong player as nearly finished the moment they set a goal.
 */
export function progressToward(from: Position, at: Position, goal: Position): number | null {
  const whole = distanceTo(from, goal);
  const left = distanceTo(at, goal);
  if (!whole || !left) return null;
  if (whole.steps <= 0) return 1;
  return Math.min(1, Math.max(0, (whole.steps - left.steps) / whole.steps));
}
