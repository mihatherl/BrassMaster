/**
 * Where the player has got to, kept between sittings.
 *
 * The continuity teacher mode is for: *"focusing a bit on what you achieved
 * last time"*. `exercise/ladder.ts` holds the rules about rungs and movement;
 * this holds nothing but the position and the evidence for it.
 *
 * **Paid, and the reason this file is worth a fingerprint.** The storage key
 * below is unique to teacher mode and survives minification, so
 * `tools/check-web-bundle.mjs` fails the free build the moment any of this
 * reaches it — including on the day someone wires the ladder into a screen and
 * forgets the flag, which is exactly how the microphone and My Music each
 * nearly leaked.
 *
 * Per instrument and clef, as the other two stores are: a player's level on a
 * cornet says nothing about their level on an E flat bass, and the same written
 * note is a different problem in bass clef.
 */

import type { Clef } from '../domain/instruments';
import { DEFAULT_LADDER_ID, rungFrom, type Progress, type Rung } from '../exercise/ladder';

/** Unique to teacher mode, and the bundle check's fingerprint for it. */
const STORAGE_PREFIX = 'brass-trainer:ladder:';

/** A rung from storage, snapped onto the grid, or undefined if it is not one. */
function readRung(value: unknown): Rung | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { ladderId, levelId, tempo } = value as Partial<Rung>;
  if (typeof ladderId !== 'string' || typeof levelId !== 'string' || typeof tempo !== 'number') {
    return undefined;
  }
  return rungFrom(ladderId, levelId, tempo);
}

function keyFor(instrumentId: string, clef: Clef): string {
  return `${STORAGE_PREFIX}${instrumentId}:${clef}`;
}

/**
 * The stored position, or a fresh one starting from what the player chose.
 *
 * `fallback` is the settings in hand, so a first session opens where the player
 * already practises rather than at the bottom of the ladder. See `rungFrom`.
 */
export function loadProgress(
  instrumentId: string,
  clef: Clef,
  fallback: { difficultyId: string; tempo: number },
): Progress {
  const fresh = (): Progress => ({
    // The app's own ladder shares its level ids with the difficulties, so the
    // player's chosen difficulty names a level directly. A ladder that does not
    // — a graded syllabus — is only ever entered deliberately, so it has no
    // business being inferred from settings.
    rung: rungFrom(DEFAULT_LADDER_ID, fallback.difficultyId, fallback.tempo),
    recent: [],
  });

  try {
    const raw = localStorage.getItem(keyFor(instrumentId, clef));
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fresh();
    const { rung, recent } = parsed as Partial<Progress>;
    if (
      !rung ||
      typeof rung.ladderId !== 'string' ||
      typeof rung.levelId !== 'string' ||
      typeof rung.tempo !== 'number'
    ) {
      return fresh();
    }
    const { goal, goalSetAt } = parsed as Partial<Progress>;
    return {
      // Re-snapped on the way in rather than trusted: a store written by an
      // older version, or edited by hand, must not put the player on a rung the
      // ladder cannot step off. The goal gets the same treatment — it is a rung
      // like any other and a screen will measure against it.
      rung: rungFrom(rung.ladderId, rung.levelId, rung.tempo),
      recent: Array.isArray(recent) ? recent.filter((n) => typeof n === 'number') : [],
      ...(readRung(goal) ? { goal: readRung(goal)! } : {}),
      ...(readRung(goalSetAt) ? { goalSetAt: readRung(goalSetAt)! } : {}),
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
    // not remembered, and the ladder opens from settings next time.
  }
}
