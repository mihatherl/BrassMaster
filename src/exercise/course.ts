/**
 * A course: an authored, ordered list of levels, and what a player does there.
 *
 * The ruling this file answers to is `docs/course-plan.md`, ratified
 * 2026-08-26. Three parts: the **author** owns what is practised and in what
 * order; the **machine** varies the work within a level and *suggests* when
 * the player is ready for more; and the **player** decides — position moves
 * only when they press forward or back. Nothing in this file moves anyone.
 *
 * This grew out of `ladder.ts` (deleted the same day), and its two founding
 * rules survive, re-aimed one level down exactly as the plan says:
 *
 * - **Hold the parameters and vary the material.** Every run at a step is
 *   music the player has not seen, so it is genuinely sight-reading while the
 *   difficulty stays put.
 * - **Exactly one thing changes** between steps — for now the tempo, the one
 *   axis this phase ships. If one thing changed and accuracy dropped, the
 *   cause is known; change three and the result is uninterpretable.
 *
 * What did NOT survive, deliberately: the ladder's promotion machinery.
 * `afterRun` used to move the player up and down on the evidence; the
 * ratification replaced it with a **suggestion bar** beside buttons that are
 * the player's in both directions. "We're leaving it up to the player to
 * decide on where they want to be." A player who steps back has decided to,
 * which is the system working, not oscillation to be prevented.
 *
 * ## Why courses are documents
 *
 * A course is read from a plain document by `readCourse`, and the bundled
 * course goes through the same reader a user's file one day will — so the
 * format cannot quietly grow a field the reader does not honour. The reading
 * is forward-tolerant by ratified rule: unknown fields are ignored, never
 * refused, because a course written by a newer version should degrade rather
 * than die. What *is* refused, loudly, is a document whose levels cannot be
 * trusted — a course silently missing its third level is worse than no
 * course.
 *
 * ## Why a level's key is optional
 *
 * Ruled 2026-08-26, forced by `rhythm-plan.md`: rhythm drills are a material
 * with no key, no register and no pitch range, and a shared document format
 * cannot be retrofitted once files exist. So `LevelBase` is a discriminated
 * shape and nothing downstream may assume `fifths` is present.
 */

import { DIFFICULTIES } from './difficulty';
import { DRILLS, type DrillId, type PatternRegister } from './generate';
import type { ExerciseKind } from './types';
import { COMMON_KEYS_DOCUMENT } from './courses/common-keys';

/** The tempo axis a level is practised across, in conducted beats per minute. */
export interface TempoBand {
  floor: number;
  ceiling: number;
  /**
   * The smallest change a player reliably notices without it being a wall:
   * about 8% at the bottom of the range and 4% at the top. Smaller makes a
   * step meaningless; larger makes it a cliff.
   */
  step: number;
}

/**
 * What kind of run a level asks for. `imported` is deliberately absent for
 * now — course-carried MusicXML is course-plan phase 4, not this one.
 */
export type LevelKind = Exclude<ExerciseKind, 'imported'>;

/**
 * The run a level prescribes — the author's half of the bargain.
 *
 * These are settings overrides, named rather than a free-form
 * `Partial<Settings>` so the reader can validate every field it honours and
 * ignore every field it does not. `fifths` optional by the ratified ruling
 * above; absent means the player's own key stands.
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
}

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

/**
 * The author's progression rule, revised into the play screen 2026-08-27:
 * after `afterBars` bars played at a step, with accuracy at or above
 * `accuracyAbove` over the last `windowBars` of them, the music pauses and a
 * countdown offers the next step — beside a Stay here button, because the
 * machine announces and the player disposes. The window is the same idea the
 * results screen's headline already computes.
 */
export interface Advance {
  afterBars: number;
  windowBars: number;
  accuracyAbove: number;
  /**
   * Whether the evidence survives a step (2026-08-28, from the player finding
   * the bug this decides: after a step the rule kept reading the passage's
   * whole history, so his pre-step clean bars offered him a new step every
   * two bars). **Absent means false — the evidence resets at every step** and
   * the rule starts counting afresh, which is right wherever a step changes
   * what is being practised. An author whose steps are trivial — a nudge of
   * tempo — may set it true and let a player in form ride the offers up.
   */
  carryEvidence?: boolean;
}

