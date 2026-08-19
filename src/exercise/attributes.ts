/**
 * What a note asked of the reader.
 *
 * The app has always recorded *which pitch* was missed, which is enough to
 * drill weak notes and nothing like enough to teach. It cannot say that dotted
 * rhythms cost a fifth of the accuracy, that everything holds together until a
 * leap passes a fifth, or that four flats is where the player comes apart —
 * because every dimension of difficulty was collapsed onto the pitch.
 *
 * This module supplies the missing half. Each judged note is labelled with the
 * properties that made it hard, so a verdict can be attributed to a *skill*
 * rather than to a note. See `docs/roadmap.md` § 1.1.
 *
 * **The taxonomy was not invented here.** `difficulty.ts` already parameterises
 * every exercise by interval, accidentals, rests, ties and rhythm, and the
 * settings add key and metre — so every exercise was already a point in a
 * skill space, and the only thing missing was recording where each note fell
 * in it. Nothing here is a new opinion about what makes reading hard; it is
 * the generator's own opinion, read back.
 *
 * Deliberately *not* a judgement of any kind. Labels come from the music as
 * written and never from how it went, so the same passage attracts the same
 * labels whoever plays it.
 */

import { keyAt } from '../domain/keys';
import { barAt, beatOfBar, metreAt } from '../domain/metre';
import type { Exercise } from './types';

/**
 * A dimension along which reading gets harder.
 *
 * Each is something a teacher would name — "your dotted rhythms", "you lose it
 * on the big leaps", "flat keys" — rather than a statistic. That is the test
 * for adding another: if a report saying *"your worst dimension is X"* would
 * not be a sentence a player could act on, X does not belong here.
 */
export type SkillDimension =
  /** The written duration, dots and triplets included. */
  | 'rhythm'
  /** How far the note is from the one before it. */
  | 'interval'
  /** Whether an accidental had to be read. */
  | 'accidental'
  /** Whether it fell on a pulse or between them. */
  | 'beat'
  /** The key signature in force. */
  | 'key'
  /** How fast the music was going. */
  | 'tempo';

/**
 * One bucket of one dimension: `rhythm:eighth.`, `interval:leap`, `key:-4`.
 *
 * A flat string rather than a record of typed fields, because the store is a
 * tally keyed by it and the set of dimensions is expected to grow. The template
 * type keeps the dimension half honest, and every key in the app is built by
 * the functions below rather than written out, so the bucket half cannot drift
 * either.
 */
export type SkillKey = `${SkillDimension}:${string}`;

/** Semitone thresholds for the interval bands, in the order they are tested. */
const INTERVAL_BANDS: ReadonlyArray<{ upTo: number; label: string }> = [
  { upTo: 0, label: 'same' },
  { upTo: 2, label: 'step' },
  { upTo: 4, label: 'third' },
  { upTo: 7, label: 'fourth-fifth' },
  { upTo: Infinity, label: 'leap' },
];

/**
 * Tempo bands, by the lower bound of each.
 *
 * Coarse on purpose. The question a report has to answer is "does it fall
 * apart when it speeds up", and buckets narrower than this would spread one
 * evening's practice across several of them and answer nothing.
 */
const TEMPO_BOUNDS = [60, 80, 100, 120, 140] as const;

function intervalBand(semitones: number): string {
  const distance = Math.abs(semitones);
  return INTERVAL_BANDS.find((band) => distance <= band.upTo)!.label;
}

function tempoBand(bpm: number): string {
  const rounded = Math.round(bpm);
  if (rounded < TEMPO_BOUNDS[0]) return `under-${TEMPO_BOUNDS[0]}`;
  for (let i = TEMPO_BOUNDS.length - 1; i >= 0; i--) {
    if (rounded >= TEMPO_BOUNDS[i]) {
      const next = TEMPO_BOUNDS[i + 1];
      return next === undefined ? `${TEMPO_BOUNDS[i]}-plus` : `${TEMPO_BOUNDS[i]}-${next - 1}`;
    }
  }
  return `under-${TEMPO_BOUNDS[0]}`;
}

/**
 * The rhythm as a reader meets it: value, dot and triplet.
 *
 * All three together rather than as separate dimensions, because they are one
 * thing on the page — a triplet quaver is not a quaver that happens to be in a
 * triplet, it is its own shape to recognise, and splitting them would report
 * "your quavers are fine" about a figure the player cannot read.
 */
function rhythmLabel(duration: { value: string; dotted: boolean; tuplet?: number }): string {
  return `${duration.value}${duration.dotted ? '.' : ''}${duration.tuplet ? '-triplet' : ''}`;
}

/** Floating-point slack for pulse arithmetic, which divides by 1.5 in compound time. */
const EPSILON = 1e-6;

/**
 * The skill labels for every note of an exercise, indexed as `exercise.notes` is.
 *
 * `tempo` is passed in rather than read from the exercise because the exercise
 * does not hold one: `TempoEvent`s describe *changes*, and the speed the music
 * is actually set at lives in the settings and on the play screen's dial. Pass
 * what the player was reading at.
 *
 * **Known limitation:** a tempo moved with the dial part-way through a run is
 * not reflected here — the whole run is attributed to the tempo it is given.
 * Attributing each note to the speed at that moment needs the session record of
 * roadmap § 1.5, which does not exist yet.
 */
export function attributesFor(exercise: Exercise, tempoBpm: number): SkillKey[][] {
  const tempo: SkillKey = `tempo:${tempoBand(tempoBpm)}`;

  return exercise.notes.map((note, index) => {
    const keys: SkillKey[] = [
      `rhythm:${rhythmLabel(note.duration)}`,
      `accidental:${note.showAccidental ? 'yes' : 'no'}`,
      `key:${keyAt(exercise.keys, note.startBeat)}`,
      tempo,
    ];

    const metre = metreAt(exercise.metres, note.startBeat);
    const withinBar = note.startBeat - beatOfBar(exercise.metres, barAt(exercise.metres, note.startBeat));
    const pulses = withinBar / metre.pulseBeats;
    keys.push(`beat:${Math.abs(pulses - Math.round(pulses)) < EPSILON ? 'on' : 'off'}`);

    /*
     * No interval for the first note, and none across a tie.
     *
     * The first has nothing to be an interval from. The far side of a tie is
     * not a new attack — the player reads one sound, and calling that a unison
     * would fill the `same` band with notes nobody had to find. The judge
     * already declines to judge such a note for the same reason.
     */
    const previous = index > 0 ? exercise.notes[index - 1] : undefined;
    if (previous && !previous.tiedToNext) {
      keys.push(`interval:${intervalBand(note.writtenMidi - previous.writtenMidi)}`);
    }

    return keys;
  });
}
