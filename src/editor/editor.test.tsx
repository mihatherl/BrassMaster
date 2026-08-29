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
    // Three boundaries — 0, 0.5, 0.75 — so three rule columns; the authored
    // override shows its figure, the default cells their placeholder.
    expect(screen.getByDisplayValue('6')).toBeTruthy();
    expect(document.querySelectorAll('.tl-cell')).toHaveLength(3);
    expect(document.querySelectorAll('.tl-cell.is-authored')).toHaveLength(1);
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
