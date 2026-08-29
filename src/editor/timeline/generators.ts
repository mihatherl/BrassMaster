/**
 * From | to | steps — the timeline's starting-sequence generators.
 *
 * Ruling 1 of `level-axes-plan.md`: generate a sensible default, then let the
 * author edit any division. What these write is an ordinary division list,
 * evenly spaced; nothing here is remembered or re-interpreted later — the
 * document carries the result, never the recipe. Ruling 2 makes that
 * explicit for the range: an anchor-plus-rule in the document would
 * re-interpret itself when the key changed, so the ladder is walked HERE,
 * once, and the explicit list is what the author then adjusts.
 */

import { keyLadder, stepOnLadder } from '../../domain/ladder';
import type { RawDivision } from './axis-model';

/** Evenly spaced `at`s for `count` divisions: 0, 1/count, … */
function spread(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i / count);
}

/**
 * A linear run from `from` to `to` in `steps` values, rounded to the axis's
 * grain (whole bpm, whole bars). The ends are exact; an author who wants the
 * ladder's oldest reset shape — 60, 65, 70, 60… — writes it by editing the
 * values afterwards, which the timeline draws truthfully.
 */
export function numericDivisions(from: number, to: number, steps: number, grain = 1): RawDivision[] {
  const count = Math.max(1, Math.round(steps));
  return spread(count).map((at, i) => ({
    at,
    value:
      Math.round((from + (count === 1 ? 0 : ((to - from) * i) / (count - 1))) / grain) * grain,
  }));
}

/** The given values in the given order, evenly spaced — enum and boolean axes. */
export function orderedDivisions(values: readonly unknown[]): RawDivision[] {
  return spread(Math.max(1, values.length)).map((at, i) => ({ at, value: values[i] }));
}

/**
 * N range steps from an anchor, widening along the key's ladder.
 *
 * Biased up, down, or both — and "both" favours **down first**, because a
 * brass range does not grow symmetrically: upward is embouchure and effort,
 * downward is comparatively free until the pedal register. Interpolation
 * walks `keyLadder`, not semitones, so each step is one line or space of the
 * key the level is authored in; `stepOnLadder` clamps at the compass, so an
 * over-ambitious ask flattens out honestly at the instrument's edge.
 */
export function rangeDivisions(options: {
  fifths: number;
  compass: readonly [number, number];
  anchor: { low: number; high: number };
  steps: number;
  bias: 'up' | 'down' | 'both';
}): RawDivision[] {
  const { fifths, compass, anchor, steps, bias } = options;
  const ladder = keyLadder(fifths, compass[0], compass[1]);
  const count = Math.max(1, Math.round(steps));
  const values: Array<{ low: number; high: number }> = [
    { low: anchor.low, high: anchor.high },
  ];
  let { low, high } = anchor;
  let downNext = bias !== 'up';
  for (let i = 1; i < count; i++) {
    if (bias === 'up') {
      high = stepOnLadder(ladder, high, 1);
    } else if (bias === 'down') {
      low = stepOnLadder(ladder, low, -1);
    } else if (downNext) {
      low = stepOnLadder(ladder, low, -1);
    } else {
      high = stepOnLadder(ladder, high, 1);
    }
    downNext = !downNext;
    values.push({ low, high });
  }
  return spread(count).map((at, i) => ({ at, value: values[i] }));
}