/**
 * Provisional like the mastery bar, and under the same law: measured, not
 * argued about, and not tuned before a real course has been played through.
 */
export const DEFAULT_ADVANCE: Advance = {
  afterBars: 8,
  windowBars: 4,
  accuracyAbove: 0.85,
};

/**
 * Ready-gate options the author pins for a run, shown disabled at the gate
 * rather than hidden — a player who cannot find the switch thinks the app is
 * broken; one who sees it locked knows the course chose. The two booleans are
 * the first increment of the ratified "all of the gate's options, configurably"
 * — the reader ignores pins it does not yet honour, so a document written for
 * a later version degrades rather than dies.
 */
export interface Pinned {
  metronomeEnabled?: boolean;
  conductorEnabled?: boolean;
}

export interface CourseLevel {
  id: string;
  /** What the player is told they are on: "F major, the shape". */
  name: string;
  /** The author's words: why this level, what to watch for. */
  note?: string;
  base: LevelBase;
  tempo: TempoBand;
  /** Overrides the course's bar for this level alone. */
  mastery?: Mastery;
  /** Overrides the course's progression rule for this level alone. */
  advance?: Advance;
  /** Overrides the course's pins for this level alone. */
  pinned?: Pinned;
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
  /** The progression rule for every level that does not set its own. */
  advance?: Advance;
  /** The pins for every level that does not set its own. */
  pinned?: Pinned;
}

/**
 * Where a player stands: a course, a level, and a tempo on that level's band.
 * The whole of what the forward and back buttons move.
 */
export interface Position {
  courseId: string;
  levelId: string;
  /** Beats per minute — the conducted beat, as everywhere else. */
  tempo: number;
}

/* ------------------------------------------------------------------ */
/* Reading a document                                                  */
/* ------------------------------------------------------------------ */

const KINDS: readonly LevelKind[] = ['drills', 'phrases', 'themes'];
const DIFFICULTY_IDS = new Set(DIFFICULTIES.map((d) => d.id));
const DRILL_IDS = new Set<string>(DRILLS.map((d) => d.id));

function readAdvance(value: unknown): Advance | undefined {
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
  const { carryEvidence } = value as Record<string, unknown>;
  return {
    afterBars: Math.round(afterBars),
    windowBars: Math.round(windowBars),
    accuracyAbove,
    ...(typeof carryEvidence === 'boolean' ? { carryEvidence } : {}),
  };
}

