/**
 * Where a player is, and what moves when they are ready.
 *
 * Teacher mode's spine (`docs/roadmap.md` § 1.2). A *rung* is a level and a
 * tempo — a standing instruction to the generator rather than a piece of music.
 * The player stays on it until they can hold it, and then **exactly one thing
 * changes.**
 *
 * ## Why this is not at odds with sight-reading
 *
 * Guided repetition looks as though it contradicts the core job: reading means
 * *unfamiliar* music, and replaying a passage until it is clean is technical
 * practice, not reading. It does not, because of something only a generator can
 * do — **hold the parameters and vary the material.** Every run at a rung is
 * music the player has never seen, so it is genuinely sight-reading, while the
 * difficulty stays put until it is mastered. A fixed-repertoire app cannot
 * offer this at all.
 *
 * ## Why one axis at a time
 *
 * Not merely kindness. If one thing changed and accuracy dropped, the cause is
 * known; change three and the result is uninterpretable — which would make the
 * whole history worthless for saying *why* someone is stuck.
 *
 * Tempo moves first and the level only when the tempo ceiling is cleared,
 * because that is the order a teacher works in: get it fluent at speed before
 * making the notes harder, then drop the speed and climb again. It is also what
 * § 2 of the roadmap asks for — *progress means holding accuracy as the tempo
 * rises*, not accuracy alone.
 *
 * ## Why ladders are data
 *
 * There is more than one sensible way to grade a brass player, and the app's
 * own four difficulties are only the most obvious. A graded syllabus is another
 * — the same shape, different rungs. Keeping a ladder as *data* rather than as
 * the two hard-coded axes it began as means a second one is a new entry here
 * rather than a rewrite, and it makes a player-defined ladder a question about
 * a screen rather than about this file.
 *
 * **What a syllabus ladder additionally needs, and does not yet have:** grades
 * constrain the keys, the metres and the length of what they set, and the
 * generator currently takes only a `Difficulty` from a level. Adding those
 * constraints is a further step, and they are deliberately not declared here
 * until the generator can honour them — a field the app quietly ignores is
 * worse than an absent one.
 */

import { DIFFICULTIES } from './difficulty';

/** The tempo band a level is practised across, in conducted beats per minute. */
export interface TempoBand {
  floor: number;
  ceiling: number;
  /**
   * The smallest change a player reliably notices without it being a wall:
   * about 8% at the bottom of the range and 4% at the top. Smaller makes
   * promotion meaningless; larger makes it a cliff.
   */
  step: number;
}

export interface Level {
  id: string;
  /** What the player is told they are on: "Easy", or "Grade 3". */
  name: string;
  /** Which of the generator's difficulties writes the music. */
  difficultyId: string;
  tempo: TempoBand;
  /** Overrides the ladder's bar for this step alone. */
  mastery?: Mastery;
}

export interface Ladder {
  id: string;
  name: string;
  blurb: string;
  /** Easiest first. The order *is* the progression. */
  levels: readonly Level[];
  /** The bar for every level that does not set its own. */
  mastery?: Mastery;
}

/**
 * The app's own ladder: its four difficulties, each with a tempo band of its
 * own.
 *
 * The bands overlap deliberately and widen as they rise. A beginner has no
 * business being pushed to 144, and a strong reader starting a hard level at 72
 * would be held below where they already are — so each level starts a little
 * faster and reaches a good deal further than the one below it.
 */
const BANDS: readonly TempoBand[] = [
  { floor: 60, ceiling: 96, step: 6 },
  { floor: 66, ceiling: 114, step: 6 },
  { floor: 72, ceiling: 132, step: 6 },
  { floor: 78, ceiling: 144, step: 6 },
];

const BRASS_MASTER: Ladder = {
  id: 'brass-master',
  name: 'Brass Master',
  blurb: "The app's own four levels, from first steps to fluent reading.",
  /*
   * Derived from the difficulties rather than written out, so a renamed
   * difficulty cannot leave a level pointing at nothing. The band comes from
   * the table above by position; a difficulty added beyond it inherits the
   * topmost band rather than breaking the ladder.
   */
  levels: DIFFICULTIES.map((difficulty, index) => ({
    id: difficulty.id,
    name: difficulty.name,
    difficultyId: difficulty.id,
    tempo: BANDS[index] ?? BANDS[BANDS.length - 1],
  })),
};

export const LADDERS: readonly Ladder[] = [BRASS_MASTER];

export const DEFAULT_LADDER_ID = BRASS_MASTER.id;

/**
 * A ladder by id, falling back to the default.
 *
 * Never throws. A stored id from a ladder that has since been removed — or one
 * a future version wrote — must leave the player somewhere they can practise
 * rather than on a screen that cannot render.
 */
export function ladderById(id: string): Ladder {
  return LADDERS.find((ladder) => ladder.id === id) ?? BRASS_MASTER;
}

export interface Rung {
  ladderId: string;
  levelId: string;
  /** Beats per minute — the conducted beat, as everywhere else. */
  tempo: number;
}

