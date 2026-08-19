/**
 * Where a player is, and what moves when they are ready.
 *
 * Teacher mode's spine (`docs/roadmap.md` § 1.2). A *rung* is a difficulty and
 * a tempo — a standing instruction to the generator rather than a piece of
 * music. The player stays on it until they can hold it, and then **exactly one
 * thing changes.**
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
 * Tempo moves first and difficulty only when the tempo ceiling is cleared,
 * because that is the order a teacher works in: get it fluent at speed before
 * making the notes harder, then drop the speed and climb again. It is also what
 * § 2 of the roadmap asks for — *progress means holding accuracy as the tempo
 * rises*, not accuracy alone.
 */

import { DIFFICULTIES } from './difficulty';

export interface Rung {
  difficultyId: string;
  /** Beats per minute — the conducted beat, as everywhere else. */
  tempo: number;
}

/**
 * The tempo grid.
 *
 * A step of 6 is the smallest change a player reliably *notices* without it
 * being a wall: about 8% at the bottom of the range and 4% at the top. Smaller
 * would make promotion meaningless, larger would make it a cliff.
 *
 * The ceiling is where the ladder stops rather than where the app does —
 * settings go to 220, and anyone who wants that has free play. Holding 144 on
 * unfamiliar music is already a strong reader.
 */
export const TEMPO_FLOOR = 72;
export const TEMPO_CEILING = 144;
export const TEMPO_STEP = 6;

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

const ORDER: readonly string[] = DIFFICULTIES.map((difficulty) => difficulty.id);

function difficultyIndex(id: string): number {
  const index = ORDER.indexOf(id);
  // An unknown id means settings from a future version, or a hand-edited store.
  // Treating it as the easiest is the safe direction to be wrong in: it asks
  // too little rather than dropping a player into music they cannot read.
  return index === -1 ? 0 : index;
}

function clampTempo(tempo: number): number {
  const steps = Math.round((tempo - TEMPO_FLOOR) / TEMPO_STEP);
  const snapped = TEMPO_FLOOR + steps * TEMPO_STEP;
  return Math.min(TEMPO_CEILING, Math.max(TEMPO_FLOOR, snapped));
}

/**
 * The rung nearest to what the player already chose.
 *
 * Teacher mode opens where the player is, not at the bottom. Starting an
 * experienced reader on beginner material at 72 would be the app telling them
 * it has not been paying attention, and the ladder corrects an over-confident
 * start within a couple of runs anyway — which is the cheaper mistake.
 */
export function rungFrom(difficultyId: string, tempo: number): Rung {
  return { difficultyId: ORDER[difficultyIndex(difficultyId)], tempo: clampTempo(tempo) };
}

export function sameRung(a: Rung, b: Rung): boolean {
  return a.difficultyId === b.difficultyId && a.tempo === b.tempo;
}

/** The next rung up, or null at the top of the ladder. */
export function nextRung(rung: Rung): Rung | null {
  const index = difficultyIndex(rung.difficultyId);
  if (rung.tempo < TEMPO_CEILING) {
    return { difficultyId: ORDER[index], tempo: clampTempo(rung.tempo + TEMPO_STEP) };
  }
  // The tempo ceiling is cleared: harder music, and back down to a speed that
  // gives the player room to read it.
  if (index + 1 < ORDER.length) {
    return { difficultyId: ORDER[index + 1], tempo: TEMPO_FLOOR };
  }
  return null;
}

/** The next rung down, or null at the bottom. */
export function previousRung(rung: Rung): Rung | null {
  const index = difficultyIndex(rung.difficultyId);
  if (rung.tempo > TEMPO_FLOOR) {
    return { difficultyId: ORDER[index], tempo: clampTempo(rung.tempo - TEMPO_STEP) };
  }
  if (index > 0) {
    return { difficultyId: ORDER[index - 1], tempo: TEMPO_CEILING };
  }
  return null;
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

  const moved = movement === 'up' ? nextRung(progress.rung) : movement === 'down' ? previousRung(progress.rung) : null;

  // At either end of the ladder there is nowhere to go, so the evidence stays
  // and the player keeps practising where they are — reported as `stay`,
  // because nothing moved and saying otherwise would be a lie to the screen.
  if (!moved) return { progress: { rung: progress.rung, recent }, movement: 'stay' };

  return { progress: { rung: moved, recent: [] }, movement };
}
