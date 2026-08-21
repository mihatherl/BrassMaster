/**
 * Authored melodic material, written in scale degrees rather than in pitches.
 *
 * A random walk cannot produce the three things that make a line read as music
 * — repetition, an answering phrase, and a cadence — so sight-reading material
 * that is worth the name has to be written rather than generated. What is
 * written down here is the *shape*: degrees of the scale, and a rhythm.
 *
 * Degrees rather than notes is what makes a theme reusable. The same eight bars
 * are playable in any key on any instrument in either clef, transposed by the
 * ordinary machinery, and a theme can still carry a change of key *relative to
 * wherever it started* — "up a fifth at bar nine" survives being played in E
 * flat or in D. It is also the only honest way to store material for an app
 * whose whole point is that the player picks the key.
 *
 * A theme is generated the same way round as a scale — contour first, with the
 * rhythm holding it — which is why it shares `assembleExercise` with the
 * patterns rather than the free-material path.
 */

import { writtenRange, type Clef, type Instrument } from '../domain/instruments';
import { MAJOR_SCALE, spellInKey, spellWithLetter, tonicPitchClass, type KeyChange } from '../domain/keys';
import { metreFor, type Metre } from '../domain/metre';
import { durationBeats, durationFromBeats, snapBeat } from '../domain/rhythm';
import { assembleExercise, type Slot, type SlotPitch } from './assemble';
import { DIFFICULTIES } from './difficulty';
import type { Exercise } from './types';

/** One sounded note of a theme, placed by degree rather than by pitch. */
export interface ThemeNote {
  /** Degree of the major scale of whatever key is in force, 1–7. */
  degree: number;
  /** Chromatic inflection of that degree: -1 flattened, +1 raised. */
  alter?: number;
  /** Octaves away from the theme's home octave. */
  octave?: number;
  /** Length in crotchets. Must be a value that can actually be written. */
  beats: number;
  /**
   * Held into the note that follows, which must be the same degree.
   *
   * This used to say "only ever across a bar line", which described the
   * generator rather than the format: material written here is never longer
   * than one drawable value, so a tie inside a bar had no way to arise. It was
   * never a rule — the validator asks only that a tie reaches a note of the
   * same pitch, and the renderer draws one wherever it falls.
   *
   * Borrowed music ties inside a bar constantly: a note of a beat and a
   * quarter is a crotchet tied to a semiquaver, and no single value writes it.
   * BWV 773 was turned away for precisely that before the description was
   * corrected. See *Ties, as built*.
   */
  tied?: boolean;
}

export interface ThemeRest {
  rest: true;
  beats: number;
}

export type ThemeEvent = ThemeNote | ThemeRest;

export function isRest(event: ThemeEvent): event is ThemeRest {
  return 'rest' in event;
}

/**
 * A change of key, relative to the key the theme is being played in.
 *
 * Stored as a delta so it survives transposition: a theme that lifts a fifth at
 * bar nine does so whether it started in E flat or in D. It lands on a bar line
 * because there is nowhere else a key change may land.
 */
export interface ThemeKeyChange {
  /** Bar it lands on, counting the first bar of the theme as 1. */
  atBar: number;
  /** Steps around the circle of fifths from the key being left. */
  fifths: number;
}

/**
 * Which mode a theme is in.
 *
 * **Degrees are of the theme's own scale.** Degree 1 of a minor theme is its
 * own tonic — an A in a signature of no sharps — and 3, 6 and 7 are already
 * the minor's, needing no `alter` to say so. The key signature is unchanged
 * either way; the mode says which note of it the tune sits on.
 *
 * The first attempt wrote minor tunes as degrees of the *relative major*, and
 * a test caught why that is a trap: the minor tonic is degree 6 there, so
 * every ascent from home needs an octave offset, and the first tune written
 * that way came out a sixth upside down. A format that is technically capable
 * and reliably misused is worse than one that is narrower.
 *
 * Absent means major, so every theme written before modes existed is unchanged.
 */
export type Mode = 'major' | 'minor';

/**
 * The natural minor. Its raised sevenths and sixths are written with `alter`
 * where a tune wants them, exactly as chromatic notes always were — a harmonic
 * minor is a natural minor with a sharpened seventh, not a scale of its own.
 */
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

