/**
 * One system: a single line of engraved music, clef to final bar line.
 *
 * Shared by the results-screen review and by paged reading, which want exactly
 * the same thing — a run of bars set out on a stave with each note in whatever
 * colour it has earned. Only what hangs off it differs: the review writes the
 * fingering under its mistakes, the play surface does not.
 *
 * Scrolling reading is not built from these. It draws one endless line whose
 * origin moves every frame, with notes culled by position rather than chosen by
 * bar, and its spacing is even rather than engraved.
 */

import { keyAt } from '../domain/keys';
import { beatOfBar, metreAt, type Metre } from '../domain/metre';
import type { TempoEvent } from '../domain/tempo';
import { insideMultiRest, isMultiRest, multiRestSpans } from '../exercise/rests';
import type { Exercise } from '../exercise/types';
import {
  drawBeamGroup,
  drawTuplet,
  type TupletMember,
  drawFingeringHint,
  drawMultiBarRest,
  drawNote,
  drawRest,
  drawTie,
  noteheadWidth,
  roundedRect,
  type LayoutNote,
} from './notes';
import { drawGlyph, glyphWidth } from './glyphs';
import type { Spacing } from './spacing';
import {
  drawBarLine,
  drawClef,
  drawKeySignature,
  drawStaveLines,
  drawTimeSignature,
  layoutKeySignature,
  timeSignatureWidth,
  yForPitch,
  type StaveMetrics,
} from './stave';
import { bandCells, cellEdgeX, soundingSpans, BAND_GAP, BAND_HEIGHT, BAND_MARGIN } from './count-band';
import type { StaveTheme } from './surface';

/**
 * How far a bar line sits to the left of its downbeat, in stave spaces.
 *
 * Half a notehead clears the note itself; the rest is the gap an engraver would
 * leave, so the note reads as being *after* the bar line rather than on it.
 */
export const BAR_LINE_SETBACK = 1.75;

/**
 * Left margin before the clef, in stave spaces — and before the key signature
 * directly, on a system that skips the clef.
 */
export const MUSIC_MARGIN = 0.4;

/** Gap between the two lines of the double bar at a key change. */
const DOUBLE_BAR_GAP = 0.45;
/** Gap between that double bar and the signature it introduces. */
const KEY_CHANGE_LEAD = 0.5;

/**
 * A change of signature part-way along a line: a key, a metre, or both.
 *
 * One shape rather than two mechanisms, because they are one event to a reader
 * — a double bar and then whatever is being restated — and a part that turns
 * into 3/4 and into D major at the same bar must print one double bar, not two
 * side by side.
 */
export interface SignatureChange {
  /** The key being left and the one being joined, when the key changes. */
  key?: { from: number; to: number };
  /** The signature coming into force, when the metre changes. */
  metre?: Metre;
}

/**
 * Room a change of signature needs, beyond what the bar line already takes.
 *
 * The double bar, the gap after it, and whatever is restated — a key signature
 * for a change being wider than an ordinary one, since it carries the naturals
 * cancelling the key being left as well as the accidentals of the key being
 * joined.
 *
 * Lives here rather than in `spacing.ts` because it is glyph arithmetic, and
 * the engraver deliberately takes every pixel figure from its caller. The
 * spacing must reserve exactly this or the change will be drawn over the note
 * before it.
 */
export function signatureChangeRoom(metrics: StaveMetrics, change: SignatureChange): number {
  const key = change.key ? layoutKeySignature(metrics, change.key.to, change.key.from).width : 0;
  const metre = change.metre
    ? timeSignatureWidth(metrics, change.metre.beatsPerBar, change.metre.beatUnit)
    : 0;
  if (key === 0 && metre === 0) return 0;
  return key + metre + metrics.staveSpace * (KEY_CHANGE_LEAD + DOUBLE_BAR_GAP);
}

export interface SystemOptions {
  exercise: Exercise;
  metrics: StaveMetrics;
  /** Where a beat sits on this line; see `justifiedX`. */
  xForBeat: (beat: number) => number;
  /** First bar of this system. */
  firstBar: number;
  /** One past the last bar of this system. */
  lastBar: number;
  theme: StaveTheme;
  colourFor: (noteIndex: number) => string;
  /** The answer bar to light, where one is current. See `currentAnswerSpan`. */
  answerSpan?: [number, number] | null;
  /** Whether the beat shading tints this run. The count band itself draws
      whenever the exercise carries a count; this is only the colour. */
  beatTint?: boolean;
  /** The system's own floor, past which the count band may not reach. */
  bandFloorY?: number;
  /** Text to write under a note, or null for most of them. */
  annotationFor?: (noteIndex: number) => string | null;
  /** Fingering to print above a note, for the ones the player struggles with. */
  hintFor?: (noteIndex: number) => string | undefined;
  /** Whether this system ends the music, and so gets a closing double bar. */
  final: boolean;
  /**
   * Whether to draw the clef at the head of this system. The key and time
   * signature are drawn regardless.
   *
   * The clef is the one element of the three a player never needs restated —
   * unlike the other two it cannot change mid-exercise even once key changes
   * exist, since a change of clef mid-part is not a thing brass notation does.
   * So a caller showing several systems at once — several stacked on one
   * screen — can ask for the courtesy repeat of just the clef to be skipped on
   * all but the first and get a little of that space back for music, while the
   * key and time signature stay in view on every line: both are live
   * information a reader may need to check mid-piece, more so once either can
   * change partway through. Static callers such as the results review draw
   * the clef on every system too, as engraved music conventionally does.
   */
  clef: boolean;
}