export function levelOf(rung: Rung): Level {
  const ladder = ladderById(rung.ladderId);
  // As with an unknown ladder: the easiest level is the safe direction to be
  // wrong in, since it asks too little rather than dropping a player into music
  // they cannot read.
  return ladder.levels.find((level) => level.id === rung.levelId) ?? ladder.levels[0];
}

function levelIndex(ladder: Ladder, levelId: string): number {
  const index = ladder.levels.findIndex((level) => level.id === levelId);
  return index === -1 ? 0 : index;
}

function snap(tempo: number, band: TempoBand): number {
  const steps = Math.round((tempo - band.floor) / band.step);
  const snapped = band.floor + steps * band.step;
  return Math.min(band.ceiling, Math.max(band.floor, snapped));
}

/**
 * How well, and for how long, before anything moves.
 *
 * **Part of the ladder rather than a constant, because the right bar depends on
 * what is being practised.** 0.85 across two runs is a strong result on music
 * the player has never seen — but a scale is a known quantity, and someone
 * playing C major at 85% has not learned it. A course of drills wants a
 * stricter bar than a sight-reading ladder, and the only place that can be
 * expressed is beside the levels themselves.
 *
 * The *shape* is what matters and is unlikely to change: a band in the middle
 * where the player stays put, so one lucky run cannot promote and one bad
 * evening cannot demote. `runsToJudge` of 2 is the least that can distinguish a
 * run from a habit.
 *
 * **The default values below are provisional and should be measured, not
 * argued about.** Getting them wrong is the main way this feature fails — too
 * strict and nobody ever advances, too loose and everyone is pushed past what
 * they can read.
 */
export interface Mastery {
  /** Every one of the recent runs at or above this promotes. */
  promoteAbove: number;
  /** Every one of them below this demotes. */
  demoteBelow: number;
  /** How many recent runs are read. Fewer than this decides nothing. */
  runsToJudge: number;
}

export const DEFAULT_MASTERY: Mastery = {
  promoteAbove: 0.85,
  demoteBelow: 0.6,
  runsToJudge: 2,
};

/**
 * The rung nearest to what the player already chose.
 *
 * Teacher mode opens where the player is, not at the bottom. Starting an
 * experienced reader on beginner material would be the app telling them it has
 * not been paying attention, and the ladder corrects an over-confident start
 * within a couple of runs anyway — which is the cheaper mistake.
 */
export function rungFrom(ladderId: string, levelId: string, tempo: number): Rung {
  const ladder = ladderById(ladderId);
  const level = ladder.levels[levelIndex(ladder, levelId)];
  return { ladderId: ladder.id, levelId: level.id, tempo: snap(tempo, level.tempo) };
}

export function sameRung(a: Rung, b: Rung): boolean {
  return a.ladderId === b.ladderId && a.levelId === b.levelId && a.tempo === b.tempo;
}

/** The next rung up, or null at the top of the ladder. */
export function nextRung(rung: Rung): Rung | null {
  const ladder = ladderById(rung.ladderId);
  const index = levelIndex(ladder, rung.levelId);
  const level = ladder.levels[index];

  if (rung.tempo < level.tempo.ceiling) {
    return { ...rung, levelId: level.id, tempo: snap(rung.tempo + level.tempo.step, level.tempo) };
  }
  // The tempo ceiling is cleared: harder music, and back down to a speed that
  // gives the player room to read it.
  const above = ladder.levels[index + 1];
  return above ? { ladderId: ladder.id, levelId: above.id, tempo: above.tempo.floor } : null;
}

/** The next rung down, or null at the bottom. */
export function previousRung(rung: Rung): Rung | null {
  const ladder = ladderById(rung.ladderId);
  const index = levelIndex(ladder, rung.levelId);
  const level = ladder.levels[index];

  if (rung.tempo > level.tempo.floor) {
    return { ...rung, levelId: level.id, tempo: snap(rung.tempo - level.tempo.step, level.tempo) };
  }
  const below = ladder.levels[index - 1];
  return below ? { ladderId: ladder.id, levelId: below.id, tempo: below.tempo.ceiling } : null;
}

/**
 * The bar in force at a rung: the level's own, else its ladder's, else the
 * default. Resolved rather than stored, so changing a ladder's bar moves every
 * level that had not overridden it.
 */
export function masteryOf(level: Level, ladder: Ladder): Mastery {
  return level.mastery ?? ladder.mastery ?? DEFAULT_MASTERY;
}

/**
 * The same, for a rung — the lookup half kept separate from the rule so the
 * rule can be tested against ladders that are not in the registry.
 */
export function masteryFor(rung: Rung): Mastery {
  return masteryOf(levelOf(rung), ladderById(rung.ladderId));
}

export type Movement = 'up' | 'down' | 'stay';

/**
 * What the last few runs at one rung say should happen next.
 *
 * Reads only the most recent `runsToJudge`, and answers `stay` until there
 * are that many — a verdict on one run is a verdict on an evening's mood.
 */
export function verdictOn(recent: readonly number[], mastery: Mastery): Movement {
  if (recent.length < mastery.runsToJudge) return 'stay';
  const judged = recent.slice(-mastery.runsToJudge);
  if (judged.every((accuracy) => accuracy >= mastery.promoteAbove)) return 'up';
  if (judged.every((accuracy) => accuracy < mastery.demoteBelow)) return 'down';
  return 'stay';
}

