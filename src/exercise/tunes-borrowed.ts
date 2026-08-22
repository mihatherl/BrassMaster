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
 * **These reach players now.** That was not true when the file was written —
 * nothing imported it — and it changed on 2026-08-20 when collections became
 * selectable material: this list is the Bach collection, and a player can
 * choose it. What still holds the line is the collection's `unjudged` set in
 * `collections.ts`, which names what has not been heard. Add a theme here and
 * add its id there, until it has been played to somebody.
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
 * caller can disagree with it knowingly. Every fault it has had was found by
 * running real music rather than by reasoning about it, and every one was the
 * same shape — **right notes on wrong beats**, silent because the wrong value
 * is itself legal. A voice resting while the other states the subject; a
 * sequencer writing 9/8 as 3/4 full of triplets; a grid of twelfths that could
 * not hold a demisemiquaver and rounded every one to a triplet; notes crossing
 * bar lines untied. Assume there are more of that shape.
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
    id: 'bwv779-invention',
    name: 'Invention 8',
    /*
     * **Complete — all thirty-four bars.** It was six, cut where the converter
     * said a cut would validate, and the ruling of 2026-08-21 is that cutting
     * there was never a musical decision: *"some are just artlessly cut off
     * without resolution."* This ends where Bach ends it, on the tonic.
     *
     * Bach's upper voice throughout. The lower one answers a bar later and is
     * the other half of the play-along experiment, not part of this line.
     *
     * **The cost is register, and it is stated rather than hidden.** The voice
     * covers thirty-one semitones over its thirty-four bars — past the
     * twenty-six any level reads, which is why `allowWideRange` is set — and
     * that is a fact about the piece, not about the model. In practice it
     * reaches the euphonium and the two tubas and not the cornets: `themesFor`
     * asks the real placement, so a cornet player is simply offered the rest
     * of the collection and told how much of it fits.
     *
     * An octave displacement would widen that — measured, one shift of bars
     * 2 to 26 brings the span to twenty-six with seams of nought and five
     * semitones — and it is deliberately not applied. That is an arrangement
     * of a line rather than a transcription of it, and the ear rules on
     * arrangements before they ship, not after.
     */
    difficulty: 'hard',
    allowWideRange: true,
    tempo: 70,
    metres: [[3, 4]],
    bars: 34,
    events: [
      r(1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(5, 1 / 2), n(1, 1 / 2),
      n(1, 1 / 2, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2),
      n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }),
      n(4, 1 / 2, { alter: 1 }), n(2, 1 / 2), n(6, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(1, 1 / 2, { octave: 1 }), n(6, 1 / 2),
      n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4),
      n(3, 1 / 2), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(3, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4),
      n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 2), n(7, 1 / 2, { octave: -1 }),
      n(1, 1 / 2), n(5, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(5, 1 / 2), n(6, 1 / 2, { octave: -1 }), n(4, 1 / 2, { alter: 1 }),
      n(5, 1), r(2),
      r(1 / 2), n(5, 1 / 2), n(7, 1 / 2), n(5, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(5, 1 / 2),
      n(5, 1 / 2, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4),
      n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(3, 1 / 4, { octave: 1 }),
      n(4, 1 / 2), n(2, 1 / 2), n(4, 1 / 2), n(2, 1 / 2), n(6, 1 / 2), n(2, 1 / 2),
      n(2, 1 / 2, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4),
      n(2, 1 / 2), n(4, 1 / 2), n(6, 1 / 2), n(4, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(6, 1 / 2),
      n(4, 1 / 2, { octave: 1 }), n(6, 1 / 2, { alter: -1 }), n(4, 1 / 2, { octave: 1 }), n(6, 1 / 2, { alter: -1 }), n(4, 1 / 2, { octave: 1 }), n(6, 1 / 2, { alter: -1 }),
      n(6, 1 / 2), n(3, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(6, 1 / 2), n(3, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }),
      n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(4, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(4, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(4, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1 }), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { alter: -1 }), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(7, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1 }), n(2, 1 / 4, { octave: 1 }), n(6, 1 / 4, { alter: -1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(2, 1 / 4, { octave: 1 }),
      n(1, 1 / 2, { octave: 1 }), n(6, 1 / 2), n(4, 1 / 2), n(6, 1 / 2), n(2, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(7, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { alter: -1 }),
      n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }),
      n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4),
      n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4),
      n(7, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(4, 1 / 2), n(2, 1 / 2),
      n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { alter: -1, octave: -1 }),
      n(6, 1 / 2, { octave: -1 }), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }),
      n(3, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(1, 1 / 2, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(3, 1 / 2, { octave: -1 }),
      n(4, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(3, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }),
      n(1, 1), r(1), r(1),
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
    tempo: 108,
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
     * **Complete — all thirty-two bars**, E flat, and it fits the whole band.
     * It was four bars, cut where the subject and its answer closed.
     *
     * The plainest of the six to read: crotchets and quavers where the others
     * run in semiquavers, so what makes it hard is the key and the climb
     * rather than the speed. Taken whole it is the same music for longer — the
     * span grows by a tone and nothing else about it changes, which is what a
     * well-behaved piece looks like when the cut comes off.
     */
    difficulty: 'hard',
    metres: [[4, 4]],
    bars: 32,
    tempo: 70,
    events: [
      r(1 / 2), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(3, 1), n(4, 1),
      r(1 / 2), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 2), n(3, 1 / 2), n(4, 1), n(5, 1),
      n(3, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(2, 1 / 2),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(1, 3 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }),
      n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }),
      n(5, 1 / 4), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }),
      n(7, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4),
      n(1, 1 / 2, { octave: 1 }), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 2), n(6, 1 / 2), n(7, 1, { alter: -1 }), n(1, 1, { octave: 1 }),
      r(1 / 2), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 2), n(7, 1 / 2), n(1, 1, { octave: 1 }), n(2, 1, { octave: 1 }),
      r(1 / 2), n(7, 1 / 4), n(6, 1 / 4), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(2, 1, { octave: 1 }), n(3, 1, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(6, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }),
      n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4, { octave: 1 }), n(5, 1 / 4, { alter: 1, octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4, { alter: 1, octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4, { alter: 1, octave: 1 }),
      n(6, 1 / 4), n(6, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { alter: 1, octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: 1, octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }),
      n(2, 1 / 2, { octave: 1 }), n(2, 1 / 4), n(1, 1 / 4, { alter: 1 }), n(2, 1 / 2), n(3, 1 / 2), n(4, 1), n(5, 1),
      r(1 / 2), n(3, 1 / 4), n(2, 1 / 4), n(3, 1 / 2), n(4, 1 / 2), n(5, 1), n(6, 1),
      n(4, 1 / 2), n(7, 1 / 2, { alter: -1 }), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 2, { alter: 1 }), n(3, 1 / 2),
      n(2, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(6, 1 / 2), n(1, 3 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }),
      n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(5, 1 / 4), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(4, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }),
      n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: 1, octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }),
      n(2, 1 / 2, { octave: 1 }), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 2), n(5, 1 / 2), n(6, 1), n(7, 1, { alter: -1 }),
      r(1 / 2), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 2), n(6, 1 / 2), n(7, 1, { alter: -1 }), n(1, 1, { octave: 1 }),
      n(6, 1 / 4), n(4, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(5, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(5, 1 / 4), n(6, 1 / 4),
      n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(7, 1 / 4),
      n(1, 1 / 2, { octave: 1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(3, 1), n(4, 1),
      r(1 / 2), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 2), n(3, 1 / 2), n(4, 1), n(5, 1),
      n(3, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(2, 1 / 2),
      n(1, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2, { alter: -1 }), n(6, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4, { alter: -1 }), n(6, 1 / 2), n(5, 1 / 2),
      n(4, 1 / 2), n(6, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(4, 3 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 2, { octave: 1 }), n(4, 3 / 8, { octave: 1 }), n(4, 1 / 8, { octave: 1 }),
      n(3, 3 / 4, { octave: 1 }), n(2, 1 / 12, { octave: 1 }), n(1, 1 / 12, { octave: 1 }), n(2, 1 / 12, { octave: 1 }), n(2, 1, { octave: 1 }), n(1, 2, { octave: 1 }),
    ],
  },
  {
    id: 'bwv782-invention',
    name: 'Invention 11',
    /*
     * **Complete — all twenty-three bars**, G minor, and the most chromatic
     * thing in the collection: the flattened second and the raised sixth both
     * turn up inside the first bar. That is the quantity of accidentals the
     * difficulty model still cannot measure and the ear notices at once —
     * twelve per cent of its notes carry one, against nothing at all in
     * Invention 5.
     *
     * It was six bars, and the reason it stopped there is gone: later cuts
     * were barred by a note of a beat and a quarter, which a score ties inside
     * the bar. The whole piece needs no cut at all.
     */
    difficulty: 'hard',
    mode: 'minor',
    metres: [[4, 4]],
    bars: 23,
    tempo: 70,
    events: [
      r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4, { alter: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4),
      n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(4, 1 / 4),
      n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 2), n(5, 1 / 2), r(1 / 2), n(5, 1 / 2),
      n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 2), n(6, 1 / 2, { alter: 1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 2), n(1, 1 / 2, { alter: -1, octave: 1 }),
      n(1, 1 / 2, { octave: 1 }), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4),
      n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(5, 1 / 4, { alter: -1 }), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }),
      n(7, 1, { tied: true }), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4, { alter: -1 }), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(5, 1 / 2, { alter: -1 }), n(4, 1 / 2),
      n(3, 1 / 4, { alter: 1 }), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 2, { alter: 1 }), n(3, 1 / 2), n(2, 1 / 2), n(5, 1), n(5, 1 / 2, { alter: -1 }),
      n(2, 1 / 2), n(7, 1), n(6, 1 / 2, { alter: 1 }), n(2, 1 / 2), n(2, 1, { octave: 1 }), n(1, 1 / 2, { octave: 1, tied: true }),
      n(1, 1 / 2, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4, { alter: -1 }), n(5, 3 / 4), n(6, 1 / 4, { alter: 1 }), n(6, 3 / 4, { alter: 1 }), n(5, 1 / 4),
      n(5, 1 / 2), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4),
      n(2, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(4, 1, { tied: true }), n(4, 1 / 4), n(2, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(4, 1 / 4), n(5, 1, { tied: true }),
      n(5, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4),
      n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4, { alter: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(7, 1 / 4),
      n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { alter: -1, octave: 1 }), n(3, 1 / 2, { alter: 1 }), n(5, 1 / 2), r(1 / 2), n(7, 1 / 2, { octave: -1 }),
      n(6, 1 / 2, { octave: -1 }), n(4, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(3, 1 / 2, { alter: 1 }), n(4, 1 / 4), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1, { tied: true }),
      n(6, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 3 / 2), n(6, 1 / 4), n(5, 1 / 4), n(1, 3 / 4, { octave: 1 }), n(7, 1 / 4),
      n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(2, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4, { alter: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(1, 1 / 4),
      n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4),
      n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(2, 1 / 4),
      n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(1, 1 / 4, { alter: -1, octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { alter: -1, octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(5, 1, { tied: true }),
      n(5, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4),
      n(5, 1 / 4, { alter: -1, octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(1, 1 / 4), n(1, 1 / 4, { alter: -1 }), n(1, 2),
    ],
  },
  {
    id: 'bwv784-invention',
    name: 'Invention 13',
    /*
     * **Complete — all twenty-five bars**, A minor, and the one whose subject
     * is pure arpeggio: the figure that makes it famous is exactly the shape a
     * brass player drills. Which is the argument for the whole exercise — a
     * study and a piece of music at once, and nothing written for difficulty
     * has managed both.
     *
     * Was eight bars. The ties across bar lines that made those eight possible
     * are what make the other seventeen possible too; they are written as a
     * score writes them, the same degree twice with the first marked `tied`.
     *
     * **The widest of the three inventions taken whole**: thirty semitones,
     * so `allowWideRange` is set and the euphonium and tubas are most of who
     * can take it. The low bars are 20 to 22 and 25, where the upper voice
     * crosses beneath the lower — genuinely part of the writing rather than an
     * artefact, and no single octave shift fixes it. Measured: no schedule of
     * one shift reaches twenty-six at all.
     */
    difficulty: 'hard',
    allowWideRange: true,
    tempo: 70,
    mode: 'minor',
    metres: [[4, 4]],
    bars: 25,
    events: [
      r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(5, 1 / 2), n(7, 1 / 2, { alter: 1, octave: -1 }), n(5, 1 / 2),
      n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(1, 1 / 2), r(1),
      r(1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(4, 1 / 2), n(6, 1 / 2, { tied: true }),
      n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(3, 1 / 2), n(5, 1 / 2, { tied: true }),
      n(5, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 2, { octave: -1 }), n(4, 3 / 4), n(2, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 2, { octave: -1 }), n(3, 1 / 2, { tied: true }),
      n(3, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(3, 1 / 2), r(3 / 2),
      r(1 / 4), n(7, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 2), n(7, 1 / 2), n(2, 1 / 2), n(7, 1 / 2),
      n(3, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 2), n(3, 1 / 2), n(7, 1 / 2), n(5, 1 / 2),
      n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(4, 1 / 2), n(6, 1 / 2, { alter: 1 }), n(1, 1 / 2, { octave: 1 }), n(3, 1 / 2, { octave: 1 }),
      n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(3, 1 / 2), n(5, 1 / 2), n(7, 1 / 2), n(2, 1 / 2, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4, { alter: 1 }), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4, { alter: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(7, 1 / 2, { octave: -1 }), n(7, 3 / 4), n(5, 1 / 4), n(3, 1 / 4), n(5, 1 / 4),
      n(1, 1 / 2), n(6, 3 / 4, { alter: 1 }), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 2, { octave: -1 }), n(5, 3 / 4), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4),
      n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4, { alter: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 2), r(3 / 2),
      r(1 / 4), n(7, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(7, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(1, 1 / 4), r(3 / 4),
      r(1 / 4), n(6, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), r(3 / 4),
      r(1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), r(3 / 4),
      r(1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), r(3 / 4),
      r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(3, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { alter: 1, octave: -1 }), n(5, 1 / 2, { octave: -1 }),
      n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(4, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4),
      n(7, 1 / 4, { alter: 1, octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(7, 1 / 4, { alter: 1, octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }),
      n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(4, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(1, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -2 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(1, 1 / 4, { octave: -1 }),
      n(7, 1 / 2, { alter: 1, octave: -2 }), n(2, 1 / 2), n(7, 1 / 2, { alter: 1, octave: -1 }), n(5, 1 / 2, { octave: -1 }), r(1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4),
      n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4),
      n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(7, 1 / 4, { alter: 1 }), n(4, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4), n(3, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4),
      n(7, 1 / 4, { alter: 1, octave: -1 }), n(2, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1, { octave: -1 }),
    ],
  },
  {
    id: 'bwv786-invention',
    name: 'Invention 15',
    /*
     * **Complete — all twenty-two bars, and it needed no waiver to get there.**
     * B minor, and the one that fits: twenty-five semitones end to end, inside
     * what Hard reads, so every instrument in the band can take it and the
     * cornets get it in half the keys.
     *
     * That is worth knowing beyond this piece. Of the three inventions taken
     * whole on 2026-08-21 this is the only one a full band can play, which
     * says the compass problem is not a property of "inventions" but of each
     * one's own writing — and that the way to find more playable Bach is to
     * measure candidates rather than to assume the genre.
     */
    difficulty: 'hard',
    tempo: 70,
    mode: 'minor',
    metres: [[4, 4]],
    bars: 22,
    events: [
      r(1 / 2), n(1, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }),
      n(5, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }),
      n(5, 1 / 2, { octave: -1 }), r(3 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }),
      n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(2, 1 / 2), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4),
      n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(6, 3 / 4, { alter: 1, octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 4), n(5, 1 / 4, { alter: -1 }), n(5, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 2), n(2, 1 / 2), n(5, 1 / 2), n(2, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(6, 1 / 2, { alter: 1 }), n(1, 1 / 2),
      n(1, 1 / 2), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4, { alter: -1, octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 4), n(4, 1 / 4), n(5, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(4, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(6, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(4, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4),
      n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(6, 1 / 4), n(3, 1 / 4), n(7, 1 / 4), n(3, 1 / 4),
      n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { alter: -1, octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(4, 1 / 4), n(7, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(3, 1 / 4), n(6, 1 / 4), n(7, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(5, 1 / 4), n(3, 1 / 4),
      n(4, 1 / 2), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(4, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(3, 1 / 2), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2),
      n(3, 1 / 2), r(3 / 4), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }),
      n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(3, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(3, 1 / 4),
      n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }),
      n(4, 1 / 2, { octave: -1 }), n(3, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(3, 1 / 2, { octave: -1 }), n(3, 1 / 2, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(1, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(3, 1 / 4, { alter: 1, octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(3, 1 / 4, { alter: 1, octave: -1 }),
      n(7, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(4, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(5, 1 / 4, { alter: -1 }), n(5, 1 / 4), n(5, 1 / 4, { alter: -1 }),
      n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4, { alter: 1 }), n(7, 1 / 4), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(4, 1 / 4), n(3, 1 / 4, { alter: 1 }), n(7, 1 / 4), n(5, 1 / 4), n(6, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4),
      n(6, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(5, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(3, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(1, 1 / 4),
      n(2, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }),
      n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(4, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2, { octave: -1 }),
      n(4, 1 / 2, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(2, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 3 / 4, { octave: -1 }), n(3, 1 / 4), n(7, 3 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4),
      n(1, 4),
    ],
  },
  {
    id: 'bwv781-invention',
    name: 'Invention 10',
    /*
     * **Complete — all thirty-two bars**, G major, in nine-eight — the metre
     * this collection had to wait for. Almost all quavers in their threes, so
     * what it drills is the compound pulse itself: three to the bar, and the
     * eye has to group by three or it loses the beat entirely.
     *
     * **Hard rather than medium, and the label moved for the range.** Taken
     * whole it spans twenty-nine semitones, so it carries `allowWideRange` and
     * reaches the euphonium and the tubas. The reclassification measured the
     * same evening agrees for a different reason: at ♩=140 its quavers are
     * 4.67 notes a second, which is exactly Invention 13's semiquavers at 70,
     * and the model called one medium and the other hard because it was
     * reading note *values*. See `docs/difficulty-model-plan.md`.
     *
     * The last bar is three quavers, a dotted crotchet and a dotted-crotchet
     * rest. MIDI carries no trailing rest, so it is written back in — without
     * it the theme is a beat and a half short and every bar line after the
     * join lands in the wrong place.
     */
    difficulty: 'hard',
    allowWideRange: true,
    metres: [[9, 8]],
    bars: 32,
    tempo: 140,
    events: [
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(7, 1), n(5, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(5, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(5, 1 / 2),
      n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(3, 1 / 2), n(7, 1 / 2, { alter: -1 }), n(5, 1 / 2), n(3, 1 / 2), n(7, 1 / 2, { alter: -1 }), n(5, 1 / 2), n(3, 1 / 2),
      n(6, 1 / 2), n(4, 1 / 2), n(2, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2),
      n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(6, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2),
      n(4, 1 / 2), n(2, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2),
      n(3, 1 / 2), n(4, 1 / 2), n(5, 1 / 2), n(6, 1 / 2), n(3, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(6, 1 / 2), n(3, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(5, 1 / 2), n(2, 1 / 2), n(7, 1 / 2), n(5, 1 / 2), n(2, 1 / 2), n(7, 1 / 2),
      n(1, 2), n(2, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(6, 1 / 2, { octave: -1 }),
      n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(3, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(6, 1 / 2), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(4, 1 / 2, { alter: 1 }), n(5, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(3, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(2, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(3, 1 / 2, { octave: 1 }),
      n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(6, 1 / 2), n(7, 1 / 2), n(5, 1 / 2), n(2, 1 / 2), n(5, 1 / 2), n(4, 1 / 2, { alter: 1 }),
      n(5, 3 / 2), r(3),
      n(2, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(6, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(2, 1 / 2), n(6, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(2, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(7, 3 / 2), n(5, 3 / 2), r(3 / 2),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { alter: -1 }),
      n(6, 1 / 2), n(4, 1 / 2), n(2, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(6, 1 / 2), n(4, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2),
      n(4, 4, { tied: true }), n(4, 1 / 2, { tied: true }),
      n(4, 4, { tied: true }), n(4, 1 / 2),
      n(3, 4, { tied: true }), n(3, 1 / 2, { tied: true }),
      n(3, 4, { tied: true }), n(3, 1 / 2, { tied: true }),
      n(3, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(1, 1 / 2),
      n(2, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(6, 1 / 2, { octave: -1 }),
      n(7, 1, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(2, 1), n(7, 1 / 2, { octave: -1 }), n(5, 1), n(7, 1 / 2, { octave: -1 }),
      n(1, 1 / 2), n(3, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(1, 1 / 2), n(1, 1 / 2, { octave: 1 }),
      n(5, 1 / 2), n(7, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(5, 1 / 2), n(2, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(5, 1 / 2), n(4, 1 / 2, { octave: 1 }),
      n(3, 1 / 2, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(5, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2),
      n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(6, 1 / 2), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }),
      n(1, 1 / 2), n(5, 1 / 2, { octave: -1 }), n(3, 1 / 2, { octave: -1 }), n(1, 3 / 2, { octave: -1 }), r(3 / 2),
    ],
  },
  {
    id: 'bwv208-sheep',
    name: 'Sheep may safely graze',
    /*
     * The vocal line, not the flutes — ten bars from where the voice enters at
     * bar five. The famous recordings give the melody to whatever is
     * available, but Bach gave it to a soprano and the obbligato to two
     * recorders, and it is the sung line a listener hums back.
     *
     * **The first theme chosen for being recognisable rather than well made.**
     * Two chorales came before it, converted cleanly and withdrawn on the
     * player's verdict: *"I'm not a church choralist and aren't familiar with
     * the two you put up already, and I'd leave them rather than take them."*
     * A tune the reader knows tells them when they have played it wrong; a
     * tune they do not is just notes, and the corpus can already generate
     * notes.
     *
     * **Ten bars, not twelve, and easy rather than hard — which turned out to
     * be one correction rather than two.** It was taken at twelve and labelled
     * hard, and the ear caught both: *"the last two bars sound wrong… it
     * should have stopped at the end of bar 10."* Those two bars hold the only
     * semiquavers in the excerpt, so they were also the whole reason nothing
     * below hard would accept it. Cut where the phrase actually closes, on a
     * minim on the tonic, the shortest note becomes a quaver and the level
     * follows. The converter can say where a cut *may* fall; only a listener
     * says where it *should*.
     */
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 10,
    tempo: 60,
    events: [
      n(1, 1), n(3, 1 / 2), n(2, 1 / 2), n(2, 3 / 2), n(3, 1 / 2),
      n(4, 1), n(6, 1 / 2), n(5, 1 / 2), n(3, 1), n(2, 1 / 2), n(1, 1 / 2),
      n(3, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(2, 3 / 2), n(3, 1 / 2),
      n(7, 1, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(5, 2, { octave: -1 }),
      n(5, 1, { octave: -1 }), n(7, 1 / 2, { alter: -1, octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(6, 3 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }),
      n(1, 1), n(3, 1 / 2), n(2, 1 / 2), n(7, 1, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }),
      n(5, 1), n(6, 1 / 2), n(5, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2),
      n(5, 1), n(6, 1 / 2), n(5, 1 / 2), n(5, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2),
      n(4, 3 / 2), n(5, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(2, 1 / 2),
      n(7, 3 / 2, { octave: -1 }), n(1, 1 / 2), n(1, 2),
    ],
  },
  {
    id: 'bwv1068-air',
    name: 'Air on the G string',
    /*
     * **Re-read from a different edition on 2026-08-22, and the old one was
     * simply in the wrong place.** The verdict was *"i think we're jumping up
     * and down octaves everywhere"*, and the measurement agrees with the ear:
     * the version this replaces spanned twenty semitones where this one spans
     * fifteen, and reached only some of the band. This one fits **every
     * instrument in every key**.
     *
     * The four leaps of an octave or more that remain are Bach's. They are in
     * both readings, and in the printed violin part: this is a line that
     * leaps, and it was never the leaps that were wrong.
     *
     * **Still an arrangement, and it still says so.** The Air is thirteen per
     * cent demisemiquavers — the texture, not an ornament — so no level admits
     * it whole and there is to be no level above hard. `--simplify 0.25`
     * collapses twenty-seven notes in thirteen runs, each run becoming its own
     * first pitch held for the run's length, which is what a band arrangement
     * of the Air does and what a teaching edition does.
     *
     * **A licensing note worth keeping.** Mutopia holds three editions of this
     * movement and they do not agree: `bach-air` is CC BY-SA 3.0 and unusable
     * in a sold app, while `bach_air_bmv_1068` and `air-tromb` are plain
     * Public Domain. This is read from the second. Check the `.rdf` of the
     * exact directory, never of the work.
     */
    difficulty: 'hard',
    metres: [[4, 4]],
    bars: 19,
    tempo: 72,
    events: [
      n(3, 4, { tied: true }),
      n(3, 1 / 2), n(6, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1, { octave: -1 }), n(5, 1, { octave: -1 }),
      n(5, 2, { tied: true }), n(5, 1 / 4), n(3, 1 / 4), n(7, 1 / 4, { alter: -1, octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(1, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(4, 1 / 4),
      n(4, 2, { tied: true }), n(4, 1 / 4), n(2, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(3, 1 / 4),
      n(3, 3 / 2), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 4), n(1, 1 / 2), n(1, 1 / 4), n(3, 1 / 2), n(2, 1 / 4), n(2, 1 / 4), n(1, 1 / 4),
      n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 3 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 2, { octave: -1 }),
      n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 3 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 2, { octave: -1 }),
      n(7, 1, { octave: -1, tied: true }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(5, 1 / 4, { octave: -1 }), n(5, 3 / 2), n(7, 1 / 2, { alter: -1, octave: -1 }),
      n(6, 1 / 2, { octave: -1 }), n(6, 3 / 4), n(5, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1, { tied: true }), n(4, 1 / 8), n(3, 3 / 8), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }),
      n(5, 1 / 4, { alter: 1, octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(7, 3 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 3 / 4), n(3, 1 / 4), n(4, 1), n(3, 1 / 2),
      n(2, 1 / 4), n(1, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(1, 1 / 2), n(6, 2, { octave: -1 }),
      n(1, 1, { tied: true }), n(1, 1 / 4), n(3, 1 / 4), n(2, 1 / 4), n(1, 1 / 4), n(6, 3 / 2), n(5, 1 / 4), n(4, 1 / 4, { alter: 1 }),
      n(3, 1 / 4), n(5, 1 / 4), n(5, 1 / 2, { octave: -1 }), n(6, 3 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(7, 3 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(5, 1, { octave: -1 }),
      n(1, 3 / 2), n(3, 1 / 4), n(2, 1 / 4), n(2, 3 / 2), n(4, 1 / 4), n(3, 1 / 4),
      n(3, 3 / 2), n(5, 1 / 4), n(4, 1 / 4), n(4, 2),
      n(5, 1, { octave: -1, tied: true }), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(3, 1, { tied: true }), n(3, 1 / 4), n(4, 1 / 4),
      n(1, 1, { tied: true }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(7, 1 / 4, { alter: -1 }), n(6, 3 / 2), n(1, 1 / 2),
      n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1), n(6, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(2, 3 / 8), n(4, 3 / 8), n(3, 1 / 2), n(2, 1 / 4),
      n(1, 1 / 4), n(6, 1 / 2, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 2), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(1, 2),
    ],
  },
  {
    id: 'bwv846-prelude',
    name: 'Prelude in C',
    /*
     * **Complete — all thirty-five bars — and an arrangement, which it says
     * plainly because everything around it is not.**
     *
     * Two things had to be true for the whole piece to exist as one line.
     *
     * **One: both hands, as one voice.** Each half-bar is eight semiquavers,
     * of which the left hand plays the first two and *holds* them while the
     * right arpeggiates above. Taking one staff gives six notes and a rest,
     * which is neither hand's part. `--reflow` merges the staves and gives
     * every note the length of the gap to the next, which is what one player
     * has no choice but to do — you cannot sustain and arpeggiate at once.
     * Ruled 2026-08-21: *"the initial two notes in each bar need to be part of
     * the arpeggio."*
     *
     * **Two: close voicing.** The reflowed piece spans forty-five semitones and
     * fits no instrument in the band — and from bar 24 the reason stops being
     * drift and becomes texture: the left hand holds a low pedal while the
     * right hand works two octaves above, so **one bar spans forty-one
     * semitones on its own**. Shifting whole bars cannot fix a bar that is
     * itself three and a half octaves wide, which is why `--fold` failed here
     * and why the piece stopped at bar 8 before. `--close 12` raises each bar's
     * low notes by octaves until the bar sits inside an octave: the same chord,
     * every pitch class kept, the bass brought up into the figure instead of
     * left where no brass instrument can reach it.
     *
     * The result is thirty-five bars spanning twenty-nine semitones with **no
     * leap anywhere wider than an octave** — inside a bar or across a bar line
     * — where the eight-bar excerpt it replaces leapt twenty-one and needed
     * `allowWideLeaps` to do it. So that waiver is gone and the range one takes
     * its place. Euphonium, both tubas, and the cornets in two keys.
     *
     * What was given up is the register, which one instrument could not have
     * had in any case. What was kept is the harmony, the figure and the
     * ending — the piece now resolves where Bach resolves it.
     */
    difficulty: 'hard',
    allowWideRange: true,
    tempo: 70,
    metres: [[4, 4]],
    bars: 35,
    events: [
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }),
      n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(6, 1 / 4, { octave: 1 }),
      n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }),
      n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }), n(5, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(5, 1 / 4, { octave: 1 }),
      n(7, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }),
      n(6, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(6, 1 / 4), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }),
      n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(1, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(1, 1 / 4, { octave: 1 }),
      n(5, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(5, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(5, 1 / 4), n(7, 1 / 4),
      n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(5, 1 / 4), n(6, 1 / 4, { alter: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { alter: 1, octave: 1 }),
      n(4, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4), n(6, 1 / 4), n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(2, 1 / 4), n(6, 1 / 4), n(2, 1 / 4, { octave: 1 }),
      n(4, 1 / 4), n(5, 1 / 4, { alter: 1 }), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { alter: 1 }), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4), n(2, 1 / 4), n(4, 1 / 4), n(7, 1 / 4),
      n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(3, 1 / 4), n(5, 1 / 4), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }), n(1, 1 / 4), n(5, 1 / 4), n(1, 1 / 4, { octave: 1 }),
      n(3, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(3, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4),
      n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4),
      n(1, 1 / 4), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4),
      n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(3, 1 / 4),
      n(4, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4),
      n(4, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4, { alter: 1 }), n(4, 1 / 4, { alter: 1, octave: -1 }), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4, { alter: 1 }),
      n(5, 1 / 4, { alter: 1, octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(5, 1 / 4, { alter: 1, octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4), n(7, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(2, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(2, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4, { octave: -1 }), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(3, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4, { alter: 1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4, { alter: 1 }),
      n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(5, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(5, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(5, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(5, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4),
      n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(7, 1 / 4, { octave: -1 }), n(4, 1 / 4),
      n(1, 1 / 4), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4), n(1, 1 / 4), n(1, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4), n(5, 1 / 4, { octave: -1 }), n(6, 1 / 4, { alter: 1, octave: -1 }), n(3, 1 / 4),
      n(1, 1 / 4), n(1, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(4, 1 / 4), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(1, 1 / 4), n(6, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(6, 1 / 4, { octave: -1 }), n(4, 1 / 4, { octave: -1 }), n(2, 1 / 4), n(4, 1 / 4, { octave: -1 }), n(2, 1 / 4),
      n(1, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(7, 1 / 4), n(5, 1 / 4), n(7, 1 / 4), n(2, 1 / 4, { octave: 1 }), n(4, 1 / 4), n(3, 1 / 4, { octave: 1 }), n(2, 1 / 4, { octave: 1 }),
      n(1, 4, { octave: 1 }),
    ],
  },
  {
    id: 'bwv-anh114-menuett',
    name: 'Menuett in G',
    /*
     * **Complete — all thirty-two bars, ending where it ends.** The first
     * whole piece in this collection rather than an excerpt, which is what the
     * corpus has wanted since the chorales were tried: nothing here has to be
     * cut, so nothing here is cut badly.
     *
     * Asked for as *"the treble clef only, except where there are no notes on
     * the treble, in which case fill the void with the notes from the bass"* —
     * which is exactly what the converter's own rule does when it merges the
     * staves: the higher note wins where both sound, and the lower stands
     * where it sounds alone. In this edition the treble never rests, so the
     * two come out identical; the rule cost nothing here and is right for the
     * next source where it does.
     *
     * **Medium, and that matters more than the piece does.** A scan on
     * 2026-08-21 found medium the thinnest level in the corpus and, worse,
     * that nine of its eleven themes were cross-rhythm études from the written
     * set — there was nothing at medium that was simply *a tune of moderate
     * difficulty*, which is most of what a middling player reads. This is one:
     * stepwise almost throughout (its typical interval is a whole tone),
     * twenty-one semitones end to end, and it fits every instrument in the
     * band.
     *
     * Not by Bach, and worth knowing: the Notebook for Anna Magdalena Bach is
     * a household anthology, and this minuet is Christian Petzold's. He died
     * in 1733, so it is public domain twice over.
     */
    difficulty: 'medium',
    metres: [[3, 4]],
    bars: 32,
    tempo: 140,
    events: [
      n(5, 1), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 1), n(1, 1), n(1, 1),
      n(6, 1), n(4, 1 / 2), n(5, 1 / 2), n(6, 1 / 2), n(7, 1 / 2),
      n(1, 1, { octave: 1 }), n(1, 1), n(1, 1),
      n(4, 1), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2),
      n(3, 1), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2),
      n(7, 1, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(1, 3 / 8), n(3, 1 / 8),
      n(2, 3),
      n(5, 1), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 1), n(1, 1), n(1, 1),
      n(6, 1), n(4, 1 / 2), n(5, 1 / 2), n(6, 1 / 2), n(7, 1 / 2),
      n(1, 1, { octave: 1 }), n(1, 1), n(1, 1),
      n(4, 1), n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2),
      n(3, 1), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2),
      n(2, 1), n(3, 1 / 2), n(2, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }),
      n(1, 3),
      n(3, 1, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(2, 1 / 2, { octave: 1 }), n(3, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }),
      n(2, 1, { octave: 1 }), n(5, 1 / 2), n(6, 1 / 2), n(7, 1 / 2), n(5, 1 / 2),
      n(1, 1, { octave: 1 }), n(6, 1 / 2), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(5, 1 / 2),
      n(4, 1, { alter: 1 }), n(3, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(2, 1),
      n(2, 1 / 2), n(3, 1 / 2), n(4, 1 / 2, { alter: 1 }), n(5, 1 / 2), n(6, 1 / 2), n(7, 1 / 2),
      n(1, 1, { octave: 1 }), n(7, 1), n(6, 1),
      n(7, 1), n(2, 1), n(4, 1, { alter: 1 }),
      n(5, 3),
      n(5, 1), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1),
      n(6, 1), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1),
      n(5, 1), n(4, 1), n(3, 1),
      n(2, 1 / 2), n(1, 1 / 2), n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(2, 1),
      n(5, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(7, 1 / 2, { octave: -1 }), n(1, 1 / 2), n(2, 1 / 2), n(3, 1 / 2),
      n(4, 1), n(3, 1), n(2, 1),
      n(3, 1 / 2), n(5, 1 / 2), n(1, 1), n(7, 1, { octave: -1 }),
      n(1, 3),
    ],
  },
];
