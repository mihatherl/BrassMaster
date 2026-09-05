import type { Clef } from '../domain/instruments';
import type { KeyChange } from '../domain/keys';
import type { MetreChange } from '../domain/metre';
import type { SpelledPitch } from '../domain/pitch';
import type { Duration } from '../domain/rhythm';
import type { TempoEvent } from '../domain/tempo';

/**
 * A name printed over the music at a beat — which tune a medley has reached.
 *
 * A text and a place, nothing more: the renderers decide how it looks, and the
 * engine never reads it. `atBeat` lands on a bar line by construction, because
 * the label names what begins there.
 */
export interface LabelEvent {
  atBeat: number;
  text: string;
}

/**
 * One note in a generated exercise.
 *
 * Both pitches are stored: the written one drives notation and is what the
 * player reads, the sounding one drives playback. Fingerings are resolved at
 * generation time so neither the scheduler nor the judge has to think about
 * instruments.
 */
/**
 * The second notehead of a divisi pair — an alternative the player may take
 * instead of the written one.
 *
 * Everything a notehead needs and nothing a note needs: it shares the slot's
 * start, duration, beam, tie and tuplet, because it *is* the same note in the
 * music and only the pitch is in question.
 *
 * **Its fingerings are folded into the note's `acceptedMasks` rather than kept
 * here**, which is what leaves the judge untouched: a player who takes either
 * head is right, and the judge has never had to know why. `primaryMask` is
 * kept for the hint, which has to name one of them.
 */
export interface Divisi {
  writtenMidi: number;
  soundingMidi: number;
  pitch: SpelledPitch;
  showAccidental: boolean;
  /** The fingering a player would be taught for *this* head. */
  primaryMask: number;
}

export interface NoteEvent {
  writtenMidi: number;
  soundingMidi: number;
  /**
   * How the written pitch is spelled: the letter, the alteration and the
   * octave, which is what decides where the notehead sits and which accidental
   * it might carry.
   *
   * Settled here rather than worked out downstream, for the same reason the
   * fingerings and the accidental are: it depends on the key, and the key is
   * something the generator knows and the renderers should not have to. F sharp
   * and G flat are the same sounding note and a different thing to read.
   */
  pitch: SpelledPitch;
  /** Beats from the start of the exercise, one beat being a crotchet. */
  startBeat: number;
  duration: Duration;
  /** Every button state accepted as correct, including alternate fingerings. */
  acceptedMasks: number[];
  /** The fingering a player would be taught, for hints and the results screen. */
  primaryMask: number;
  /** Index of the beam group, or -1 when the note stands alone. */
  beamGroup: number;
  /**
   * Which triplet this note belongs to, or -1.
   *
   * Its own grouping rather than a reuse of `beamGroup`, because the two are
   * not the same span and only look it in easy cases: a triplet of quavers is
   * beamed and bracketed identically, but three triplet crotchets are bracketed
   * and not beamed at all, and a beam can run across two triplets in a row that
   * want a numeral each. The bracket answers "how does this divide", the beam
   * answers "how does this group" — different questions with different answers.
   */
  tupletGroup: number;
  /**
   * Joined to the note that follows: same pitch, one sound, no second attack.
   *
   * Held on the first note of the pair rather than the second because that is
   * the one that sounds; see `ties.ts` for what the rest of the app does with
   * the note on the other end of it.
   */
  tiedToNext: boolean;
  /**
   * Whether an accidental must be drawn. Decided once at generation time, since
   * it depends on the key signature and on what has already occurred in the bar.
   */
  showAccidental: boolean;
  /**
   * A second notehead on this slot, which the player may take instead.
   *
   * Printed as a divisi pair and judged as either: `acceptedMasks` holds the
   * fingerings of both heads, so nothing downstream of generation has to know
   * this field exists in order to be correct about it.
   *
   * It exists because a band part prints divisi constantly and because the
   * Prelude in C cannot be read without it — its arpeggio starts on two notes
   * most of the band cannot reach, and the musical answer is to print both and
   * let the player take the one their instrument has. See roadmap § 1.10.
   *
   * **The written head is the one the app sounds**, since one of them has to
   * be, and the written one is the composer's.
   */
  alternative?: Divisi;
}

/**
 * Whether the instrument in hand can play this note at all.
 *
 * A note outside the instrument's range resolves to no fingering, so
 * `acceptedMasks` is empty and nothing the player holds can ever match it. That
 * only arises with imported music — the generator asks `isPlayable` before it
 * chooses a pitch — and a part written for a cornet can easily reach above what
 * a tuba has.
 *
 * Such a note is **shown and sounded but not judged**, for the same reason the
 * far end of a tie is not: it asked nothing of the player that they could have
 * answered, so a verdict on it is not evidence of anything. Left in the totals
 * it would be a wrong answer nobody could have got right, quietly spoiling the
 * score for the whole run.
 */
