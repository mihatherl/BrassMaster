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
import { boundariesOf, clearRule, setRule, type AxisId, type TimelineFragment } from './axis-model';

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
     * A score window longer than the minimum is what the segment actually
     * asks for, so it is what the picture draws — the drag keeps each side
     * at or above its own window for the same reason.
     */
    const bars = Math.max(rule.minBars, rule.score?.overBars ?? 0);

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
  /**
   * What dropping here would do.
   *
   * `redistribute` — the ordinary case: bars move from one side of the
   * divider to the other. `merge` — the segment between this divider and
   * its neighbour has been squeezed to nothing, so the two boundaries
   * become one and the axes change together there. `separate` — this
   * divider shares a boundary with another axis and is being pulled off it,
   * splitting the segment it lands in.
   */
  kind: 'redistribute' | 'merge' | 'separate';
  /** The bar the divider lands on, counted from the start of the level. */
  bar: number;
  /** Where the guide draws, as a fraction of the level. */
  x: number;
}

/** Which boundary index a division sits on, or -1. */
function boundaryIndex(layout: Layout, at: number): number {
  return layout.segments.findIndex((segment) => same(segment.at, at));
}

/**
 * What a pointer position means for a divider in flight.
 *
 * A divider lives between two stages and owns the border between them: drag
 * it and bars cross that border, one whole bar at a time — the unit the
 * picture is drawn in, so a divider can never land anywhere the music
 * cannot. It stops where a stage would be squeezed below one bar (or below
 * its own score window, which is a longer ask), except where squeezing the
 * last bar out would put it exactly on a neighbouring boundary, which is
 * how two axes come to change at the same bar.
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
  if (!axis || !division || index <= 0) return null;
  const b = boundaryIndex(layout, division.at);
  if (b <= 0) return null;

  const left = layout.segments[b - 1];
  const right = layout.segments[b];
  const beyond = layout.segments[b + 1];
  const low = left.barStart;
  const high = right.barStart + right.bars;

  /*
   * A boundary this divider shares with another axis cannot be dragged away
   * wholesale — the other axis still changes there — so the drag pulls this
   * divider off it instead, splitting whichever stage it lands in.
   */
  const shared = fragment.axes.some(
    (other) =>
      other.axis !== axisId && other.divisions.some((d) => same(d.at, division.at)),
  );
  /** Two divisions of one axis may never sit on the same bar. */
  const ownBoundary = (at: number) => axis.divisions.some((d) => same(d.at, at));
  const minLeft = Math.max(1, left.rule.score?.overBars ?? 1);
  const minRight = Math.max(1, right.rule.score?.overBars ?? 1);

  const raw = Math.round(pointerX * layout.totalBars);
  if (!shared && raw <= low && !ownBoundary(left.at)) {
    return { kind: 'merge', bar: low, x: low / layout.totalBars };
  }
  if (!shared && beyond && raw >= high && !ownBoundary(beyond.at)) {
    return { kind: 'merge', bar: high, x: high / layout.totalBars };
  }
  const bar = clamp(raw, low + minLeft, high - minRight);
  return {
    kind: shared ? 'separate' : 'redistribute',
    bar,
    x: bar / layout.totalBars,
  };
}

/**
 * The drop, written into the document — as bars in the two rules the
 * divider stands between, which is the whole of what a drag means now.
 *
 * Nothing else is touched: the stages either side of the border change
 * length, every other stage keeps the rule its author gave it, and the
 * level's total is unchanged because the bars crossed the border rather
 * than appearing.
 */
export function applyBarDrag(
  fragment: TimelineFragment,
  layout: Layout,
  axisId: AxisId,
  index: number,
  drag: BarDrag,
): TimelineFragment {
  const axis = fragment.axes.find((a) => a.axis === axisId);
  const division = axis?.divisions[index];
  if (!axis || !division) return fragment;
  const b = boundaryIndex(layout, division.at);
  if (b <= 0) return fragment;

  const left = layout.segments[b - 1];
  const right = layout.segments[b];
  const beyond = layout.segments[b + 1];
  const pair = left.bars + right.bars;

  if (drag.kind === 'redistribute') {
    const leftBars = drag.bar - left.barStart;
    let next = setRule(fragment, left.at, { ...left.rule, minBars: leftBars });
    return setRule(next, right.at, { ...right.rule, minBars: pair - leftBars });
  }

  if (drag.kind === 'merge') {
    /*
     * The stage between the two boundaries has been squeezed out. The
     * divider joins the boundary it was pushed against; the stage that
     * survives keeps every bar the pair had, so the level is no shorter for
     * the merge, and the rule keyed at the vanished boundary goes with it.
     */
    const joinsLeft = drag.bar === left.barStart;
    let next = setDivisionAt(
      fragment,
      axisId,
      index,
      joinsLeft ? left.at : (beyond?.at ?? right.at),
    );
    // Either way the boundary this divider held is gone and the stage that
    // begins at the boundary to its left is the one that survives, so it
    // keeps its own rule and the pair's whole length.
    next = clearRule(next, right.at);
    return setRule(next, left.at, { ...left.rule, minBars: pair });
  }

  /*
   * Pulled off a shared boundary: a new boundary is born where it lands,
   * and the stage it lands in gives up the bars on the far side of it.
   */
  const inLeft = drag.bar < right.barStart;
  const host = inLeft ? left : right;
  const after = inLeft ? right.at : (beyond?.at ?? 1);
  const newAt = (host.at + after) / 2;
  const firstBars = drag.bar - host.barStart;
  let next = setDivisionAt(fragment, axisId, index, newAt);
  next = setRule(next, host.at, { ...host.rule, minBars: firstBars });
  return setRule(next, newAt, { ...host.rule, minBars: host.bars - firstBars });
}

/**
 * Moves a division to a stored position, and nothing else.
 *
 * The rule-carrying `moveDivision` this replaces belonged to the percent
 * era, where a rule and a position were independent things. Under bars a
 * rule *is* a length, so what a move does to the rules depends on what the
 * move meant — which is why the three cases above write them themselves.
 */
export function setDivisionAt(
  fragment: TimelineFragment,
  axisId: AxisId,
  index: number,
  at: number,
): TimelineFragment {
  return {
    ...fragment,
    axes: fragment.axes.map((axis) =>
      axis.axis === axisId
        ? {
            ...axis,
            divisions: axis.divisions
              .map((division, i) => (i === index ? { ...division, at } : division))
              .sort((a, c) => a.at - c.at),
          }
        : axis,
    ),
  };
}

/**
 * Where a new division goes: the start of the longest stage's second half,
 * so the insert lands somewhere visible and the author can drag it from
 * there. The stage it splits keeps its own length and the new one takes the
 * level default — adding a stage lengthens the level, exactly as deleting
 * one shortens it.
 */
export function insertAt(layout: Layout): number {
  let widest = layout.segments[0];
  for (const segment of layout.segments) {
    if (segment.bars > widest.bars) widest = segment;
  }
  const index = layout.segments.indexOf(widest);
  const after = layout.segments[index + 1]?.at ?? 1;
  return (widest.at + after) / 2;
}
