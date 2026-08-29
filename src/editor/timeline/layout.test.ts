import { describe, expect, it } from 'vitest';
import {
  ASSUMED_TEMPO,
  estimateSegments,
  formatSeconds,
  resolveDrop,
  widestGap,
  xOf,
} from './layout';
import type { TimelineFragment } from './axis-model';

const RULE = { minBars: 8 };

/** Two tempo segments, 60 then 120 — same bars, half the time. */
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

describe('estimating segments', () => {
  it('gives a faster segment less width — the whole point', () => {
    const [slow, fast] = estimateSegments(tempoFragment(), RULE, {});
    // 8 bars of 4/4: 32 beats. At 60 that is 32s; at 120, 16s.
    expect(slow.seconds).toBe(32);
    expect(fast.seconds).toBe(16);
    expect(slow.x1 - slow.x0).toBeCloseTo(2 / 3, 9);
    expect(fast.x1 - fast.x0).toBeCloseTo(1 / 3, 9);
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
    const [common, compound] = estimateSegments(fragment, RULE, { tempo: 60 });
    expect(common.seconds).toBe(32);
    expect(compound.seconds).toBe(24);
  });

  it('stands on the stated assumption where nothing names a tempo, and says so', () => {
    const [only] = estimateSegments({ axes: [] }, RULE, {});
    expect(only.tempo).toBe(ASSUMED_TEMPO);
    expect(only.assumedTempo).toBe(true);
    const [pinned] = estimateSegments({ axes: [] }, RULE, { tempo: 100 });
    expect(pinned.assumedTempo).toBe(false);
  });

  it('floors the bars at the score window where it is wider', () => {
    const fragment: TimelineFragment = {
      ...tempoFragment(),
      segmentRules: [{ at: 0.5, minBars: 2, score: { atLeast: 0.9, overBars: 6 } }],
    };
    const [, scored] = estimateSegments(fragment, RULE, {});
    expect(scored.bars).toBe(6);
    expect(scored.authored).toBe(true);
  });

  it('covers the whole level: x runs 0 to 1 with no gaps', () => {
    const estimates = estimateSegments(tempoFragment(), RULE, {});
    expect(estimates[0].x0).toBe(0);
    expect(estimates[estimates.length - 1].x1).toBeCloseTo(1, 9);
    for (let i = 1; i < estimates.length; i++) {
      expect(estimates[i].x0).toBeCloseTo(estimates[i - 1].x1, 9);
    }
  });
});

describe('resolving a drop', () => {
  /** Tempo boundaries at 0, .3, .6; a reading divider at .8 to drag about. */
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
            { at: 0.8, value: 'paged' },
          ],
        },
      ],
    };
  }

  it('joins a boundary within reach, at its exact stored value', () => {
    const frag = fragment();
    const estimates = estimateSegments(frag, RULE, {});
    const nearBoundary = xOf(estimates, 0.3) + 0.01;
    const drop = resolveDrop(frag, estimates, 'readingMode', 1, nearBoundary)!;
    expect(drop.joined).toBe(true);
    expect(drop.at).toBe(0.3);
    expect(drop.x).toBe(xOf(estimates, 0.3));
  });

  it('splits the gap it lands in, at the stored midpoint — never a sliver', () => {
    const frag = fragment();
    const estimates = estimateSegments(frag, RULE, {});
    // Well inside the first tempo segment, clear of any boundary.
    const drop = resolveDrop(frag, estimates, 'readingMode', 1, xOf(estimates, 0.3) / 2)!;
    expect(drop.joined).toBe(false);
    expect(drop.at).toBe(0.15);
  });

  it('stays put when the pointer wanders within its own gap', () => {
    const frag = fragment();
    const estimates = estimateSegments(frag, RULE, {});
    // The divider at .8 lives between boundaries .6 and 1; pointing there again.
    const inOwnGap = (xOf(estimates, 0.6) + 1) / 2 + 0.03;
    const drop = resolveDrop(frag, estimates, 'readingMode', 1, inOwnGap)!;
    expect(drop.joined).toBe(false);
    expect(drop.at).toBe(0.8);
  });

  it('never crosses its own neighbours', () => {
    const frag = fragment();
    const estimates = estimateSegments(frag, RULE, {});
    // Tempo's middle divider dragged far right: fenced by its own .6 neighbour.
    const drop = resolveDrop(frag, estimates, 'tempo', 1, 0.99)!;
    expect(drop.at).toBeLessThan(0.6);
  });
});

describe('the widest gap', () => {
  it('measures in time, not stored fractions', () => {
    // Stored gaps are .5/.5, but the slow half is twice the time — the
    // insert belongs there.
    const frag = tempoFragment();
    const estimates = estimateSegments(frag, RULE, {});
    expect(widestGap(frag, estimates)).toBe(0.25);
  });
});

describe('formatting', () => {
  it('reads like a clock', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(32)).toBe('0:32');
    expect(formatSeconds(247)).toBe('4:07');
  });
});