/**
 * Where each beat of one system sits, with the line justified to fill its width.
 *
 * Engraved music does not leave a quarter of a line empty because the next bar
 * would not quite fit. The bars that did fit are stretched until the line is
 * full, which is why printed systems all end flush at the right margin.
 *
 * Stretching is uniform across the system, so the proportions the engraving
 * rule worked out are preserved exactly — a bar of semiquavers stays wider than
 * a bar of minims, and everything simply has more air.
 *
 * The final system of a piece is the exception, and is left ragged. Stretching
 * two remaining bars across a full line would space them like a largo and imply
 * a breadth that is not there.
 */
export function justifiedX(
  spacing: Spacing,
  firstBeat: number,
  lastBeat: number,
  headerWidth: number,
  usableWidth: number,
  justify: boolean,
): (beat: number) => number {
  const from = spacing.xOf(firstBeat);
  const natural = spacing.xOf(lastBeat) - from;
  // Never below 1: squeezing is the spacing rule's job, and it has already had
  // its say about what fits.
  const stretch = justify && natural > 0 ? Math.max(1, usableWidth / natural) : 1;
  return (beat) => headerWidth + (spacing.xOf(beat) - from) * stretch;
}

/** Where an annotation sits, in stave spaces below the bottom line. */
const ANNOTATION_OFFSET = 4.6;

/**
 * The metronome mark's note against a full-sized one, and where the mark sits
 * above the stave. Cue-sized, as printed parts set it: the mark is an
 * instruction about the music, not a note of it.
 */
const MARK_SCALE = 0.75;
/**
 * Gap between the mark's notehead and its dot, in stave spaces before the
 * mark's own scaling. The same 0.3 the stave uses behind a notehead, so a
 * dotted crotchet in the mark is spaced like a dotted crotchet in the music.
 */
const MARK_DOT_GAP = 0.3;
const MARK_RISE = 2.5;

/**
 * How high above the top line a bar number sits, in stave spaces.
 *
 * Tucked against the stave, under everything else that lives above it: the
 * metronome mark's band starts at `MARK_RISE`, and a fingering callout's
 * capsule floats above that again. It used to sit at 1.5, which is inside the
 * band a fingering occupies, so a hint over the first note of a numbered bar
 * landed on top of its number — and the number is furniture, so it is the one
 * that gives way.
 *
 * The callout's tail passes through this band on its way down to its note.
 * That is a thin line crossing a number rather than two things written over
 * each other, and the capsule is filled, so what the tail meets it passes over
 * cleanly.
 */
const BAR_NUMBER_RISE = 0.35;

/** How big a bar number is set, in stave spaces. */
const BAR_NUMBER_SIZE = 0.9;

/**
 * How often a bar is numbered where there are no systems to number the start
 * of — the scrolling line, which is one unbroken system.
 *
 * Five is what a printed part uses when it numbers periodically rather than by
 * system. Every bar would be a wall of digits over music being sight-read, and
 * the number is furniture: it is there to be found when looked for, not read.
 */
export const SCROLLING_BAR_NUMBER_EVERY = 5;

/**
 * Writes a bar's number above the stave, at its bar line.
 *
 * **Counted from one**, as a player counts and as every printed part prints —
 * `bar` is the app's own index, which starts at zero.
 *
 * **Bar one is never drawn.** A part does not label its own first bar; the
 * number is there to be found in the middle of a piece, and "1" over the
 * opening bar tells a reader nothing they did not know.
 *
 * Drawn in the stave colour rather than the note colour, because it is
 * furniture: it belongs to the page, not to the music, and a player glancing
 * for the next note should not have it answered by a number.
 */
/**
 * What a bar is called, which is not always what it is counted as.
 *
 * Imported music carries the numbers from its own page and they win; see
 * `Exercise.barNumbers`. Everything else is numbered by counting, which is all
 * a generated exercise can be numbered by.
 *
 * Null where nothing should be drawn: the first bar of any piece — a part does
 * not label its own opening — and a bar the app inserted, which the page has no
 * name for.
 */
export function barLabel(exercise: Exercise, bar: number): string | null {
  if (bar <= 0) return null;
  const printed = exercise.barNumbers?.[bar];
  return printed === undefined ? String(bar + 1) : printed;
}

