/*
 * Borrowed subjects, for review.
 *
 * Themes taken from the canon rather than written, on the reasoning that hard
 * material is hard to *write*: the things that make music difficult — wide
 * leaps, chromatics, awkward rhythms — are the same things that stop it being a
 * melody, so writing for difficulty tends to produce études. Borrowing from
 * someone who could do both is an accelerant, not a shortcut.
 *
 * **Fugue subjects are the sweet spot, and not by metaphor.** A subject *is* a
 * theme in the technical sense: short, self-contained, and built to be
 * recognised when it returns. It is the one kind of classical material designed
 * for exactly this job. Three further constraints decide what can be taken:
 *
 * 1. **Single line.** A monophonic exercise needs monophonic source, which is
 *    why organ and keyboard counterpoint transcribes better than orchestral
 *    writing — the subject is stated alone before anything joins it.
 * 2. **A brass compass.** `realiseTheme` returns null rather than compressing,
 *    so anything much past two octaves will not render on an E flat bass.
 * 3. **A stable end.** Both ends must be the tonic, mediant or dominant, which
 *    a subject usually is and a passage usually is not.
 *
 * **Candidates. Nothing in the app imports this**, so none of it reaches a
 * player until it has been heard.
 *
 * ## Copyright
 *
 * Bach died in 1750 and Liszt in 1886; the music is long out of copyright. What
 * is *not* free is a particular modern engraving, which is its own work — so
 * these are written as degrees from the music rather than copied from an
 * edition, exactly as the traditional tunes are.
 *
 * ## How far my hand goes, and where it stops
 *
 * The first two are written out because they are short, famous and checkable.
 * **Everything after them was measured, not remembered**: `tools/midi-to-theme.mts`
 * reads a public-domain MIDI, spells it with the app's own `spellInKey`, and
 * reports every place it had to decide. That line matters because transcribing
 * thousands of notes from memory produces plausible, wrong music — worse than
 * none, since it costs a reviewer's attention to find and shakes their trust in
 * everything beside it. Which theme came from which source is recorded on each.
 *
 * The converter refuses to guess a key, and reports what the file claims so the
 * caller can disagree with it knowingly. Two of its findings so far came from
 * real material rather than from reasoning about it: a voice that rests while
 * the other states the subject, and a sequencer that writes 9/8 as 3/4 full of
 * triplets. Both produced right notes on wrong beats, which is the failure mode
 * to keep watching for.
 */

import type { Theme } from './theme';

/**
 * A note of `beats` on `degree`, with the options a chromatic line needs.
 *
 * `tied` joins it to the next note of the same degree, which counterpoint needs
 * constantly — a suspension is a note held across the bar line, and this format
 * writes one the way a score does, as two notes joined.
 */
function n(
  degree: number,
  beats: number,
  extra: { alter?: number; octave?: number; tied?: boolean } = {},
) {
  return { degree, beats, ...extra };
}

/** A rest of `beats`. Counterpoint enters on an upbeat more often than not. */
function r(beats: number) {
  return { rest: true as const, beats };
}

