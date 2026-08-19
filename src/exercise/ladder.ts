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
}

export interface Ladder {
  id: string;
  name: string;
  blurb: string;
  /** Easiest first. The order *is* the progression. */
  levels: readonly Level[];
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
 * **These three numbers are provisional and should be measured, not argued
 * about.** The shape is what matters and is unlikely to change: a *band* in the
 * middle where the player stays put, so that one lucky run cannot promote and
 * one bad evening cannot demote. Getting them wrong is the main way this
 * feature fails — too strict and nobody ever advances, too loose and everyone
 * is pushed past what they can read.
 *
 * `RUNS_TO_JUDGE` of 2 is the least that can distinguish a run from a habit.
 * The gap between 0.6 and 0.85 is deliberately wide: it is where practice
 * actually happens, and it should be the common case rather than a narrow strip
 * between promotions.
 */
export const PROMOTE_ABOVE = 0.85;
export const DEMOTE_BELOW = 0.6;
export const RUNS_TO_JUDGE = 2;

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

export type Movement = 'up' | 'down' | 'stay';

/**
 * What the last few runs at one rung say should happen next.
 *
 * Reads only the most recent `RUNS_TO_JUDGE`, and answers `stay` until there
 * are that many — a verdict on one run is a verdict on an evening's mood.
 */
export function verdictOn(recent: readonly number[]): Movement {
  if (recent.length < RUNS_TO_JUDGE) return 'stay';
  const judged = recent.slice(-RUNS_TO_JUDGE);
  if (judged.every((accuracy) => accuracy >= PROMOTE_ABOVE)) return 'up';
  if (judged.every((accuracy) => accuracy < DEMOTE_BELOW)) return 'down';
  return 'stay';
}

export interface Progress {
  rung: Rung;
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
  const recent = [...progress.recent, accuracy].slice(-RUNS_TO_JUDGE);
  const movement = verdictOn(recent);

  const moved =
    movement === 'up'
      ? nextRung(progress.rung)
      : movement === 'down'
        ? previousRung(progress.rung)
        : null;

  // At either end of the ladder there is nowhere to go, so the evidence stays
  // and the player keeps practising where they are — reported as `stay`,
  // because nothing moved and saying otherwise would be a lie to the screen.
  if (!moved) return { progress: { rung: progress.rung, recent }, movement: 'stay' };

  return { progress: { rung: moved, recent: [] }, movement };
}