function scaleOf(mode: Mode = 'major'): readonly number[] {
  return mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
}

/**
 * Semitones from the key signature's own tonic up to the mode's.
 *
 * Zero in the major; nine in the minor, whose tonic is the sixth degree of the
 * signature it shares. What placement centres on, so a minor tune sits where
 * its own home note wants to be rather than where the relative major's does.
 */
function tonicOffset(mode: Mode = 'major'): number {
  return mode === 'minor' ? 9 : 0;
}

export interface Theme {
  id: string;
  /** Shown to nobody yet; it is for whoever is reading the corpus. */
  name: string;
  /** Which of the five levels this belongs to. */
  difficulty: string;
  /**
   * Metres the theme is legal in, as numerator and denominator.
   *
   * A tune in three is not a tune in four, so this is declared rather than
   * inferred. Most themes name one.
   */
  metres: ReadonlyArray<readonly [number, number]>;
  /** Major unless it says otherwise. */
  mode?: Mode;
  bars: number;
  /**
   * Crotchets a minute the tune is conceived at, where that is known.
   *
   * **Not a playback instruction** — the tempo dial is the player's, and this
   * never moves it. It is what the piece *asks*, which is the missing half of
   * what a difficulty level means: a semiquaver at 42 is a slower note to read
   * than a quaver at 108, and the level could not see that until this existed.
   *
   * Absent for everything written rather than read, and deliberately not
   * guessed. Measured across the sourced pieces on 2026-08-21, note values turn
   * out to carry almost no information about tempo — a median semiquaver is 42
   * in the Air and 100 in Invention 13, and a median quaver is 60 in Sheep and
   * 108 in Bist du bei mir. The spread inside one note value is as wide as the
   * spread between them, so a heuristic would be inventing a figure rather than
   * deriving one. It is set from the source, or by an ear on the review sheet.
   */
  tempo?: number;
  events: readonly ThemeEvent[];
  keyChanges?: readonly ThemeKeyChange[];
}

/**
 * Degrees a phrase may begin and end on, so that any two themes can abut.
 *
 * The tonic, mediant and dominant — and because degrees are of the theme's own
 * scale, that is 1, 3 and 5 in either mode. The minor needed no special case
 * once its degrees stopped being borrowed from the relative major.
 */
const STABLE_DEGREES = [1, 3, 5];

/**
 * Where a theme's tonic is allowed to sit, as a written pitch.
 *
 * A ruling from playing rather than from arithmetic. Placing a theme by
 * centring whatever it happens to span puts the same tune somewhere different
 * in every key, and puts a wide one somewhere nobody would write it — the tonic
 * is what a player feels the music sitting on, so that is what gets placed.
 *
 * Written rather than sounding, because this is about where the notes land on
 * the page in front of the player. An octave from just below the stave to just
 * inside it, which on a treble-clef tuba part is low G up to the G the clef
 * curls around, and on everything else in treble is the ledger C up to the C in
 * the stave. Bass clef is the same octave where that clef puts it.
 *
 * Clamped to what the instrument can actually reach, so the window can never
 * ask for a note that does not exist.
 */
export function tonicWindow(instrument: Instrument, clef: Clef): [number, number] {
  const TUBAS = ['eb-bass', 'bb-bass'];
  const [low, high] =
    clef === 'bass' ? [48, 60] : TUBAS.includes(instrument.id) ? [55, 67] : [60, 72];

  const [lowest, highest] = writtenRange(instrument, clef);
  return [Math.max(low, lowest), Math.min(high, highest)];
}

/**
 * Everything wrong with a theme, or an empty list.
 *
 * Written as a list rather than a throw because the point is to check a whole
 * corpus and see all of it at once. A theme that fails is discarded rather than
 * argued with — the corpus is cheap to write again, and a tune that does not
 * add up is not a tune.
 */
