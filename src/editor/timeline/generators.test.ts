import { describe, expect, it } from 'vitest';
import { instrumentById, writtenRange } from '../../domain/instruments';
import { numericDivisions, orderedDivisions, rangeDivisions } from './generators';

describe('numeric divisions', () => {
  it('runs from and to inclusive, on the grain, evenly spaced', () => {
    const divisions = numericDivisions(60, 80, 5);
    expect(divisions.map((d) => d.value)).toEqual([60, 65, 70, 75, 80]);
    expect(divisions.map((d) => d.at)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });

  it('rounds to the grain rather than writing fractions of a bpm', () => {
    expect(numericDivisions(60, 70, 4).map((d) => d.value)).toEqual([60, 63, 67, 70]);
  });

  it('writes one constant division for a single step', () => {
    expect(numericDivisions(60, 96, 1)).toEqual([{ at: 0, value: 60 }]);
  });
});

describe('ordered divisions', () => {
  it('spreads the values in the order given', () => {
    expect(orderedDivisions(['scrolling', 'paged'])).toEqual([
      { at: 0, value: 'scrolling' },
      { at: 0.5, value: 'paged' },
    ]);
  });
});

describe('range divisions', () => {
  const ebBass = instrumentById('eb-bass');
  const compass = writtenRange(ebBass, 'treble');
  const anchor = { low: 67, high: 79 }; // written G to G, mid-compass

  const values = (bias: 'up' | 'down' | 'both') =>
    rangeDivisions({ fifths: 0, compass, anchor, steps: 4, bias }).map(
      (d) => d.value as { low: number; high: number },
    );

  it('writes the explicit list — the anchor first, then the walked steps', () => {
    const walked = values('up');
    expect(walked).toHaveLength(4);
    expect(walked[0]).toEqual(anchor);
  });

  it('biased up moves only the top; biased down only the bottom', () => {
    const up = values('up');
    expect(up.every((v) => v.low === anchor.low)).toBe(true);
    expect(up[3].high).toBeGreaterThan(anchor.high);

    const down = values('down');
    expect(down.every((v) => v.high === anchor.high)).toBe(true);
    expect(down[3].low).toBeLessThan(anchor.low);
  });

  it('both alternates, and favours down first — upward is embouchure and effort', () => {
    const both = values('both');
    expect(both[1].low).toBeLessThan(anchor.low);
    expect(both[1].high).toBe(anchor.high);
    expect(both[2].high).toBeGreaterThan(anchor.high);
  });

  it('walks the key ladder in stave steps, not semitones', () => {
    // From G in C major one rung up is A: two semitones, one line or space.
    const up = values('up');
    expect(up[1].high - up[0].high).toBe(2);
  });

  it('clamps honestly at the compass rather than inventing notes', () => {
    const greedy = rangeDivisions({
      fifths: 0,
      compass,
      anchor: { low: compass[0], high: compass[1] },
      steps: 3,
      bias: 'both',
    }).map((d) => d.value as { low: number; high: number });
    expect(greedy[2]).toEqual({ low: compass[0], high: compass[1] });
  });
});
