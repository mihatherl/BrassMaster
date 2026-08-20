/*
 * Choosing a collection, from the generator's end.
 *
 * The seam is one line — the corpus handed to the stitcher is a collection's
 * themes instead of tunes composed for the run — and the whole feature rests on
 * it, so it is tested by what comes out rather than by whether the line is
 * there.
 *
 * The discriminator is bar counts, which is a fact about the material rather
 * than about the implementation: a composed tune is always `TUNE_BARS` long,
 * where the two Bach subjects are five bars and the invention is six. An
 * exercise made of five-bar tunes cannot have come from the composer.
 */

import { describe, expect, it } from 'vitest';
import { generateExercise } from './generate';
import { COMPOSED } from './collections';
import { difficultyById } from './difficulty';
import { TUNE_BARS } from './compose';
import { instrumentById } from '../domain/instruments';
import { metreFor } from '../domain/metre';

function run(collectionId: string, difficultyId: string, metre: readonly [number, number], seed = 42) {
  const m = metreFor(metre[0], metre[1]);
  const exercise = generateExercise({
    instrument: instrumentById('cornet'),
    clef: 'treble',
    fifths: 0,
    keySet: [0],
    difficulty: difficultyById(difficultyId),
    kind: 'themes',
    drillId: 'major-scale',
    bars: 16,
    themeCount: 3,
    cycles: 4,
    register: 'middle',
    metre: m,
    seed,
    tempo: 96,
    variableTempo: false,
    collectionId,
  });
  return { exercise, bars: exercise.totalBeats / m.barBeats };
}

describe('choosing where the tunes come from', () => {
  it('composes from cells by default', () => {
    // Composed tunes are a fixed length, so a whole number of them is the tell.
    expect(run(COMPOSED, 'easy', [4, 4]).bars % TUNE_BARS).toBe(0);
  });

  /*
   * Both Bach subjects are five bars, and nothing the composer writes is —
   * so a run that divides by five and not by eight came from the collection.
   */
  it('plays a collection when one is named', () => {
    const { bars } = run('bach', 'easy', [4, 4]);
    expect(bars % 5).toBe(0);
    expect(bars % TUNE_BARS).not.toBe(0);
  });

  it('plays a different collection differently', () => {
    // The invention is six bars, in three-four, and is the only hard Bach.
    expect(run('bach', 'hard', [3, 4]).bars % 6).toBe(0);
  });

  /*
   * The fallback, which is the same one a metre no cell is written in gets.
   * No Bach is written in six-eight, and asking for it must still produce
   * music rather than an empty screen or a throw.
   */
  it('falls back to composed tunes where the collection has nothing that fits', () => {
    const { exercise, bars } = run('bach', 'easy', [6, 8]);
    expect(exercise.notes.length).toBeGreaterThan(0);
    expect(bars % TUNE_BARS).toBe(0);
  });

  it('treats a collection it does not know as composed', () => {
    expect(run('no-such-collection', 'easy', [4, 4]).bars % TUNE_BARS).toBe(0);
  });

  /*
   * A seed names its music whatever the source. The stitcher draws from the
   * exercise's own rng, so a collection must not make a run unrepeatable.
   */
  it('stays deterministic for a seed', () => {
    const a = run('traditional', 'easy', [4, 4], 7);
    const b = run('traditional', 'easy', [4, 4], 7);
    expect(a.exercise.notes).toEqual(b.exercise.notes);
  });

  it('gives different music for different seeds', () => {
    const a = run('traditional', 'easy', [4, 4], 1);
    const b = run('traditional', 'easy', [4, 4], 2);
    expect(a.exercise.notes).not.toEqual(b.exercise.notes);
  });
});
