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
import type { DrillId, PatternRegister } from '../exercise/generate';

export interface CourseRun {
  kind: Exclude<ExerciseKind, 'imported'>;
  difficultyId: string;
  drillId?: DrillId;
  fifths?: number;
  register?: PatternRegister;
  tempo: number;
  levelId: string;
}
