import { describe, expect, it } from 'vitest';
import { generateExercise, type GenerateOptions } from './generate';
import { difficultyById } from './difficulty';
import {
  availableClefs,
  INSTRUMENTS,
  instrumentById,
  soundingFromWritten,
} from '../domain/instruments';
import { primaryFingering } from '../domain/fingering';
import { metreFor } from '../domain/metre';
import { isUnplayable } from './types';
import { patternEvents, previewExerciseFromBars, rhythmPatternById, syllablesFor } from './rhythm';

/**
 * The rhythm exercise: rounds of demonstration-then-play, per
 * `rhythm-plan.md`. What is load-bearing here is judged elsewhere too — the
 * session skips `isUnplayable` notes, the reveal discounts them — so these
 * tests pin the SHAPE: which notes are demo, how the pitches alternate, and
 * that the printed count is the mapping's own truth.
 */

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    instrument: instrumentById('eb-bass'),
    clef: 'treble',
    fifths: -3, // Ignored by rhythm mode, and the test below proves it.
    difficulty: difficultyById('easy'),
    kind: 'rhythm',
    bars: 8,
    cycles: 2,
    themeCount: 2,
    metre: metreFor(4, 4),
    seed: 7,
    rhythmPatternId: 'four-crotchets',
    ...overrides,
  };
}