export interface Progress {
  rung: Rung;
  /**
   * What the player is aiming at: a rung on the same ladder.
   *
   * A marker, not a ceiling. Reaching it is worth saying so; it does not stop
   * the ladder, and a player who carries on past their goal is doing exactly
   * what a goal is for.
   *
   * Kept in this document rather than a store of its own — where the player is
   * and where they are going are one fact about one instrument, and § 1.7 of
   * the roadmap asks for one versioned document rather than scattered keys.
   */
  goal?: Rung;
  /**
   * The rung the goal was set from, which is what a progress bar measures out
   * of. Without it, a goal two rungs above a strong player would read as nearly
   * done before they had played anything.
   */
  goalSetAt?: Rung;
  /**
   * Accuracies at the current rung, oldest first.
   *
   * Cleared whenever the rung moves, because evidence is about a rung and
   * carrying it across would judge new music by how the old went. Trimmed to
   * what the verdict reads, so the store cannot grow without bound.
   */
  recent: number[];
}

/**
 * One run's result, folded in — and the move it causes, if any.
 *
 * Returns a new `Progress` rather than mutating, so a caller can show what
 * happened before committing it, and never moves more than one rung at a time
 * however good or bad the run was.
 */
export function afterRun(
  progress: Progress,
  accuracy: number,
): { progress: Progress; movement: Movement } {
  const mastery = masteryFor(progress.rung);
  const recent = [...progress.recent, accuracy].slice(-mastery.runsToJudge);
  const movement = verdictOn(recent, mastery);

  const moved =
    movement === 'up'
      ? nextRung(progress.rung)
      : movement === 'down'
        ? previousRung(progress.rung)
        : null;

  // At either end of the ladder there is nowhere to go, so the evidence stays
  // and the player keeps practising where they are — reported as `stay`,
  // because nothing moved and saying otherwise would be a lie to the screen.
  if (!moved) return { progress: { ...progress, recent }, movement: 'stay' };

  return { progress: { ...progress, rung: moved, recent: [] }, movement };
}

/**
 * How many rungs a level holds, counting both ends.
 *
 * The ceiling sits on the step grid (there is a test), so this divides
 * exactly — a band from 60 to 96 in sixes is seven rungs, not six.
 */
export function rungsInLevel(level: Level): number {
  const { floor, ceiling, step } = level.tempo;
  return Math.round((ceiling - floor) / step) + 1;
}

/** Every rung of a ladder, end to end. */
export function ladderLength(ladder: Ladder): number {
  return ladder.levels.reduce((total, level) => total + rungsInLevel(level), 0);
}

/**
 * A rung's position in the whole ladder, counting from 0 at the bottom.
 *
 * Flattening the ladder is what makes a goal answerable. Two rungs differing on
 * two axes — a level apart and a tempo apart — cannot be subtracted, but their
 * positions in the one sequence the player actually climbs can be, and that
 * sequence is exactly what `nextRung` walks.
 */
export function rungOrdinal(rung: Rung): number {
  const ladder = ladderById(rung.ladderId);
  const index = levelIndex(ladder, rung.levelId);
  const level = ladder.levels[index];
  const below = ladder.levels
    .slice(0, index)
    .reduce((total, earlier) => total + rungsInLevel(earlier), 0);
  return below + Math.round((snap(rung.tempo, level.tempo) - level.tempo.floor) / level.tempo.step);
}

export interface Distance {
  /** Rungs from here to there: positive while the goal is still above. */
  rungs: number;
  /** Level changes in between, signed the same way. */
  levels: number;
  /** Whether the goal is met — reached *or passed*. */
  reached: boolean;
}

/**
 * How far it is from one rung to another, or null when they are not comparable.
 *
 * Null for two different ladders, deliberately: a rung on a scales course and a
 * rung on a reading course are not a distance apart in any sense a player would
 * recognise, and inventing a number would be worse than admitting it. A screen
 * given null should say the goal belongs to another course rather than draw an
 * empty bar.
 */
export function distanceTo(from: Rung, to: Rung): Distance | null {
  if (from.ladderId !== to.ladderId) return null;
  const ladder = ladderById(from.ladderId);
  const rungs = rungOrdinal(to) - rungOrdinal(from);
  return {
    rungs,
    levels: levelIndex(ladder, to.levelId) - levelIndex(ladder, from.levelId),
    reached: rungs <= 0,
  };
}

/**
 * How far along the way to a goal, from 0 to 1 — or null when the two rungs
 * are not comparable.
 *
 * Measured from where the player *started aiming* rather than from the bottom
 * of the ladder, which would show a strong player as nearly finished the moment
 * they set a goal two rungs above themselves.
 */
export function progressToward(from: Rung, at: Rung, goal: Rung): number | null {
  const whole = distanceTo(from, goal);
  const left = distanceTo(at, goal);
  if (!whole || !left) return null;
  if (whole.rungs <= 0) return 1;
  return Math.min(1, Math.max(0, (whole.rungs - left.rungs) / whole.rungs));
}