/**
 * The widest leap an authored theme may be written with, in semitones.
 *
 * A tenth, and deliberately not `difficulty.maxInterval` — which is what this
 * checked until v2.14.0, and which is a rule about something else. That number
 * constrains a *random walk*: a generated line picking freely inside a wide
 * interval is a sequence of unrelated jumps rather than music, so it is held to
 * a step it can be musical within. A written tune has an author. Its tenth is
 * placed, prepared and resolved, and reads in context in a way a walk's never
 * does; binding one to the other was borrowing a constraint from a problem
 * themes do not have.
 *
 * It came to light when Expert was removed on the player's call and the eight
 * themes filed under it had nowhere to go — every one of them failing on a leap,
 * none on anything else. The player's ruling was to file them as Hard, together
 * with an observation worth keeping: **the corpus's difficulty labels are
 * miscalibrated anyway**, themes reading easier than the sight-reading of the
 * same name. Recategorising them is its own piece of work.
 *
 * A ceiling remains because it still catches the thing worth catching — a typo
 * in a degree, which lands two octaves out rather than a third too far.
 */
const THEME_MAX_LEAP = 16;

/**
 * How many of the fastest notes are set aside before judging how fast a theme
 * moves — a twentieth of them, rounded down.
 *
 * One note in twenty, which for a theme of the length this corpus holds is the
 * *"one or two tricky notes"* the rule was asked for, and calibrated against
 * four real cases rather than chosen:
 *
 * | | fastest notes | verdict wanted |
 * |---|---|---|
 * | *Bist du bei mir* | 4 of 171 (2%) | tolerate — a slow aria with ornaments |
 * | Sheep may safely graze, at twelve bars | 2 of 80 (3%) | tolerate |
 * | `wide-steps` | 4 of 41 (10%) | **do not** — the dotted-quaver-against-semiquaver figure is what the theme teaches |
 * | *Air on the G string* | 19 of 145 (13%) | do not — it genuinely runs |
 *
 * A tenth was tried first and reclassified `wide-steps` as medium, which is
 * how the upper bound got found: notes that are the point of a theme are not
 * ornaments, however few of them there are. A twentieth separates all four.
 *
 * Rounded down, so a short theme gets no tolerance at all — one fast note
 * among five is not an ornament, it is a fifth of the tune.
 */
const ORNAMENT_TOLERANCE = 0.05;

/**
 * The shortest note a theme *substantially* asks for, ignoring its ornaments.
 *
 * A trimmed minimum: set the fastest few aside and take the shortest of what
 * is left. That is the number both halves of the difficulty check read — the
 * ceiling, which asks whether a theme is too fast for the level it claims, and
 * the floor, which asks whether it is fast enough to have earned it.
 *
 * Rests are counted with the notes. A short rest is a reading difficulty of
 * the same kind — it is a thing to get right in passing — and leaving them out
 * would make a theme's tolerance depend on how much of it is silent.
 *
 * **The far end of a tie is not counted**, because nobody plays it. A note of
 * a beat and an eighth crossing a bar line is written as a crotchet tied to a
 * demisemiquaver, and counting that demisemiquaver as a note the reader has to
 * find would call the Air on the G string faster than it is — the same reason
 * the interval check steps over a tie rather than measuring across it.
 */
export function readingFloor(events: readonly ThemeEvent[]): number {
  const played = events.filter((_, index) => {
    const previous = events[index - 1];
    return !(previous && !isRest(previous) && previous.tied);
  });
  if (played.length === 0) return Infinity;
  const lengths = played.map((event) => event.beats).sort((a, b) => a - b);
  return lengths[Math.floor(lengths.length * ORNAMENT_TOLERANCE)];
}

