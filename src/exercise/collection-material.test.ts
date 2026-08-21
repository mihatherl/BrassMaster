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
import { collectionById, playableThemes } from './collections';
import { difficultyById } from './difficulty';
import { TUNE_BARS } from './compose';
import { instrumentById } from '../domain/instruments';
import { changesMetre, metreFor } from '../domain/metre';

function run(
  collectionIds: string[],
  difficultyId: string,
  metre: readonly [number, number],
  seed = 42,
  themeIds: string[] = [],
) {
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
    collectionIds,
    themeIds,
    selection: themeIds.length > 0 ? ('defined' as const) : ('medley' as const),
  });
  return { exercise, bars: exercise.totalBeats / m.barBeats };
}

/*
 * Which Bach can actually be played, asked rather than assumed.
 *
 * This file has now broken three times because it named themes or levels the
 * corpus happened to hold — a title that did not match a regex, a level whose
 * only members turned out to be unheard. The corpus changing is the one thing
 * it is guaranteed to do, so what a test needs from it gets derived.
 */
const playable = (id: string) => playableThemes(collectionById(id)!);

/**
 * A written theme whose length is *not* the composer's fixed one, so a bar
 * count alone says which of the two produced a run. Searched for rather than
 * named: which tunes are playable changes every time one is heard.
 */
const telling = [...playable('default'), ...playable('bach')].find(
  (theme) => theme.bars % TUNE_BARS !== 0,
)!;

/** Its level, and a tune of a different metre at that same level. */
const tellingLevel = telling.difficulty;
const differentMetre = [...playable('default'), ...playable('bach')].find(
  (t) =>
    t.difficulty === tellingLevel &&
    (t.metres[0][0] !== telling.metres[0][0] || t.metres[0][1] !== telling.metres[0][1]),
)!;

