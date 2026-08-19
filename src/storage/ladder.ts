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
import { rungFrom, type Progress } from '../exercise/ladder';

/** Unique to teacher mode, and the bundle check's fingerprint for it. */
const STORAGE_PREFIX = 'brass-trainer:ladder:';

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
    rung: rungFrom(fallback.difficultyId, fallback.tempo),
    recent: [],
  });

  try {
    const raw = localStorage.getItem(keyFor(instrumentId, clef));
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fresh();
    const { rung, recent } = parsed as Partial<Progress>;
    if (!rung || typeof rung.difficultyId !== 'string' || typeof rung.tempo !== 'number') {
      return fresh();
    }
    return {
      // Re-snapped on the way in rather than trusted: a store written by an
      // older version, or edited by hand, must not put the player on a rung the
      // ladder cannot step off.
      rung: rungFrom(rung.difficultyId, rung.tempo),
      recent: Array.isArray(recent) ? recent.filter((n) => typeof n === 'number') : [],
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
