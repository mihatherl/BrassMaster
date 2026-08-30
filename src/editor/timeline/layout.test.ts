import { describe, expect, it } from 'vitest';
import {
  applyBarDrag,
  ASSUMED_TEMPO,
  formatSeconds,
  insertAt,
  layoutOf,
  resolveBarDrag,
  xOfAt,
  type SegmentRuleShape,
} from './layout';
import { addDivision, boundariesOf, type TimelineFragment } from './axis-model';

const RULE: SegmentRuleShape = { minBars: 8 };

/** Two tempo stages, 60 then 120 — the same bars, half the time. */
function tempoFragment(): TimelineFragment {
  return {
    axes: [
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 0.5, value: 120 },
        ],
      },
    ],
  };
}

/** Six eight-bar tempo stages: the level a fresh axis generates. */
function sixStages(): TimelineFragment {
  return {
    axes: [
      {
        axis: 'tempo',
        divisions: [0, 1, 2, 3, 4, 5].map((i) => ({ at: i / 6, value: 66 + i * 6 })),
      },
    ],
  };
}

describe('laying the level out in bars', () => {
  it('gives every stage the bars its rule asks for, and sums them', () => {
    const layout = layoutOf(sixStages(), RULE, {});
    expect(layout.segments.map((s) => s.bars)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(layout.segments.map((s) => s.barStart)).toEqual([0, 8, 16, 24, 32, 40]);
    expect(layout.totalBars).toBe(48);
  });

  it('draws equal bars equally, however fast they are played', () => {
    // The percent ruler's lie and the time ruler's lie in one case: two
    // eight-bar stages at 60 and 120 are the same width and different times.
    const layout = layoutOf(tempoFragment(), RULE, {});
    const [slow, fast] = layout.segments;
    expect(slow.x1 - slow.x0).toBeCloseTo(0.5, 9);
    expect(fast.x1 - fast.x0).toBeCloseTo(0.5, 9);
    expect(slow.seconds).toBe(32);
    expect(fast.seconds).toBe(16);
    expect(layout.totalSeconds).toBe(48);
  });

  it('reads the metre in force: a 6/8 bar is three crotchets, not six', () => {
    const fragment: TimelineFragment = {
      axes: [
        {
          axis: 'metre',
          divisions: [
            { at: 0, value: [4, 4] },
            { at: 0.5, value: [6, 8] },
          ],
        },
      ],
    };
    const [common, compound] = layoutOf(fragment, RULE, { tempo: 60 }).segments;
    expect(common.seconds).toBe(32);
    expect(compound.seconds).toBe(24);
  });

  it('stands on the stated assumption where nothing names a tempo, and says so', () => {
    const [only] = layoutOf({ axes: [] }, RULE, {}).segments;
    expect(only.tempo).toBe(ASSUMED_TEMPO);
    expect(only.assumedTempo).toBe(true);
    expect(layoutOf({ axes: [] }, RULE, { tempo: 100 }).segments[0].assumedTempo).toBe(false);
  });

  it('draws a stage at the score window where that is the longer ask', () => {
    const fragment: TimelineFragment = {
      ...tempoFragment(),
      segmentRules: [{ at: 0.5, minBars: 2, score: { atLeast: 0.9, overBars: 6 } }],
    };
    const [, scored] = layoutOf(fragment, RULE, {}).segments;
    expect(scored.bars).toBe(6);
    expect(scored.authored).toBe(true);
  });
});

describe('dragging a divider', () => {
  const drag = (fragment: TimelineFragment, axis: 'tempo' | 'readingMode', index: number, x: number) => {
    const layout = layoutOf(fragment, RULE, {});
    const resolved = resolveBarDrag(fragment, layout, axis, index, x);
    return { resolved, layout };
  };

  /*
   * The fault this model was built to fix: under the time axis a divider
   * alone between its own neighbours had nowhere to go, so the tempo
   * dividers could not be dragged at all.
   */
  it('moves a divider that has no foreign boundary anywhere near it', () => {
    const fragment = sixStages();
    const { resolved, layout } = drag(fragment, 'tempo', 1, 12 / 48);
    expect(resolved).toEqual({ bar: 12, x: 12 / 48, aligned: false });
    const after = layoutOf(applyBarDrag(fragment, layout, 'tempo', 1, resolved!), RULE, {});
    expect(after.segments.map((s) => s.bars)).toEqual([12, 4, 8, 8, 8, 8]);
  });

  it('redistributes: the level is the same length after the drag', () => {
    const fragment = sixStages();
    const { resolved, layout } = drag(fragment, 'tempo', 3, 20 / 48);
    const after = layoutOf(applyBarDrag(fragment, layout, 'tempo', 3, resolved!), RULE, {});
    expect(after.totalBars).toBe(48);
    expect(after.segments.map((s) => s.bars)).toEqual([8, 8, 4, 12, 8, 8]);
  });

  it('writes the bars into the two rules it stands between, and no others', () => {
    const fragment = sixStages();
    const { resolved, layout } = drag(fragment, 'tempo', 1, 10 / 48);
    const next = applyBarDrag(fragment, layout, 'tempo', 1, resolved!);
    // Keyed by the bars they now begin at: stored positions are renumbered
    // onto the layout, which is ordinal at runtime and legible in the file.
    expect(next.segmentRules).toEqual([
      { at: 0, minBars: 10 },
      { at: 10 / 48, minBars: 6 },
    ]);
  });

  /*
   * The player's ruling of 2026-08-29: the only fence is this axis's own
   * neighbours. A conductor divider used to be penned in by the tempo steps
   * either side of it — it could not be moved past them, which is not a
   * limit anything about the music imposes.
   */
  it('moves clean across another axis’s boundaries', () => {
    const fragment: TimelineFragment = {
      axes: [
        sixStages().axes[0],
        {
          axis: 'conductorEnabled',
          divisions: [
            { at: 0, value: true },
            { at: 0.55, value: false },
          ],
        },
      ],
    };
    const layout = layoutOf(fragment, RULE, {});
    // Seven stages of eight bars; the conductor changes at bar 32.
    expect(layout.totalBars).toBe(56);
    expect(layout.segments.find((s) => Math.abs(s.at - 0.55) < 1e-9)!.barStart).toBe(32);

    // Dragged back to bar 6 — past four tempo dividers.
    const resolved = resolveBarDrag(fragment, layout, 'conductorEnabled', 1, 6 / 56)!;
    expect(resolved.bar).toBe(6);
    const after = layoutOf(applyBarDrag(fragment, layout, 'conductorEnabled', 1, resolved), RULE, {});
    expect(after.totalBars).toBe(56);
    // The stage it left closes up; the stage it lands in splits at bar 6.
    expect(after.segments.map((s) => s.bars)).toEqual([6, 2, 8, 8, 16, 8, 8]);
  });

  it('stops a stage being squeezed below a bar, and stops nowhere else', () => {
    const fragment = sixStages();
    // Hard left, past the previous divider: one bar is as far as it goes.
    const { resolved } = drag(fragment, 'tempo', 1, 0);
    expect(resolved!.bar).toBe(1);
  });

  /*
   * The player's ruling of 2026-08-29: a score window is not a wall. It used
   * to floor the drag — an author moving a divider two bars from its
   * neighbour was stopped four bars away by a figure they had never set —
   * and since evidence is per-segment by construction, a window longer than
   * its stage was only ever "play on past the minimum". So the window bends.
   */
  it('lets a stage past its own score window, taking the window down with it', () => {
    const scored: TimelineFragment = {
      ...sixStages(),
      segmentRules: [{ at: 0, minBars: 8, score: { atLeast: 0.9, overBars: 5 } }],
    };
    const { resolved, layout } = drag(scored, 'tempo', 1, 2 / 48);
    expect(resolved!.bar).toBe(2);
    const next = applyBarDrag(scored, layout, 'tempo', 1, resolved!);
    expect(next.segmentRules).toContainEqual({
      at: 0,
      minBars: 2,
      score: { atLeast: 0.9, overBars: 2 },
    });
    // The stage is drawn at the two bars it was dragged to, not at five.
    expect(layoutOf(next, RULE, {}).segments[0].bars).toBe(2);
  });

  it('leaves a window alone when the stage is wide enough for it', () => {
    const scored: TimelineFragment = {
      ...sixStages(),
      segmentRules: [{ at: 0, minBars: 8, score: { atLeast: 0.9, overBars: 5 } }],
    };
    const { resolved, layout } = drag(scored, 'tempo', 1, 6 / 48);
    const next = applyBarDrag(scored, layout, 'tempo', 1, resolved!);
    expect(next.segmentRules).toContainEqual({
      at: 0,
      minBars: 6,
      score: { atLeast: 0.9, overBars: 5 },
    });
  });

  it('never lets one axis’s own dividers meet on the same bar', () => {
    // Tempo's divider dragged onto tempo's own previous boundary: clamped,
    // never merged — two tempo values cannot begin at one bar.
    const fragment = sixStages();
    const { resolved } = drag(fragment, 'tempo', 2, 8 / 48);
    expect(resolved!.bar).toBe(9);
  });

  /*
   * The Visio gesture, in bars: squeeze the stage between two axes' dividers
   * out of existence and they change at the same bar.
   */
  it('merges onto another axis’s divider, keeping the level’s length', () => {
    const fragment: TimelineFragment = {
      axes: [
        {
          axis: 'tempo',
          divisions: [
            { at: 0, value: 60 },
            { at: 0.5, value: 72 },
          ],
        },
        {
          axis: 'readingMode',
          divisions: [
            { at: 0, value: 'scrolling' },
            { at: 0.25, value: 'paged' },
          ],
        },
      ],
    };
    const layout = layoutOf(fragment, RULE, {});
    expect(layout.segments.map((s) => s.bars)).toEqual([8, 8, 8]);
    // Tempo's divider (bar 16) dragged onto reading's (bar 8).
    const resolved = resolveBarDrag(fragment, layout, 'tempo', 1, 8 / 24)!;
    expect(resolved.bar).toBe(8);
    expect(resolved.aligned).toBe(true);
    const next = applyBarDrag(fragment, layout, 'tempo', 1, resolved);
    // One boundary where there were two: both axes now change at bar 9.
    expect(boundariesOf(next.axes)).toEqual([0, 1 / 3]);
    const after = layoutOf(next, RULE, {});
    expect(after.totalBars).toBe(24);
    expect(after.segments.map((s) => s.bars)).toEqual([8, 16]);
  });

  it('pulls a divider back off a shared boundary, splitting the stage it lands in', () => {
    const fragment: TimelineFragment = {
      axes: [
        {
          axis: 'tempo',
          divisions: [
            { at: 0, value: 60 },
            { at: 0.5, value: 72 },
          ],
        },
        {
          axis: 'readingMode',
          divisions: [
            { at: 0, value: 'scrolling' },
            { at: 0.5, value: 'paged' },
          ],
        },
      ],
    };
    const layout = layoutOf(fragment, RULE, {});
    expect(layout.segments).toHaveLength(2);
    // Reading's divider pulled right, four bars into the second stage.
    const resolved = resolveBarDrag(fragment, layout, 'readingMode', 1, 12 / 16)!;
    expect(resolved.aligned).toBe(false);
    const after = layoutOf(applyBarDrag(fragment, layout, 'readingMode', 1, resolved), RULE, {});
    expect(after.totalBars).toBe(16);
    expect(after.segments.map((s) => s.bars)).toEqual([8, 4, 4]);
  });

  it('refuses to drag the division an axis opens with', () => {
    const fragment = sixStages();
    expect(resolveBarDrag(fragment, layoutOf(fragment, RULE, {}), 'tempo', 0, 0.5)).toBeNull();
  });
});

describe('adding a stage', () => {
  it('lands in the longest stage and lengthens the level by the default', () => {
    const fragment = sixStages();
    const layout = layoutOf(fragment, RULE, {});
    const at = insertAt(layout);
    const after = layoutOf(addDivision(fragment, 'tempo', at, 66), RULE, {});
    expect(after.segments).toHaveLength(7);
    expect(after.totalBars).toBe(56);
  });
});

describe('positions and formatting', () => {
  it('places a boundary at its own bar', () => {
    const layout = layoutOf(sixStages(), RULE, {});
    expect(xOfAt(layout, 2 / 6)).toBeCloseTo(16 / 48, 9);
  });

  it('reads seconds like a clock', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(32)).toBe('0:32');
    expect(formatSeconds(247)).toBe('4:07');
  });
});