export function isUnplayable(note: NoteEvent): boolean {
  return note.acceptedMasks.length === 0;
}

export interface RestEvent {
  startBeat: number;
  duration: Duration;
  /**
   * The tuplet bracket this rest sits inside, where it sits in one — a
   * triplet figure with a silent member still brackets the whole figure,
   * rests included, or a lone triplet quaver reads as an ordinary note
   * (the player, 2026-09-01: one painted cell in a triplet beat "probably
   * still needs the bracket beneath with the 3"). Absent everywhere else.
   */
  tupletGroup?: number;
  /**
   * Bars this rest covers when it is a **multi-bar rest** — the thick bar with
   * a count over it that a brass part is full of. Absent for an ordinary rest,
   * which is the only kind the generator makes.
   *
   * Authoritative for how long the rest lasts, and `duration` stays honest
   * beside it: a whole-bar rest is written as a semibreve rest whatever the
   * metre, so `duration` says what *one* of these bars is written as while
   * `bars` says how many there are. The two only agree in 4/4 and are not
   * meant to.
   *
   * **A multi-bar rest is not unfolded.** It is how the music is read — twenty
   * bars rest is one object with "20" over it, and writing out twenty bars of
   * semibreve rests would fill the screen with something no publisher prints.
   * That is the opposite of a bar repeat, which *is* unfolded, because it is
   * shorthand for music that has to sound. See `musicxml-import-plan.md`.
   */
  bars?: number;
}

export interface Exercise {
  notes: NoteEvent[];
  rests: RestEvent[];
  instrumentId: string;
  clef: Clef;
  /**
   * The written key, and any changes of it, in beat order starting at 0.
   *
   * A list rather than one number because a part changes key, often several
   * times — the same reason `metres` is a shape of its own rather than a loose
   * numerator. Ask it with `keyAt`; a single-key exercise is a list of one and
   * costs nothing.
   */
  keys: KeyChange[];
  /**
   * The time signature, and any changes of it, in beat order starting at 0.
   *
   * Each entry is a whole `Metre` rather than a loose numerator and denominator,
   * because the numerator is not the length of a bar and the two only agree
   * while the denominator is 4. See `metre.ts`.
   *
   * A list for the same reason `keys` is one: a real part changes time
   * signature, and everything that counts bars has to survive it. Ask it with
   * `metreAt`, and count bars with `barAt`, which walks the list — a generated
   * exercise is a list of one and costs nothing.
   */
  metres: MetreChange[];
  /**
   * Where the tempo moves, in beat order, with absolute bpm values.
   *
   * The same shape of addition as `keys`: settled at generation time, empty
   * for an exercise that holds its speed — which costs nothing, exactly as a
   * single-key exercise is a key list of one. The transport compiles it; the
   * renderers print it; neither may invent one, because a tempo change with
   * nothing printed would be the page lying about the music.
   */
  tempo: TempoEvent[];
  /**
   * Names printed over the music, in beat order — a medley says which tune is
   * beginning at the bar where it begins, the way a printed selection does.
   *
   * The same shape of addition as `tempo`: settled at generation time, drawn
   * by the renderers, read by nothing else. Empty for material with nothing to
   * name — a composed tune has no name, and labelling `tune-3` would be the
   * page dressing up machinery as repertoire.
   */
  labels: LabelEvent[];
  /**
   * The printed count above the notes, one entry per spoken onset — rhythm
   * mode's teaching line (`rhythm-plan.md`). Its own channel rather than a
   * ride on `labels`, because the two are typeset as differently as they
   * read: a section label is a word set left of its beat, a count is a
   * short mark centred on its notehead — and the first cut borrowed the
   * label style and printed "and" straight through the next beat's "3".
   * The text is the printed FORM ("&" for the spoken "and", the standard
   * 1 e & a), while the clip scheduler will speak from the mapping itself.
   *
   * `rest: true` marks a count printed over silence (the player,
   * 2026-09-01: *"include the count for the rests, but in a different
   * color"*): the page counts on where the mouth rests, drawn in the
   * horizon grey, and the voice — when its clips exist — reads only the
   * unmarked entries, keeping the plan's rule that a rest is not spoken.
   */
  syllables?: Array<LabelEvent & { rest?: true }>;
  /**
   * Beat ranges the player is asked to play — rhythm mode's answer bars,
   * painted with a soft highlight behind the stave (ruled 2026-09-03).
   * A range rather than a flag per note, because a background is painted
   * over a span; and positive rather than negative — the app says which
   * bar is yours, instead of dimming the ones that are not, after greyed
   * demonstration notes were read as the optional horizon.
   */
  playSpans?: Array<[number, number]>;
  /** Length of the exercise in crotchets. */
  totalBeats: number;
  /**
   * Where the length the player chose ends, in crotchets.
   *
   * Equal to `totalBeats` for an exercise with no horizon, which is every
   * exercise a tool or a test asks for by exact length. Less than it when the
   * material carries on past the chosen length in grey: the music between the
   * two is real and generated, and whether the player meets it is up to them.
   */
  chosenBeats: number;
  seed: number;
  /** How the material was generated, for the results screen. */
  kind: ExerciseKind;
  /**
   * What each bar is called on the printed part, where there is one.
   *
   * Absent for generated material, which has no printed part and is numbered
   * by counting: bar one, bar two. Present for an imported one, and then it
   * wins — because the whole worth of a bar number here is that it means the
   * same thing to the player, the app, and whoever is standing in front of the
   * band saying "from bar thirty-three".
   *
   * They are not the same list. A part opening with a pickup numbers that bar
   * nothing and calls the next one bar 1, while the app pads the pickup into a
   * full bar and would count it as the first — so counting puts every number
   * one ahead of the paper for the whole piece. A scanned part with a bar split
   * across two measures drifts by another one further on.
   *
   * `null` for a bar the app inserted and the page does not have, which is the
   * rest between two chosen passages.
   */
  barNumbers?: Array<string | null>;
}

