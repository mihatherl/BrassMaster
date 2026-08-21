import { describe, expect, it } from 'vitest';
import { instrumentById, writtenRange } from '../domain/instruments';
import { keyAt } from '../domain/keys';
import { metreFor } from '../domain/metre';
import { midiOf } from '../domain/pitch';
import { composeTune } from './compose';
import { DIFFICULTIES } from './difficulty';
import { createRng } from './rng';
import {
  exerciseFromTheme,
  realiseTheme,
  tonicWindow,
  validateTheme,
  type Theme,
} from './theme';

const EB_BASS = { instrument: instrumentById('eb-bass'), clef: 'treble' as const };

/**
 * A corpus to run the whole-theme checks over: composed tunes, a few at every
 * level in every metre the app offers, from fixed seeds. What the hand-written
 * corpus was to these tests until v2.20.0.
 */
const THEMES: Theme[] = [];
for (const difficulty of DIFFICULTIES) {
  for (const [n, d] of [[4, 4], [3, 4], [2, 4], [6, 8]] as const) {
    for (let seed = 1; seed <= 3; seed++) {
      const tune = composeTune({
        difficulty,
        metre: metreFor(n, d),
        rng: createRng(seed),
        id: `${difficulty.id}-${n}${d}-${seed}`,
      });
      if (tune) THEMES.push(tune);
    }
  }
}

function themeOf(overrides: Partial<Theme>): Theme {
  return {
    id: 'test',
    name: 'Test',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 1,
    events: [{ degree: 1, beats: 4 }],
    ...overrides,
  };
}

describe('validateTheme', () => {
  /*
   * The corpus is authored by hand or by a model, and neither can be trusted to
   * count. This is the guard that keeps the data honest, so it is worth knowing
   * it fails on the things it claims to.
   */
  it('passes every composed tune', () => {
    expect(THEMES.length).toBeGreaterThan(40);
    for (const theme of THEMES) {
      expect(validateTheme(theme), theme.id).toEqual([]);
    }
  });

  it('catches bars that do not add up', () => {
    const problems = validateTheme(themeOf({ events: [{ degree: 1, beats: 3 }] }));
    expect(problems.join()).toMatch(/3 beats but 1 bars of 4\/4 is 4/);
  });

  it('catches a length no note can be written as', () => {
    // Five crotchets is not a note. It is two, tied — which is the point.
    const problems = validateTheme(themeOf({ bars: 5, events: [{ degree: 1, beats: 20 }] }));
    expect(problems.join()).toMatch(/cannot be written/);
  });

  it('catches a note crossing a bar line', () => {
    const problems = validateTheme(
      themeOf({
        bars: 2,
        events: [
          { degree: 1, beats: 2 },
          // A semibreve starting on beat three spills into the next bar.
          { degree: 1, beats: 4 },
          { degree: 1, beats: 2 },
        ],
      }),
    );
    expect(problems.join()).toMatch(/crosses a bar line/);
  });

  it('catches an unstable end, since themes abut', () => {
    const problems = validateTheme(
      themeOf({ events: [{ degree: 1, beats: 2 }, { degree: 7, beats: 2 }] }),
    );
    expect(problems.join()).toMatch(/last note is degree 7/);
  });

  it('catches a tie to a different note, which is a slur', () => {
    const problems = validateTheme(
      themeOf({
        bars: 2,
        events: [
          { degree: 1, beats: 4, tied: true },
          { degree: 3, beats: 4 },
        ],
      }),
    );
    expect(problems.join()).toMatch(/tied to a different note/);
  });

  it('catches a key change that is not inside the theme', () => {
    const problems = validateTheme(themeOf({ keyChanges: [{ atBar: 4, fifths: 1 }] }));
    expect(problems.join()).toMatch(/not inside the theme/);
  });
});

