/**
 * The timeline's edit operations, pure and tested — the editor's half of the
 * axes model. `readCourse` owns what a document *means* (`segmentsOf` derives
 * the segments the app steps); this file owns what an *edit* does to one,
 * implementing the rule semantics ratified 2026-08-29:
 *
 * - **a rule belongs to the division that begins its segment** — moving a
 *   division carries its rule with it;
 * - **splitting inherits** — a new boundary inside a segment copies that
 *   segment's authored override to both halves (a default cell stays default,
 *   never materialised);
 * - **deleting merges, keeping the left rule** — a boundary that disappears
 *   takes its override with it, and the segment to its left simply extends.
 *
 * Nothing is ever invented, and an edit never rewrites a rule the author did
 * not touch. Boundaries are shared across axes, so a rule survives a move of
 * one axis's division wherever another axis still holds the boundary up.
 *
 * Everything here works on the raw document fragments the editor edits —
 * plain data, judged by `readCourse` on every keystroke as ever.
 */

import type { AxisId } from '../../exercise/course';

export type { AxisId };

export interface RawDivision {
  at: number;
  value: unknown;
}

export interface RawAxis {
  axis: AxisId;
  divisions: RawDivision[];
}

export interface RawRule {
  at: number;
  minBars: number;
  score?: { atLeast: number; overBars: number };
}

export interface TimelineFragment {
  axes: RawAxis[];
  segmentRules?: RawRule[];
}

/** Two boundaries closer than this are the same boundary — the reader's own figure. */
const EPSILON = 1e-9;

const same = (a: number, b: number) => Math.abs(a - b) < EPSILON;

/** Every boundary the axes make, 0 first, deduplicated and sorted. */
export function boundariesOf(axes: readonly RawAxis[]): number[] {
  const found = [0];
  for (const axis of axes) {
    for (const division of axis.divisions) {
      if (!found.some((at) => same(at, division.at))) found.push(division.at);
    }
  }
  return found.sort((a, b) => a - b);
}

function ruleAt(rules: readonly RawRule[] | undefined, at: number): RawRule | undefined {
  return rules?.find((rule) => same(rule.at, at));
}

function withoutRuleAt(rules: readonly RawRule[] | undefined, at: number): RawRule[] | undefined {
  const kept = (rules ?? []).filter((rule) => !same(rule.at, at));
  return kept.length ? kept : undefined;
}

function boundaryExists(axes: readonly RawAxis[], at: number): boolean {
  return same(at, 0) || axes.some((axis) => axis.divisions.some((d) => same(d.at, at)));
}

/**
 * Splitting inherits: a boundary newly created at `at` copies the authored
 * override of the segment it lands inside, so both halves keep asking what
 * the whole asked. A segment on the level default stays on it — the copy is
 * only of what the author wrote.
 */
function copyOnSplit(fragment: TimelineFragment, at: number): TimelineFragment {
  if (ruleAt(fragment.segmentRules, at)) return fragment;
  const below = boundariesOf(fragment.axes)
    .filter((boundary) => boundary < at - EPSILON)
    .pop();
  if (below === undefined) return fragment;
  const inherited = ruleAt(fragment.segmentRules, below);
  if (!inherited) return fragment;
  return {
    ...fragment,
    segmentRules: [...(fragment.segmentRules ?? []), { ...inherited, at }],
  };
}

/** The named axis, or nothing — raw fragments may be mid-edit. */
function axisIn(fragment: TimelineFragment, axisId: AxisId): RawAxis | undefined {
  return fragment.axes.find((axis) => axis.axis === axisId);
}

function replaceAxis(fragment: TimelineFragment, next: RawAxis): TimelineFragment {
  return {
    ...fragment,
    axes: fragment.axes.map((axis) => (axis.axis === next.axis ? next : axis)),
  };
}

