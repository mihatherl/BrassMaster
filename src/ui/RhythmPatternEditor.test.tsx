// @vitest-environment happy-dom

/**
 * The grid's gestures, tested at the component because that is where the
 * fault lived: the pure engraving was green while a tap-painted note
 * vanished on release. The press decides what the gesture means; these
 * pin that a tap paints AND STAYS, a second tap deletes, and a tap
 * mid-note splits — the player's three ruled gestures.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { RhythmPatternEditor } from './RhythmPatternEditor';

afterEach(cleanup);

function open() {
  const utils = render(
    <RhythmPatternEditor
      editing={null}
      instrumentId="eb-bass"
      clef="treble"
      onSaved={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const cells = () => utils.container.querySelectorAll('.rhythm-cell');
  const state = () =>
    [...cells()]
      .map((el) =>
        el.className.includes('is-attack') ? 'x' : el.className.includes('is-hold') ? '-' : '.',
      )
      .join('');
  const tap = (index: number) => {
    fireEvent.pointerDown(cells()[index]);
    fireEvent.pointerUp(cells()[index]);
  };
  return { ...utils, cells, state, tap };
}

describe('the grid’s gestures', () => {
  it('a single tap paints a note that SURVIVES its own release', () => {
    /*
     * The fault the player found on 2026-09-01: release read the cell to
     * decide the gesture, but the press had already changed the cell — so
     * a tap-painted attack looked like a tapped attack and deleted itself,
     * and only dragging could place a note.
     */
    const { state, tap } = open();
    tap(0);
    expect(state()).toBe('x...............');
  });

  it('a second tap on the note’s start deletes it, holds and all', () => {
    const { state, tap } = open();
    tap(0);
    // Grow it: drag from the attack? Paint a separate note and delete it.
    tap(4);
    expect(state()).toBe('x...x...........');
    tap(4);
    expect(state()).toBe('x...............');
  });

  it('a drag paints attack-plus-holds, and a tap inside splits it', () => {
    const { state, tap, cells } = open();
    fireEvent.pointerDown(cells()[8]);
    fireEvent.pointerEnter(cells()[9]);
    fireEvent.pointerEnter(cells()[10]);
    fireEvent.pointerEnter(cells()[11]);
    fireEvent.pointerUp(cells()[11]);
    expect(state()).toBe('........x---....');
    tap(10);
    expect(state()).toBe('........x-x-....');
  });

  it('deleting the front half of a split leaves the back half standing', () => {
    const { state, tap, cells } = open();
    fireEvent.pointerDown(cells()[0]);
    for (const i of [1, 2, 3]) fireEvent.pointerEnter(cells()[i]);
    fireEvent.pointerUp(cells()[3]);
    tap(2); // split
    tap(0); // delete the front note only
    expect(state()).toBe('..x-............');
  });
});

describe('the beat’s division toggle', () => {
  it('the numeral flips its own beat to triplets, resetting its cells', () => {
    const { container, state, tap, cells } = open();
    // Paint something in beat 2, then flip beat 2: the flip clears it —
    // four states cannot map honestly onto three.
    tap(4);
    expect(state()).toBe('....x...........');
    // Each beat wears one toggle naming what a tap gives you.
    const toggles = container.querySelectorAll('.rhythm-beat__toggle');
    expect(toggles).toHaveLength(4);
    expect(toggles[1].textContent).toBe('in 4');
    fireEvent.click(toggles[1]);
    // Beat 2 is now three cells: 15 in all, and beat 2 is empty again.
    expect(cells()).toHaveLength(15);
    expect(state()).toBe('...............');
    // Its toggle names the new state, and its cells carry the count.
    expect(container.querySelectorAll('.rhythm-beat__toggle')[1].textContent).toBe('in 3');
    const labels = [...container.querySelectorAll('.rhythm-cell__count')].map((el) => el.textContent);
    expect(labels).toEqual(['1', 'e', '&', 'a', '2', 'trip', 'let', '3', 'e', '&', 'a', '4', 'e', '&', 'a']);
  });

  it('a triplet painted after the flip engraves in triplet values', () => {
    const { container, cells, tap, getByText } = open();
    fireEvent.change(container.querySelector('input')!, { target: { value: 'Trip' } });
    const drag = (from: number, to: number) => {
      fireEvent.pointerDown(cells()[from]);
      for (let i = from + 1; i <= to; i++) fireEvent.pointerEnter(cells()[i]);
      fireEvent.pointerUp(cells()[to]);
    };
    drag(0, 3); // a crotchet on beat 1
    fireEvent.click(container.querySelectorAll('.rhythm-beat__toggle')[1]);
    // Beat 2 is now cells 4–6: three separate triplet attacks.
    tap(4); tap(5); tap(6);
    drag(7, 10); // a crotchet on beat 3 (the grid is 15 cells now)
    drag(11, 14); // and on beat 4
    fireEvent.click(getByText('Save'));
    const stored = JSON.parse(localStorage.getItem('brass-trainer:rhythms')!);
    expect(stored[stored.length - 1].bars).toEqual(['0q 0t 0t 0t 0q 0q']);
  });
});