export const BORROWED: readonly Theme[] = [
  {
    id: 'bwv1080-subject',
    name: 'The Art of Fugue — subject',
    // Labelled by measurement, not by reputation: minims and crotchets, a span
    // of eight semitones and one accidental. Great music that is easy to read,
    // which is not a contradiction — its difficulty is in the playing.
    difficulty: 'easy',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 5,
    /*
     * D A F D | C sharp D E | F G F E | D. Bach's plainest great subject: the
     * tonic triad laid out in minims, a leading note from below, then a
     * stepwise turn home. It spans eight semitones, which is why it fits a
     * brass compass where most of the repertoire does not — and it is entirely
     * diatonic but for the raised seventh, so the difficulty is in the reading
     * rather than in the accidentals.
     */
    events: [
      n(1, 2), n(5, 2),
      n(3, 2), n(1, 2),
      n(7, 1, { alter: 1, octave: -1 }), n(1, 1), n(2, 2),
      n(3, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 4),
    ],
  },
  {
    id: 'bwv1079-royal',
    name: 'The Musical Offering — royal theme',
    /*
     * Written down as hard, measured as **easy**, and labelled easy only
     * because the validator insists — which is a finding about the difficulty
     * model, not about the theme.
     *
     * The check asks whether a theme does anything the level below never does.
     * Accidentals are one of its tests, but as a *yes or no*: once the level
     * below allows any accidental at all, a theme chromatic in every bar and a
     * theme with one passing note are indistinguishable to it. This subject is
     * plain in note length, leap and span while being chromatic throughout —
     * which is exactly what makes it hard to read, and exactly what nothing
     * measures. See `docs/roadmap.md`.
     */
    difficulty: 'easy',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 5,
    /*
     * The theme Frederick the Great gave Bach to improvise on: a rising minor
     * triad to the flat sixth, a leading note, then a long chromatic descent
     * through the flattened second. Genuinely hard in the way the corpus was
     * short of — the chromatics are the subject rather than an ornament of it.
     *
     * Watch this one on the sheet in remote keys: the app never writes a double
     * accidental and spells the natural above instead, so the descent may
     * respell somewhere it should not.
     */
    events: [
      n(1, 2), n(3, 2),
      n(5, 2), n(6, 2),
      n(7, 2, { alter: 1 }), n(1, 2, { octave: 1 }),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(2, 1, { alter: -1 }), n(1, 1), n(7, 1, { alter: 1, octave: -1 }), n(1, 1),
    ],
  },
  {
    id: 'bwv779-invention',
    name: 'Invention 8 — opening',
    /*
     * **The first theme here nobody wrote down from memory.** Read out of a
     * public-domain MIDI by `tools/midi-to-theme.mts`, spelled by the app's own
     * `spellInKey`, and cut where the converter said a cut would validate — so
     * unlike the two subjects above, its notes are a measurement rather than a
     * recollection. That is the whole reason it is here: one verified tune says
     * more about whether the pipeline can be trusted than fifteen unverified
     * ones, and everything that follows it will arrive the same way.
     *
     * Six bars because the converter reported bars 1-6 ending on the tonic and
     * 1-12 on the dominant, which is Bach's own phrase structure — the subject
     * in F, its answer in C. The tool found the cut; it does not know why the
     * cut is there.
     */
    difficulty: 'hard',
    metres: [[3, 4]],
    bars: 6,
    /*
     * Bach's upper voice, entering on the second quaver — the lower voice
     * answers a bar later, which is why this makes sense as the play-along
     * experiment as well as a reading test.
     *
     * Hard for reasons that are all measurable: continuous semiquavers from bar
     * 2, a span of nineteen semitones, and three bars of sequence where the eye
     * must keep its place in a repeating figure that shifts each bar. What it
     * has that the written-for-difficulty themes lacked is that it is also a
     * tune — listen for whether the sequences read as music or as an exercise,
     * because that is the one thing measurement cannot settle.
     */
    events: [
      r(1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(5, 1 / 2), n(1, 1 / 2),
      n(1, 1 / 2, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2),
      n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }),
    ],
  },
  {
    id: 'jesu-joy',
    name: 'Jesu, Joy of Man\'s Desiring',
    /*
     * The obbligato, not the chorale. The tune most people can hum is the
     * flowing quaver line the instruments play *around* the sung melody, and it
     * is the one that suits brass: stepwise almost throughout, an octave and a
     * minor third from end to end, and it never stops moving — which is the
     * whole reading exercise.
     *
     * Eight bars because the converter reported that cut ending on the dominant.
     * Bars 1-4 end on the supertonic and would not have validated, which is
     * correct of it: the phrase genuinely is not over there.
     */
    difficulty: 'medium',
    metres: [[9, 8]],
    bars: 8,
    /*
     * **Read as 9/8 although the file says 3/4.** The sequencer wrote compound
     * time as simple time full of triplets, so every quaver arrived as a third
     * of a beat and each bar came out a third short — the notes right, the
     * barlines wrong, which is the kind of error that reads as a slightly odd
     * piece rather than as a fault. `--scale 1.5` rewrites the note values
     * without changing what is heard; a 9/8 bar at a dotted crotchet and a 3/4
     * bar at a crotchet are the same length of time.
     *
     * The quaver rest at the start is real: the line enters after the beat.
     */
    events: [
      r(1 / 2), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(4, 1 / 2), n(6, 1 / 2), n(5, 1 / 2),
      n(5, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2),
      n(4, 1 / 2), n(5, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(1, 1 / 2),
      n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 2), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(4, 1 / 2), n(6, 1 / 2), n(5, 1 / 2),
      n(5, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2),
      n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2),
    ],
  },
{
    id: 'bwv776-invention',
    name: 'Invention 5',
    /*
     * E flat, and the plainest of the four to read: crotchets and quavers where
     * the others run in semiquavers, so what makes it hard is the key and the
     * two-octave climb rather than the speed. Four bars because that is where
     * the subject and its answer close, and the converter found the tonic at
     * both ends of exactly that span.
     */
    difficulty: 'hard',
    metres: [[4, 4]],
    bars: 4,
    events: [
      r(1 / 2), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(3, 1), n(4, 1),
      r(1 / 2), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 2), n(3, 1 / 2), n(4, 1), n(5, 1),
      n(3, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(2, 1 / 2),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(1, 3 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }),
    ],
  },
{
    id: 'bwv782-invention',
    name: 'Invention 11',
    /*
     * G minor, and the most chromatic thing in the collection — the flattened
     * second and the raised sixth both turn up inside the first bar, which is
     * the quantity of accidentals the difficulty model still cannot measure
     * and the ear notices immediately.
     *
     * Six bars. Later cuts are barred by a note of a beat and a quarter, which
     * a score ties inside the bar and this format cannot.
     */
    difficulty: 'hard',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 6,
    events: [
      r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4, { alter: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4),
      n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(4, 1 / 4),
      n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 2), n(5, 1 / 2), r(1 / 2), n(5, 1 / 2),
      n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 2), n(6, 1 / 2, { alter: 1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 2), n(1, 1 / 2, { alter: -1, octave: 1 }),
      n(1, 1 / 2, { octave: 1 }), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4),
      n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(5, 1 / 4, { alter: -1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }),
    ],
  },
{
    id: 'bwv784-invention',
    name: 'Invention 13',
    /*
     * A minor, and the one whose subject is pure arpeggio — the figure that
     * makes it famous is also, exactly, the shape a brass player drills. Which
     * is the argument for the whole exercise: this is a study and a piece of
     * music at once, and nothing written for difficulty has managed both.
     *
     * The first theme here to carry a tie. Three notes are held across the bar
     * line, written as a score writes them: the same degree twice, the first
     * marked `tied`.
     */
    difficulty: 'hard',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 8,
    events: [
      r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(5, 1 / 2), n(7, 1 / 2, { alter: 1, octave: -1 }), n(5, 1 / 2),
      n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(1, 1 / 2), r(1),
      r(1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(4, 1 / 2), n(6, 1 / 2, { tied: true }),
      n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(3, 1 / 2), n(5, 1 / 2, { tied: true }),
      n(5, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 2, { octave: -1 }), n(4, 3 / 4), n(2, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 2, { octave: -1 }), n(3, 1 / 2, { tied: true }),
      n(3, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(3, 1 / 2), r(3 / 2),
      r(1 / 4), n(7, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 2), n(7, 1 / 2), n(2, 1 / 2), n(7, 1 / 2),
      n(3, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 2), n(3, 1 / 2), n(7, 1 / 2), n(5, 1 / 2),
    ],
  },
{
    id: 'bwv786-invention',
    name: 'Invention 15',
    /*
     * B minor, and the widest — it sits low and climbs, so it is the one most
     * likely to be declined on a smaller compass. That is not a fault: a theme
     * that will not fit is simply not offered, and the settings screen counts
     * what fits before a player chooses it.
     */
    difficulty: 'hard',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 8,
    events: [
      r(1 / 2), n(1, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }),
      n(5, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }),
      n(5, 1 / 2, { octave: -1 }), r(3 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }),
      n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(2, 1 / 2), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4),
      n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(6, 3 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 4), n(5, 1 / 4, { alter: -1 }), n(5, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 2), n(2, 1 / 2), n(5, 1 / 2), n(2, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(6, 1 / 2, { alter: 1 }), n(1, 1 / 2),
      n(1, 1 / 2), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(4, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(4, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4),
    ],
  },
];