describe('choosing where the tunes come from', () => {
  it('composes from cells by default', () => {
    // Composed tunes are a fixed length, so a whole number of them is the tell.
    expect(run([], 'easy', [4, 4]).bars % TUNE_BARS).toBe(0);
  });

  /*
   * A written tune is whatever length it is; a composed one is always
   * TUNE_BARS. So a run that divides by the collection's own bar count and not
   * by the composer's came from the collection.
   */
  it('plays a collection when one is named', () => {
    const { bars } = run(['default', 'bach'], tellingLevel, [4, 4], 3, [telling.id]);
    expect(bars % telling.bars).toBe(0);
    expect(bars % TUNE_BARS).not.toBe(0);
  });

  /*
   * **The metre follows the material.** A collection plays each tune in its
   * own time signature, whatever the settings hold — asking for the Bach in
   * six-eight brings the whole Bach, not silence, because the control set for
   * composed material has nothing to say about written tunes. The subjects
   * are in four-four and the run opens in it, in five-bar multiples that
   * nothing composed produces.
   */
  it('ignores the chosen time signature and plays each tune in its own', () => {
    // Six-eight is asked for; the collection holds nothing in it, and plays
    // its tunes in their own metres regardless rather than falling through.
    const own = telling.metres[0];
    const { exercise } = run(['default', 'bach'], tellingLevel, [6, 8], 3, [telling.id]);
    expect(exercise.metres[0].metre.beatsPerBar).toBe(own[0]);
    expect(exercise.metres[0].metre.beatUnit).toBe(own[1]);
  });

  /*
   * The hard Bach spans three-four and four-four, so a medley of it must
   * change signature mid-exercise — and only at a join, because a signature
   * changing inside a tune would be laid over somebody else's phrase, the
   * same trespass a key change there would be.
   */
  it('changes metre between tunes, and only where a tune begins', () => {
    const { exercise } = run(['default', 'bach'], tellingLevel, [4, 4], 3, [
      telling.id,
      differentMetre.id,
    ]);
    expect(changesMetre(exercise.metres)).toBe(true);
    const starts = new Set(exercise.labels.map((label) => label.atBeat));
    for (const change of exercise.metres) {
      if (change.fromBeat > 0) expect(starts.has(change.fromBeat)).toBe(true);
    }
  });

  /*
   * A medley says which tune is which. Every label sits where a tune begins,
   * carries its printed name rather than its id, and the first is at the top.
   */
  it('labels each tune with its name at its first bar', () => {
    const { exercise } = run(['default', 'bach'], tellingLevel, [4, 4], 3);
    expect(exercise.labels.length).toBeGreaterThan(1);
    expect(exercise.labels[0].atBeat).toBe(0);
    // Against the collection, not against a list of names written here — the
    // sibling test above learnt this the same way, when a Bach theme whose
    // title looked nothing like the others broke a working medley.
    const names = new Set([...playable('default'), ...playable('bach')].map((t) => t.name));
    for (const label of exercise.labels) {
      expect(names.has(label.text), label.text).toBe(true);
    }
  });

  it('leaves composed tunes unlabelled, since they have ids rather than names', () => {
    expect(run([], 'easy', [4, 4]).exercise.labels).toEqual([]);
  });

  /*
   * Naming tunes overrides the level: Jesu Joy is medium, and a player who
   * picked it under an easy setting has said which tunes they want more
   * plainly than any level could. The pick also carries its own nine-eight.
   */
  it('plays picked tunes whatever the level says', () => {
    const { exercise } = run(['bach'], 'easy', [4, 4], 3, ['jesu-joy']);
    expect(exercise.labels.every((label) => label.text.startsWith('Jesu'))).toBe(true);
    expect(exercise.metres[0].metre.beatsPerBar).toBe(9);
  });

  /*
   * The fallback that remains: a collection with nothing at the chosen level.
   * No Bach is written at beginner, and asking for it must still produce
   * music rather than an empty screen or a throw.
   */
  it('falls back to composed tunes where the collection has nothing at the level', () => {
    const { exercise, bars } = run(['bach'], 'beginner', [4, 4]);
    expect(exercise.notes.length).toBeGreaterThan(0);
    expect(bars % TUNE_BARS).toBe(0);
  });

  it('treats a collection it does not know as composed', () => {
    expect(run(['no-such-collection'], 'easy', [4, 4]).bars % TUNE_BARS).toBe(0);
  });

  /*
   * A seed names its music whatever the source. The stitcher draws from the
   * exercise's own rng, so a collection must not make a run unrepeatable.
   */
  it('stays deterministic for a seed', () => {
    const a = run(['traditional'], 'easy', [4, 4], 7);
    const b = run(['traditional'], 'easy', [4, 4], 7);
    expect(a.exercise.notes).toEqual(b.exercise.notes);
  });

  /*
   * More than one library at once, which is what nobody sorting through their
   * own music thinks of as unusual — Bach and the nursery tunes are not two
   * mutually exclusive worlds.
   */
  it('draws a medley from every chosen collection', () => {
    /*
     * Asked of the collections rather than of a list of names written here.
     * The first version pattern-matched the titles it expected, and adding one
     * Bach theme whose name did not look like the others — Sheep may safely
     * graze — broke it while the medley was working perfectly. A test that
     * enumerates the corpus has to be edited every time the corpus grows,
     * which is the one thing this corpus is meant to do.
     */
    const namesOf = (id: string) =>
      new Set(playableThemes(collectionById(id)!).map((theme) => theme.name));
    // Bach and Nursery no longer share a level once the unheard are excluded,
    // so the pair here is Bach and the written themes, which both have medium.
    const { exercise } = run(['bach', 'default'], 'medium', [4, 4], 4);
    const played = exercise.labels.map((label) => label.text);
    expect(played.some((name) => namesOf('bach').has(name))).toBe(true);
    expect(played.some((name) => namesOf('default').has(name))).toBe(true);
  });

  /*
   * A defined run is a playlist, and the two things that makes it are order
   * and repeats. A filter over the collection would have given corpus order
   * and one copy of each, quietly overruling both.
   */
  it('plays a defined list in the order given', () => {
    const { exercise } = run(['bach'], 'easy', [4, 4], 4, [
      'jesu-joy',
      'bwv779-invention',
      'jesu-joy',
    ]);
    const played = exercise.labels.map((label) => label.text).slice(0, 3);
    expect(played[0]).toMatch(/^Jesu/);
    expect(played[1]).toMatch(/^Invention 8/);
    expect(played[2]).toMatch(/^Jesu/);
  });

  it('honours a tune asked for twice running', () => {
    // The no-repeat rule is right when the app is choosing and wrong when
    // somebody has deliberately asked for the same tune twice.
    const { exercise } = run(['bach'], 'easy', [4, 4], 4, ['jesu-joy', 'jesu-joy']);
    expect(exercise.labels.slice(0, 2).every((label) => label.text.startsWith('Jesu'))).toBe(true);
  });

  it('ignores the level for a defined list, as naming the tunes settles it', () => {
    // Jesu Joy is medium; asked for under an easy setting it still plays.
    const { exercise } = run(['bach'], 'easy', [4, 4], 4, ['jesu-joy']);
    expect(exercise.labels.every((label) => label.text.startsWith('Jesu'))).toBe(true);
  });

  it('gives different music for different seeds', () => {
    const a = run(['traditional'], 'easy', [4, 4], 1);
    const b = run(['traditional'], 'easy', [4, 4], 2);
    expect(a.exercise.notes).not.toEqual(b.exercise.notes);
  });
});
