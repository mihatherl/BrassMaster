/**
 * The count band — where the printed count lives from 2026-09-03, and the
 * beat shading behind the notes (the player's design, ratified the same
 * day: *"break the bar up into colored segments… the edges of these
 * colored extents curve down beneath the stave into a 'label bar', which
 * presents the labels in more-or-less even divisions of horizontal
 * space"*).
 *
 * The band replaced the syllables that sat ABOVE the stave, where they
 * shared one crowded strip with the bar numbers, tempo marks, section
 * labels and fingering callouts — the player: *"we may be trying to do
 * too much above the stave… the fingerings overlap with these labels"*.
 * The count moved below; the fingering callout's whole design (a capsule
 * on a needle pointing down at its note) is invested in being above, so
 * the count was the one to move.
 *
 * This module is the pure layout: which cells the band has and where each
 * syllable sits in them. Positions are *fractions of the bar*, not
 * pixels, because the two surfaces place bars differently (justified on
 * the page, uniform on the scrolling line) and both must draw the same
 * band. The geometry the fractions encode is the design's own point: the
 * stave above is engraved — room follows the notes — while the label bar
 * below divides each bar EVENLY by beat, which is how the beats actually
 * fall in time. The curved ribbon edges are the eye's guide from the one
 * to the other.
 *
 * **The cell is the pulse**: the count resets every beat, the grid
 * divides every beat, the voice speaks every beat — so the band segments
 * by the felt beat (`pulseBeats`, the dotted crotchet in compound time),
 * and the tint alternates by a global pulse count so 3/4's odd bars
 * cannot put two like tints either side of a bar line.
 */

import { beatOfBar, metreAt } from '../domain/metre';
import type { Exercise } from '../exercise/types';

export interface BandEntry {
  text: string;
  /** Dimmed: the count continues here, through silence or sustain. */
  rest: boolean;
  /** Where the mark falls in the music, for wearing its note's colour. */
  atBeat: number;
  /** Centre of the entry's even slot, as a fraction of its bar's width. */
  fraction: number;
}

export interface BandCell {
  /** The pulse's span in the music, in crotchets from the start. */
  fromBeat: number;
  toBeat: number;
  /** The bar the cell belongs to, as beat positions — the frame the
      fractions are measured against. */
  barFromBeat: number;
  barToBeat: number;
  /** The cell's even slot in the label bar, as fractions of the bar. */
  fromFraction: number;
  toFraction: number;
  /** Global pulse index, for the alternating tint. */
  pulse: number;
  /** This cell's syllables, in order. Empty where nothing is counted. */
  entries: BandEntry[];
}

/**
 * The band's cells for the beats a system shows, one per pulse. Cells are
 * emitted whether or not the exercise carries a count, because the beat
 * shading is its own aid (a run option in every mode); the entries are
 * empty where there is no count to print.
 *
 * **A bar where nothing is played prints only its numbers, dimmed**
 * (the player, 2026-09-04, on a demonstration bar reading "1e&a2e&a3 &"
 * in bold through a bar rest). The demonstration bar carries the whole
 * figure in the EMISSION — that is what the counting voice will speak,
 * and it is untouched here — but a bar-rest's engraving is one narrow
 * column, and the figure's count crammed into it was mush; the print
 * says just where the beats fall. This amends the 2026-09-03 ruling
 * that the demo's count shows the whole figure, which was written for
 * the count above the stave on a full-width bar; the teaching survives
 * in the voice and in the play bars alongside.
 */
