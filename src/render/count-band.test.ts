import { describe, expect, it } from 'vitest';
import { bandCells, cellEdgeX, soundingSpans, spacesBelowFor } from './count-band';
import { metreFor } from '../domain/metre';

/**
 * The count band's pure layout (the player's design, 2026-09-03): cells
 * per pulse, even fractions of the bar below where engraving is uneven
 * above, and the alternating tint counted globally so a bar line never
 * sits between two like tints.
 */

const fourFour = (
  totalBeats: number,
  syllables?: Array<{ atBeat: number; text: string; rest?: true }>,
  notes: Array<{ startBeat: number }> = [{ startBeat: 0 }],
) => ({
  metres: [{ fromBeat: 0, metre: metreFor(4, 4) }],
  totalBeats,
  syllables,
  notes,
});

describe('the band’s cells', () => {
  it('cuts one cell per pulse, evenly across each bar', () => {
    const cells = bandCells(fourFour(8, undefined, [{ startBeat: 0 }, { startBeat: 4 }]), 0, 8);
    expect(cells).toHaveLength(8);
    expect(cells.map((cell) => cell.fromBeat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Even quarters of the bar, restarting at the bar line.
    expect(cells[1].fromFraction).toBeCloseTo(0.25);
    expect(cells[1].toFraction).toBeCloseTo(0.5);
    expect(cells[5].fromFraction).toBeCloseTo(0.25);
    expect(cells[5].barFromBeat).toBe(4);
  });

  it('counts the tint globally, so 3/4 alternates across the bar line', () => {
    // Three pulses a bar: parity per-bar would put like tints either side
    // of every bar line, which is exactly where a boundary must show.
    const cells = bandCells(
      { metres: [{ fromBeat: 0, metre: metreFor(3, 4) }], totalBeats: 6, notes: [] },
      0,
      6,
    );
    expect(cells.map((cell) => cell.pulse)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('segments compound time by the felt beat', () => {
    // 6/8 is two dotted-crotchet pulses, not six quavers.
    const cells = bandCells(
      { metres: [{ fromBeat: 0, metre: metreFor(6, 8) }], totalBeats: 3, notes: [] },
      0,
      3,
    );
    expect(cells).toHaveLength(2);
    expect(cells[0].toBeat).toBeCloseTo(1.5);
    expect(cells[1].fromFraction).toBeCloseTo(0.5);
  });

  it('gives a cell’s entries even slots within the cell', () => {
    const cells = bandCells(
      fourFour(
        4,
        [
          { atBeat: 0, text: '1' },
          { atBeat: 0.5, text: '&' },
          { atBeat: 1, text: '2', rest: true },
        ],
        [{ startBeat: 0 }, { startBeat: 0.5 }],
      ),
      0,
      4,
    );
    // Two marks share beat one's quarter equally…
    expect(cells[0].entries.map((entry) => entry.text)).toEqual(['1', '&']);
    expect(cells[0].entries[0].fraction).toBeCloseTo(0.0625);
    expect(cells[0].entries[1].fraction).toBeCloseTo(0.1875);
    // …and a lone mark sits at the centre of its own.
    expect(cells[1].entries[0].fraction).toBeCloseTo(0.375);
    expect(cells[1].entries[0].rest).toBe(true);
  });

  it('clips to the system’s beats without splitting a cell', () => {
    const cells = bandCells(fourFour(8, undefined, [{ startBeat: 0 }, { startBeat: 4 }]), 4, 8);
    expect(cells).toHaveLength(4);
    expect(cells[0].barFromBeat).toBe(4);
    // The pulse count stays global: the second line's tints line up with
    // where the first line left off.
    expect(cells[0].pulse).toBe(4);
  });
});

describe('a bar where nothing is played', () => {
  it('prints only its numbers, dimmed, whatever the emission carries', () => {
    /*
     * The player, 2026-09-04: a demonstration bar (one bar rest) read
     * "1e&a2e&a3 &" in bold through silence. The EMISSION keeps the
     * whole figure — the counting voice will speak it — but the print
     * in a note-less bar says just where the beats fall, and quietly.
     */
    const cells = bandCells(
      fourFour(
        4,
        [
          { atBeat: 0, text: '1' },
          { atBeat: 0.5, text: '&' },
          { atBeat: 1, text: '2', rest: true },
          { atBeat: 2, text: '3', rest: true },
          { atBeat: 3, text: '4', rest: true },
        ],
        [],
      ),
      0,
      4,
    );
    expect(
      cells.map((cell) => cell.entries.map((e) => `${e.text}${e.rest ? '·' : ''}`).join(' ')),
    ).toEqual(['1·', '2·', '3·', '4·']);
    // Centred in its own cell, not left in the figure's old slot.
    expect(cells[0].entries[0].fraction).toBeCloseTo(0.125);
  });
});

describe('sounding spans — one loop per sound', () => {
  /*
   * The player, 2026-09-04: a quaver on 'e' and a semiquaver on 'e'
   * printed the same. The sustain loop groups a sound's marks, and a
   * sound is a note OR a tied chain — the far end of a tie is not a
   * new sound, so its loop crosses the bar line.
   */
  const q = { value: 'quarter', dotted: false } as const;
  const e = { value: 'eighth', dotted: false } as const;

  it('spans each sound by its own length', () => {
    expect(
      soundingSpans([
        { startBeat: 0, duration: e },
        { startBeat: 1, duration: q },
      ]),
    ).toEqual([
      { from: 0, to: 0.5 },
      { from: 1, to: 2 },
    ]);
  });

  it('merges a tied chain into one span', () => {
    expect(
      soundingSpans([
        { startBeat: 0, duration: q, tiedToNext: true },
        { startBeat: 1, duration: q, tiedToNext: true },
        { startBeat: 2, duration: e },
      ]),
    ).toEqual([{ from: 0, to: 2.5 }]);
  });

  it('never merges across a gap, whatever a stray tie flag claims', () => {
    expect(
      soundingSpans([
        { startBeat: 0, duration: e, tiedToNext: true },
        { startBeat: 1, duration: e },
      ]),
    ).toEqual([
      { from: 0, to: 0.5 },
      { from: 1, to: 1.5 },
    ]);
  });
});

describe('a cell’s edges on the page', () => {
  /*
   * The player's eye, 2026-09-04: the shading was out of alignment.
   * `xForBeat` names a beat's COLUMN CENTRE, and edges drawn there
   * sliced through the noteheads and spilled past the final bar line.
   * The engraver's rules instead: bar-line edges sit at the setback,
   * interior edges midway between the columns either side.
   */
  const xForBeat = (beat: number) => 100 + beat * 40;

  it('a bar-line edge sits exactly where the bar line is drawn', () => {
    expect(cellEdgeX(4, { barLine: true, columns: [0, 1, 2, 3], xForBeat, setbackX: 17.5 })).toBe(
      xForBeat(4) - 17.5,
    );
  });

  it('an interior edge splits the columns either side of it', () => {
    // The previous column is the quaver at 1.5, not the beat before.
    expect(cellEdgeX(2, { barLine: false, columns: [0, 1, 1.5], xForBeat, setbackX: 17.5 })).toBe(
      (xForBeat(1.5) + xForBeat(2)) / 2,
    );
  });

  it('never reaches left of the line’s own margin', () => {
    expect(cellEdgeX(0, { barLine: true, columns: [], xForBeat, setbackX: 17.5, limit: 95 })).toBe(
      95,
    );
  });
});

describe('the room the band asks for below the stave', () => {
  it('asks nothing extra where nothing is counted', () => {
    expect(spacesBelowFor(false, 0)).toBe(3.5);
    expect(spacesBelowFor(false, 4)).toBe(3.5);
  });

  it('fits the base clearance until ledger lines push it down', () => {
    // The band was sized to live in the 3.5 spaces every system already
    // keeps below its bottom line; a page of counted music stays as
    // dense as one without.
    expect(spacesBelowFor(true, 0)).toBe(3.5);
    expect(spacesBelowFor(true, 3)).toBeGreaterThan(3.5);
    // Deeper music pushes further; a pedal-register note is capped so it
    // cannot spend the page on empty air.
    expect(spacesBelowFor(true, 20)).toBe(spacesBelowFor(true, 5));
  });
});