export function drawBarNumber(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  x: number,
  label: string | null,
  colour: string,
): void {
  if (label === null) return;
  const { staveSpace } = metrics;

  ctx.save();
  ctx.fillStyle = colour;
  // Smaller than it was, now that it shares the space above the stave with a
  // fingering's capsule: furniture set at the size of the music was taking room
  // the music needs.
  ctx.font = `500 ${Math.max(8, Math.round(staveSpace * BAR_NUMBER_SIZE))}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, metrics.topLineY - staveSpace * BAR_NUMBER_RISE);
  ctx.restore();
}

/**
 * The beat a tempo event's mark anchors to on the page, or null for events
 * that print nothing there.
 *
 * A step marks the beat it takes force; a rit marks where the broadening
 * begins — its far end needs no mark of its own, since either a new metronome
 * mark stands there or the music ends. A hold prints on its note rather than
 * over a bar line, and not until stage 3 gives it a glyph.
 */
export function tempoMarkBeat(event: TempoEvent): number | null {
  if (event.kind === 'tempo') return event.atBeat;
  if (event.kind === 'ramp') return event.fromBeat;
  return null;
}

/**
 * A change of key: the double bar, the naturals cancelling what is being left,
 * and the new signature.
 *
 * Positioned from the downbeat the change takes force at, and stacked leftwards
 * from there — the signature finishes where the downbeat's own clearance
 * begins. All of it has to fit between the last note of the old key and the
 * first of the new, which is why `keyChangeRoom` is reserved in the spacing
 * before any of this is drawn.
 *
 * Exported for the same reason `drawTempoEvent` is: the scrolling surface draws
 * one endless line rather than systems, and a change of key has to look the
 * same and sit in the same place whichever way the music is being read. It was
 * missing there entirely — the key simply switched in the fixed header as the
 * playhead crossed it, with nothing travelling towards the strike line to say
 * it was coming.
 */
/**
 * Draws a change of signature where it falls, ahead of the downbeat it governs.
 *
 * Laid out backwards from the downbeat, because that is the fixed point: the
 * note is positioned by the spacing and the apparatus has to fit in front of
 * it, in the room `signatureChangeRoom` reserved. Reading order is double bar,
 * then key, then metre — the same order the head of a line states them in.
 */
/**
 * Changes of signature falling strictly inside a stretch of music.
 *
 * Strictly, at both ends: a change at `fromBeat` is already stated by the
 * signature at the head of the line, and one at `toBeat` belongs to the line
 * after. Key and metre are collected into one entry per beat, because a part
 * that turns into 3/4 and into D major at the same bar prints one double bar
 * and two signatures — not two changes side by side.
 *
 * Shared by the two drawing paths, which is the point: a change the scrolling
 * line drew and the paged one did not would be the same music reading
 * differently in the two modes.
 */
export function signatureChangesIn(
  exercise: Exercise,
  fromBeat: number,
  toBeat: number,
): Map<number, SignatureChange> {
  const changes = new Map<number, SignatureChange>();
  const inside = (beat: number) => beat > fromBeat && beat < toBeat;

  for (const change of exercise.keys) {
    if (!inside(change.fromBeat)) continue;
    changes.set(change.fromBeat, {
      // The key being left, which is whatever was in force just before.
      key: { from: keyAt(exercise.keys, change.fromBeat - 1e-6), to: change.fifths },
    });
  }

  for (const change of exercise.metres) {
    if (!inside(change.fromBeat)) continue;
    const already = changes.get(change.fromBeat) ?? {};
    changes.set(change.fromBeat, { ...already, metre: change.metre });
  }

  return changes;
}

export function drawSignatureChange(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  downbeatX: number,
  change: SignatureChange,
  colour: string,
): void {
  const { staveSpace } = metrics;
  const keyWidth = change.key ? layoutKeySignature(metrics, change.key.to, change.key.from).width : 0;
  const metreWidth = change.metre
    ? timeSignatureWidth(metrics, change.metre.beatsPerBar, change.metre.beatUnit)
    : 0;
  if (keyWidth === 0 && metreWidth === 0) return;

  const startX = downbeatX - BAR_LINE_SETBACK * staveSpace - keyWidth - metreWidth;
  const lineX = startX - staveSpace * KEY_CHANGE_LEAD;

  ctx.strokeStyle = colour;
  drawBarLine(ctx, metrics, lineX);
  drawBarLine(ctx, metrics, lineX - staveSpace * DOUBLE_BAR_GAP);

  ctx.fillStyle = colour;
  if (change.key) drawKeySignature(ctx, metrics, startX, change.key.to, change.key.from);
  if (change.metre) {
    drawTimeSignature(ctx, metrics, startX + keyWidth, change.metre.beatsPerBar, change.metre.beatUnit);
  }
}

/**
 * A tempo event's mark above the stave: a cue-sized beat note with "= 96" for
 * a step, "rit." for a ramp.
 *
 * Drawn from the exercise's own tempo events and nowhere else: the mark is
 * the page stating what the clock will actually do, and both read the same
 * data so neither can lie about the other. The note is the notehead glyph
 * with a stem, not font text, because the music fonts are embedded as paths
 * and a ♩ from the system font would render differently on every device.
 *
 * **The note is the beat the number counts, which in compound time is a dotted
 * crotchet.** Printing a plain crotchet against a dotted-crotchet number is
 * the page misquoting its own clock by half again, and it is the same mistake
 * in ink that the tempo setting used to make in seconds.
 *
 * A ramp prints "rit." unconditionally because the plan writes no accels;
 * the day it does, the label needs the tempo in force, which is the map's to
 * answer rather than something to reconstruct here.
 *
 * Exported for the scrolling surface, which draws its own endless line rather
 * than systems and needs the same mark at the same beat.
 */
export function drawTempoEvent(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  x: number,
  event: TempoEvent,
  colour: string,
  dotted = false,
): void {
  const { staveSpace } = metrics;
  const y = metrics.topLineY - staveSpace * MARK_RISE;
  const textY = y + staveSpace * 0.4;

  ctx.save();
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (event.kind === 'tempo') {
    const headWidth = glyphWidth('noteheadBlack') * staveSpace * MARK_SCALE;
    const stemWidth = Math.max(1, staveSpace * 0.12 * MARK_SCALE);
    const stemRise = staveSpace * 2.6 * MARK_SCALE;

    drawGlyph(ctx, 'noteheadBlack', x, y, staveSpace * MARK_SCALE);
    // Up on the right of the head, as every stem this size is.
    ctx.fillRect(x + headWidth - stemWidth, y - stemRise, stemWidth, stemRise);

    /*
     * The dot sits after the head at the head's own height, exactly as it does
     * on the stave — and it is the same `augmentationDot` glyph the notes use,
     * not a drawn circle. Two reasons: a mark that quotes a dotted crotchet
     * should be printing the dot the reader has just seen on the page, and the
     * glyph is a path from the embedded font, so it renders identically
     * everywhere and through the SVG shim the engraving snapshots draw with.
     */
    let width = headWidth;
    if (dotted) {
      const gap = MARK_DOT_GAP * staveSpace * MARK_SCALE;
      drawGlyph(ctx, 'augmentationDot', x + headWidth + gap, y, staveSpace * MARK_SCALE);
      width = headWidth + gap + glyphWidth('augmentationDot') * staveSpace * MARK_SCALE;
    }

    ctx.font = `600 ${Math.round(staveSpace * 1.25)}px system-ui, sans-serif`;
    ctx.fillText(`= ${event.bpm}`, x + width + staveSpace * 0.5, textY);
  } else if (event.kind === 'ramp') {
    // Italic, as every printed part sets it.
    ctx.font = `italic 600 ${Math.round(staveSpace * 1.25)}px system-ui, sans-serif`;
    ctx.fillText('rit.', x, textY);
  }

  ctx.restore();
}

/**
 * How high above the top line a tune's name sits, in stave spaces.
 *
 * Above the metronome mark's band, because the two share a beat whenever a
 * medley opens — every exercise prints its tempo at beat 0, and a medley
 * prints its first tune's name there too. Printed selections stack them the
 * same way: title over tempo over the music.
 */
const LABEL_RISE = MARK_RISE + 2;

/**
 * A tune's name over the bar where it begins, as a printed medley sets one.
 *
 * Bold italic, which is how printed parts set a cue title — distinct at a
 * glance from a tempo mark, which is upright, and from a fingering hint,
 * which lives in a capsule. Exported for the scrolling surface, exactly as
 * `drawTempoEvent` is and for the same reason.
 */
export function drawLabelEvent(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  x: number,
  text: string,
  colour: string,
): void {
  const { staveSpace } = metrics;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 700 ${Math.round(staveSpace * 1.3)}px system-ui, sans-serif`;
  ctx.fillText(text, x, metrics.topLineY - staveSpace * LABEL_RISE);
  ctx.restore();
}