describe('the rhythm exercise', () => {
  it('builds rounds of plays alone while the counting voice is unbuilt', () => {
    /*
     * The demonstration statement is SKIPPED (ruled 2026-09-04, from the
     * player's phone: his 8-bar pattern opened with eight bars of
     * metronome and dimmed numbers). The demonstration exists to be
     * HEARD, and with no recorded clips it is only waiting, scaled by
     * the pattern's own length — so a run opens on the first ask. One-bar
     * pattern, two rounds: 2 × 2 plays = 4 bars of 4/4, every bar the
     * player's.
     */
    const exercise = generateExercise(options());
    expect(exercise.totalBeats).toBe(16);
    expect(exercise.kind).toBe('rhythm');
    // No demonstration: every bar holds notes, from the very first beat.
    expect(exercise.notes.some((note) => note.startBeat < 1)).toBe(true);
    expect(exercise.notes.some(isUnplayable)).toBe(false);
    // And every bar is an answer bar, marked for the highlight.
    expect(exercise.playSpans).toEqual([
      [0, 4],
      [4, 8],
      [8, 12],
      [12, 16],
    ]);
  });

  it('alternates two adjacent written notes, restarting each statement', () => {
    const exercise = generateExercise(options());
    const played = exercise.notes.map((note) => note.writtenMidi);
    const pair = [...new Set(played)].sort((a, b) => a - b);
    expect(pair).toHaveLength(2);
    // Adjacent scale letters: a tone or a semitone apart.
    expect(pair[1] - pair[0]).toBeLessThanOrEqual(2);
    // Strict alternation, restarting from the low note at each statement.
    for (const statement of [0, 1, 2, 3]) {
      const bar = exercise.notes.filter(
        (note) => note.startBeat >= statement * 4 && note.startBeat < (statement + 1) * 4,
      );
      expect(bar.map((note) => note.writtenMidi)).toEqual([pair[0], pair[1], pair[0], pair[1]]);
    }
  });

  it('lights one answer bar, following the playhead', () => {
    /*
     * The highlight is "the bar you are playing NOW" (the player,
     * 2026-09-03, sharpening a static wash over every answer bar). Before
     * the run it names the first ask, so the request is legible while the
     * demonstration plays; during a demonstration it names none.
     */
    const exercise = generateExercise(options());
    const spans = exercise.playSpans!;
    const at = (beat: number) => {
      const inside = spans.find(([from, to]) => beat >= from - 1e-9 && beat < to - 1e-9);
      return inside ?? (beat < spans[0][0] ? spans[0] : null);
    };
    // Before the run it names the first ask; then it follows the playhead.
    expect(at(-1)).toEqual([0, 4]);
    expect(at(2)).toEqual([0, 4]);
    expect(at(5)).toEqual([4, 8]);
    expect(at(9)).toEqual([8, 12]);
    expect(at(14)).toEqual([12, 16]);
  });

  it('plays a written cell at the page’s own register — the editor’s exact pitches', () => {
    /*
     * The player's repro (2026-09-04): a note authored at A3 came out an
     * octave lower in the player. The run placed the line near the
     * alternating pair's register while the editor anchored the page at
     * written C — two placements for one page. Both read
     * `cellWrittenMidi` now, so the run IS the page.
     */
    const cellNotes = [
      { degree: 6, octave: -2 },
      { degree: 1 },
      { degree: 3 },
      { degree: 5, octave: 1 },
    ];
    const exercise = generateExercise(options({ cellNotes, cycles: 1, fifths: 0 }));
    const preview = previewExerciseFromBars(
      ['0q 0q 0q 0q'], [4, 4], instrumentById('eb-bass'), 'treble', cellNotes, 0,
    );
    const statement = exercise.notes.slice(0, 4).map((note) => note.writtenMidi);
    expect(statement).toEqual(preview.notes.map((note) => note.writtenMidi));
    // His A3 itself: degree 6, two octaves under the written-C anchor.
    expect(statement[0]).toBe(57);
  });

  it('never alternates onto an open note, on any instrument or clef', () => {
    /*
     * The player's catch, 2026-09-03: *"G is open, so doesn't actually
     * require the user to do anything."* The pair exists because the
     * judge measures WHEN a fingering changes — an open note has no
     * state to change to, so half the alternation would ask for nothing
     * and the timing it exists to expose would go unmeasured. Seven of
     * these eleven picked an open note before the rule.
     */
    for (const instrument of INSTRUMENTS) {
      for (const clef of availableClefs(instrument)) {
        const exercise = generateExercise(
          options({ instrument, clef, rhythmPatternId: 'four-crotchets' }),
        );
        const written = [...new Set(exercise.notes.map((note) => note.writtenMidi))];
        expect(written, `${instrument.id}/${clef}`).toHaveLength(2);
        for (const midi of written) {
          const mask = primaryFingering(
            soundingFromWritten(midi, instrument, clef),
            instrument,
          )?.mask;
          expect(mask, `${instrument.id}/${clef} written ${midi}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('prints its key only when it has notes to put in one', () => {
    /*
     * A pattern with a LINE is in a key and prints its signature; a bare
     * rhythm has none, which is the plan's constraint and keeps every
     * eye on the rhythm. The first cut placed the line for the chosen
     * key and spelled it against C, so an E flat pattern came out under
     * a blank signature covered in sharps (2026-09-03).
     */
    const line = [{ degree: 1 }, { degree: 2 }, { degree: 3 }, { degree: 4 }];
    const inEflat = generateExercise(options({ fifths: -3, cellNotes: line }));
    expect(inEflat.keys).toEqual([{ fromBeat: 0, fifths: -3 }]);
    expect(inEflat.notes.some((note) => note.showAccidental)).toBe(false);
    // And a rhythm with no line keeps no signature, whatever key is set.
    expect(generateExercise(options({ fifths: -3 })).keys).toEqual([{ fromBeat: 0, fifths: 0 }]);
  });

  it('is keyless: no signature, and the chosen key cannot reach it', () => {
    // The plan's constraint — no key, no key set — honoured in free play:
    // C is the absence of a signature, every eye on the rhythm.
    const inEflat = generateExercise(options({ fifths: -3 }));
    const inD = generateExercise(options({ fifths: 2 }));
    expect(inEflat.keys).toEqual([{ fromBeat: 0, fifths: 0 }]);
    expect(inD.notes.map((n) => n.writtenMidi)).toEqual(inEflat.notes.map((n) => n.writtenMidi));
    expect(inEflat.notes.every((note) => !note.showAccidental)).toBe(true);
  });

  it('takes the pattern’s own metre, not the setting’s', () => {
    const exercise = generateExercise(
      options({ rhythmPatternId: 'waltz-crotchets', metre: metreFor(4, 4) }),
    );
    expect(exercise.metres[0].metre.beatsPerBar).toBe(3);
    expect(exercise.totalBeats).toBe(2 * 2 * 3);
  });

  it('prints the count on its own channel, in the printed forms', () => {
    const exercise = generateExercise(options({ rhythmPatternId: 'dotted-pair', cycles: 1 }));
    const pattern = rhythmPatternById('dotted-pair');
    const spokenWords = syllablesFor(patternEvents(pattern)[0]).filter((s) => s !== null);
    // Two statements, each counted PER POSITION at its beats' own level:
    // the dotted pair reads "1 · 2 & · 3 · 4 &" — bright where an attack
    // speaks, dimmed where the count continues — and "and" prints as "&".
    const first = exercise.syllables!.filter((entry) => entry.atBeat < 4);
    expect(first.map((entry) => `${entry.text}${entry.rest ? '·' : ''}`)).toEqual([
      '1', '2·', '&', '3', '4·', '&',
    ]);
    expect(exercise.syllables).toHaveLength(first.length * 2);
    // The voice's share is the unmarked half, and it is the old spoken list.
    const spoken = exercise.syllables!.filter((entry) => !entry.rest).slice(0, spokenWords.length);
    expect(spoken.map((entry) => entry.text)).toEqual(
      spokenWords.map((syllable) => (syllable === 'and' ? '&' : syllable)),
    );
    // Labels stay what they are elsewhere: section text, none here.
    expect(exercise.labels).toHaveLength(0);
  });

  it('keeps a tie’s far end on the head’s pitch, outside the alternation', () => {
    const exercise = generateExercise(options({ rhythmPatternId: 'tied-over-beat', cycles: 1 }));
    const heads = exercise.notes.filter((note) => note.tiedToNext);
    expect(heads.length).toBeGreaterThan(0);
    for (const head of heads) {
      // Notes arrive in beat order, so the far end is simply the next one.
      const far = exercise.notes.find((note) => note.startBeat > head.startBeat);
      expect(far?.writtenMidi).toBe(head.writtenMidi);
    }
  });

  it('counts through the rests on the page, marked as silence', () => {
    /*
     * Re-ruled 2026-09-01: the PRINT counts on where the mouth rests —
     * you keep counting through a rest when you play — drawn dimmed,
     * while the voice keeps the plan's rule and will speak only the
     * unmarked entries. Off-beats are the proving case: the dimmed beat
     * numbers are exactly what the off-beat quavers are read against.
     */
    const exercise = generateExercise(options({ rhythmPatternId: 'off-beats', cycles: 1 }));
    const spoken = exercise.syllables!.filter((entry) => !entry.rest);
    const silent = exercise.syllables!.filter((entry) => entry.rest);
    expect(spoken.length).toBeGreaterThan(0);
    expect(silent.length).toBeGreaterThan(0);
    /* The count describes the PATTERN, so it is identical over every
       statement. */
    const answerOnsets = new Set(
      exercise.notes.filter((note) => note.startBeat >= 4).map((note) => note.startBeat),
    );
    for (const entry of spoken.filter((e) => e.atBeat >= 4 && e.atBeat < 8)) {
      expect(answerOnsets.has(entry.atBeat)).toBe(true);
    }
    // The off-beat bar reads "1 & 2 & …": numbers silent, ands spoken.
    const first = exercise.syllables!.filter((entry) => entry.atBeat < 4);
    expect(first.map((entry) => `${entry.text}${entry.rest ? '·' : ''}`)).toEqual([
      '1·', '&', '2·', '&', '3·', '&', '4·', '&',
    ]);
  });
});
