// @vitest-environment happy-dom
/**
 * My tunes — the player's passages as a collection under Tunes, playing
 * as written (reading-tab-plan.md, ruling 5, slice 2a).
 *
 * The rulings these hold: a passage keeps its author's key whatever the run
 * tours; its register is `cellWrittenMidi`'s, the one placement the editor
 * and the rhythm run already share; the level filter does not exclude it;
 * and the generator, handed the collection, plays it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { instrumentById } from '../domain/instruments';
import { midiOf } from '../domain/pitch';
import { metreFor } from '../domain/metre';
import { difficultyById } from './difficulty';
import { generateExercise } from './generate';
import { themesFor } from './phrases';
import {
  CELLS_KEY,
  MY_TUNES_ID,
  cellAsTheme,
  cellWrittenMidi,
  myTunes,
  type AuthoredCell,
} from './rhythm';
import { realiseTheme } from './theme';

const instrument = instrumentById('eb-bass');
const clef = 'treble' as const;

/** Eight notes in B flat, written the way a copied page would be. */
const passage: AuthoredCell = {
  id: 'bars-17-24',
  name: 'Bars 17–24',
  patternId: 'custom-bars',
  metre: [4, 4],
  fifths: -2,
  bars: ['0q 0q 0q 0q', '0q 0q 0h'],
  notes: [
    { degree: 1 },
    { degree: 2 },
    { degree: 3 },
    { degree: 5 },
    { degree: 6 },
    { degree: 5 },
    { degree: 1, octave: 1 },
  ],
};

describe('a written passage as a theme', () => {
  it('carries its author’s key', () => {
    expect(cellAsTheme(passage).written).toEqual({ fifths: -2 });
    expect(cellAsTheme({ ...passage, fifths: undefined }).written).toBeUndefined();
  });

  it('opens in that key whatever key the run asked for, at the page’s own register', () => {
    const theme = cellAsTheme(passage);
    const realised = realiseTheme(theme, { instrument, clef, fifths: 3, metre: metreFor(4, 4) })!;
    expect(realised, 'fits the E flat bass').not.toBeNull();
    expect(realised.keys[0].fifths, 'B flat, not the E flat asked for').toBe(-2);
    const expected = passage.notes.map((note) => cellWrittenMidi(note, -2, clef));
    const midis = realised.pitches.map((pitch) => (typeof pitch === 'number' ? pitch : midiOf(pitch)));
    expect(midis).toEqual(expected);
  });

  it('does not fit rather than float when the page’s register is out of reach', () => {
    const high = cellAsTheme({
      ...passage,
      notes: passage.notes.map((note) => ({ ...note, octave: (note.octave ?? 0) + 3 })),
    });
    expect(realiseTheme(high, { instrument, clef, fifths: -2, metre: metreFor(4, 4) })).toBeNull();
    // The same notes unpinned would have been floated down to fit.
    expect(
      realiseTheme({ ...high, written: undefined }, { instrument, clef, fifths: -2, metre: metreFor(4, 4) }),
    ).not.toBeNull();
  });

  it('passes the level filter at every level, since asking for it answered the question', () => {
    const theme = cellAsTheme(passage);
    for (const difficulty of ['beginner', 'easy', 'medium', 'hard']) {
      expect(
        themesFor({ instrument, clef, fifths: 0, difficulty, corpus: [theme] }).map((t) => t.id),
        difficulty,
      ).toEqual([theme.id]);
    }
  });
});

describe('the collection on the shelf', () => {
  beforeEach(() => localStorage.clear());

  it('is nothing until something is written', () => {
    expect(myTunes()).toBeNull();
  });

  it('holds every passage, and the generator plays it as written', () => {
    localStorage.setItem(CELLS_KEY, JSON.stringify([passage]));
    const mine = myTunes('My tunes')!;
    expect(mine.id).toBe(MY_TUNES_ID);
    expect(mine.themes.map((t) => t.name)).toEqual(['Bars 17–24']);

    const exercise = generateExercise({
      instrument,
      clef,
      fifths: 3,
      keySet: [3],
      difficulty: difficultyById('hard'),
      kind: 'themes',
      collectionIds: [MY_TUNES_ID],
      extraCollections: [mine],
      themeCount: 1,
      bars: 8,
      cycles: 1,
      metre: metreFor(4, 4),
      seed: 1,
    });
    expect(exercise.keys[0].fifths, 'the passage’s own key, not the run’s').toBe(-2);
    const expected = passage.notes.map((note) => cellWrittenMidi(note, -2, clef));
    expect(exercise.notes.slice(0, expected.length).map((note) => note.writtenMidi)).toEqual(expected);
  });
});
