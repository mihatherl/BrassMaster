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
import type { Settings } from '../storage/settings';

export interface CourseRun {
  kind: Exclude<ExerciseKind, 'imported'>;
  difficultyId: string;
  drillId?: DrillId;
  fifths?: number;
  register?: PatternRegister;
  tempo: number;
  levelId: string;
  /**
   * Options the course pins for this run (2026-08-27). Present means the
   * author chose; absent leaves the player's own setting alone. `App` spreads
   * them over the settings like the rest, and the gate shows them disabled.
   */
  metronomeEnabled?: boolean;
  conductorEnabled?: boolean;
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
  return run.fifths ?? settings.courseFifths ?? settings.fifths;
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