/**
 * Where an exercise came from.
 *
 * `imported` is deliberately **not** in `EXERCISE_KINDS`: that list drives the
 * chooser on the settings screen, and imported music is not something the
 * generator can be asked for — it arrives with a file. The union carries it so
 * that everything downstream can tell an imported part from a generated one,
 * and the chooser lists only what can actually be chosen.
 */
export type ExerciseKind =
  | 'drills'
  | 'phrases'
  | 'themes'
  | 'rhythm'
  | 'imported';

export const EXERCISE_KINDS: ReadonlyArray<{ id: ExerciseKind; name: string; blurb: string }> = [
  {
    id: 'drills',
    name: 'Drills',
    /*
     * One box where Scales and Arpeggios used to be two, holding every shape
     * that is practised the same way: pick a drill, pick a key, up and back
     * down. Which shapes exist is `DRILLS` in `generate.ts`, and this sentence
     * is tied to that list by a test in both directions — it may not promise a
     * drill the list does not hold (the Arpeggios box named five chords for
     * months while the generator played one), and a drill may not be added
     * without the sentence widening to own it.
     */
    // Shortened from the full inventory (the player, 2026-08-23): with every
    // drill visible in the chooser below, the blurb reciting all eight was
    // saying twice what the buttons say once.
    blurb: 'Scales and arpeggios.',
  },
  /*
   * Renamed from "Sight-reading" 2026-09-05 (reading-tab-plan.md): the whole
   * app is sight-reading, so the tab could not be. "Phrases" is what the
   * generator has always called them.
   */
  { id: 'phrases', name: 'Phrases', blurb: 'Musical phrases with contour, leaps and rests.' },
  {
    id: 'themes',
    // "Tunes" on screen since 2026-09-05, matching "Tunes from" beneath it;
    // the id stays `themes`, which is what the corpus calls them.
    name: 'Tunes',
    // The player's own words (2026-08-23), chosen knowing the caveat: some of
    // the corpus is written in-house rather than known, and "we'll be
    // forgiven that". The claim is warmth, not inventory.
    blurb: 'Musical melodies you know and enjoy.',
  },
  /*
   * Paid, and gated HERE rather than at the screen: this list drives the
   * chooser, the settings sanitiser and the i18n mirror, so one literal at
   * the source keeps a stored `kind: 'rhythm'` from surviving on a build
   * with no way to play it. The spread folds to nothing on the web target —
   * the flag is a literal by Rollup's time, like every other `__HAS_` read.
   *
   * The `typeof` guard is not an indirection — the define substitutes the
   * identifier inside it too, and the minifier folds `typeof true` — it is
   * for the tools: they import this module under `tsx`, where no define
   * runs and a bare read of the global would throw at import time.
   */
  ...(typeof __HAS_RHYTHM__ !== 'undefined' && __HAS_RHYTHM__
    ? [
        {
          id: 'rhythm' as const,
          name: 'Rhythms',
          blurb: 'One rhythm pattern at a time: count it, then play it.',
        },
      ]
    : []),
];

/**
 * The reading materials — everything that is music to read rather than a
 * shape to run (`drills`). One tab on the settings screen since 2026-09-05
 * (reading-tab-plan.md), with these as the answers to its "What" row; the
 * kinds themselves are untouched, so nothing stored has to migrate.
 */
export const READING_KINDS = EXERCISE_KINDS.filter((kind) => kind.id !== 'drills');

export function isReadingKind(kind: ExerciseKind): boolean {
  return READING_KINDS.some((reading) => reading.id === kind);
}