describe('realiseTheme', () => {
  const metre = metreFor(4, 4);

  it('spells a degree into whatever key it is played in', () => {
    // Degree 3 of E flat is G; of D major it is F sharp. Same theme, and the
    // whole reason a theme is stored in degrees.
    const theme = themeOf({ events: [{ degree: 3, beats: 4 }] });

    const inEFlat = exerciseFromTheme(theme, { ...EB_BASS, fifths: -3, metre })!;
    const inD = exerciseFromTheme(theme, { ...EB_BASS, fifths: 2, metre })!;

    expect(inEFlat.notes[0].pitch.letter).toBe('G');
    expect(inEFlat.notes[0].pitch.alter).toBe(0);
    expect(inD.notes[0].pitch.letter).toBe('F');
    expect(inD.notes[0].pitch.alter).toBe(1);
  });

  it('keeps the written pitch and the spelling agreeing', () => {
    for (const theme of THEMES) {
      const exercise = exerciseFromTheme(theme, {
        ...EB_BASS,
        fifths: -3,
        metre: metreFor(...theme.metres[0]),
      });
      expect(exercise, theme.id).not.toBeNull();
      for (const note of exercise!.notes) {
        expect(midiOf(note.pitch), `${theme.id} ${note.startBeat}`).toBe(note.writtenMidi);
      }
    }
  });

  it('places a key change relative to the key it is played in', () => {
    // Up a fifth from E flat is B flat; from C it is G. The delta travels, the
    // absolute key does not.
    const theme = themeOf({
      bars: 2,
      keyChanges: [{ atBar: 2, fifths: 1 }],
      events: [{ degree: 1, beats: 4 }, { degree: 1, beats: 4 }],
    });

    const fromEFlat = realiseTheme(theme, { ...EB_BASS, fifths: -3, metre })!;
    const fromC = realiseTheme(theme, { ...EB_BASS, fifths: 0, metre })!;

    expect(keyAt(fromEFlat.keys, 4)).toBe(-2);
    expect(keyAt(fromC.keys, 4)).toBe(1);
    // And it lands on the bar line, which is the only place one may land.
    expect(fromEFlat.keys[1].fromBeat).toBe(4);
  });

  it('keeps a key inside the seven signatures anyone writes', () => {
    // F sharp major is six sharps. Lift a fifth twice and the arithmetic
    // arrives at eight, which is a real key that no part is ever printed in —
    // G sharp major. Written the other way round it is A flat, four flats.
    const theme = themeOf({
      bars: 3,
      keyChanges: [{ atBar: 2, fifths: 1 }, { atBar: 3, fifths: 1 }],
      events: [
        { degree: 1, beats: 4 },
        { degree: 1, beats: 4 },
        { degree: 1, beats: 4 },
      ],
    });
    const realised = realiseTheme(theme, { ...EB_BASS, fifths: 6, metre })!;
    for (const key of realised.keys) {
      expect(Math.abs(key.fifths)).toBeLessThanOrEqual(7);
    }
    expect(keyAt(realised.keys, 4)).toBe(7);
    expect(keyAt(realised.keys, 8)).toBe(-4);
  });

  it('refuses a theme that will not fit the compass rather than forcing it', () => {
    const tooWide = themeOf({
      bars: 2,
      events: [
        { degree: 1, beats: 4, octave: -3 },
        { degree: 1, beats: 4, octave: 3 },
      ],
    });
    expect(realiseTheme(tooWide, { ...EB_BASS, fifths: 0, metre })).toBeNull();
  });

  it('lays every corpus theme inside the compass it is realised for', () => {
    for (const theme of THEMES) {
      for (const id of ['eb-bass', 'cornet', 'euphonium']) {
        const instrument = instrumentById(id);
        const realised = realiseTheme(theme, {
          instrument,
          clef: 'treble',
          fifths: -3,
          metre: metreFor(...theme.metres[0]),
        });
        // Null is a legitimate answer — the caller picks another theme — but a
        // realised one must actually be playable.
        if (!realised) continue;
        const [low, high] = writtenRange(instrument, 'treble');
        for (const pitch of realised.pitches) {
          const midi = typeof pitch === 'number' ? pitch : midiOf(pitch);
          expect(midi, `${theme.id} on ${id}`).toBeGreaterThanOrEqual(low);
          expect(midi, `${theme.id} on ${id}`).toBeLessThanOrEqual(high);
        }
      }
    }
  });

  it('carries a tie across the bar line as two notes, not one long one', () => {
    const theme = themeOf({
      bars: 2,
      events: [
        { degree: 1, beats: 2 },
        { degree: 3, beats: 2, tied: true },
        { degree: 3, beats: 1 },
        { degree: 2, beats: 1 },
        { degree: 1, beats: 2 },
      ],
    });
    const exercise = exerciseFromTheme(theme, { ...EB_BASS, fifths: -3, metre })!;
    const heads = exercise.notes.filter((note) => note.tiedToNext);

    expect(heads).toHaveLength(1);
    const head = exercise.notes.indexOf(heads[0]);
    const tail = exercise.notes[head + 1];
    expect(tail.writtenMidi).toBe(heads[0].writtenMidi);
    // The far end takes no accidental of its own: it is one sound continuing.
    expect(tail.showAccidental).toBe(false);
  });
});

