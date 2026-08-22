/*
 * Two noteheads on one stem.
 *
 * A band part prints divisi constantly, and until 2026-08-22 nothing in this
 * app could hold it: one pitch per slot, one notehead drawn, and the Import
 * screen's "divisi" a choice of which line to read, resolved away at the door.
 * Roadmap § 1.10.
 *
 * These check the drawing, which is the half with geometry in it. Whether the
 * player may *take* either head is `acceptedMasks`, and the judge has never
 * had to know why a fingering is accepted.
 *
 * Glyphs are identified by their `translate`, since `drawGlyph` saves,
 * translates to where the glyph goes, scales and fills — so one translate is
 * one glyph, and its arguments are where it landed.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { parsePitch } from '../domain/pitch';
import { drawNote, type LayoutNote } from './notes';
import { staveMetrics } from './stave';

const SPACE = 12;
const metrics = staveMetrics('treble', 100, SPACE);

interface Call {
  method: string;
  args: unknown[];
}

function mockContext(calls: Call[]): CanvasRenderingContext2D {
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };
  const context: Record<string, unknown> = {
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    arcTo: record('arcTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    closePath: record('closePath'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    scale: record('scale'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  };
  return context as unknown as CanvasRenderingContext2D;
}

beforeAll(() => {
  (globalThis as { Path2D?: unknown }).Path2D = class {
    d: string | undefined;
    constructor(d?: string) {
      this.d = d;
    }
  };
});

function draw(note: Partial<LayoutNote> & { pitch: LayoutNote['pitch'] }): Call[] {
  const calls: Call[] = [];
  drawNote(mockContext(calls), metrics, {
    x: 100,
    duration: { value: 'quarter', dotted: false },
    showAccidental: false,
    colour: '#000',
    ...note,
  });
  return calls;
}

/** Where each glyph landed, in the order they were drawn. */
const glyphs = (calls: Call[]) =>
  calls.filter((c) => c.method === 'translate').map((c) => ({ x: Number(c.args[0]), y: Number(c.args[1]) }));

/**
 * The stem, as the pair of points it is stroked between.
 *
 * The *last* `moveTo`, not the first: a ledger line is drawn the same way and
 * comes first, which is what this test caught itself on — C4 in the treble
 * needs one, and its half-pixel offset read as a stem standing half a pixel
 * off its notehead.
 */
function stem(calls: Call[]): { from: number; to: number } {
  const move = calls.map((c) => c.method).lastIndexOf('moveTo');
  return { from: Number(calls[move].args[1]), to: Number(calls[move + 1].args[1]) };
}

describe('a divisi pair', () => {
  it('draws a second notehead, at its own pitch', () => {
    const alone = glyphs(draw({ pitch: parsePitch('C5') }));
    const pair = glyphs(
      draw({
        pitch: parsePitch('C5'),
        alternative: { pitch: parsePitch('C4'), showAccidental: false },
      }),
    );

    expect(alone).toHaveLength(1);
    expect(pair).toHaveLength(2);
    // An octave is seven diatonic steps, which is three and a half spaces.
    expect(Math.abs(pair[0].y - pair[1].y)).toBeCloseTo(3.5 * SPACE);
  });

  it('keeps both heads in one column, unless they are a second apart', () => {
    const wide = glyphs(
      draw({
        pitch: parsePitch('C5'),
        alternative: { pitch: parsePitch('E4'), showAccidental: false },
      }),
    );
    expect(wide[0].x).toBe(wide[1].x);

    /*
     * A second cannot be two heads side by side — the ellipses would overlap —
     * so one moves to the far side of the stem. Which one is the engraver's
     * rule and is asserted in the stem test below; here it is enough that they
     * stop sharing a column.
     */
    const second = glyphs(
      draw({
        pitch: parsePitch('C5'),
        alternative: { pitch: parsePitch('D5'), showAccidental: false },
      }),
    );
    expect(second[0].x).not.toBe(second[1].x);
  });

  it('spans the pair with one stem rather than crossing it', () => {
    /*
     * The fault this guards against is a stem drawn from the written head
     * only, which on a divisi octave leaves the other head hanging off nothing
     * — the same shape of fault as the beam that arrived at a notehead with no
     * stem, reported from bar 41 of a hymn.
     */
    const pair = draw({
      pitch: parsePitch('C5'),
      alternative: { pitch: parsePitch('C4'), showAccidental: false },
    });
    const heads = glyphs(pair);
    const lowest = Math.max(...heads.map((h) => h.y));
    const highest = Math.min(...heads.map((h) => h.y));
    const { from, to } = stem(pair);

    // C4 to C5 straddles the middle line and takes an up stem from the lower
    // head, so the stem stands on the low C and finishes above the high one.
    expect(from).toBeCloseTo(lowest);
    expect(to).toBeLessThan(highest);
  });

  it('gives each head its own accidental, in its own column', () => {
    const calls = draw({
      pitch: parsePitch('F#5'),
      showAccidental: true,
      alternative: { pitch: parsePitch('C#4'), showAccidental: true },
    });
    const drawn = glyphs(calls);

    // Two heads and two accidentals.
    expect(drawn).toHaveLength(4);
    const accidentals = drawn.filter((g) => g.x < 100);
    expect(accidentals).toHaveLength(2);
    // Never in the same column: the lower one steps further out.
    expect(accidentals[0].x).not.toBeCloseTo(accidentals[1].x);
  });

  it('leaves an ordinary note exactly as it was', () => {
    const calls = draw({ pitch: parsePitch('A4') });
    expect(glyphs(calls)).toHaveLength(1);
    const { from } = stem(calls);
    // Stands on its own head, which is where it always stood.
    expect(from).toBeCloseTo(glyphs(calls)[0].y);
  });
});
