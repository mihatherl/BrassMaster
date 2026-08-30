/**
 * The seam between the course and `App`: the run a level prescribes, said in
 * plain settings words.
 *
 * `App` is in both builds and may import nothing that names a course — not
 * the store (the bundle check's fingerprint) and not the rules. So this type
 * lives in its own file with no course imports: `PracticeScreen` builds one
 * from a level's base, and `App` spreads it over the player's settings. The
 * fields are exactly the overrides a level may set (`LevelBase` plus the
 * tempo the position holds), and `levelId` rides along so the run is filed
 * against the level it came from.
 */

import type { ExerciseKind } from '../exercise/types';
import { drillById, type DrillId, type PatternRegister } from '../exercise/generate';
import type { IntervalPool } from '../exercise/difficulty';
import type { FingeringMode } from '../exercise/hints';
import type { PlaybackMode } from '../engine/session';
import type { ReadingMode } from '../render/surface';
import type { Settings } from '../storage/settings';

export interface CourseRun {
  kind: Exclude<ExerciseKind, 'imported'>;
  /**
   * Absent where the material needs none (2026-08-30): a themes level names
   * its tunes, and a written tune carries its own difficulty. `App` then
   * leaves the player's own setting alone, exactly as it does for a tempo
   * the level did not pin — a course that says nothing about a parameter
   * has always meant the player's answer stands.
   */
  difficultyId?: string;
  drillId?: DrillId;
  fifths?: number;
  register?: PatternRegister;
  /** How long the run is, in the material's own unit; absent means the default. */
  bars?: number;
  cycles?: number;
  /**
   * The tune this segment plays, and the key it is played in (2026-08-30).
   *
   * A themes level names its tunes on an axis, one per segment, so a run
   * carries exactly one — the length of the run is that tune, and stepping
   * forward is what brings the next. `themeCount` is gone with the random
   * draw it served.
   */
  themes?: { id: string; fifths: number };
  /** Whether the music carries on past that length. Absent means no. */
  endless?: boolean;
  /**
   * The course's tempo — pinned by the level or set by its segment. Absent
   * (2026-08-29, the axes trichotomy) means the course said nothing and the
   * player's own dial is live at the gate, exactly as their key is when the
   * level names none.
   */
  tempo?: number;
  levelId: string;
  /** Written compass and interval pool for sight-reading, where the course narrows them. */
  range?: { low: number; high: number };
  intervals?: IntervalPool;
  /** How far above the tonic a drill reaches, overriding the difficulty's. */
  spanSemitones?: number;
  /** Written time signature, where the course names one. */
  metre?: readonly [number, number];
  /**
   * Options the course pins for this run (2026-08-27; the full set
   * 2026-08-29). Present means the author chose — in the header or on an
   * axis; absent leaves the player's own setting alone. `App` spreads them
   * over the settings like the rest, and the gate shows them disabled.
   */
  metronomeEnabled?: boolean;
  conductorEnabled?: boolean;
  fingerings?: FingeringMode;
  playbackMode?: PlaybackMode;
  readingMode?: ReadingMode;
}

/**
 * The key a course run is in: the level's, or the player's answer to a level
 * that named none, or their free-play key the first time they are asked.
 *
 * This chain *is* "the player's own key", and it is written once because two
 * things must agree about it — the settings the music is generated from, and
 * the name the gate puts on screen. A gate that named a different key from
 * the one the music was written in would be worse than the silence it
 * replaced, which is what was there until 2026-08-29.
 *
 * `courseFifths` is kept apart from `keySet` deliberately; see its note in
 * `storage/settings.ts`. Free play's set is a tour, a course level is one key.
 */
export function courseKeyOf(run: CourseRun, settings: Settings): number {
  /*
   * A tune names the key it is played in, and it outranks everything: the
   * step chose a key the tune actually fits, which is a stronger statement
   * than a player's remembered preference. `readCourse` refuses a `fifths`
   * beside a tune list, so these two can never both be set.
   */
  return run.themes?.fifths ?? run.fifths ?? settings.courseFifths ?? settings.fifths;
}

