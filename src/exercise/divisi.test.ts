/*
 * Divisi from a theme: the offer, the placement it buys, and the fingerings.
 *
 * The drawing is guarded in `render/divisi.test.ts`. These are the other half
 * — what a theme declaring `alsoOctave` actually produces, and the two
 * properties the rest of the app depends on without knowing it:
 *
 *  - **either head is correct**, because both fingerings land in the one
 *    `acceptedMasks` list the judge already asks about; and
 *  - **placement needs only one head in reach**, which is what lets music
 *    wider than any brass instrument be printed as written and still played.
 */

import { describe, expect, it } from 'vitest';
import { instrumentById } from '../domain/instruments';
import { metreFor } from '../domain/metre';
import { acceptedMasks } from '../domain/fingering';
import { exerciseFromTheme, realiseTheme, type Theme } from './theme';

const metre = metreFor(4, 4);
const cornet = instrumentById('cornet');

const n = (degree: number, beats: number, extra: Record<string, unknown> = {}) => ({
  degree,
  beats,
  ...extra,
});

/** A plain theme in C, four crotchets to the bar, with whatever notes are given. */
function theme(events: Theme['events'], bars: number): Theme {
  return {
    id: 'test-divisi',
    name: 'Test',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars,
    events,
  };
}

describe('a theme that offers an octave', () => {
  it('prints a second head an octave away, and leaves the written one alone', () => {
    const exercise = exerciseFromTheme(
      theme([n(1, 1, { alsoOctave: 1 }), n(3, 1), n(5, 1), n(1, 1)], 1),
      { instrument: cornet, clef: 'treble', fifths: 0, metre },
    )!;

    const [first, second] = exercise.notes;
    expect(first.alternative).toBeDefined();
    // The offer is an octave above; the written head has not moved.
    expect(first.alternative!.writtenMidi).toBe(first.writtenMidi + 12);
    // A note that made no offer has none.
    expect(second.alternative).toBeUndefined();
  });

  it('accepts either head, without the judge being told why', () => {
    /*
     * A third apart, so the two heads genuinely differ in fingering — an
     * octave pair shares one, which would make this test pass for the wrong
     * reason.
     */
    const exercise = exerciseFromTheme(
      theme([n(1, 1, { alsoOctave: 1 }), n(3, 1), n(5, 1), n(1, 1)], 1),
      { instrument: cornet, clef: 'treble', fifths: 0, metre },
    )!;
    const note = exercise.notes[0];

    for (const mask of acceptedMasks(note.soundingMidi, cornet)) {
      expect(note.acceptedMasks).toContain(mask);
    }
    for (const mask of acceptedMasks(note.alternative!.soundingMidi, cornet)) {
      expect(note.acceptedMasks).toContain(mask);
    }
    // Listed once each: an octave pair shares a fingering and must not double it.
    expect(new Set(note.acceptedMasks).size).toBe(note.acceptedMasks.length);
  });

  it('places music the instrument could not otherwise hold', () => {
    /*
     * Three and a half octaves of leaping — more than any brass instrument
     * has, and exactly the Prelude in C's problem in miniature. The low notes
     * offer the octave above and the high ones the octave below, so every note
     * has a head within reach even though the written line fits nowhere.
     */
    const wide = [
      n(1, 1, { octave: -2, alsoOctave: 1 }),
      n(5, 1, { octave: 1, alsoOctave: -1 }),
      n(1, 1, { octave: -2, alsoOctave: 1 }),
      n(1, 1, { octave: 1, alsoOctave: -1 }),
    ];
    /* The same line with the offers taken off, which is what the instrument
       is really being asked to hold. */
    const without = wide.map((note) => {
      const bare: Record<string, unknown> = { ...note };
      delete bare.alsoOctave;
      return bare as (typeof wide)[number];
    });

    expect(realiseTheme(theme(without, 1), { instrument: cornet, clef: 'treble', fifths: 0, metre }))
      .toBeNull();
    expect(realiseTheme(theme(wide, 1), { instrument: cornet, clef: 'treble', fifths: 0, metre }))
      .not.toBeNull();
  });

  it('reprints neither head across a tie', () => {
    const exercise = exerciseFromTheme(
      theme([n(1, 1, { alsoOctave: 1, tied: true }), n(1, 1, { alsoOctave: 1 }), n(3, 2)], 1),
      { instrument: cornet, clef: 'treble', fifths: 0, metre },
    )!;

    const held = exercise.notes[1];
    expect(held.alternative).toBeDefined();
    expect(held.alternative!.showAccidental).toBe(false);
  });
});