export function validateTheme(theme: Theme): string[] {
  const problems: string[] = [];
  const at = (what: string) => `${theme.id}: ${what}`;

  if (!DIFFICULTIES.some((d) => d.id === theme.difficulty)) {
    problems.push(at(`unknown difficulty "${theme.difficulty}"`));
  }
  if (theme.metres.length === 0) problems.push(at('names no metre'));
  if (theme.bars < 1) problems.push(at('has no bars'));
  if (theme.events.length === 0) problems.push(at('has no events'));

  for (const [index, event] of theme.events.entries()) {
    if (!durationFromBeats(event.beats)) {
      problems.push(at(`event ${index} is ${event.beats} beats, which cannot be written`));
    }
    if (isRest(event)) continue;
    if (!Number.isInteger(event.degree) || event.degree < 1 || event.degree > 7) {
      problems.push(at(`event ${index} is degree ${event.degree}, outside 1–7`));
    }
    if (event.alter !== undefined && Math.abs(event.alter) > 1) {
      problems.push(at(`event ${index} is altered by ${event.alter}, beyond a semitone`));
    }
  }

  const sounded = theme.events.filter((e): e is ThemeNote => !isRest(e));
  const ends = [sounded[0], sounded[sounded.length - 1]];
  for (const [which, note] of ['first', 'last'].map((w, i) => [w, ends[i]] as const)) {
    if (note && !STABLE_DEGREES.includes(note.degree)) {
      problems.push(
        at(`${which} note is degree ${note.degree}; themes abut, so both ends must be stable`),
      );
    }
  }

  for (const [index, event] of theme.events.entries()) {
    if (isRest(event) || !event.tied) continue;
    const next = theme.events[index + 1];
    if (!next || isRest(next)) {
      problems.push(at(`event ${index} is tied into a rest or into nothing`));
    } else if (next.degree !== event.degree || (next.alter ?? 0) !== (event.alter ?? 0) ||
      (next.octave ?? 0) !== (event.octave ?? 0)) {
      problems.push(at(`event ${index} is tied to a different note, which is a slur`));
    }
  }

  /*
   * The difficulty tag, held to what the difficulty actually says.
   *
   * A tag is a claim, and an unchecked one drifts: a theme labelled Beginner
   * with a leap of a tenth in it is worse than no theme, because a player
   * meeting it has been told it is within reach. `difficulty.ts` already states
   * these numbers for generated material, so a theme is measured against the
   * same ones rather than against an opinion.
   *
   * Only the unambiguous claims are checked. Note *values* are not: the pool
   * says what the generator draws from, and a dotted minim is plainly fine for
   * a beginner without appearing in it. How fast the theme moves is checked,
   * because that one really is a difficulty.
   *
   * **How fast it moves is not its fastest note.** Until 2026-08-21 it was:
   * one note below the level's floor rejected the whole theme. That is too
   * blunt for borrowed music, where a slow piece carries an ornament — *Bist
   * du bei mir* is seventy-seven quavers and four demisemiquavers, and was
   * refused at every level, so a player could not have it at all. The player's
   * reasoning, which is the rule now: *"someone looking for a challenge won't
   * be interested in them, and beginners will be happy to skip over the one or
   * two notes they can't play."* Difficulty is what a reader meets most of the
   * time, not the single hardest instant. See `readingFloor`.
   */
  const difficulty = DIFFICULTIES.find((d) => d.id === theme.difficulty);
  if (difficulty) {
    const shortest = Math.min(...difficulty.rhythms.map((r) => durationBeats(r.duration)));
    const floor = readingFloor(theme.events);
    if (floor < shortest - 1e-9) {
      const fast = theme.events.filter((event) => event.beats < shortest - 1e-9).length;
      problems.push(
        at(
          `${fast} of ${theme.events.length} notes are shorter than ${theme.difficulty} reads ` +
            `(${shortest} beats) — more than a few, so it is the texture rather than an ornament`,
        ),
      );
    }

    if (difficulty.accidentalChance === 0 && sounded.some((n) => (n.alter ?? 0) !== 0)) {
      problems.push(at(`${theme.difficulty} takes no accidentals`));
    }
    if (difficulty.restChance === 0 && theme.events.some(isRest)) {
      problems.push(at(`${theme.difficulty} takes no rests`));
    }
    if (difficulty.tieChance === 0 && sounded.some((n) => n.tied)) {
      problems.push(at(`${theme.difficulty} takes no ties`));
    }

    /*
     * Intervals and span are measured in the theme's own degree space, which is
     * what the author wrote and can control. A theme that changes key is
     * measured within each key rather than across the join, since where the
     * join lands is decided later, by the compass.
     */
    const offsets = sounded.map((note) => semitonesAbove(note, theme.mode));
    const span = Math.max(...offsets) - Math.min(...offsets);
    if (span > difficulty.rangeSemitones) {
      problems.push(
        at(`spans ${span} semitones; ${theme.difficulty} reads ${difficulty.rangeSemitones}`),
      );
    }
    let widestLeap = 0;
    for (let i = 1; i < sounded.length; i++) {
      if (sounded[i - 1].tied) continue;
      const leap = Math.abs(offsets[i] - offsets[i - 1]);
      widestLeap = Math.max(widestLeap, leap);
      if (leap > THEME_MAX_LEAP) {
        problems.push(at(`leaps ${leap} semitones at note ${i}; a theme may leap ${THEME_MAX_LEAP}`));
      }
    }

    /*
     * And the floor, which is the half that was missing.
     *
     * Every check above is a ceiling, so a theme of plain crotchets passed at
     * Expert — which is exactly what shipped, and what a player reading it said
     * about it: the hardest material in the corpus read like the middle of the
     * range. A tag has to mean something in both directions or it means very
     * little in either.
     *
     * The rule: a theme must be harder than the level below it in at least one
     * respect, or it belongs on that level. Which respect is deliberately left
     * open — a tune earns Hard by leaping, or by moving faster, or by its
     * range, and insisting on all three would describe one tune rather than a
     * level.
     */
    const below = DIFFICULTIES[DIFFICULTIES.indexOf(difficulty) - 1];
    if (below) {
      const belowShortest = Math.min(...below.rhythms.map((r) => durationBeats(r.duration)));
      /*
       * Measured the same way as the ceiling, and it has to be: if a couple of
       * ornaments are too few to disqualify a theme from its level, they are
       * also too few to be what *earns* it the level above. Reading the raw
       * minimum here and a trimmed one there would let a slow tune with one
       * flourish claim to be harder than it reads.
       */
      const harder =
        floor < belowShortest - 1e-9 ||
        widestLeap > below.maxInterval ||
        span > below.rangeSemitones ||
        (below.accidentalChance === 0 && sounded.some((n) => (n.alter ?? 0) !== 0)) ||
        (below.restChance === 0 && theme.events.some(isRest)) ||
        (below.tieChance === 0 && sounded.some((n) => n.tied));
      if (!harder) {
        problems.push(
          at(
            `is no harder than ${below.id}: nothing shorter than ${belowShortest} beats, ` +
              `no leap past ${below.maxInterval}, span ${span} within ${below.rangeSemitones}`,
          ),
        );
      }
    }

    /*
     * And it has to move at the pace of its level.
     *
     * The rhythm pool says what the generator draws from, and its *longest*
     * value says how fast the level goes: Expert holds nothing longer than a
     * quaver, which is what "relentless semiquavers" in its own blurb means. A
     * median rather than a maximum, so a theme may still end on a long note —
     * a cadence needs one, and a level is set by how the tune moves rather than
     * by how it stops.
     */
    const lengths = theme.events.map((e) => e.beats).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];
    const slowest = Math.max(...difficulty.rhythms.map((r) => durationBeats(r.duration)));
    if (lengths.length > 0 && median > slowest + 1e-9) {
      problems.push(
        at(`moves in ${median}-beat notes; ${theme.difficulty} moves in ${slowest} at the slowest`),
      );
    }
  }

  // Bar arithmetic, per metre, since a theme may be legal in more than one.
  for (const [numerator, denominator] of theme.metres) {
    const metre = metreFor(numerator, denominator);
    const total = theme.events.reduce((sum, e) => sum + e.beats, 0);
    const expected = theme.bars * metre.barBeats;
    if (Math.abs(total - expected) > 1e-9) {
      problems.push(
        at(`is ${total} beats but ${theme.bars} bars of ${numerator}/${denominator} is ${expected}`),
      );
    }

    /*
     * Nothing may cross a bar line. A note that wants to is written as two,
     * joined by a tie — which is exactly what the rest of the app means by one,
     * and the only construction its judging and drawing understand.
     */
    let beat = 0;
    for (const [index, event] of theme.events.entries()) {
      const bar = Math.floor(beat / metre.barBeats + 1e-9);
      const endsIn = Math.floor((beat + event.beats - 1e-9) / metre.barBeats);
      if (bar !== endsIn) {
        problems.push(
          at(`event ${index} crosses a bar line in ${numerator}/${denominator}; tie it instead`),
        );
      }
      beat += event.beats;
    }

    for (const change of theme.keyChanges ?? []) {
      if (!Number.isInteger(change.atBar) || change.atBar < 2 || change.atBar > theme.bars) {
        problems.push(at(`changes key at bar ${change.atBar}, which is not inside the theme`));
      }
    }
  }

  return problems;
}

