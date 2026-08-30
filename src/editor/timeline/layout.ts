/**
 * The timeline's x-axis, measured in BARS — the player's ruling of
 * 2026-08-29, and the second correction to this axis in one evening.
 *
 * The percent ruler lied: with per-segment rules, a segment drawn at 25% of
 * the level and one drawn at 5% could both need eight bars. Widths became
 * *time* next, which was true but one derivation too far — and it left
 * dragging meaningless, because nothing about a divider's position in
 * seconds was the author's to set. **The bar is the unit the rules are
 * written in, the unit the player plays, and the only one an author can act
 * on**, so it is the unit of the picture:
 *
 * - a segment's width is the bars its rule asks for;
 * - the level's length is the sum of them (six stages of eight bars is a
 *   48-bar level, and it says so);
 * - **dragging a divider redistributes bars between the two stages it
 *   separates** and writes the result into their rules — the total is
 *   unchanged, because moving a boundary moves bars from one side to the
 *   other and nowhere else;
 * - editing a rule changes the level's length (eight bars to ten makes a
 *   48-bar level a 50-bar one), and adding or deleting a division adds or
 *   removes a stage of its own length.
 *
 * Time is still drawn, because the tempo is known and "how long is this
 * level?" is a fair question — but as a label on the bars, never as the
 * measure itself.
 *
 * The stored `at` fractions remain what they have always been at runtime:
 * an ordinal encoding. The app steps segments, so only their order and
 * their coincidences are real; bar offsets are derived here from the rules,
 * and a drag writes bars rather than positions.
 */

import { metreFor } from '../../domain/metre';
import { boundariesOf, type AxisId, type TimelineFragment } from './axis-model';
import { themeById } from '../../exercise/collections';

/** Where no tempo is named anywhere, the estimate stands on this and says so. */
export const ASSUMED_TEMPO = 80;

const EPSILON = 1e-9;
const same = (a: number, b: number) => Math.abs(a - b) < EPSILON;
const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), Math.max(low, high));

export interface SegmentRuleShape {
  minBars: number;
  score?: { atLeast: number; overBars: number };
}

/**
 * A rule resized to a stage of `bars` — **the score window follows the
 * stage down** (ruled by the player, 2026-08-29).
 *
 * The window used to be a floor on how short a stage could be dragged,
 * which was logical and unusable: an author moving a divider two bars from
 * its neighbour was stopped four bars away by a figure they had never set,
 * with nothing on screen to explain the wall. The rule bends instead.
 *
 * Nothing is lost by bending it. Evidence is per-segment by construction
 * since `carryEvidence` was retired — the window can only ever be filled by
 * bars played inside this very stage — so a window longer than the stage
 * only ever meant "and play on past the minimum until it is full", which is
 * not what an author dragging a divider to two bars is asking for. Widening
 * a stage does not widen its window again: the author set that figure, and
 * only squeezing it was ever the machine's business.
 */
export function fitRule(rule: SegmentRuleShape, bars: number): SegmentRuleShape {
  return {
    minBars: bars,
    ...(rule.score
      ? { score: { ...rule.score, overBars: Math.min(rule.score.overBars, bars) } }
      : {}),
  };
}

export interface SegmentLayout {
  /** The stored boundary that begins this segment. */
  at: number;
  /** Bars to progress: the rule's floor, or the score window if wider. */
  bars: number;
  /** Bars from the start of the level, 0-based. */
  barStart: number;
  seconds: number;
  tempo: number;
  /** True where the tempo is nobody's — the stated assumption is in force. */
  assumedTempo: boolean;
  /** Whether the segment carries its own authored rule. */
  authored: boolean;
  rule: SegmentRuleShape;
  /** Fraction of the level where the segment begins and ends. */
  x0: number;
  x1: number;
}

export interface Layout {
  segments: SegmentLayout[];
  totalBars: number;
  totalSeconds: number;
  /** The level default these segments fell back to, for writing rules back. */
  levelRule: SegmentRuleShape;
}

/** The value the named axis has in force at a boundary, read left. */
function inForce(fragment: TimelineFragment, axisId: string, at: number): unknown {
  const axis = fragment.axes.find((a) => a.axis === axisId);
  if (!axis) return undefined;
  let value: unknown;
  for (const division of axis.divisions) {
    if (division.at <= at + EPSILON) value = division.value;
  }
  return value;
}

