/**
 * The timeline's x-axis, measured in TIME — the player's ruling of
 * 2026-08-29, on finding the percent ruler lying: a segment needing eight
 * bars was drawn at 25% of the level and its neighbour, also eight bars, at
 * 5%. The stored `at` fractions never meant anything at runtime (the app
 * steps segments; only their order and their coincidences — shared
 * boundaries — are real), so the picture is free to say something true
 * instead: **each segment's width is its estimated duration**, the minimum
 * bars its rule asks for at the tempo and metre in force there. Seconds per
 * pixel is constant across the whole graph, and every edit re-lays the lot.
 *
 * The estimate is a floor, and says so: it assumes every bar goes clean —
 * a score requirement can stretch a segment — and where nothing names a
 * tempo (the player's dial), a stated assumption stands in.
 *
 * Dragging follows: with widths derived, a divider's position between
 * boundaries is meaningless, so a drop either JOINS an existing boundary
 * (the snap, now the primary gesture) or SPLITS the gap it lands in. The
 * stored `at` written back is an ordinal encoding only — the exact shared
 * value for a join, the gap's midpoint for a split — and the picture never
 * reads it for proportions again.
 */

import { metreFor } from '../../domain/metre';
import { boundariesOf, type TimelineFragment } from './axis-model';

/** Where no tempo is named anywhere, the estimate stands on this and says so. */
export const ASSUMED_TEMPO = 80;

/** How close a drag must come to a boundary, in time-fraction, to join it. */
export const JOIN_SNAP = 0.02;

const EPSILON = 1e-9;
const same = (a: number, b: number) => Math.abs(a - b) < EPSILON;

export interface SegmentRuleShape {
  minBars: number;
  score?: { atLeast: number; overBars: number };
}

export interface SegmentEstimate {
  /** The stored boundary that begins this segment. */
  at: number;
  /** Bars to progress: the rule's floor, or the score window if wider. */
  bars: number;
  seconds: number;
  tempo: number;
  /** True where the tempo is nobody's — the stated assumption is in force. */
  assumedTempo: boolean;
  /** Whether the segment carries its own authored rule. */
  authored: boolean;
  rule: SegmentRuleShape;
  /** Time-fraction where the segment begins and ends, 0..1. */
  x0: number;
  x1: number;
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
 * Every segment, timed. The one estimator the ruler, the bars, the rules
 * chips and the drop resolution all read — two of these and the picture
 * could disagree with itself.
 */
export function estimateSegments(
  fragment: TimelineFragment,
  levelRule: SegmentRuleShape,
  header: { tempo?: number; metre?: readonly [number, number] },
): SegmentEstimate[] {
  const boundaries = boundariesOf(fragment.axes);
  const timed = boundaries.map((at) => {
    const override = fragment.segmentRules?.find((rule) => same(rule.at, at));
    const rule: SegmentRuleShape = override
      ? { minBars: override.minBars, ...(override.score ? { score: override.score } : {}) }
      : levelRule;
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

    return { at, rule, bars, tempo, assumedTempo, authored: override !== undefined, seconds: (bars * barBeats * 60) / tempo };
  });

  const total = timed.reduce((sum, segment) => sum + segment.seconds, 0);
  let elapsed = 0;
  return timed.map((segment) => {
    const x0 = elapsed / total;
    elapsed += segment.seconds;
    return { ...segment, x0, x1: elapsed / total };
  });
}

/** A stored boundary's position on the time axis. */
export function xOf(estimates: readonly SegmentEstimate[], at: number): number {
  const segment = estimates.find((estimate) => same(estimate.at, at));
  return segment ? segment.x0 : at;
}

/** Seconds as a player reads them: 0:32, 4:07. */
export function formatSeconds(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export interface Drop {
  /** The stored `at` to move the division to. */
  at: number;
  /** Where the guide should draw, in time-fraction. */
  x: number;
  /** True when the drop joins an existing boundary — the snap is lit. */
  joined: boolean;
}

/**
 * What a pointer position means for a division in flight.
 *
 * A join beats a split: the nearest boundary within `JOIN_SNAP` that the
 * division may legally reach (strictly between its own neighbours) wins,
 * at that boundary's exact stored value. Otherwise the drop splits the gap
 * the pointer is in, at the gap's stored midpoint — so a drag can never
 * mint a sliver segment, and a division already in that gap stays put.
 */
export function resolveDrop(
  fragment: TimelineFragment,
  estimates: readonly SegmentEstimate[],
  axisId: string,
  index: number,
  pointerX: number,
): Drop | null {
  const axis = fragment.axes.find((a) => a.axis === axisId);
  if (!axis || index <= 0 || index >= axis.divisions.length) return null;
  const self = axis.divisions[index].at;
  const previous = axis.divisions[index - 1].at;
  const next = index + 1 < axis.divisions.length ? axis.divisions[index + 1].at : 1;

  /* The boundaries this division can interact with: everything except its
   * own neighbours (joining those would collapse the axis's own ordering)
   * and itself. All in stored order, which time order agrees with. */
  const reachable = boundariesOf(fragment.axes).filter(
    (at) => at > previous + EPSILON && at < next - EPSILON && !same(at, self),
  );

  const join = reachable
    .map((at) => ({ at, x: xOf(estimates, at) }))
    .filter((candidate) => Math.abs(candidate.x - pointerX) <= JOIN_SNAP)
    .sort((a, b) => Math.abs(a.x - pointerX) - Math.abs(b.x - pointerX))[0];
  if (join) return { at: join.at, x: join.x, joined: true };

  /* The gap the pointer is in, fenced by the reachable boundaries and the
   * division's own neighbours. */
  const fenceAts = [previous, ...reachable, next];
  const fenceXs = fenceAts.map((at) =>
    same(at, next) && index + 1 >= axis.divisions.length ? 1 : xOf(estimates, at),
  );
  let gap = 0;
  for (let i = 0; i + 1 < fenceAts.length; i++) {
    if (pointerX >= fenceXs[i]) gap = i;
  }
  const target = (fenceAts[gap] + fenceAts[gap + 1]) / 2;
  // Already alone in this gap: stay put rather than sliding to its midpoint.
  const stays = self > fenceAts[gap] + EPSILON && self < fenceAts[gap + 1] - EPSILON;
  return {
    at: stays ? self : target,
    x: Math.min(Math.max(pointerX, fenceXs[gap] + 0.005), fenceXs[gap + 1] - 0.005),
    joined: false,
  };
}

/**
 * Where a new division should go: the widest gap in TIME anywhere on the
 * level, split at its stored midpoint, wearing the value the axis already
 * has in force there — an insert that changes nothing until edited.
 */
export function widestGap(
  fragment: TimelineFragment,
  estimates: readonly SegmentEstimate[],
): number {
  const boundaries = boundariesOf(fragment.axes);
  let widest = 0;
  let width = -1;
  for (let i = 0; i < boundaries.length; i++) {
    const x0 = xOf(estimates, boundaries[i]);
    const x1 = i + 1 < boundaries.length ? xOf(estimates, boundaries[i + 1]) : 1;
    if (x1 - x0 > width) {
      width = x1 - x0;
      widest = i;
    }
  }
  const a = boundaries[widest];
  const b = widest + 1 < boundaries.length ? boundaries[widest + 1] : 1;
  return (a + b) / 2;
}