export interface RealiseOptions {
  instrument: Instrument;
  clef: Clef;
  /** The key the theme opens in. Its own changes are relative to this. */
  fifths: number;
  metre: Metre;
  /** Beat the theme starts at, so themes can be laid end to end. */
  fromBeat?: number;
}

/** A theme placed in a key and an octave, ready to be assembled or appended. */
export interface RealisedTheme {
  slots: Slot[];
  /**
   * A written MIDI number for a diatonic note, spelled downstream by the key;
   * a settled spelling for an altered one, on its own degree's letter — see
   * `realiseTheme` for why.
   */
  pitches: SlotPitch[];
  keys: KeyChange[];
  beats: number;
}

/**
 * Keeps a key inside the seven signatures anyone writes.
 *
 * A theme that lifts a fifth twice from B major would arrive at nine sharps,
 * which is a real key and not one any part is printed in. Twelve steps round
 * the circle is the same sound spelled the other way.
 */
function readableKey(fifths: number): number {
  let k = fifths;
  while (k > 7) k -= 12;
  while (k < -7) k += 12;
  return k;
}

/** Semitones above the tonic for a degree, with any chromatic inflection. */
function semitonesAbove(note: ThemeNote, mode: Mode = 'major'): number {
  return scaleOf(mode)[note.degree - 1] + (note.alter ?? 0) + (note.octave ?? 0) * 12;
}

