import { describe, expect, it } from 'vitest';
import { attributesFor, type SkillKey } from './attributes';
import { metreFor } from '../domain/metre';
import type { Exercise, NoteEvent } from './types';
import type { Duration } from '../domain/rhythm';

/**
 * Labels are read off the music as written, so these fixtures build the music
 * directly rather than generating it — a generated exercise would make the
 * assertions depend on the generator's choices, which is exactly the coupling
 * that would make this test fail for reasons that are not about attribution.
 */

const crotchet: Duration = { value: 'quarter', dotted: false };

function note(partial: Partial<NoteEvent> & { writtenMidi: number; startBeat: number }): NoteEvent {
  return {
    soundingMidi: partial.writtenMidi,
    pitch: { letter: 'C', alter: 0, octave: 4 },
    duration: crotchet,
    acceptedMasks: [0],
    primaryMask: 0,
    beamGroup: -1,
    tupletGroup: -1,
    tiedToNext: false,
    showAccidental: false,
    ...partial,
  } as NoteEvent;
}

function exerciseOf(notes: NoteEvent[], fifths = 0, metre = metreFor(4, 4)): Exercise {
  return {
    notes,
    rests: [],
    instrumentId: 'cornet',
    clef: 'treble',
    keys: [{ fromBeat: 0, fifths }],
    metres: [{ fromBeat: 0, metre }],
    tempo: [],
    totalBeats: notes.length,
    committedBeats: notes.length,
  } as unknown as Exercise;
}

/** The labels for note `index`, as a set, for order-independent assertions. */
function labels(exercise: Exercise, bpm: number, index: number): Set<SkillKey> {
  return new Set(attributesFor(exercise, bpm)[index]);
}

describe('what a note asked of the reader', () => {
  it('labels the rhythm as it is written, dots and triplets included', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0, duration: { value: 'eighth', dotted: true } }),
      note({ writtenMidi: 60, startBeat: 1.5, duration: { value: 'eighth', dotted: false, tuplet: 3 } }),
    ]);
    expect(labels(exercise, 90, 0)).toContain('rhythm:eighth.');
    expect(labels(exercise, 90, 1)).toContain('rhythm:eighth-triplet');
  });

  it('bands the interval from the note before', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0 }),
      note({ writtenMidi: 60, startBeat: 1 }),
      note({ writtenMidi: 62, startBeat: 2 }),
      note({ writtenMidi: 66, startBeat: 3 }),
      note({ writtenMidi: 73, startBeat: 4 }),
      note({ writtenMidi: 85, startBeat: 5 }),
    ]);
    expect(labels(exercise, 90, 1)).toContain('interval:same');
    expect(labels(exercise, 90, 2)).toContain('interval:step');
    expect(labels(exercise, 90, 3)).toContain('interval:third');
    expect(labels(exercise, 90, 4)).toContain('interval:fourth-fifth');
    expect(labels(exercise, 90, 5)).toContain('interval:leap');
  });

  it('bands a leap downwards the same as one upwards', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 72, startBeat: 0 }),
      note({ writtenMidi: 60, startBeat: 1 }),
    ]);
    expect(labels(exercise, 90, 1)).toContain('interval:leap');
  });

  it('gives the first note no interval, having nothing to measure from', () => {
    const exercise = exerciseOf([note({ writtenMidi: 60, startBeat: 0 })]);
    expect([...labels(exercise, 90, 0)].some((key) => key.startsWith('interval:'))).toBe(false);
  });

  it('gives the far side of a tie no interval, because it is not a new attack', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0, tiedToNext: true }),
      note({ writtenMidi: 60, startBeat: 1 }),
      note({ writtenMidi: 62, startBeat: 2 }),
    ]);
    expect([...labels(exercise, 90, 1)].some((key) => key.startsWith('interval:'))).toBe(false);
    // …and the note after it is measured normally.
    expect(labels(exercise, 90, 2)).toContain('interval:step');
  });

  it('records whether an accidental had to be read', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 61, startBeat: 0, showAccidental: true }),
      note({ writtenMidi: 60, startBeat: 1 }),
    ]);
    expect(labels(exercise, 90, 0)).toContain('accidental:yes');
    expect(labels(exercise, 90, 1)).toContain('accidental:no');
  });

  it('separates notes on the pulse from notes between them', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0 }),
      note({ writtenMidi: 60, startBeat: 0.5 }),
      note({ writtenMidi: 60, startBeat: 5 }),
    ]);
    expect(labels(exercise, 90, 0)).toContain('beat:on');
    expect(labels(exercise, 90, 1)).toContain('beat:off');
    // A pulse in the second bar is still a pulse.
    expect(labels(exercise, 90, 2)).toContain('beat:on');
  });

  it('counts the pulse of a compound metre, not the crotchet', () => {
    // 6/8: the bar is three crotchets and the pulse is a dotted crotchet, so
    // the second pulse falls at 1.5 — a place that is off the beat in 4/4.
    const exercise = exerciseOf(
      [
        note({ writtenMidi: 60, startBeat: 1.5 }),
        note({ writtenMidi: 60, startBeat: 1 }),
      ],
      0,
      metreFor(6, 8),
    );
    expect(labels(exercise, 90, 0)).toContain('beat:on');
    expect(labels(exercise, 90, 1)).toContain('beat:off');
  });

  it('records the key in force, signed so flats and sharps differ', () => {
    const flat = exerciseOf([note({ writtenMidi: 60, startBeat: 0 })], -4);
    const sharp = exerciseOf([note({ writtenMidi: 60, startBeat: 0 })], 4);
    expect(labels(flat, 90, 0)).toContain('key:-4');
    expect(labels(sharp, 90, 0)).toContain('key:4');
  });

  it('follows a key change through the exercise', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0 }),
      note({ writtenMidi: 60, startBeat: 4 }),
    ]);
    exercise.keys = [
      { fromBeat: 0, fifths: 0 },
      { fromBeat: 4, fifths: -3 },
    ];
    expect(labels(exercise, 90, 0)).toContain('key:0');
    expect(labels(exercise, 90, 1)).toContain('key:-3');
  });

  it('bands the tempo, and keeps the top band open', () => {
    const exercise = exerciseOf([note({ writtenMidi: 60, startBeat: 0 })]);
    expect(labels(exercise, 50, 0)).toContain('tempo:under-60');
    expect(labels(exercise, 60, 0)).toContain('tempo:60-79');
    expect(labels(exercise, 99, 0)).toContain('tempo:80-99');
    expect(labels(exercise, 200, 0)).toContain('tempo:140-plus');
  });

  it('labels every note, so nothing judged can go unattributed', () => {
    const exercise = exerciseOf([
      note({ writtenMidi: 60, startBeat: 0 }),
      note({ writtenMidi: 64, startBeat: 1 }),
    ]);
    const all = attributesFor(exercise, 90);
    expect(all).toHaveLength(2);
    for (const keys of all) expect(keys.length).toBeGreaterThan(0);
  });
});