/**
 * Every segment, in bars and in the time those bars take. The one layout the
 * ruler, the bars, the chips and the drag all read — two of these and the
 * picture could disagree with itself.
 */
export function layoutOf(
  fragment: TimelineFragment,
  levelRule: SegmentRuleShape,
  header: { tempo?: number; metre?: readonly [number, number] },
): Layout {
  let barStart = 0;
  const segments = boundariesOf(fragment.axes).map((at) => {
    const override = fragment.segmentRules?.find((rule) => same(rule.at, at));
    const rule: SegmentRuleShape = override
      ? { minBars: override.minBars, ...(override.score ? { score: override.score } : {}) }
      : levelRule;
    /*
     * A window longer than the minimum is what the stage actually asks for,
     * so it is what the picture draws. The editor keeps them in step
     * (`fitRule`), so this only ever differs for a document written by hand
     * or by an older editor — and then the truth is the longer figure.
     */
    /*
     * **A stage is as wide as the music it holds** (generalised 2026-08-30,
     * on the player's ruling, from the themes-only version of the morning).
     *
     * Two different things are called "bars" and only one of them was ever
     * drawn. `rule.minBars` is a gate on ADVANCEMENT — how long you must
     * play before the next step is offered. A length axis says how much
     * music the generator WRITES. Where a level moves one, the stage was
     * drawn at the rule's figure and so a stage asking for sixteen bars of
     * sight-reading was drawn eight bars wide: the picture disagreeing with
     * what plays, which is the fault that got percent and time thrown out
     * as x-axes in the first place.
     *
     * So the music's own length wins, from whichever axis states it:
     *
     * - **themes** — the tune's own `bars`. A tune is as long as it is, and
     *   the author does not set it at all.
     * - **bars** — the sight-reading length the author asked for.
     * - **cycles** is deliberately NOT here: a cycle's length in bars
     *   depends on how many notes the drill has in the key it is played in
     *   (two cycles of an octave being seven bars of four-four exactly, and
     *   other keys differing), so there is no honest static conversion.
     *   Drills keep the rule's figure until there is one.
     *
     * The rule still governs advancement, and still floors the width: a
     * level asking for eight bars of music but sixteen bars of playing
     * means reading it twice, and sixteen is then the honest width.
     */
    const tune = inForce(fragment, 'themes', at);
    const tuneBars =
      typeof tune === 'object' && tune !== null
        ? themeById(String((tune as { id?: unknown }).id))?.bars
        : undefined;
    const axisBars = inForce(fragment, 'bars', at);
    const musicBars =
      tuneBars ?? (typeof axisBars === 'number' && axisBars > 0 ? axisBars : undefined);
    const ruleBars = Math.max(rule.minBars, rule.score?.overBars ?? 0);
    const bars = musicBars === undefined ? ruleBars : Math.max(musicBars, ruleBars);

    const axisTempo = inForce(fragment, 'tempo', at);
    const tempo =
      typeof axisTempo === 'number' && axisTempo > 0
        ? axisTempo
        : typeof header.tempo === 'number'
          ? header.tempo
          : ASSUMED_TEMPO;
    const assumedTempo = typeof axisTempo !== 'number' && typeof header.tempo !== 'number';

    const axisMetre = inForce(fragment, 'metre', at);
    const metre = Array.isArray(axisMetre) ? axisMetre : (header.metre ?? [4, 4]);
    const barBeats = metreFor(Number(metre[0]), Number(metre[1])).barBeats;

    const segment = {
      at,
      rule,
      bars,
      barStart,
      tempo,
      assumedTempo,
      authored: override !== undefined,
      seconds: (bars * barBeats * 60) / tempo,
    };
    barStart += bars;
    return segment;
  });

  const totalBars = barStart;
  return {
    segments: segments.map((segment) => ({
      ...segment,
      x0: segment.barStart / totalBars,
      x1: (segment.barStart + segment.bars) / totalBars,
    })),
    totalBars,
    totalSeconds: segments.reduce((sum, segment) => sum + segment.seconds, 0),
    levelRule,
  };
}