/**
 * The count band: the beat shading behind the notes, and the label bar
 * beneath the stave where the printed count lives (the player's design,
 * ratified 2026-09-03 — it replaced count marks drawn ABOVE the stave,
 * where they fought the bar numbers, tempo marks and fingering callouts
 * for one strip).
 *
 * Each pulse is a ribbon: over the stave it spans the pulse's ENGRAVED
 * width, behind the notes at a tint the music reads straight through;
 * below the bottom line its edges curve to the pulse's EVEN cell in the
 * label bar, where its syllables sit at even intervals. Engraving gives
 * room to the notes; the count is even in time; the curve is the eye's
 * guide between the two.
 *
 * The label bar and its syllables draw whenever the exercise carries a
 * count — they ARE the teaching. The tint is a run option (`tint`),
 * off elsewhere by default, on in rhythm mode; with it off the count
 * keeps its bar and only the colour goes. In an exercise with no count
 * at all the tint shades the stave region alone: there is no bar to
 * curve down to.
 *
 * All the colour rules the count was ruled with survive the move: bright
 * means an attack speaks (the note's own colour, so a demonstration
 * bar's count greys with its bar), dimmed-through-silence-and-sustain
 * wears the horizon grey.
 */
export function drawCountBand(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  options: {
    exercise: Exercise;
    firstBeat: number;
    lastBeat: number;
    xForBeat: (beat: number) => number;
    theme: StaveTheme;
    colourFor: (noteIndex: number) => string;
    /** Lowest y the band may reach — the system's own floor. */
    floorY: number;
    /** Whether the beat shading is on for this run. */
    tint: boolean;
    /** Horizontal cull for the scrolling surface; the page needs none. */
    clipX?: { min: number; max: number };
    /** The line's left margin — where the signature ends. Edges never
        reach left of it. */
    leftLimit?: number;
  },
): void {
  const { exercise, firstBeat, lastBeat, xForBeat, theme, tint } = options;
  const counted = (exercise.syllables?.length ?? 0) > 0;
  if (!counted && !tint) return;
  const { staveSpace, bottomLineY, topLineY } = metrics;

  /* Cell edges follow the engraver, not the notehead centres — see
     `cellEdgeX` for the fault its first cut had. */
  const columns = [...exercise.notes, ...exercise.rests]
    .map((event) => event.startBeat)
    .sort((a, b) => a - b);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const edgeFor = (beat: number, barLine: boolean) =>
    cellEdgeX(beat, {
      barLine,
      columns,
      xForBeat,
      setbackX: BAR_LINE_SETBACK * staveSpace,
      ...(options.leftLimit !== undefined ? { limit: options.leftLimit } : {}),
    });

  const cells = bandCells(exercise, firstBeat, lastBeat).filter((cell) => {
    if (!options.clipX) return true;
    return (
      xForBeat(cell.barToBeat) >= options.clipX.min &&
      xForBeat(cell.barFromBeat) <= options.clipX.max
    );
  });
  if (cells.length === 0) return;

  /*
   * Where the label bar sits on THIS system: just under this line's own
   * lowest notehead, never higher than the base gap, never past the
   * system's floor — per system rather than per bar, so the bar holds
   * one height across a line instead of wobbling under the reading eye.
   */
  let deepest = bottomLineY;
  for (const note of exercise.notes) {
    if (note.startBeat < firstBeat || note.startBeat >= lastBeat) continue;
    deepest = Math.max(deepest, yForPitch(metrics, note.pitch));
    if (note.alternative) deepest = Math.max(deepest, yForPitch(metrics, note.alternative.pitch));
  }
  const bandTop = Math.min(
    Math.max(bottomLineY + BAND_GAP * staveSpace, deepest + 0.6 * staveSpace),
    options.floorY - (BAND_HEIGHT + BAND_MARGIN) * staveSpace,
  );
  const bandBottom = bandTop + BAND_HEIGHT * staveSpace;

  ctx.save();

  if (tint) {
    const tintTop = topLineY - 0.75 * staveSpace;
    for (const cell of cells) {
      const barLeft = edgeFor(cell.barFromBeat, true);
      const barRight = edgeFor(cell.barToBeat, true);
      const topLeft = edgeFor(cell.fromBeat, near(cell.fromBeat, cell.barFromBeat));
      const topRight = edgeFor(cell.toBeat, near(cell.toBeat, cell.barToBeat));
      ctx.fillStyle = cell.pulse % 2 === 0 ? theme.beatBand : theme.beatBandAlt;
      if (!counted) {
        // No count, no bar: the shading alone, over the stave region.
        ctx.fillRect(topLeft, tintTop, topRight - topLeft, bottomLineY + 0.75 * staveSpace - tintTop);
        continue;
      }
      const botLeft = barLeft + cell.fromFraction * (barRight - barLeft);
      const botRight = barLeft + cell.toFraction * (barRight - barLeft);
      /* One ribbon: square over the stave, S-curved sides through the
         gap, square again through the label bar. */
      const curveMid = (bottomLineY + bandTop) / 2;
      ctx.beginPath();
      ctx.moveTo(topLeft, tintTop);
      ctx.lineTo(topRight, tintTop);
      ctx.lineTo(topRight, bottomLineY);
      ctx.bezierCurveTo(topRight, curveMid, botRight, curveMid, botRight, bandTop);
      ctx.lineTo(botRight, bandBottom);
      ctx.lineTo(botLeft, bandBottom);
      ctx.lineTo(botLeft, bandTop);
      ctx.bezierCurveTo(botLeft, curveMid, topLeft, curveMid, topLeft, bottomLineY);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (counted) {
    const middle = bandTop + (BAND_HEIGHT / 2) * staveSpace;
    /* Every mark's place, gathered once: the sustain loops span cells
       and bar lines, so they are drawn against the flat list, and the
       text goes on over them. */
    const marks: Array<{ x: number; atBeat: number; rest: boolean; text: string }> = [];
    for (const cell of cells) {
      const barLeft = edgeFor(cell.barFromBeat, true);
      const barRight = edgeFor(cell.barToBeat, true);
      for (const entry of cell.entries) {
        marks.push({
          x: barLeft + entry.fraction * (barRight - barLeft),
          atBeat: entry.atBeat,
          rest: entry.rest,
          text: entry.text,
        });
      }
    }

    /*
     * The sustain loops (the player, 2026-09-04): a quaver on 'e' and a
     * semiquaver on 'e' printed the same — one bright mark, dim
     * neighbours — because dim deliberately conflates sustain with
     * silence for the VOICE, which says nothing either way. The eye
     * needs the difference, so each sound long enough to cross a count
     * position wears a loop: a soft capsule grouping its attack's mark
     * with every mark it sounds through, stopping where silence begins,
     * crossing beat and bar lines for as long as the sound holds (tied
     * chains are one loop — `soundingSpans`). A sound too short to
     * reach the next mark gets none, which IS the semiquaver's signal.
     * Silence gets nothing, so a demonstration bar stays clean.
     */
    ctx.strokeStyle = theme.horizon;
    ctx.lineWidth = Math.max(1, staveSpace * 0.08);
    const halfHeight = 0.8 * staveSpace;
    const pad = 0.75 * staveSpace;
    for (const span of soundingSpans(exercise.notes)) {
      if (span.to <= firstBeat + 1e-6 || span.from >= lastBeat - 1e-6) continue;
      const inSpan = marks.filter(
        (mark) => mark.atBeat >= span.from - 1e-6 && mark.atBeat < span.to - 1e-6,
      );
      /* One mark is a sound with nothing to group — unless the sound
         began on an earlier line, where the lone continuation mark
         still deserves its loop. */
      if (inSpan.length < 2 && !(inSpan.length === 1 && span.from < firstBeat - 1e-6)) continue;
      ctx.beginPath();
      roundedRect(
        ctx,
        inSpan[0].x - pad,
        middle - halfHeight,
        inSpan[inSpan.length - 1].x + pad - (inSpan[0].x - pad),
        2 * halfHeight,
        halfHeight,
      );
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(staveSpace * 1.05)}px system-ui, sans-serif`;
    for (const mark of marks) {
      // A count over silence or sustain wears the horizon grey: the
      // count continues, and quietly.
      const index = mark.rest
        ? -1
        : exercise.notes.findIndex((note) => Math.abs(note.startBeat - mark.atBeat) < 1e-9);
      ctx.fillStyle = mark.rest
        ? theme.horizon
        : index >= 0
          ? options.colourFor(index)
          : theme.note;
      ctx.fillText(mark.text, mark.x, middle);
    }
  }

  ctx.restore();
}

export function drawSystem(ctx: CanvasRenderingContext2D, options: SystemOptions): void {
  const { exercise, metrics, xForBeat, theme, firstBar, lastBar } = options;
  const { staveSpace } = metrics;
  const firstBeat = beatOfBar(exercise.metres, firstBar);
  const lastBeat = Math.min(exercise.totalBeats, beatOfBar(exercise.metres, lastBar));
  // The signature the system opens in. A change part-way along a line is a
  // thing to draw where it falls, as key changes already are; the header states
  // what is in force at the bar line the line begins on.
  const { beatsPerBar, beatUnit } = metreAt(exercise.metres, firstBeat);
  const rightEdge = xForBeat(lastBeat) - BAR_LINE_SETBACK * staveSpace;

  /* The bar being played now, painted first so the stave sits on top. */
  const answer = options.answerSpan;
  if (answer && answer[1] > firstBeat + 1e-9 && answer[0] < lastBeat - 1e-9) {
    /* Set back like the bar lines themselves, so the wash fills the bar
       it names instead of starting on its first notehead and bleeding
       into the next bar's opening (found with the count band's edges,
       2026-09-04). */
    const left = xForBeat(Math.max(answer[0], firstBeat)) - BAR_LINE_SETBACK * staveSpace;
    const right = xForBeat(Math.min(answer[1], lastBeat)) - BAR_LINE_SETBACK * staveSpace;
    ctx.fillStyle = theme.answer;
    ctx.fillRect(left, metrics.topLineY - staveSpace * 1.5, right - left, staveSpace * 7);
  }

  ctx.strokeStyle = theme.stave;
  ctx.fillStyle = theme.stave;
  drawStaveLines(ctx, metrics, 0, rightEdge);

  // The key and time signature are drawn regardless; only the clef is ever
  // skipped, from a plain margin in its place. See `SystemOptions.clef`.
  let x = staveSpace * MUSIC_MARGIN;
  if (options.clef) x = drawClef(ctx, metrics, x);
  // The key this system opens in, which is not necessarily the one the
  // exercise opened in.
  x = drawKeySignature(ctx, metrics, x, keyAt(exercise.keys, firstBeat));
  // Where the music proper starts, which is where a tie arriving from the
  // system above has to begin.
  const musicLeft = drawTimeSignature(ctx, metrics, x, beatsPerBar, beatUnit);

  /*
   * Changes of key or metre falling inside this system, as opposed to at its
   * head — the one at the head is already stated by the signature above.
   *
   * Each takes the full apparatus a part prints: a double bar to say something
   * structural is happening, the naturals cancelling what is being left, then
   * the new signature. All of it has to sit between the last note of the old
   * key and the first note of the new one, which is why `signatureChangeRoom`
   * is reserved in the spacing before any of this is drawn.
   */
  const changes = signatureChangesIn(exercise, firstBeat, lastBeat);

  /*
   * Every bar line except the one at the head of the system, which the start
   * of the stave already marks; those belonging to a change, which are drawn
   * below at the position the signature leaves them; and those a multi-bar
   * rest swallows. An engraved multi-bar rest has a line at each end and
   * nothing between — the count says how many bars are in there, and drawing
   * nineteen lines through it would contradict the number and be unreadable.
   */
  const spans = multiRestSpans(exercise);
  ctx.strokeStyle = theme.stave;
  for (let bar = firstBar + 1; ; bar++) {
    const beat = beatOfBar(exercise.metres, bar);
    if (beat > lastBeat) break;
    if (changes.has(beat) || insideMultiRest(spans, beat)) continue;
    drawBarLine(ctx, metrics, xForBeat(beat) - BAR_LINE_SETBACK * staveSpace);
  }

  for (const [beat, change] of changes) {
    drawSignatureChange(ctx, metrics, xForBeat(beat), change, theme.stave);
  }

  /*
   * The system's own number, at its head, which is where a printed part puts
   * one — a reader looking for bar 47 scans down the left margin, not along
   * the music.
   *
   * Placed against `musicLeft` rather than the bar line, because the head of a
   * system is the one bar line that is not drawn: the clef and signatures stand
   * in its place, and a number floating left of them would sit outside the
   * line entirely.
   */
  drawBarNumber(ctx, metrics, musicLeft, barLabel(exercise, firstBar), theme.stave);

  for (const rest of exercise.rests) {
    if (rest.startBeat < firstBeat || rest.startBeat >= lastBeat) continue;
    if (isMultiRest(rest)) continue;
    drawRest(ctx, metrics, xForBeat(rest.startBeat), rest.duration, theme.stave);
  }

  /*
   * Multi-bar rests, drawn between their two bar lines rather than at a point.
   * Inset by the same setback the lines themselves take, so the bar sits inside
   * the bar it fills instead of running into the lines at either end.
   */
  for (const span of spans) {
    if (span.fromBeat < firstBeat || span.fromBeat >= lastBeat) continue;
    drawMultiBarRest(
      ctx,
      metrics,
      xForBeat(span.fromBeat) + staveSpace,
      xForBeat(span.toBeat) - BAR_LINE_SETBACK * staveSpace - staveSpace,
      span.bars,
      theme.stave,
    );
  }

  /*
   * Tempo marks falling on this system — including at its head, unlike a key
   * change there: the signature restates a key on every line, but nothing
   * restates a tempo, so a mark landing where the page turned must still be
   * seen.
   */
  for (const event of exercise.tempo) {
    const beat = tempoMarkBeat(event);
    if (beat === null || beat < firstBeat || beat >= lastBeat) continue;
    drawTempoEvent(
      ctx,
      metrics,
      xForBeat(beat) - BAR_LINE_SETBACK * staveSpace,
      event,
      theme.note,
      metreAt(exercise.metres, beat).isCompound,
    );
  }

  // Tune names falling on this system, by the same rule as the tempo marks:
  // a name landing where the page turned must still be seen.
  for (const label of exercise.labels) {
    if (label.atBeat < firstBeat || label.atBeat >= lastBeat) continue;
    drawLabelEvent(
      ctx,
      metrics,
      xForBeat(label.atBeat) - BAR_LINE_SETBACK * staveSpace,
      label.text,
      theme.note,
    );
  }

  /*
   * The count band: beat shading behind the notes and the label bar
   * beneath the stave — where the printed count moved on 2026-09-03,
   * out of the crowded strip above. Painted here, AFTER the stave and
   * before the notes, so the tint sits behind the music it segments.
   */
  drawCountBand(ctx, metrics, {
    exercise,
    firstBeat,
    lastBeat,
    xForBeat,
    theme,
    colourFor: options.colourFor,
    floorY: options.bandFloorY ?? metrics.bottomLineY + 3.5 * staveSpace,
    tint: options.beatTint === true,
    leftLimit: musicLeft,
  });

  const loose: LayoutNote[] = [];
  const beamed = new Map<number, LayoutNote[]>();
  const tuplets = new Map<number, TupletMember[]>();
  const hints: Array<{ note: LayoutNote; text: string; room: number }> = [];

  exercise.notes.forEach((note, index) => {
    if (note.startBeat < firstBeat || note.startBeat >= lastBeat) return;

    const headWidth = noteheadWidth(metrics, note.duration);
    const centre = xForBeat(note.startBeat);
    const item: LayoutNote = {
      x: centre - headWidth / 2,
      pitch: note.pitch,
      duration: note.duration,
      showAccidental: note.showAccidental,
      colour: options.colourFor(index),
      /*
       * Divisi. Easy to forget here, and it was: `LayoutNote` is built in two
       * places — the scrolling surface and this one — and only the surface was
       * wired first, so the play screen printed both heads and the review
       * sheet, the SVG renderer and the engraving snapshots all printed one.
       * The reviewer saw the Prelude in its true register with none of its
       * offers, which is the piece at its least readable.
       */
      ...(note.alternative
        ? {
            alternative: {
              pitch: note.alternative.pitch,
              showAccidental: note.alternative.showAccidental,
            },
          }
        : {}),
    };

    if (note.tupletGroup >= 0) {
      const group = tuplets.get(note.tupletGroup) ?? [];
      group.push(item);
      tuplets.set(note.tupletGroup, group);
    }

    if (note.beamGroup >= 0) {
      const group = beamed.get(note.beamGroup) ?? [];
      group.push(item);
      beamed.set(note.beamGroup, group);
    } else {
      loose.push(item);
    }

    const annotation = options.annotationFor?.(index);
    if (annotation) annotate(ctx, metrics, centre, annotation, item.colour);

    const hint = options.hintFor?.(index);
    if (hint) {
      const next = exercise.notes[index + 1];
      const room =
        next && next.startBeat < lastBeat ? xForBeat(next.startBeat) - centre : rightEdge - centre;
      hints.push({ note: item, text: hint, room });
    }
  });

  for (const note of loose) drawNote(ctx, metrics, note);
  for (const group of beamed.values()) drawBeamGroup(ctx, metrics, group);
  /*
   * After the notes, because the bracket is placed against where their stems
   * actually ended up, and before the ties, which arch over everything.
   *
   * A group cut in half by a system break draws the part that is on this
   * system: the same treatment a beam gets, and the same reasoning — half a
   * bracket at the margin says "this continues" where nothing at all would say
   * the rhythm changed.
   */
  /* The silent members: a rest inside a figure stretches its bracket. */
  for (const rest of exercise.rests) {
    if (rest.tupletGroup === undefined || rest.startBeat < firstBeat || rest.startBeat >= lastBeat) {
      continue;
    }
    const group = tuplets.get(rest.tupletGroup) ?? [];
    group.push({ x: xForBeat(rest.startBeat), duration: rest.duration });
    tuplets.set(rest.tupletGroup, group);
  }
  for (const group of tuplets.values()) {
    drawTuplet(ctx, metrics, group.sort((a, b) => a.x - b.x), 3, theme.note);
  }

  /*
   * Ties, drawn over the notes rather than with them.
   *
   * A tie belongs to two noteheads, and on an engraved page those two are
   * routinely on different lines: the whole point of the thing is that it
   * crosses a bar line, and a system break is a bar line. So each end is placed
   * independently — against its notehead if that note is on this system, and
   * against the margin if it is not — which draws the half of the tie that
   * belongs here and leaves the other half to the system that owns it.
   */
  exercise.notes.forEach((note, index) => {
    const next = exercise.notes[index + 1];
    if (!note.tiedToNext || !next) return;

    const headHere = note.startBeat >= firstBeat && note.startBeat < lastBeat;
    const tailHere = next.startBeat >= firstBeat && next.startBeat < lastBeat;
    if (!headHere && !tailHere) return;

    drawTie(ctx, metrics, {
      from: headHere
        ? { x: xForBeat(note.startBeat), headWidth: noteheadWidth(metrics, note.duration) }
        : { x: musicLeft },
      to: tailHere
        ? { x: xForBeat(next.startBeat), headWidth: noteheadWidth(metrics, next.duration) }
        : { x: rightEdge },
      pitch: note.pitch,
      colour: options.colourFor(index),
    });
  });

  for (const { note, text, room } of hints) {
    drawFingeringHint(ctx, metrics, note, text, room, theme.hint, theme.background);
  }

  if (options.final) {
    ctx.strokeStyle = theme.stave;
    drawBarLine(ctx, metrics, rightEdge);
    ctx.fillStyle = theme.stave;
    ctx.fillRect(rightEdge + staveSpace * 0.35, metrics.topLineY, staveSpace * 0.35, staveSpace * 4);
  }
}

function annotate(
  ctx: CanvasRenderingContext2D,
  metrics: StaveMetrics,
  centreX: number,
  text: string,
  colour: string,
): void {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.font = `600 ${Math.round(metrics.staveSpace * 1.25)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, centreX, metrics.bottomLineY + metrics.staveSpace * ANNOTATION_OFFSET);
  ctx.restore();
}