function readPinned(value: unknown): Pinned | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { metronomeEnabled, conductorEnabled } = value as Record<string, unknown>;
  const pinned: Pinned = {
    ...(typeof metronomeEnabled === 'boolean' ? { metronomeEnabled } : {}),
    ...(typeof conductorEnabled === 'boolean' ? { conductorEnabled } : {}),
  };
  return Object.keys(pinned).length ? pinned : undefined;
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
 * A course from a plain document, or a sentence saying why not.
 *
 * Unknown fields are ignored at every depth (the forward-tolerance ruling);
 * a level the reader cannot trust refuses the whole document (a course
 * silently missing a level is worse than none). The one normalisation is the
 * tempo ceiling, snapped down onto the step grid — an authoring slip, not a
 * meaning; every position calculation divides by the step and a misaligned
 * ceiling would poison the arithmetic silently.
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

  const read: CourseLevel[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of levels.entries()) {
    const where = `course "${id}" level ${index + 1}`;
    if (typeof entry !== 'object' || entry === null) return { error: `${where} is not a level` };
    const level = entry as Record<string, unknown>;
    if (typeof level.id !== 'string' || !level.id) return { error: `${where} has no id` };
    if (seen.has(level.id)) return { error: `${where} repeats the id "${level.id}"` };
    seen.add(level.id);
    if (typeof level.name !== 'string' || !level.name) return { error: `${where} has no name` };

    const base = level.base as Record<string, unknown> | undefined;
    if (typeof base !== 'object' || base === null) return { error: `${where} has no base` };
    if (!KINDS.includes(base.kind as LevelKind)) {
      return { error: `${where} asks for unknown material "${String(base.kind)}"` };
    }
    if (typeof base.difficultyId !== 'string' || !DIFFICULTY_IDS.has(base.difficultyId)) {
      return { error: `${where} names a difficulty the generator does not know` };
    }
    if (base.drillId !== undefined && !DRILL_IDS.has(String(base.drillId))) {
      return { error: `${where} names a drill that does not exist` };
    }
    if (
      base.fifths !== undefined &&
      (typeof base.fifths !== 'number' || !Number.isInteger(base.fifths) || Math.abs(base.fifths) > 7)
    ) {
      return { error: `${where} has a key off the circle of fifths` };
    }

    const tempo = level.tempo as Record<string, unknown> | undefined;
    if (
      typeof tempo !== 'object' ||
      tempo === null ||
      typeof tempo.floor !== 'number' ||
      typeof tempo.ceiling !== 'number' ||
      typeof tempo.step !== 'number' ||
      tempo.step <= 0 ||
      tempo.ceiling < tempo.floor
    ) {
      return { error: `${where} has no usable tempo band` };
    }
    const steps = Math.floor((tempo.ceiling - tempo.floor) / tempo.step);
    const band: TempoBand = {
      floor: tempo.floor,
      ceiling: tempo.floor + steps * tempo.step,
      step: tempo.step,
    };

    read.push({
      id: level.id,
      name: level.name,
      ...(typeof level.note === 'string' && level.note ? { note: level.note } : {}),
      base: {
        kind: base.kind as LevelKind,
        difficultyId: base.difficultyId,
        ...(base.drillId !== undefined ? { drillId: base.drillId as DrillId } : {}),
        ...(base.fifths !== undefined ? { fifths: base.fifths as number } : {}),
        ...(base.register !== undefined &&
        ['low', 'middle', 'high'].includes(String(base.register))
          ? { register: base.register as PatternRegister }
          : {}),
      },
      tempo: band,
      ...(readMastery(level.mastery) ? { mastery: readMastery(level.mastery)! } : {}),
      ...(readAdvance(level.advance) ? { advance: readAdvance(level.advance)! } : {}),
      ...(readPinned(level.pinned) ? { pinned: readPinned(level.pinned)! } : {}),
    });
  }

  return {
    id,
    name,
    blurb: typeof blurb === 'string' ? blurb : '',
    schemaVersion,
    levels: read,
    ...(readMastery(doc.mastery) ? { mastery: readMastery(doc.mastery)! } : {}),
    ...(readAdvance(doc.advance) ? { advance: readAdvance(doc.advance)! } : {}),
    ...(readPinned(doc.pinned) ? { pinned: readPinned(doc.pinned)! } : {}),
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
export const COURSES: readonly Course[] = [COMMON_KEYS_DOCUMENT].flatMap((doc) => {
  const course = readCourse(doc);
  if ('error' in course) {
    console.error(`bundled course refused: ${course.error}`);
    return [];
  }
  return [course];
});

/**
 * A course by id, falling back to the first. Never throws: a stored id from a
 * course that has since been removed must leave the player somewhere they can
 * practise rather than on a screen that cannot render.
 */
export function courseById(id: string): Course {
  return COURSES.find((course) => course.id === id) ?? COURSES[0];
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

function snap(tempo: number, band: TempoBand): number {
  const steps = Math.round((tempo - band.floor) / band.step);
  const snapped = band.floor + steps * band.step;
  return Math.min(band.ceiling, Math.max(band.floor, snapped));
}

/**
 * A trustworthy position from possibly-stale parts: the level looked up, the
 * tempo snapped onto its band. What every stored position goes through on the
 * way in, so nothing can stand on a step the course cannot step off.
 */
export function positionFrom(courseId: string, levelId: string, tempo: number): Position {
  const course = courseById(courseId);
  const level = course.levels[levelIndex(course, levelId)];
  return { courseId: course.id, levelId: level.id, tempo: snap(tempo, level.tempo) };
}

/**
 * Where a course begins: its first level's floor. The ladder used to open
 * "where the player already practises", inferred from their settings — that
 * reasoning died with authored courses, because the author's order is the
 * progression and the start of a curriculum is the start. The forward button
 * is how an experienced player skips ahead, and it is theirs.
 */
export function startOf(course: Course): Position {
  const first = course.levels[0];
  return { courseId: course.id, levelId: first.id, tempo: first.tempo.floor };
}

export function samePosition(a: Position, b: Position): boolean {
  return a.courseId === b.courseId && a.levelId === b.levelId && a.tempo === b.tempo;
}

/* ------------------------------------------------------------------ */
/* Stepping — the player's buttons                                     */
/* ------------------------------------------------------------------ */

/** The next step up, or null at the top of the course. */
export function stepForward(position: Position): Position | null {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];

  if (position.tempo < level.tempo.ceiling) {
    return { ...position, levelId: level.id, tempo: snap(position.tempo + level.tempo.step, level.tempo) };
  }
  // The tempo ceiling is cleared: harder music, and back down to a speed that
  // gives the player room to read it.
  const above = course.levels[index + 1];
  return above ? { courseId: course.id, levelId: above.id, tempo: above.tempo.floor } : null;
}

/** The next step down, or null at the bottom. */
export function stepBack(position: Position): Position | null {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];

  if (position.tempo > level.tempo.floor) {
    return { ...position, levelId: level.id, tempo: snap(position.tempo - level.tempo.step, level.tempo) };
  }
  const below = course.levels[index - 1];
  return below ? { courseId: course.id, levelId: below.id, tempo: below.tempo.ceiling } : null;
}