describe('a theme in the minor', () => {
  /*
   * Written the way an author would: degree 1 is the tune's own tonic, and its
   * thirds and sevenths are already minor without a single `alter`. In a
   * signature of no sharps this is A minor.
   */
  const aMinor = (over: Partial<Theme> = {}): Theme =>
    themeOf({
      id: 'minor',
      mode: 'minor',
      difficulty: 'easy',
      metres: [[4, 4]],
      bars: 2,
      events: [
        { degree: 1, beats: 1 },
        { degree: 3, beats: 1 },
        { degree: 5, beats: 1 },
        { degree: 4, beats: 1 },
        { degree: 3, beats: 1 },
        { degree: 2, beats: 1 },
        { degree: 7, beats: 1, alter: 1 },
        { degree: 1, beats: 1 },
      ],
      ...over,
    });

  const options = { ...EB_BASS, fifths: 0, metre: metreFor(4, 4) };

  it('is written from its own tonic, and validates like any other', () => {
    expect(validateTheme(aMinor())).toEqual([]);
  });

  /*
   * The reason the mode exists at all. Read as a major scale the same degrees
   * are a different tune — a major third where the minor has a minor one.
   */
  /* `pitches` holds either a MIDI number or a spelled pitch; the minor tunes
     here are diatonic, so they arrive as numbers. */
  const midis = (theme: Theme): number[] =>
    realiseTheme(theme, options)!.pitches.map((pitch) =>
      typeof pitch === 'number' ? pitch : midiOf(pitch),
    );

  it('sounds its thirds and sevenths minor without being told to', () => {
    const minor = midis(aMinor());
    const major = midis(aMinor({ mode: 'major' }));
    expect(minor[1] - minor[0]).toBe(3);
    expect(major[1] - major[0]).toBe(4);
  });

  /*
   * A minor tune sits on its own home note. Placing by the signature's tonic
   * would put every one of them a third out of the register a player expects.
   */
  it('sits on its own tonic, not the relative major’s', () => {
    const [low, high] = tonicWindow(EB_BASS.instrument, EB_BASS.clef);
    const first = midis(aMinor())[0];
    expect(first).toBeGreaterThanOrEqual(low);
    expect(first).toBeLessThanOrEqual(high);
  });

  it('starts on a different note from the major theme it shares a key with', () => {
    const minor = midis(aMinor());
    const major = midis(aMinor({ mode: 'major' }));
    // A against C. Compared as pitch classes rather than by distance, since
    // which octave each landed in is the compass's business: A is nine
    // semitones above C going up, three below it going down, and only the
    // signed comparison says which note it actually is.
    expect((((minor[0] - major[0]) % 12) + 12) % 12).toBe(9);
  });

  it('leaves every theme written before modes existed exactly as it was', () => {
    expect(midis(aMinor({ mode: undefined }))).toEqual(midis(aMinor({ mode: 'major' })));
  });
});

/*
 * Ties inside a bar, which borrowed music needs and generated music never did.
 *
 * The field's own description said ties were "only ever across a bar line" —
 * true of the generator, which never writes a note longer than one drawable
 * value, and never a rule the validator or the renderer enforced. Real music
 * ties inside a bar constantly: a note of a beat and a quarter is a crotchet
 * tied to a semiquaver and no single value writes it. BWV 773 was turned away
 * for exactly that until the converter learnt to split and tie.
 *
 * Written because the capability is now load-bearing and nothing held it: it
 * worked by accident of what the rules did not say, which is precisely the
 * kind of thing a refactor removes without noticing.
 */