/*
 * `moveDivision` lived here until 2026-08-29, carrying a rule from one
 * boundary to another. It belonged to the era when a position and a rule
 * were independent things; once the x-axis became bars, a rule *is* a
 * length, so what a move does to the rules depends on what the move meant.
 * The three answers — redistribute, merge, separate — live in `layout.ts`'s
 * `applyBarDrag`, which writes them itself.
 */

/** Adds a division, splitting the segment it lands in. */
export function addDivision(
  fragment: TimelineFragment,
  axisId: AxisId,
  at: number,
  value: unknown,
): TimelineFragment {
  const axis = axisIn(fragment, axisId);
  if (!axis) return fragment;
  const divisions = [...axis.divisions, { at, value }].sort((a, b) => a.at - b.at);
  const wasBoundary = boundaryExists(fragment.axes, at);
  let next = replaceAxis(fragment, { ...axis, divisions });
  if (!wasBoundary) next = copyOnSplit(next, at);
  return next;
}

/** Deletes a division; a boundary that goes with it takes its rule along. */
export function deleteDivision(
  fragment: TimelineFragment,
  axisId: AxisId,
  index: number,
): TimelineFragment {
  const axis = axisIn(fragment, axisId);
  if (!axis || index <= 0 || index >= axis.divisions.length) return fragment;
  const from = axis.divisions[index].at;
  const divisions = axis.divisions.filter((_, i) => i !== index);
  let next = replaceAxis(fragment, { ...axis, divisions });
  if (!boundaryExists(next.axes, from)) {
    // The segments either side merged; the left rule stands untouched, and
    // the vanished boundary's override goes with the boundary.
    next = { ...next, segmentRules: withoutRuleAt(next.segmentRules, from) };
  }
  return next;
}

export function setDivisionValue(
  fragment: TimelineFragment,
  axisId: AxisId,
  index: number,
  value: unknown,
): TimelineFragment {
  const axis = axisIn(fragment, axisId);
  if (!axis || index < 0 || index >= axis.divisions.length) return fragment;
  return replaceAxis(fragment, {
    ...axis,
    divisions: axis.divisions.map((d, i) => (i === index ? { ...d, value } : d)),
  });
}

/** Adds a whole axis; every boundary it newly creates splits a segment. */
export function addAxis(fragment: TimelineFragment, axis: RawAxis): TimelineFragment {
  if (axisIn(fragment, axis.axis)) return fragment;
  const fresh = axis.divisions
    .map((d) => d.at)
    .filter((at) => !boundaryExists(fragment.axes, at));
  let next: TimelineFragment = { ...fragment, axes: [...fragment.axes, axis] };
  for (const at of fresh.sort((a, b) => a - b)) next = copyOnSplit(next, at);
  return next;
}

/** Removes an axis; boundaries only it held up take their rules along. */
export function removeAxis(fragment: TimelineFragment, axisId: AxisId): TimelineFragment {
  const axis = axisIn(fragment, axisId);
  if (!axis) return fragment;
  let next: TimelineFragment = {
    ...fragment,
    axes: fragment.axes.filter((a) => a.axis !== axisId),
  };
  for (const division of axis.divisions) {
    if (!boundaryExists(next.axes, division.at)) {
      next = { ...next, segmentRules: withoutRuleAt(next.segmentRules, division.at) };
    }
  }
  return next;
}

/** Writes (or rewrites) the override at a boundary — the table's pencil. */
export function setRule(
  fragment: TimelineFragment,
  at: number,
  rule: { minBars: number; score?: { atLeast: number; overBars: number } },
): TimelineFragment {
  return {
    ...fragment,
    segmentRules: [...((fragment.segmentRules ?? []).filter((r) => !same(r.at, at))), { at, ...rule }],
  };
}

/** Back to the level default — the table's eraser. */
export function clearRule(fragment: TimelineFragment, at: number): TimelineFragment {
  return { ...fragment, segmentRules: withoutRuleAt(fragment.segmentRules, at) };
}