export function bandCells(
  exercise: Pick<Exercise, 'metres' | 'totalBeats' | 'syllables'> & {
    notes: ReadonlyArray<{ startBeat: number }>;
  },
  firstBeat: number,
  lastBeat: number,
): BandCell[] {
  const cells: BandCell[] = [];
  const syllables = exercise.syllables ?? [];
  let bar = 0;
  let barFrom = beatOfBar(exercise.metres, 0);
  let pulse = 0;
  while (barFrom < lastBeat - 1e-9 && barFrom < exercise.totalBeats - 1e-9) {
    const metre = metreAt(exercise.metres, barFrom);
    const barTo = Math.min(barFrom + metre.barBeats, exercise.totalBeats);
    const pulses = Math.max(1, Math.round((barTo - barFrom) / metre.pulseBeats));
    const sounded = exercise.notes.some(
      (note) => note.startBeat >= barFrom - 1e-9 && note.startBeat < barTo - 1e-9,
    );
    for (let index = 0; index < pulses; index++, pulse++) {
      const from = barFrom + index * metre.pulseBeats;
      const to = Math.min(from + metre.pulseBeats, barTo);
      if (to <= firstBeat + 1e-9 || from >= lastBeat - 1e-9) continue;
      const inCell = syllables.filter(
        (entry) => entry.atBeat >= from - 1e-9 && entry.atBeat < to - 1e-9,
      );
      const kept = sounded
        ? inCell
        : inCell.filter((entry) => Math.abs(entry.atBeat - from) < 1e-9);
      cells.push({
        fromBeat: from,
        toBeat: to,
        barFromBeat: barFrom,
        barToBeat: barTo,
        fromFraction: index / pulses,
        toFraction: (index + 1) / pulses,
        pulse,
        /*
         * Even slots WITHIN the even cell: one semiquaver anywhere makes
         * a beat read "n e & a" (the count's own rule), and those four
         * marks share the beat's cell equally — which is the "more-or-
         * less" in the player's spec: cells are even, and a busy beat's
         * marks are narrower than a quiet beat's one.
         */
        entries: kept.map((entry, slot) => ({
          text: entry.text,
          rest: sounded ? entry.rest === true : true,
          atBeat: entry.atBeat,
          fraction:
            index / pulses + ((slot + 0.5) / kept.length) * (1 / pulses),
        })),
      });
    }
    bar++;
    barFrom = beatOfBar(exercise.metres, bar);
  }
  return cells;
}

/**
 * Where a cell's edge sits on the page.
 *
 * `xForBeat` names a beat's COLUMN CENTRE, and the first cut used it
 * raw — so every edge sliced through the very notehead it was meant to
 * contain and the final cell spilled past the closing bar line (the
 * player's eye, 2026-09-04). The engraver's own rules instead: an edge
 * that IS a bar line sits where bar lines are drawn — the setback
 * before the next column — and an edge inside the bar sits midway
 * between the columns either side of it, because between beats there
 * is no bar-line reserve to set back into. `limit` is the line's own
 * left margin, where the signature ends and music may begin.
 */
export function cellEdgeX(
  beat: number,
  options: {
    barLine: boolean;
    /** Every column's beat (notes and rests), sorted ascending. */
    columns: readonly number[];
    xForBeat: (beat: number) => number;
    /** The bar-line setback, in pixels: BAR_LINE_SETBACK × staveSpace. */
    setbackX: number;
    limit?: number;
  },
): number {
  const { barLine, columns, xForBeat, setbackX } = options;
  const limit = options.limit ?? -Infinity;
  if (barLine) return Math.max(limit, xForBeat(beat) - setbackX);
  let previous: number | null = null;
  for (const at of columns) {
    if (at >= beat - 1e-9) break;
    previous = at;
  }
  return Math.max(
    limit,
    previous === null
      ? xForBeat(beat) - setbackX
      : (xForBeat(previous) + xForBeat(beat)) / 2,
  );
}

/**
 * How many stave spaces a system needs below its bottom line.
 *
 * Base is the 3.5 the layout has always kept (`SYSTEM_SPACES`' own
 * arithmetic). A counted exercise adds the band: a curve zone the ribbon
 * edges fall through, the label strip itself, and a margin — pushed
 * deeper when the music itself reaches below the stave (the player's
 * spec: *"if there are many ledger lines beneath the stave, then this
 * label bar might need to get pushed down"*), and capped so one
 * pedal-register note cannot spend the whole page on empty air.
 */
export const BAND_GAP = 1.1;
export const BAND_HEIGHT = 1.9;
export const BAND_MARGIN = 0.4;
const BAND_DEPTH_CAP = 5;

export function spacesBelowFor(
  counted: boolean,
  /** How far the lowest notehead reaches below the bottom line, in stave
      spaces; zero or negative when nothing does. */
  depthBelow: number,
): number {
  if (!counted) return 3.5;
  const gap = Math.max(BAND_GAP, Math.min(depthBelow, BAND_DEPTH_CAP) + 0.6);
  return Math.max(3.5, gap + BAND_HEIGHT + BAND_MARGIN);
}
