// @vitest-environment happy-dom

/**
 * The editor's first tests, arriving with the timeline (2026-08-29). The
 * heavy lifting — rule semantics, snapping, generators — is pure and tested
 * in `timeline/*.test.ts`; these prove the round-trip and that the drawing
 * actually mounts: a course document in, the bars and the rules table out,
 * an edit flowing back as a patch.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Timeline } from './timeline/Timeline';
import { documentOf } from './document';
import { readCourse, type Course } from '../exercise/course';

afterEach(cleanup);

const LEVEL = {
  id: 'one',
  name: 'One',
  base: { kind: 'phrases', difficultyId: 'easy' },
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
        { at: 0.75, value: 'paged' },
      ],
    },
  ],
  segmentRules: [{ at: 0.5, minBars: 6 }],
};

describe('the timeline', () => {
  it('draws one bar per axis, a value at each division, and the rules table', () => {
    render(<Timeline kind="phrases" level={LEVEL} onPatch={vi.fn()} />);
    expect(screen.getByText('Tempo')).toBeTruthy();
    expect(screen.getByText('Reading')).toBeTruthy();
    // The division's own value editor — not the generator's "to" field,
    // which echoes the same figure.
    const values = [...document.querySelectorAll('input.tl-value')] as HTMLInputElement[];
    expect(values.map((input) => input.value)).toEqual(['60', '72']);
    // A value is drawn as a block spanning until its OWN axis changes: the
    // reading divider at 0.75 must not cut the 72 block short.
    const tempoSpans = [
      ...document.querySelectorAll('.tl-axis__bar')[0].querySelectorAll('.tl-span'),
    ] as HTMLElement[];
    expect(tempoSpans).toHaveLength(2);
    const edge = (span: HTMLElement) =>
      parseFloat(span.style.left) + parseFloat(span.style.width);
    // 8 + 6 + 8 bars: the second tempo value begins at bar 9 and runs to the
    // end, straight across the reading divider at bar 15.
    expect(parseFloat(tempoSpans[1].style.left)).toBeCloseTo((8 / 22) * 100, 6);
    expect(edge(tempoSpans[1])).toBeCloseTo(100, 6);
    // Three boundaries — 0, 0.5, 0.75 — so three rule chips; the authored
    // one wears its own figures, the defaults the level's.
    expect(document.querySelectorAll('.tl-chip')).toHaveLength(3);
    const authored = document.querySelectorAll('.tl-chip.is-authored');
    expect(authored).toHaveLength(1);
    expect(authored[0].textContent).toContain('6 bars');
    // The x-axis is bars: 8 + 6 + 8, and the corner says so.
    expect(screen.getByText(/22 bars/)).toBeTruthy();
  });

  it('opens a rule callout from a chip, editing through it', () => {
    const onPatch = vi.fn();
    render(<Timeline kind="phrases" level={LEVEL} onPatch={onPatch} />);
    fireEvent.click(document.querySelector('.tl-chip.is-authored')!);
    const callout = screen.getByRole('dialog', { name: /segment rule/i });
    expect(callout.textContent).toContain('This segment’s own rule');
    fireEvent.change(callout.querySelector('input[type=number]')!, { target: { value: '4' } });
    const patch = onPatch.mock.calls[0][0];
    expect(patch.segmentRules).toContainEqual({ at: 0.5, minBars: 4 });
    // A default segment's callout materialises a copy-of-default on edit.
    cleanup();
    const onPatch2 = vi.fn();
    render(<Timeline kind="phrases" level={LEVEL} onPatch={onPatch2} />);
    fireEvent.click(document.querySelectorAll('.tl-chip.is-default')[0]);
    const fresh = screen.getByRole('dialog', { name: /segment rule/i });
    expect(fresh.textContent).toContain('Level default in force');
    fireEvent.change(fresh.querySelector('input[type=number]')!, { target: { value: '12' } });
    expect(onPatch2.mock.calls[0][0].segmentRules).toContainEqual({
      at: 0,
      minBars: 12,
      score: { atLeast: 0.85, overBars: 4 },
    });
  });

  /*
   * The clipped callout, 2026-08-29: `.tl__scroll` carries `overflow-x:
   * auto` for sideways scrolling, and CSS forces the other axis to `auto`
   * with it — so the scroller clips vertically no matter what, and a
   * callout opening upward lost its head. It opens downward now, into room
   * the scroller reserves while it is up. The room is MEASURED from the
   * callout (the first fix guessed 13.5rem and was a pixel short of the
   * plainest variant, half the tallest), so this guards the wiring rather
   * than a figure: no reported room, no reserved space, clipped again.
   */
  it('reserves measured room for an open callout, and gives it back on close', () => {
    render(<Timeline kind="phrases" level={LEVEL} onPatch={vi.fn()} />);
    const scroller = document.querySelector('.tl__scroll') as HTMLElement;
    expect(scroller.style.paddingBottom).toBe('');

    fireEvent.click(document.querySelector('.tl-chip')!);
    expect(scroller.className).toContain('has-callout');
    // A number, from the callout's own measurement — not an assumed constant.
    expect(scroller.style.paddingBottom).toMatch(/^\d+px$/);
    // Downward, which is the whole fix: the callout follows its chip in the
    // DOM rather than hanging above it through the ruler.
    const callout = screen.getByRole('dialog', { name: /segment rule/i });
    expect(callout.previousElementSibling?.className).toContain('tl-chip');

    fireEvent.click(callout.querySelector('button[title="Close"]')!);
    expect(scroller.style.paddingBottom).toBe('');
    expect(scroller.className).not.toContain('has-callout');
  });

  /*
   * The score window is not a wall (player's ruling, 2026-08-29): it used to
   * floor the drag at four bars — a figure the author never set — so a
   * divider could not be brought closer than that to its neighbour. The
   * window bends down with the stage instead, and reads in the singular
   * when a stage is one bar.
   */
  it('shows a squeezed stage with its window bent to fit', () => {
    render(
      <Timeline
        kind="phrases"
        level={{
          ...LEVEL,
          segmentRules: [{ at: 0.5, minBars: 1, score: { atLeast: 0.85, overBars: 1 } }],
        }}
        onPatch={vi.fn()}
      />,
    );
    const authored = document.querySelector('.tl-chip.is-authored')!;
    expect(authored.textContent).toContain('1 bar ·');
    expect(authored.textContent).toContain('85%/1');
  });

  it('anchors a late segment’s callout to the right, so it stays on the page', () => {
    render(<Timeline kind="phrases" level={LEVEL} onPatch={vi.fn()} />);
    const chips = document.querySelectorAll('.tl-chip');
    fireEvent.click(chips[chips.length - 1]);
    expect(screen.getByRole('dialog', { name: /segment rule/i }).className).toContain('is-right');
  });

  it('offers only the axes the material can play, and not those already drawn', () => {
    render(<Timeline kind="phrases" level={LEVEL} onPatch={vi.fn()} />);
    const picker = screen.getByLabelText(/add an axis/i) as HTMLSelectElement;
    const offered = [...picker.options].map((option) => option.value).filter(Boolean);
    expect(offered).toContain('range');
    expect(offered).toContain('intervals');
    expect(offered).not.toContain('tempo'); // already on the timeline
    expect(offered).not.toContain('span'); // drills only
    expect(offered).not.toContain('cycles');
  });

  it('unpins a header scalar when its parameter is moved onto the timeline', () => {
    const onPatch = vi.fn();
    render(
      <Timeline
        kind="phrases"
        level={{ ...LEVEL, axes: undefined, segmentRules: undefined, metronomeEnabled: false }}
        onPatch={onPatch}
      />,
    );
    fireEvent.change(screen.getByLabelText(/add an axis/i), {
      target: { value: 'metronomeEnabled' },
    });
    const patch = onPatch.mock.calls[0][0];
    expect(patch.metronomeEnabled).toBeUndefined();
    expect('metronomeEnabled' in patch).toBe(true); // explicitly cleared
    expect(patch.axes.some((a: { axis: string }) => a.axis === 'metronomeEnabled')).toBe(true);
  });

  it('edits a division value in place', () => {
    const onPatch = vi.fn();
    render(<Timeline kind="phrases" level={LEVEL} onPatch={onPatch} />);
    const division = [...document.querySelectorAll('input.tl-value')].find(
      (input) => (input as HTMLInputElement).value === '72',
    )!;
    fireEvent.change(division, { target: { value: '80' } });
    const patch = onPatch.mock.calls[0][0];
    const tempo = patch.axes.find((a: { axis: string }) => a.axis === 'tempo');
    expect(tempo.divisions[1]).toEqual({ at: 0.5, value: 80 });
  });
});