describe('a tie that does not cross a bar line', () => {
  /* A crotchet tied to a semiquaver, then a dotted quaver and a minim — every
     value drawable, which is the point: only the *join* is new. */
  const held = (): Theme => ({
    id: 'within-bar-tie',
    name: 'Within-bar tie',
    difficulty: 'hard',
    metres: [[4, 4]],
    bars: 1,
    events: [
      { degree: 1, beats: 1, tied: true },
      { degree: 1, beats: 0.25 },
      { degree: 2, beats: 0.75 },
      { degree: 3, beats: 2 },
    ],
  });

  it('is legal, and is how a beat and a quarter gets written', () => {
    expect(validateTheme(held())).toEqual([]);
  });

  it('reaches the player as one sounded note, held', () => {
    const exercise = exerciseFromTheme(held(), { ...EB_BASS, fifths: 0, metre: metreFor(4, 4) });
    expect(exercise).not.toBeNull();
    // Two noteheads, the first tied into the second — which is what the
    // engine reads to sound one note rather than two.
    expect(exercise!.notes[0].tiedToNext).toBe(true);
    expect(exercise!.notes[1].startBeat).toBeCloseTo(1, 9);
    expect(exercise!.notes[1].writtenMidi).toBe(exercise!.notes[0].writtenMidi);
  });

  /* The rule that does apply, and the only one: a tie joins same to same. */
  it('is still refused where it would be a slur', () => {
    const slurred: Theme = { ...held(), events: [
      { degree: 1, beats: 1, tied: true },
      { degree: 2, beats: 0.25 },
      { degree: 3, beats: 0.75 },
      { degree: 1, beats: 2 },
    ] };
    expect(validateTheme(slurred).join(' ')).toContain('slur');
  });
});

/*
 * How fast a theme moves is what it asks *most of the time*, not its fastest
 * note.
 *
 * The rule until 2026-08-21 was the raw minimum, and one note below a level's
 * floor rejected the theme outright — so `Bist du bei mir`, seventy-seven
 * quavers and four demisemiquavers, was refused at every level and could not
 * be offered at all. The player's reasoning: *"someone looking for a challenge
 * won't be interested in them, and beginners will be happy to skip over the
 * one or two notes they can't play."*
 */
describe('an ornament against a texture', () => {
  /*
   * Four bars of four-four filled with quavers, with `ornaments` of them
   * replaced by a dotted quaver and a semiquaver — which keeps the bar
   * arithmetic exact while adding notes faster than easy reads.
   */
  const withOrnaments = (ornaments: number, difficulty = 'easy'): Theme => {
    const events: Theme['events'] = [];
    let beats = 0;
    for (let i = 0; i < ornaments; i++) {
      events.push({ degree: 1, beats: 0.75 }, { degree: 2, beats: 0.25 });
      beats += 1;
    }
    // Alternating degrees so nothing leaps, ending on the tonic.
    for (let i = 0; beats < 16 - 1e-9; i++, beats += 0.5) {
      events.push({ degree: i % 2 === 0 ? 3 : 2, beats: 0.5 });
    }
    events[events.length - 1] = { degree: 1, beats: 0.5 };
    return { id: 'ornament-test', name: 'Ornament test', difficulty, metres: [[4, 4]], bars: 4, events };
  };

  it('lets a slow theme keep its level despite an ornament or two', () => {
    expect(validateTheme(withOrnaments(1))).toEqual([]);
  });

  it('refuses one where the fast notes are the texture', () => {
    // Enough of them that they are no longer a rounding error in the reading.
    expect(validateTheme(withOrnaments(6)).join(' ')).toContain('texture rather than an ornament');
  });

  /*
   * The other half, and the reason both had to change together: if two
   * ornaments are too few to disqualify a theme from its level, they are also
   * too few to be what *earns* it the level above. Otherwise a slow tune with
   * one flourish could claim to be harder than it reads.
   */
  it('does not let an ornament buy the level above', () => {
    const claimed = validateTheme(withOrnaments(1, 'medium'));
    expect(claimed.join(' ')).toContain('no harder than easy');
  });

  /* Rounded down, so there is no tolerance to spend on a very short theme. */
  it('gives a short theme no tolerance at all', () => {
    const short: Theme = {
      id: 'short', name: 'Short', difficulty: 'easy', metres: [[4, 4]], bars: 1,
      events: [
        { degree: 1, beats: 0.75 }, { degree: 2, beats: 0.25 },
        { degree: 3, beats: 1 }, { degree: 2, beats: 1 }, { degree: 1, beats: 1 },
      ],
    };
    expect(validateTheme(short).join(' ')).toContain('shorter than easy reads');
  });
});
