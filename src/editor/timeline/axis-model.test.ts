import { describe, expect, it } from 'vitest';
import {
  addAxis,
  addDivision,
  boundariesOf,
  clearRule,
  deleteDivision,
  moveDivision,
  removeAxis,
  setRule,
  snapDivision,
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

describe('moving a division (the ratified rule semantics)', () => {
  it('carries its rule with it', () => {
    const moved = moveDivision(fragment(), 'tempo', 1, 0.4);
    expect(moved.segmentRules).toEqual([{ at: 0.4, minBars: 6 }]);
  });

  it('leaves the rule behind when another axis still holds the boundary up', () => {
    // The 0.6 boundary is shared; moving tempo's division does not move the
    // reading-mode boundary, so a rule there belongs where it always did.
    const shared = setRule(fragment(), 0.6, { minBars: 3 });
    const moved = moveDivision(shared, 'tempo', 2, 0.8);
    expect(moved.segmentRules).toContainEqual({ at: 0.6, minBars: 3 });
  });

  it('drops the carried rule rather than overwriting one already at the target', () => {
    const both = setRule(fragment(), 0.6, { minBars: 3 });
    // Tempo's 0.3 division (rule minBars 6) merges onto the shared 0.6.
    const moved = moveDivision(both, 'tempo', 1, 0.6);
    expect(moved.segmentRules).toEqual([{ at: 0.6, minBars: 3 }]);
  });

  it('splits with inheritance when the move lands inside a ruled segment', () => {
    // Reading mode's 0.6 division moves to 0.45 — inside the segment that
    // begins at 0.3 and carries an authored override. The split copies it.
    const moved = moveDivision(fragment(), 'readingMode', 1, 0.45);
    expect(moved.segmentRules).toContainEqual({ at: 0.3, minBars: 6 });
    expect(moved.segmentRules).toContainEqual({ at: 0.45, minBars: 6 });
  });
});

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

describe('snapping a drag', () => {
  it('joins another axis’s boundary within reach — deliberate merging', () => {
    // Reading mode's division dragged near tempo's 0.3 joins it exactly.
    expect(snapDivision(fragment(), 'readingMode', 1, 0.293)).toBe(0.3);
  });

  it('lands on the grid otherwise', () => {
    expect(snapDivision(fragment(), 'tempo', 1, 0.4531)).toBeCloseTo(0.455, 9);
  });

  it('clamps between its neighbours with a minimum gap', () => {
    expect(snapDivision(fragment(), 'tempo', 1, 0.001)).toBeCloseTo(0.01, 9);
    // 0.6 would collide with the next division; held one gap short... except
    // the snap magnet claims it first, which IS the collision the author
    // means (a shared boundary), so the clamp applies to the grid path only.
    expect(snapDivision(fragment(), 'tempo', 2, 0.999)).toBeCloseTo(0.99, 9);
  });
});