/** A stored boundary's position along the level, as a fraction. */
export function xOfAt(layout: Layout, at: number): number {
  const segment = layout.segments.find((candidate) => same(candidate.at, at));
  return segment ? segment.x0 : 1;
}

/** Seconds as a player reads them: 0:32, 4:07. */
export function formatSeconds(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface BarDrag {
  /** The bar the divider lands on, counted from the start of the level. */
  bar: number;
  /** Where the guide draws, as a fraction of the level. */
  x: number;
  /** True when it lands on a bar another axis already changes at. */
  aligned: boolean;
}

/** Which bar a stored boundary begins at. */
function barOfAt(layout: Layout, at: number): number {
  const segment = layout.segments.find((candidate) => same(candidate.at, at));
  return segment ? segment.barStart : layout.totalBars;
}

/**
 * What a pointer position means for a divider in flight.
 *
 * **The only fence is this axis's own neighbours** (the player's ruling of
 * 2026-08-29, on finding a conductor divider penned in by the tempo steps
 * either side of it). A value must begin after the one before it and before
 * the one after it, and that is all: every *other* axis's boundary is a
 * place this divider may land, never a wall it stops at. Landing on one is
 * how two axes come to change at the same bar.
 *
 * Bars are whole, so a drop always lands on a bar line the music has.
 */
export function resolveBarDrag(
  fragment: TimelineFragment,
  layout: Layout,
  axisId: AxisId,
  index: number,
  pointerX: number,
): BarDrag | null {
  const axis = fragment.axes.find((a) => a.axis === axisId);
  const division = axis?.divisions[index];
  // The division an axis opens with is the start of the level, not a divider.
  if (!axis || !division || index <= 0) return null;

  const previous = barOfAt(layout, axis.divisions[index - 1].at);
  const next =
    index + 1 < axis.divisions.length
      ? barOfAt(layout, axis.divisions[index + 1].at)
      : layout.totalBars;
  const bar = clamp(Math.round(pointerX * layout.totalBars), previous + 1, next - 1);

  const landing = layout.segments.find((segment) => segment.barStart === bar);
  return {
    bar,
    x: bar / layout.totalBars,
    aligned: landing !== undefined && !same(landing.at, division.at),
  };
}

/**
 * The drop, written into the document.
 *
 * One operation, whatever the drag looked like: **take the divider out and
 * put it back where it was dropped.** Taking it out merges the stage it
 * began into the one before it (unless another axis holds that boundary
 * too, in which case nothing merges); putting it back either lands on a
 * boundary that is already there — the two axes now change at the same bar —
 * or splits the stage it lands in. Every other stage keeps its bars and its
 * place, so the level is exactly as long as it was: bars crossed a border
 * rather than appearing.
 *
 * Only the rules whose stage actually changed length are written, and a
 * stage that sits at the level default is left to it.
 */
export function applyBarDrag(
  fragment: TimelineFragment,
  layout: Layout,
  axisId: AxisId,
  index: number,
  drag: BarDrag,
  /**
   * Whether stored positions may be renumbered onto their bars. False where
   * the timeline carries an axis inherited from the course: those positions
   * belong to the course document, and renumbering half of a shared set
   * would leave the two disagreeing about which boundaries coincide.
   */
  renumber = true,
): TimelineFragment {
  const axis = fragment.axes.find((a) => a.axis === axisId);
  const division = axis?.divisions[index];
  if (!axis || !division) return fragment;
  const b = layout.segments.findIndex((segment) => same(segment.at, division.at));
  if (b <= 0) return fragment;

  const shared = fragment.axes.some(
    (other) =>
      other.axis !== axisId && other.divisions.some((d) => same(d.at, division.at)),
  );

  interface Stage {
    at: number;
    bars: number;
    rule: SegmentRuleShape;
  }

  // Out: the stage this divider began is absorbed by the one before it.
  const base: Stage[] = [];
  layout.segments.forEach((segment, i) => {
    if (i === b && !shared) base[base.length - 1].bars += segment.bars;
    else base.push({ at: segment.at, bars: segment.bars, rule: segment.rule });
  });

  // Back in, at the bar it was dropped on.
  const starts: number[] = [];
  let offset = 0;
  for (const stage of base) {
    starts.push(offset);
    offset += stage.bars;
  }
  const landing = starts.indexOf(drag.bar);
  let planned: Stage[];
  /** The stage this divider now begins, by its position before renumbering. */
  let landedOn: number;
  if (landing >= 0) {
    planned = base;
    landedOn = base[landing].at;
  } else {
    let host = 0;
    for (let i = 0; i < base.length; i += 1) if (starts[i] < drag.bar) host = i;
    const first = drag.bar - starts[host];
    const after = host + 1 < base.length ? base[host + 1].at : 1;
    landedOn = (base[host].at + after) / 2;
    planned = [
      ...base.slice(0, host),
      { at: base[host].at, bars: first, rule: base[host].rule },
      { at: landedOn, bars: base[host].bars - first, rule: base[host].rule },
      ...base.slice(host + 1),
    ];
  }

  /*
   * Stored positions are renormalised onto the bars they now begin at.
   * `at` is ordinal at runtime, so this changes nothing about what plays —
   * but distinct stages are distinct bars, which keeps two divisions from
   * ever landing on one `at` after a long evening of halving midpoints, and
   * leaves a saved document reading as the picture looks.
   */
  const total = planned.reduce((sum, stage) => sum + stage.bars, 0);
  let running = 0;
  const remapped = planned.map((stage) => {
    const at = renumber ? running / total : stage.at;
    running += stage.bars;
    return { ...stage, from: stage.at, at };
  });

  const renumbered = (from: number, fallback: number) =>
    remapped.find((stage) => same(stage.from, from))?.at ?? fallback;
  const axes = fragment.axes.map((candidate) => ({
    ...candidate,
    divisions: candidate.divisions
      .map((d, i) =>
        candidate.axis === axisId && i === index
          ? // The dragged one goes to the stage it landed on; every other
            // division stays on its own boundary, wherever that renumbered to.
            { ...d, at: renumbered(landedOn, d.at) }
          : { ...d, at: renumbered(d.at, d.at) },
      )
      .sort((a, c) => a.at - c.at),
  }));

  /*
   * A length axis takes the widths the drag produced, so the music the
   * generator writes matches the stage the author just sized. This is what
   * makes dragging mean anything at all on such a level: the bars crossed a
   * border, exactly as the bars-as-x-axis ruling says, and the level's total
   * length is unchanged.
   */
  const withLengths = axes.map((candidate) => {
    if (candidate.axis !== 'bars') return candidate;
    return {
      ...candidate,
      divisions: candidate.divisions.map((d) => {
        const stage = remapped.find((entry) => same(entry.at, d.at));
        return stage ? { ...d, value: stage.bars } : d;
      }),
    };
  });

  const defaultBars = Math.max(
    layout.levelRule.minBars,
    layout.levelRule.score?.overBars ?? 0,
  );
  /*
   * Where a LENGTH AXIS governs a stage's width, the drag writes that axis
   * rather than the rule (2026-08-30, with the ruling that a stage is as
   * wide as the music it holds).
   *
   * Writing the rule there would move the divider and change nothing: the
   * width comes from the axis, so the picture would snap straight back and
   * the level would have silently grown instead. `themes` is excluded —
   * a tune's length is the music's and not the author's, which is why a
   * themes divider offers no drag handle at all.
   */
  const lengthAxis = fragment.axes.find((candidate) => candidate.axis === 'bars');
  const segmentRules = remapped.flatMap((stage) => {
    const authored = fragment.segmentRules?.find((rule) => same(rule.at, stage.from));
    /* The rule keeps its own meaning — the gate on advancement — and is
       only trimmed where it would now exceed the music it judges. */
    if (lengthAxis) {
      if (!authored) return [];
      return [{ at: stage.at, ...fitRule(authored, Math.min(authored.minBars, stage.bars)) }];
    }
    if (!authored && stage.bars === defaultBars) return [];
    return [{ at: stage.at, ...fitRule(stage.rule, stage.bars) }];
  });

  return { axes: withLengths, ...(segmentRules.length ? { segmentRules } : {}) };
}

export function insertAt(layout: Layout): number {
  let widest = layout.segments[0];
  for (const segment of layout.segments) {
    if (segment.bars > widest.bars) widest = segment;
  }
  const index = layout.segments.indexOf(widest);
  const after = layout.segments[index + 1]?.at ?? 1;
  return (widest.at + after) / 2;
}