describe('modernising an old document', () => {
  const OLD = {
    id: 'old-course',
    name: 'Old',
    blurb: '',
    schemaVersion: 1,
    pinned: { metronomeEnabled: true },
    advance: { afterBars: 6, windowBars: 3, accuracyAbove: 0.8, carryEvidence: true },
    levels: [
      {
        id: 'one',
        name: 'One',
        base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
        tempo: { floor: 60, ceiling: 72, step: 6 },
      },
    ],
  };

  it('rewrites bands, pins and advance as axes, scalars and rules — and reads clean again', () => {
    const modern = documentOf(readCourse(OLD) as Course);
    const level = modern.levels[0];
    expect(level.tempo).toBeUndefined();
    expect(level.axes).toEqual([
      {
        axis: 'tempo',
        divisions: [
          { at: 0, value: 60 },
          { at: 1 / 3, value: 66 },
          { at: 2 / 3, value: 72 },
        ],
      },
    ]);
    expect(level.metronomeEnabled).toBe(true);
    expect(level.rules).toEqual({ minBars: 6, score: { atLeast: 0.8, overBars: 3 } });
    expect('advance' in level).toBe(false);
    expect('pinned' in level).toBe(false);
    expect('segments' in level).toBe(false); // derived, never authored

    const reread = readCourse(modern);
    expect('error' in reread).toBe(false);
    expect((reread as Course).levels[0].segments.map((s) => s.values.tempo)).toEqual([60, 66, 72]);
  });
});