describe('the cell editor — notes on the rhythm', () => {
  /*
   * The vertical axis of the stave the grid already draws (the player's
   * bridge, 2026-09-01). Dragging is a pointer gesture on a canvas, so
   * what is testable here is the state machine around it: a line
   * appears with one note per attack, and saving writes a cell beside
   * its rhythm rather than instead of it.
   */
  const paintCrotchets = (utils: ReturnType<typeof open>) => {
    for (const start of [0, 4, 8, 12]) {
      fireEvent.pointerDown(utils.cells()[start]);
      for (let i = start + 1; i < start + 4; i++) fireEvent.pointerEnter(utils.cells()[i]);
      fireEvent.pointerUp(utils.cells()[start + 3]);
    }
  };

  it('gives every attack a note when notes are added', () => {
    const utils = open();
    paintCrotchets(utils);
    fireEvent.click(utils.getByText('Add notes'));
    // Four crotchets, so four notes to drag — and a name field for them.
    expect(utils.container.querySelectorAll('input')).toHaveLength(2);
    expect(utils.getByText('Rhythm only')).toBeTruthy();
  });

  it('saves the cell beside its rhythm, with a snapshot of the bars', () => {
    localStorage.clear();
    const utils = open();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'Parent' } });
    paintCrotchets(utils);
    fireEvent.click(utils.getByText('Add notes'));
    fireEvent.change(utils.container.querySelectorAll('input')[1], { target: { value: 'Line' } });
    fireEvent.click(utils.getByText('Save'));

    const rhythms = JSON.parse(localStorage.getItem('brass-trainer:rhythms')!);
    const cells = JSON.parse(localStorage.getItem('brass-trainer:cells')!);
    // The pattern stays a pattern; the cell points at it and carries its own copy.
    expect(rhythms).toHaveLength(1);
    expect(rhythms[0].bars).toEqual(['0q 0q 0q 0q']);
    expect(cells).toHaveLength(1);
    expect(cells[0].patternId).toBe(rhythms[0].id);
    expect(cells[0].bars).toEqual(rhythms[0].bars);
    expect(cells[0].notes).toHaveLength(4);
  });

  it('saves no cell where the rhythm was left alone', () => {
    localStorage.clear();
    const utils = open();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'Bare' } });
    paintCrotchets(utils);
    fireEvent.click(utils.getByText('Save'));
    expect(localStorage.getItem('brass-trainer:cells')).toBeNull();
    expect(JSON.parse(localStorage.getItem('brass-trainer:rhythms')!)).toHaveLength(1);
  });

  it('an attack painted AFTER the line was seeded joins it and can be moved', () => {
    /*
     * The player's repro of 2026-09-03: a semiquaver, Add notes, then a
     * second semiquaver — which drew (the preview falls back to the
     * tonic) but had no entry in the line, so it could not be dragged or
     * nudged at all. A note belongs to its onset: the line reconciles on
     * every change of the engraved bars, and the first note's pitch must
     * survive the edit.
     */
    localStorage.clear();
    const utils = open();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'Grow' } });
    utils.tap(0); // a semiquaver on beat 1
    fireEvent.click(utils.getByText('Add notes'));
    // Move the seeded note first, so reconciliation must carry a real pitch.
    const canvas = utils.container.querySelector('.rhythm-editor__stave')!;
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 80 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(utils.getByLabelText('Up a step'));
    utils.tap(4); // the repro: a second semiquaver, painted after the seeding
    fireEvent.change(utils.container.querySelectorAll('input')[1], { target: { value: 'Two' } });
    fireEvent.click(utils.getByText('Save'));
    const cells = JSON.parse(localStorage.getItem('brass-trainer:cells')!);
    expect(cells[0].notes).toEqual([{ degree: 2 }, { degree: 1 }]);
  });
});

