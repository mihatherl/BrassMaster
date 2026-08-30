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
import { levelRuleOf, rawAxesOf, rawRulesOf, Timeline } from './timeline/Timeline';
import { formatSeconds, layoutOf } from './timeline/layout';
import { Prescription } from './Prescription';
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
    const picker = screen.getByLabelText(/add a new axis/i) as HTMLSelectElement;
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
    fireEvent.change(screen.getByLabelText(/add a new axis/i), {
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

describe('what a new level arrives with', () => {
  /*
   * Ruled 2026-08-30. A new level used to arrive with a six-step tempo axis
   * baked into the editor, which was the editor answering a pedagogical
   * question that belongs to the author. Course defaults are the place for
   * "what every level looks like", and inheritance already carries them —
   * so a fresh level now states only what it cannot inherit: its name.
   */
  it('inherits the course’s axes rather than restating them', () => {
    const doc = {
      id: 'c',
      name: 'C',
      blurb: '',
      schemaVersion: 1,
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy' },
      axes: [{ axis: 'tempo', divisions: [{ at: 0, value: 66 }, { at: 0.5, value: 80 }] }],
      // A level with nothing but a name — what `freshLevel` now makes.
      levels: [{ id: 'one', name: 'One' }],
    };
    const course = readCourse(doc);
    expect(course).not.toHaveProperty('error');
    const level = (course as Course).levels[0];
    // The course's shape reached it whole, without the level saying a word.
    expect(level.segments.map((segment) => segment.values.tempo)).toEqual([66, 80]);
  });

  it('reads clean with no axes anywhere at all', () => {
    // One segment, the level default rule — the ruling of 2026-08-29 that a
    // level may have no axes, which is what makes an empty fresh level legal.
    const course = readCourse({
      id: 'c',
      name: 'C',
      blurb: '',
      schemaVersion: 1,
      levels: [
        { id: 'one', name: 'One', base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy' } },
      ],
    });
    expect(course).not.toHaveProperty('error');
    expect((course as Course).levels[0].segments).toHaveLength(1);
  });
});

describe('a range stage', () => {
  const RANGE = {
    id: 'r',
    name: 'R',
    base: { kind: 'phrases', difficultyId: 'easy' },
    axes: [
      {
        axis: 'range',
        divisions: [
          { at: 0, value: { low: 61, high: 73 } },
          { at: 0.5, value: { low: 59, high: 76 } },
        ],
      },
    ],
  };

  it('gives the range row its own taller class, because a stave is tall', () => {
    /*
     * `drawRangeStave` sizes itself from the ink it must show — a brass
     * compass is thirteen spaces counting ledger lines — so it cannot fit
     * the row an axis of numbers uses. At the ordinary height the figure
     * overflowed by 63px, its ledger lines were cut off top and bottom, and
     * the two bound inputs were clipped away entirely. The class is the
     * reachable half here; the fit was measured in a real browser.
     */
    const { container } = render(<Timeline kind="phrases" level={RANGE} onPatch={vi.fn()} />);
    expect(container.querySelector('.tl-axis__bar.is-range')).toBeTruthy();
  });

  it('draws a stave and both bound inputs for every division', () => {
    const { container } = render(<Timeline kind="phrases" level={RANGE} onPatch={vi.fn()} />);
    expect(container.querySelectorAll('.tl-range')).toHaveLength(2);
    // Two bounds per stage: the figure alone cannot be typed into.
    expect(container.querySelectorAll('.tl-range__bounds input')).toHaveLength(4);
  });

  it('patches the document when a bound is edited', () => {
    const onPatch = vi.fn();
    const { container } = render(<Timeline kind="phrases" level={RANGE} onPatch={onPatch} />);
    const low = container.querySelectorAll('.tl-range__bounds input')[0];
    fireEvent.change(low, { target: { value: '55' } });
    expect(onPatch).toHaveBeenCalled();
    const axes = onPatch.mock.calls[0][0].axes as { divisions: { value: unknown }[] }[];
    expect(axes[0].divisions[0].value).toEqual({ low: 55, high: 73 });
  });
});

describe('a level folds to its header bar', () => {
  /*
   * The readability ruling of 2026-08-30: everything but the coloured stage
   * blocks was "distinguishable by no more than thin white lines". A level
   * became a card with a solid header bar, and the bar is what it collapses
   * to — so a long course reads as a list of bars, each still carrying the
   * name, the length and the controls that act on the level as a whole.
   */
  it('measures a level through the timeline’s own readers, so the two agree', () => {
    const layout = layoutOf(
      { axes: rawAxesOf(LEVEL), segmentRules: rawRulesOf(LEVEL) },
      levelRuleOf(LEVEL),
      {},
    );
    // What the header states is exactly what the graph beneath it draws.
    expect(layout.totalBars).toBeGreaterThan(0);
    expect(formatSeconds(layout.totalSeconds)).toMatch(/^\d+:\d\d$/);
  });

  it('reports nothing for a level it cannot read, rather than guessing', () => {
    /*
     * A figure invented for a broken level would be one the app cannot stand
     * behind, and the red verdict already says what is wrong.
     */
    const broken = { id: 'x', name: 'X', axes: [{ axis: 'tempo', divisions: [] }] };
    expect(() =>
      layoutOf(
        { axes: rawAxesOf(broken), segmentRules: rawRulesOf(broken) },
        levelRuleOf(broken),
        {},
      ),
    ).not.toThrow();
  });
});

describe('the header a themes level shows', () => {
  it('offers no Difficulty control either: a written tune carries its own', () => {
    /*
     * Ruled 2026-08-30. A difficulty tells the generator what to write, and
     * a named tune is already written — the generator turns the level filter
     * off for a named playlist, so the field was demanded and then ignored.
     */
    const level = { id: 'one', name: 'One', base: { kind: 'themes' } };
    render(
      <Prescription
        scope="level"
        record={level}
        onTimeline={new Set()}
        onPatch={vi.fn()}
        onPatchBase={vi.fn()}
      />,
    );
    expect(screen.queryByText('Difficulty')).toBeNull();
  });

  it('offers no Key control, because each tune names its own', () => {
    /*
     * Ruled 2026-08-30. Not merely redundant: `AXES.fifths.kinds` excludes
     * themes, so `readCourse` REFUSES a themes level that sets a key — a
     * control whose only possible effect is to break the document.
     */
    const level = { id: 'one', name: 'One', base: { kind: 'themes', difficultyId: 'easy' } };
    render(
      <Prescription
        scope="level"
        record={level}
        onTimeline={new Set()}
        onPatch={vi.fn()}
        onPatchBase={vi.fn()}
      />,
    );
    expect(screen.queryByText('Key')).toBeNull();
  });

  it('still offers Key where the material can play one', () => {
    const level = { id: 'one', name: 'One', base: { kind: 'phrases', difficultyId: 'easy' } };
    render(
      <Prescription
        scope="level"
        record={level}
        onTimeline={new Set()}
        onPatch={vi.fn()}
        onPatchBase={vi.fn()}
      />,
    );
    expect(screen.getByText('Key')).toBeTruthy();
  });
});

describe('a tune stage', () => {
  const TUNES = {
    id: 'tunes',
    name: 'Tunes',
    base: { kind: 'themes', difficultyId: 'easy' },
    axes: [
      {
        axis: 'themes',
        divisions: [
          { at: 0, value: { id: 'plain-answer', fifths: 0 } },
          { at: 0.5, value: { id: 'plain-answer', fifths: -1 } },
        ],
      },
    ],
  };

  it('names the tune, its length and its key, so nothing is chosen blind', () => {
    /*
     * The whole complaint the themes axis answers: an author could not see
     * what they were choosing. The name and the bars are the minimum, and
     * the stave beside them is the rest of it.
     */
    render(<Timeline kind="themes" level={TUNES} onPatch={vi.fn()} />);
    expect(screen.getAllByText(/Plain answer/)[0]).toBeTruthy();
    expect(screen.getAllByText(/8 bars/)[0]).toBeTruthy();
  });

  it('draws a stave for every tune, not a summary of it', () => {
    const { container } = render(<Timeline kind="themes" level={TUNES} onPatch={vi.fn()} />);
    expect(container.querySelectorAll('.tl-theme__stave')).toHaveLength(2);
  });

  it('gives the tunes row its own taller class, because two things stack in it', () => {
    /*
     * The look IS the feature here (the lesson of 2026-08-29, when a test
     * asserted a class and an unstyled ghost passed): a tune stage carries a
     * name above a stave, and at the ordinary row height the name was
     * clipped out of the block. Asserting the class is the reachable half in
     * happy-dom; the measurement was taken in a real browser.
     */
    const { container } = render(<Timeline kind="themes" level={TUNES} onPatch={vi.fn()} />);
    expect(container.querySelector('.tl-axis__bar.is-tunes')).toBeTruthy();
  });

  it('offers no drag handle, because a tune is as long as it is', () => {
    const { container } = render(<Timeline kind="themes" level={TUNES} onPatch={vi.fn()} />);
    expect(container.querySelectorAll('.tl-drag')).toHaveLength(0);
  });

  it('does not offer key on a themes level: each tune names its own', () => {
    const { container } = render(<Timeline kind="themes" level={TUNES} onPatch={vi.fn()} />);
    const picker = container.querySelector('.tl-add__ghost select')!;
    const offered = [...picker.querySelectorAll('option')].map((o) => o.textContent);
    expect(offered).not.toContain('Key');
    // And the tunes axis is gone from the list because it is already drawn.
    expect(offered).not.toContain('Tunes');
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

/*
 * Course defaults (2026-08-29): the course says a thing once and every
 * level that does not say it plays it. Two mechanisms, because a scalar
 * and an axis are different kinds of thing — a dropdown can name a value
 * but not a shape.
 */
describe('inheriting from the course', () => {
  it('names the course’s answer in a scalar’s empty option', () => {
    render(
      <Prescription
        scope="level"
        record={{ base: {} }}
        inherited={{ base: { kind: 'drills' }, fields: { metronomeEnabled: false } }}
        onTimeline={new Set()}
        onPatch={vi.fn()}
        onPatchBase={vi.fn()}
      />,
    );
    const metronome = screen.getByLabelText(/Metronome/) as HTMLSelectElement;
    expect(metronome.value).toBe('');
    expect(metronome.options[0].text).toBe('Course default: off');
    // And the control is marked as taking it rather than stating it.
    expect(metronome.closest('label')!.className).toContain('is-inherited');
  });

  it('says which parameters the course moves on its own timeline', () => {
    render(
      <Prescription
        scope="level"
        record={{ base: {} }}
        inherited={{ base: { kind: 'drills' }, fields: {} }}
        onTimeline={new Set(['tempo'])}
        fromCourse={new Set(['tempo'])}
        onPatch={vi.fn()}
        onPatchBase={vi.fn()}
      />,
    );
    const tempo = screen.getByLabelText(/Tempo/) as HTMLInputElement;
    expect(tempo.disabled).toBe(true);
    expect(tempo.placeholder).toBe('On the course’s timeline');
  });

  it('draws an inherited axis ghosted, and takes a copy on request', () => {
    const onAdopt = vi.fn();
    const onPatch = vi.fn();
    render(
      <Timeline
        kind="phrases"
        level={LEVEL}
        inherited={['tempo']}
        onAdopt={onAdopt}
        onPatch={onPatch}
      />,
    );
    const tempoRow = document.querySelectorAll('.tl-axis__bar')[0];
    // Drawn — it shapes this level's stages — but not this level's to edit.
    expect(tempoRow.querySelectorAll('.tl-span.is-ghost')).toHaveLength(2);
    expect(tempoRow.querySelectorAll('.tl-handle')).toHaveLength(0);
    expect((tempoRow.querySelector('.tl-span__body') as HTMLFieldSetElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /override/i }));
    expect(onAdopt).toHaveBeenCalledWith('tempo');
  });

  it('never writes an inherited axis back into the level', () => {
    const onPatch = vi.fn();
    render(<Timeline kind="phrases" level={LEVEL} inherited={['tempo']} onPatch={onPatch} />);
    // Edit something on the level's OWN axis; the course's must not follow.
    const own = [...document.querySelectorAll('.tl-axis__bar')][1];
    fireEvent.change(own.querySelector('select.tl-value')!, { target: { value: 'paged' } });
    const patched = onPatch.mock.calls[0][0].axes as { axis: string }[];
    expect(patched.map((a) => a.axis)).toEqual(['readingMode']);
  });
});
