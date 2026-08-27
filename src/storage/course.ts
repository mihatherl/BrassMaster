/**
 * Where the player has got to in a course, kept between sittings.
 *
 * The continuity teacher mode is for: *"focusing a bit on what you achieved
 * last time"*. `exercise/course.ts` holds the rules; this holds nothing but
 * the position, the goal, and the evidence at the current step.
 *
 * **Paid, and the reason this file is worth a fingerprint.** The storage key
 * below is unique to teacher mode and survives minification, so
 * `tools/check-web-bundle.mjs` fails the free build the moment any of this
 * reaches it — including on the day someone wires a screen and forgets the
 * flag, which is how the microphone and My Music each nearly leaked. The key
 * moved from `brass-trainer:ladder:` when the ladder became courses
 * (2026-08-26) and **the bundle check moved with it, deliberately** — the
 * ratified free-taster ruling says those tripwires move on purpose or not at
 * all. The old key's data is not migrated: it named rungs on a ladder that no
 * longer exists, and teacher mode has never shipped, so there is nobody to
 * migrate.
 *
 * Per instrument and clef, as the other stores are: a player's position on a
 * cornet says nothing about their position on an E flat bass, and the same
 * written note is a different problem in bass clef.
 */

import type { Clef } from '../domain/instruments';
import { COURSES, positionFrom, startOf, type Position, type Progress } from '../exercise/course';

/** Unique to teacher mode, and the bundle check's fingerprint for it. */
const STORAGE_PREFIX = 'brass-trainer:course:';

/** A position from storage, made trustworthy, or undefined if it is not one. */
function readPosition(value: unknown): Position | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { courseId, levelId, tempo } = value as Partial<Position>;
  if (typeof courseId !== 'string' || typeof levelId !== 'string' || typeof tempo !== 'number') {
    return undefined;
  }
  return positionFrom(courseId, levelId, tempo);
}

function keyFor(instrumentId: string, clef: Clef): string {
  return `${STORAGE_PREFIX}${instrumentId}:${clef}`;
}

/**
 * The stored progress, or a fresh start at the first course's beginning.
 *
 * The ladder used to open "where the player already practises", inferred from
 * settings — that inference died with authored courses, whose start is the
 * start (see `startOf`). A stored position is re-made through `positionFrom`
 * rather than trusted: a store written by an older version, or by hand, must
 * not put the player on a step the course cannot step off.
 */
export function loadProgress(instrumentId: string, clef: Clef): Progress {
  const fresh = (): Progress => ({ position: startOf(COURSES[0]), recent: [] });

  try {
    const raw = localStorage.getItem(keyFor(instrumentId, clef));
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fresh();
    const { position, recent, goal, goalSetAt } = parsed as Partial<Progress>;
    const trusted = readPosition(position);
    if (!trusted) return fresh();
    return {
      position: trusted,
      recent: Array.isArray(recent) ? recent.filter((n) => typeof n === 'number') : [],
      ...(readPosition(goal) ? { goal: readPosition(goal)! } : {}),
      ...(readPosition(goalSetAt) ? { goalSetAt: readPosition(goalSetAt)! } : {}),
    };
  } catch {
    return fresh();
  }
}

export function saveProgress(instrumentId: string, clef: Clef, progress: Progress): void {
  try {
    localStorage.setItem(keyFor(instrumentId, clef), JSON.stringify(progress));
  } catch {
    // Private browsing, or a full store. The session still counts; it is just
    // not remembered, and the course opens from its start next time.
  }
}
