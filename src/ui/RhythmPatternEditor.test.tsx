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
});
