import { describe, expect, it } from 'vitest';
import {
  addAxis,
  addDivision,
  boundariesOf,
  clearRule,
  deleteDivision,
  removeAxis,
  setRule,
  type TimelineFragment,
} from './axis-model';

/** A tempo axis over three segments, with a reading-mode axis sharing 0.6. */
function fragment(): TimelineFragment {
  return {
    axes: [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.3, value: 66 },
          { at: 0.6, value: 72 },
        ],
      },
      {
        axis: 'readingMode',
        divisions: [
          { at: 0, value: 'scrolling' },
          { at: 0.6, value: 'paged' },
        ],
      },
    ],
    segmentRules: [{ at: 0.3, minBars: 6 }],
  };
}

describe('boundaries', () => {
  it('unions the axes, deduplicating shared boundaries', () => {
    expect(boundariesOf(fragment().axes)).toEqual([0, 0.3, 0.6]);
  });
});

/*
 * The move tests lived here until 2026-08-29. Moving a divider is no longer
 * a rule-carrying operation on stored positions: with the x-axis in bars a
 * rule *is* a length, so a drag writes lengths, and its three meanings —
 * redistribute, merge, separate — are pinned in `layout.test.ts`. What
 * survives here is what still belongs to positions: splitting inherits, and
 * deleting keeps the left rule.
 */

describe('adding and deleting divisions', () => {
  it('copies the authored override to both halves of a split', () => {
    const split = addDivision(fragment(), 'readingMode', 0.45, 'paged');
    expect(split.segmentRules).toContainEqual({ at: 0.3, minBars: 6 });
    expect(split.segmentRules).toContainEqual({ at: 0.45, minBars: 6 });
  });

  it('leaves a default segment default when it splits', () => {
    const split = addDivision(fragment(), 'tempo', 0.8, 78);
    expect(split.segmentRules).toEqual([{ at: 0.3, minBars: 6 }]);
  });

  it('deletes a boundary’s rule with the boundary, keeping the left rule', () => {
    const gone = deleteDivision(fragment(), 'tempo', 1);
    expect(gone.segmentRules).toBeUndefined();
    expect(boundariesOf(gone.axes)).toEqual([0, 0.6]);
  });

  it('keeps the rule when the deleted division shared its boundary', () => {
    const shared = setRule(fragment(), 0.6, { minBars: 3 });
    const gone = deleteDivision(shared, 'tempo', 2);
    expect(gone.segmentRules).toContainEqual({ at: 0.6, minBars: 3 });
  });

  it('never deletes an axis’s first division', () => {
    expect(deleteDivision(fragment(), 'tempo', 0)).toEqual(fragment());
  });
});

describe('whole axes', () => {
  it('adding an axis splits with inheritance at each fresh boundary', () => {
    const added = addAxis(fragment(), {
      axis: 'metronomeEnabled',
      divisions: [
        { at: 0, value: true },
        { at: 0.45, value: false },
      ],
    });
    expect(added.segmentRules).toContainEqual({ at: 0.45, minBars: 6 });
  });

  it('removing an axis takes its unshared boundaries’ rules along', () => {
    const gone = removeAxis(fragment(), 'tempo');
    // 0.3 was tempo's alone (its rule goes); 0.6 is still held by readingMode.
    expect(gone.segmentRules).toBeUndefined();
    expect(boundariesOf(gone.axes)).toEqual([0, 0.6]);
  });
});

describe('the table’s pencil and eraser', () => {
  it('writes, rewrites, and clears an override at a boundary', () => {
    let edited = setRule(fragment(), 0.6, { minBars: 2, score: { atLeast: 0.9, overBars: 2 } });
    expect(edited.segmentRules).toContainEqual({
      at: 0.6,
      minBars: 2,
      score: { atLeast: 0.9, overBars: 2 },
    });
    edited = setRule(edited, 0.6, { minBars: 4 });
    expect(edited.segmentRules).toContainEqual({ at: 0.6, minBars: 4 });
    edited = clearRule(clearRule(edited, 0.6), 0.3);
    expect(edited.segmentRules).toBeUndefined();
  });
});