describe('a stage is as wide as the music it holds', () => {
  /*
   * Ruled 2026-08-30, after the player found the bars axis not lining up
   * with the ruler beneath it. Two things are called "bars": the rule's
   * gate on ADVANCEMENT, and a length axis saying how much music is
   * WRITTEN. Only the first was ever drawn, so a stage asking for sixteen
   * bars of sight-reading was drawn eight bars wide.
   */
  const RULE = { minBars: 8, score: { atLeast: 0.85, overBars: 4 } };

  it('draws a bars axis at the length it asks for, not the rule’s', () => {
    const layout = layoutOf(
      {
        axes: [
          { axis: 'bars', divisions: [{ at: 0, value: 8 }, { at: 0.5, value: 16 }] },
        ],
      },
      RULE,
      {},
    );
    expect(layout.segments.map((segment) => segment.bars)).toEqual([8, 16]);
    expect(layout.totalBars).toBe(24);
  });

  it('still floors the width at the rule, because playing on is honest', () => {
    // Four bars of music but eight bars of playing means reading it twice,
    // and eight is then the true width. The pre-existing doctrine: where the
    // two differ, the truth is the longer figure.
    const layout = layoutOf(
      { axes: [{ axis: 'bars', divisions: [{ at: 0, value: 4 }] }] },
      RULE,
      {},
    );
    expect(layout.segments[0].bars).toBe(8);
  });

  it('drags bars ACROSS a divider, writing the axis and not the rule', () => {
    /*
     * The bars-as-x-axis doctrine, which a length axis nearly broke: a drag
     * moves bars across a border and leaves the level the same length.
     * Writing the rule here would move the divider and change nothing —
     * the axis governs the width — so the picture would snap back and the
     * level would have silently grown instead.
     */
    const fragment = {
      axes: [{ axis: 'bars' as const, divisions: [{ at: 0, value: 8 }, { at: 0.5, value: 16 }] }],
    };
    const layout = layoutOf(fragment, RULE, {});
    expect(layout.totalBars).toBe(24);
    const drop = resolveBarDrag(fragment, layout, 'bars', 1, 12 / layout.totalBars);
    const next = applyBarDrag(fragment, layout, 'bars', 1, drop!, true);
    // The axis itself now says 12 and 12 — the music the generator writes.
    expect(next.axes[0].divisions.map((division) => division.value)).toEqual([12, 12]);
    const after = layoutOf(next, RULE, {});
    expect(after.segments.map((segment) => segment.bars)).toEqual([12, 12]);
    expect(after.totalBars).toBe(24);
  });

  it('leaves drills to the rule, since a cycle has no honest bar count', () => {
    /*
     * A cycle's length depends on the notes the drill has in the key it is
     * played in — two cycles of an octave being seven bars of four-four
     * exactly, and other keys differing. There is no static conversion, so
     * inventing one would be a new lie in place of the old one.
     */
    const layout = layoutOf(
      { axes: [{ axis: 'cycles', divisions: [{ at: 0, value: 2 }, { at: 0.5, value: 6 }] }] },
      RULE,
      {},
    );
    expect(layout.segments.map((segment) => segment.bars)).toEqual([8, 8]);
  });
});