describe('moving a note', () => {
  /*
   * The player, 2026-09-03: dragging up dropped the note "down to middle
   * C or something", and no note could be pushed onto the ledger lines
   * above the stave. The drag re-read the pointer against the layout
   * after every move — and the layout MOVES, because the renderer
   * rescales the stave as notes climb into ledger lines, so the anchor
   * shifted under the gesture. It now measures the pointer's own travel
   * from a single anchor taken at the press.
   *
   * The gesture itself is a canvas pointer sequence; what is testable
   * here is the arrow path he asked for beside it, which shares the
   * step arithmetic — including the carry past the seventh that made
   * the ledger lines unreachable.
   */
  const withNotes = () => {
    const utils = open();
    for (const start of [0, 4, 8, 12]) {
      fireEvent.pointerDown(utils.cells()[start]);
      for (let i = start + 1; i < start + 4; i++) fireEvent.pointerEnter(utils.cells()[i]);
      fireEvent.pointerUp(utils.cells()[start + 3]);
    }
    fireEvent.click(utils.getByText('Add notes'));
    return utils;
  };

  it('cannot move a note until one is chosen', () => {
    const utils = withNotes();
    expect((utils.getByLabelText('Up a step') as HTMLButtonElement).disabled).toBe(true);
    expect(utils.getByText('Tap a note, then move it')).toBeTruthy();
  });

  it('carries past the seventh into the next octave, so ledger lines are reachable', () => {
    localStorage.clear();
    const utils = withNotes();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'P' } });
    // Select the first note through the canvas's own hit test.
    const canvas = utils.container.querySelector('.rhythm-editor__stave')!;
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 80 });
    fireEvent.pointerUp(canvas);
    // Nine steps up from the tonic: past the seventh, into the octave above.
    for (let i = 0; i < 9; i++) fireEvent.click(utils.getByLabelText('Up a step'));
    fireEvent.change(utils.container.querySelectorAll('input')[1], { target: { value: 'High' } });
    fireEvent.click(utils.getByText('Save'));
    const cells = JSON.parse(localStorage.getItem('brass-trainer:cells')!);
    // Degree 1 + 9 steps = degree 3 of the octave above.
    expect(cells[0].notes[0]).toEqual({ degree: 3, octave: 1 });
  });

  it('comes home from the octave above with no stale octave (the jumping drag)', () => {
    /*
     * Up nine steps and back down nine must land exactly where it began.
     * The old constructor kept the octave it had whenever the move landed
     * back in the home octave, so the round trip ended a seventh adrift —
     * the "jumps to the bottom of the stave" the player could not pin
     * down, because only gestures crossing the octave boundary showed it.
     */
    localStorage.clear();
    const utils = withNotes();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'R' } });
    const canvas = utils.container.querySelector('.rhythm-editor__stave')!;
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 80 });
    fireEvent.pointerUp(canvas);
    for (let i = 0; i < 9; i++) fireEvent.click(utils.getByLabelText('Up a step'));
    for (let i = 0; i < 9; i++) fireEvent.click(utils.getByLabelText('Down a step'));
    fireEvent.change(utils.container.querySelectorAll('input')[1], { target: { value: 'Home' } });
    fireEvent.click(utils.getByText('Save'));
    const cells = JSON.parse(localStorage.getItem('brass-trainer:cells')!);
    expect(cells[0].notes[0]).toEqual({ degree: 1 });
  });

  it('♯ and ♭ state the spelling, each a toggle, and a step-move clears it', () => {
    /*
     * Letter first, then accidental (ruled 2026-09-03): G sharp is
     * "drag to G, tap ♯" and A flat is "drag to A, tap ♭" — a half-step
     * increment cannot know which spelling the copied page shows. The
     * accidental belongs to the note it was written on, so moving the
     * note a step returns it to the scale's own note.
     */
    localStorage.clear();
    const utils = withNotes();
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'A' } });
    const canvas = utils.container.querySelector('.rhythm-editor__stave')!;
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 80 });
    fireEvent.pointerUp(canvas);
    const sharp = () => utils.getByLabelText('Sharp');
    const flat = () => utils.getByLabelText('Flat');
    fireEvent.click(sharp());
    expect(sharp().getAttribute('aria-pressed')).toBe('true');
    // The other accidental replaces it; a second tap on it is the natural.
    fireEvent.click(flat());
    expect(sharp().getAttribute('aria-pressed')).toBe('false');
    expect(flat().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(flat());
    expect(flat().getAttribute('aria-pressed')).toBe('false');
    // Raise it and save: the alteration reaches the stored cell.
    fireEvent.click(sharp());
    fireEvent.change(utils.container.querySelectorAll('input')[1], { target: { value: 'Raised' } });
    fireEvent.click(utils.getByText('Save'));
    const cells = JSON.parse(localStorage.getItem('brass-trainer:cells')!);
    expect(cells[0].notes[0]).toEqual({ degree: 1, alter: 1 });
    // And a step-move drops it: a fresh position means the plain note.
    fireEvent.click(utils.getByLabelText('Up a step'));
    expect(sharp().getAttribute('aria-pressed')).toBe('false');
  });
});
