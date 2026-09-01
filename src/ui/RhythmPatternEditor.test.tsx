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