/**
 * Places a theme in a key, choosing the octave that centres it in the compass.
 *
 * Returns null when it will not fit at any octave, which is not a failure: a
 * theme with a two-octave leap is playable on a euphonium and nowhere near a
 * beginner's range on an Eb bass. The caller picks a different theme, the way
 * a pattern that will not fit falls back rather than being forced.
 */
export function realiseTheme(theme: Theme, options: RealiseOptions): RealisedTheme | null {
  const { instrument, clef, metre } = options;
  const fromBeat = options.fromBeat ?? 0;
  const [lowest, highest] = writtenRange(instrument, clef);

  const keys: KeyChange[] = [{ fromBeat, fifths: readableKey(options.fifths) }];
  for (const change of theme.keyChanges ?? []) {
    const previous = keys[keys.length - 1].fifths;
    keys.push({
      fromBeat: fromBeat + (change.atBar - 1) * metre.barBeats,
      fifths: readableKey(previous + change.fifths),
    });
  }

  // Which key each event falls under, so a degree is read against the key it is
  // actually in. Walked once, since the events already run in beat order.
  const slots: Slot[] = [];
  const sounded: Array<{ note: ThemeNote; key: number }> = [];
  let beat = fromBeat;
  let previousTied = false;
  let keyIndex = 0;

  for (const event of theme.events) {
    while (keyIndex + 1 < keys.length && keys[keyIndex + 1].fromBeat <= beat + 1e-9) keyIndex++;
    const duration = durationFromBeats(event.beats)!;
    if (isRest(event)) {
      slots.push({ startBeat: beat, duration, isRest: true, tiedFromPrevious: false });
      previousTied = false;
    } else {
      slots.push({ startBeat: beat, duration, isRest: false, tiedFromPrevious: previousTied });
      // A tie continuation is the note before it held, not a pitch of its own.
      if (!previousTied) sounded.push({ note: event, key: keyIndex });
      previousTied = event.tied === true;
    }
    // Snapped as it goes, not at the end: thirds drift, and every bar line
    // after the first triplet is compared against this. See `snapBeat`.
    beat = snapBeat(beat + event.beats);
  }

  /*
   * A change of key rebuilds the tune on the new tonic; it does not reprint the
   * old notes under a new signature. That would be a change of signature and
   * nothing else, and every degree after it would be reckoned against a key it
   * is not in — which shows up as a line full of accidentals cancelling a
   * signature that was never true. The same rule the patterns follow: a scale
   * in B flat is a different set of notes, not the same shape wearing a new
   * key.
   *
   * Each new tonic goes as near the last as its pitch class allows, so the
   * music stays in the register the player is already in and the key moves
   * underneath it. That is what a modulating part actually does.
   *
   * The tempting alternative is to honour the direction the delta names — "up a
   * fifth" really lifting by a fifth — and it was tried and is worse. Moving a
   * section bodily widens the whole theme's span by that interval, and since
   * the theme is then placed to centre what it spans, everything before the
   * change is dragged down to make room: on an Eb bass the first six bars went
   * two ledger lines under the stave to buy a lift in the last six. A theme
   * that wants a register change can say so per note, which is what `octave`
   * is for.
   */
  function tonicsFrom(base: number): number[] {
    const placed = [base];
    for (let i = 1; i < keys.length; i++) {
      const from = ((tonicPitchClass(keys[i - 1].fifths) % 12) + 12) % 12;
      const to = ((tonicPitchClass(keys[i].fifths) % 12) + 12) % 12;
      placed.push(placed[i - 1] + ((((to - from + 6) % 12) + 12) % 12) - 6);
    }
    return placed;
  }

  function spanOf(base: number): [number, number] {
    const tonics = tonicsFrom(base);
    const pitched = sounded.map(({ note, key }) => tonics[key] + semitonesAbove(note, theme.mode));
    return [Math.min(...pitched), Math.max(...pitched)];
  }

  /*
   * The opening tonic may sit in any octave whose pitch class matches the key.
   * The one inside `tonicWindow` is the one wanted, so the same tune sits in
   * the same part of the instrument whichever key it is played in.
   *
   * Outside the window is a fallback rather than a failure: a theme that spans
   * more than the compass leaves above its tonic has to sit lower, and a tune
   * an octave from home is better than no tune. Every candidate is still tested
   * against the whole theme, since one that modulates upwards can fit at the
   * start and run off the top later.
   */
  // The pitch class the tune sits on, which in the minor is a sixth above the
  // signature's own tonic rather than the signature's tonic itself.
  const tonicClass =
    ((((tonicPitchClass(keys[0].fifths) + tonicOffset(theme.mode)) % 12) + 12) % 12);
  const [windowLow, windowHigh] = tonicWindow(instrument, clef);
  const bases: number[] = [];
  for (let midi = lowest - 24; midi <= highest + 24; midi++) {
    if (((midi % 12) + 12) % 12 === tonicClass) bases.push(midi);
  }

  const home = (windowLow + windowHigh) / 2;
  bases.sort((a, b) => Math.abs(a - home) - Math.abs(b - home));

  const holds = (candidate: number) => {
    const [low, high] = spanOf(candidate);
    return low >= lowest && high <= highest;
  };

  const base =
    bases.find((c) => c >= windowLow && c <= windowHigh && holds(c)) ?? bases.find(holds);
  if (base === undefined) return null;

  const tonics = tonicsFrom(base);
  /*
   * An altered degree is spelled here, on its own degree's letter, rather than
   * left to the key downstream. `spellInKey` chooses by the signature's
   * direction, and in a flat key that writes a raised sixth approaching the
   * seventh as D flat before D natural — the same sound, and a misprint to
   * read. The theme said "the sixth, raised": the letter is the sixth's, and
   * the accidental is whatever carries that letter to the pitch. Where that
   * would be a double accidental, which this app never prints, the key's own
   * spelling stands.
   */
  const pitches: SlotPitch[] = sounded.map(({ note, key }) => {
    const midi = tonics[key] + semitonesAbove(note, theme.mode);
    if (!note.alter) return midi;
    const letter = spellInKey(midi - note.alter, keys[key].fifths).letter;
    return spellWithLetter(midi, letter) ?? midi;
  });

  return { slots, pitches, keys, beats: beat - fromBeat };
}

/**
 * One theme as a playable exercise, for looking at it and for testing.
 *
 * Stitching several together is the next piece of work; this is the one that
 * proves a theme survives the whole path from degrees to a drawn stave.
 */
export function exerciseFromTheme(theme: Theme, options: RealiseOptions): Exercise | null {
  const realised = realiseTheme(theme, options);
  if (!realised) return null;

  return assembleExercise(realised.slots, realised.pitches, {
    instrument: options.instrument,
    clef: options.clef,
    keys: realised.keys,
    metres: [{ fromBeat: 0, metre: options.metre }],
    totalBeats: realised.beats,
    seed: 0,
    kind: 'phrases',
  });
}