/**
 * Whether this run's keys should be named as minors.
 *
 * From the run's own drill, never from the player's settings: the app stores
 * a *signature*, so a level playing the harmonic minor must read "D minor"
 * over the very number a major level called "F major". Only drills have a
 * mode at all — a phrase or a theme is written in whatever it is written in.
 *
 * This is also why a remembered key needs no translation when the player
 * moves from a major level to a minor one (ruled 2026-08-29, over carrying
 * the tonic): the number does not change, only this name does.
 */
export function isMinorRun(run: CourseRun): boolean {
  if (run.kind !== 'drills') return false;
  return drillById(run.drillId).minor === true;
}

/**
 * Whether answering the key at the gate must regenerate the music.
 *
 * Only when the level left the key open *and* the answer changed. A level
 * that names its key shows the control locked and can never get here.
 *
 * It matters that this is true rather than convenient: recording the answer
 * without rebuilding is the precise failure `course-plan.md` forbids — *a
 * field the app quietly ignores is worse than an absent one*. The player
 * would pick B flat, be told they were in B flat, and read music the course
 * had already written in E flat.
 */
export function keyAnswerChanged(run: CourseRun, before: Settings, after: Settings): boolean {
  return run.fifths === undefined && before.courseFifths !== after.courseFifths;
}

/**
 * How long a course run is and whether it carries on — the two things
 * `generateExercise` needs that are not settings.
 *
 * `horizonBars: 0` is the substantive half. It leaves no paper past the
 * committed end, so `chosenBeats` and `totalBeats` meet, nothing draws grey,
 * no *Continue* is offered, and the run simply ends at the length the author
 * chose — out to the results screen, to repeat or move on. That is the
 * chunking driver the course never had: it was previously whatever
 * `defaultLengthFor` handed back, extended indefinitely by a player accepting
 * an offer designed for free play.
 *
 * A level that asks for `endless` gets the horizon it would have had.
 */
export function runShapeOf(run: CourseRun): RunShape {
  return {
    ...(run.bars !== undefined ? { bars: run.bars } : {}),
    ...(run.cycles !== undefined ? { cycles: run.cycles } : {}),
    /* One tune per segment: the axis's division IS the run's length. */
    ...(run.themes !== undefined
      ? { themeCount: 1, themeSteps: [{ id: run.themes.id, fifths: run.themes.fifths }] }
      : {}),
    ...(run.spanSemitones !== undefined ? { spanSemitones: run.spanSemitones } : {}),
    ...(run.intervals !== undefined ? { intervals: run.intervals } : {}),
    ...(run.endless ? {} : { horizonBars: 0 }),
  };
}

/**
 * The shape of a run, over and above the settings it is generated from.
 *
 * Not folded into `Settings` because none of it is a setting: the player has
 * no length control and no horizon control, and inventing two so a course
 * could speak through them would put a course's decisions where a player's
 * preferences live — the mistake `courseFifths` and `runTempo` were both
 * created to avoid.
 */
export interface RunShape {
  bars?: number;
  cycles?: number;
  themeCount?: number;
  /**
   * The tune a themes segment plays, as a one-step playlist (2026-08-30).
   *
   * It rides here rather than through `Settings.themeSteps` for the reason
   * `courseFifths` and `runTempo` exist: the player's own playlist is a
   * preference and this is the author's decision, and writing one over the
   * other would lose whatever the player had chosen in free play. `App`
   * hands it to the generator instead, with `selection: 'defined'`.
   */
  themeSteps?: ReadonlyArray<{ id: string; fifths: number }>;
  /** Paper past the committed end. 0 ends the run where the author said. */
  horizonBars?: number;
  /** Generator knobs a course sets that are likewise not settings. */
  spanSemitones?: number;
  intervals?: IntervalPool;
}