/**
 * The position as the player reads it: level.step, one-based on both sides —
 * the third level's second tempo step is "3.2". The ratified stepping ruling
 * asked for exactly this decimal, and it is display only: nothing parses it
 * back.
 */
export function positionLabel(position: Position): string {
  const course = courseById(position.courseId);
  const index = levelIndex(course, position.levelId);
  const level = course.levels[index];
  const step = Math.round((snap(position.tempo, level.tempo) - level.tempo.floor) / level.tempo.step);
  return `${index + 1}.${step + 1}`;
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

/*
 * Each resolver takes the course as an optional second argument — the lookup
 * half kept separate from the rule, as the ladder's masteryOf/masteryFor
 * split was, so the rules can be tested against courses that are not in the
 * registry.
 */

function levelIn(course: Course, levelId: string): CourseLevel {
  return course.levels.find((level) => level.id === levelId) ?? course.levels[0];
}

/** The progression rule in force at a position, resolved like the bar is. */
export function advanceFor(position: Position, course = courseById(position.courseId)): Advance {
  return levelIn(course, position.levelId).advance ?? course.advance ?? DEFAULT_ADVANCE;
}

/** The pins in force at a position: the level's, else the course's, else none. */
export function pinnedFor(position: Position, course = courseById(position.courseId)): Pinned {
  return levelIn(course, position.levelId).pinned ?? course.pinned ?? {};
}

/**
 * The run a position prescribes, in the plain settings words that cross the
 * seam into `App` (structurally `CourseRun` — see `ui/course-run.ts`, which
 * deliberately imports nothing from here). The level's base, the position's
 * tempo, and the pins resolved.
 */
export function prescribedRun(position: Position, course = courseById(position.courseId)) {
  const level = levelIn(course, position.levelId);
  const band = level.tempo;
  const steps = Math.round((position.tempo - band.floor) / band.step);
  const tempo = Math.min(band.ceiling, Math.max(band.floor, band.floor + steps * band.step));
  return {
    ...level.base,
    tempo,
    levelId: level.id,
    ...pinnedFor(position, course),
  };
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

/**
 * How many steps a level holds, counting both ends. The reader snapped the
 * ceiling onto the grid, so this divides exactly.
 */
export function stepsInLevel(level: CourseLevel): number {
  const { floor, ceiling, step: size } = level.tempo;
  return Math.round((ceiling - floor) / size) + 1;
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
  return below + Math.round((snap(position.tempo, level.tempo) - level.tempo.floor) / level.tempo.step);
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
