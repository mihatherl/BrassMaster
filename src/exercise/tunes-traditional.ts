/*
 * Traditional tunes, written as degrees, for review.
 *
 * Everything here is a melody people already know, and that is the point: the
 * question the review sheet cannot settle about a composed tune — *is it a
 * tune?* — does not arise. Nobody has to adjudicate Twinkle. So these serve as
 * a calibration for the ear alongside the forty-seven, which say of themselves
 * that they were written "deliberately plain … not that the tunes are
 * memorable".
 *
 * **Candidates. Nothing in the app imports this**, so none of it reaches a
 * player until it has been heard and kept.
 *
 * ## Why degrees and not MusicXML
 *
 * A theme is a shape, not a key — which is what lets one be played by a cornet
 * in B flat and an E flat bass in either clef from the same eight bars. A
 * MusicXML file arrives in one key for one instrument with somebody's engraving
 * attached, all of which would be stripped back to this anyway. Writing the
 * tune out as degrees is the import, minus the conversion — and it sidesteps
 * the trap in using found files: the *melodies* here are long out of copyright,
 * but a particular typeset **edition** is its own work, and a tune written from
 * common knowledge as scale degrees copies nobody's engraving.
 *
 * ## What to expect when these are measured
 *
 * They will read *short* against every level above beginner — narrow spans, no
 * accidentals, few rests. That is correct rather than a fault: these are
 * beginner material by nature, and it is the variation of them, not the tunes
 * themselves, that carries them upward.
 *
 * ## What is missing
 *
 * Almost all of these are in 4/4, with one in 6/8 and **nothing in 3/4** — not
 * an accident of taste but of which traditional tunes are simple enough to be
 * beginner material. A corpus built only from here would leave the metre picker
 * lopsided.
 */

import type { Theme } from './theme';

/** A note of `beats` on `degree`, with the options a few need. */
function n(degree: number, beats: number, extra: { alter?: number; octave?: number } = {}) {
  return { degree, beats, ...extra };
}

export const TRADITIONAL: readonly Theme[] = [
  {
    id: 'trad-hot-cross-buns',
    name: 'Hot cross buns',
    // Easy rather than beginner: "one a penny" is quavers, and beginner reads
    // nothing shorter than a crotchet. The validator said so, not I.
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 4,
    /* Three notes and a step-wise fall. The smallest tune anyone knows. */
    events: [
      n(3, 1), n(2, 1), n(1, 2),
      n(3, 1), n(2, 1), n(1, 2),
      n(1, 0.5), n(1, 0.5), n(1, 0.5), n(1, 0.5), n(2, 0.5), n(2, 0.5), n(2, 0.5), n(2, 0.5),
      n(3, 1), n(2, 1), n(1, 2),
    ],
  },
  {
    id: 'trad-mary',
    name: 'Mary had a little lamb',
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(3, 1), n(2, 1), n(1, 1), n(2, 1),
      n(3, 1), n(3, 1), n(3, 2),
      n(2, 1), n(2, 1), n(2, 2),
      n(3, 1), n(5, 1), n(5, 2),
      n(3, 1), n(2, 1), n(1, 1), n(2, 1),
      n(3, 1), n(3, 1), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(3, 1), n(2, 1),
      n(1, 4),
    ],
  },
  {
    id: 'trad-twinkle',
    name: 'Twinkle, twinkle, little star',
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 12,
    /*
     * Ah vous dirai-je Maman, 1761 — and also the Alphabet Song, and the
     * contour of Baa baa black sheep below. Three sets of words on one tune,
     * which is a variation engine that tradition built.
     */
    events: [
      n(1, 1), n(1, 1), n(5, 1), n(5, 1),
      n(6, 1), n(6, 1), n(5, 2),
      n(4, 1), n(4, 1), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
      n(5, 1), n(5, 1), n(4, 1), n(4, 1),
      n(3, 1), n(3, 1), n(2, 2),
      n(5, 1), n(5, 1), n(4, 1), n(4, 1),
      n(3, 1), n(3, 1), n(2, 2),
      n(1, 1), n(1, 1), n(5, 1), n(5, 1),
      n(6, 1), n(6, 1), n(5, 2),
      n(4, 1), n(4, 1), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
    ],
  },
  {
    id: 'trad-baa-baa',
    name: 'Baa, baa, black sheep',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    /*
     * The same contour as Twinkle with the words pulling the rhythm about —
     * four quavers where Twinkle has two crotchets, because "have you any
     * wool" has more syllables than "twinkle twinkle". Worth keeping both:
     * side by side they show what a *rhythmic* variation does to a tune that
     * is otherwise identical, which is the kind that stays recognisable.
     */
    events: [
      n(1, 1), n(1, 1), n(5, 1), n(5, 1),
      n(6, 0.5), n(6, 0.5), n(6, 0.5), n(6, 0.5), n(5, 2),
      n(4, 1), n(4, 1), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
      n(4, 0.5), n(4, 0.5), n(4, 0.5), n(4, 0.5), n(3, 1), n(3, 1),
      n(2, 0.5), n(2, 0.5), n(2, 0.5), n(2, 0.5), n(1, 2),
      n(1, 1), n(1, 1), n(5, 1), n(5, 1),
      n(6, 1), n(6, 1), n(5, 2),
    ],
  },
  {
    id: 'trad-au-clair',
    name: 'Au clair de la lune',
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(1, 1), n(1, 1), n(1, 1), n(2, 1),
      n(3, 2), n(2, 2),
      n(1, 1), n(3, 1), n(2, 1), n(2, 1),
      n(1, 4),
      n(1, 1), n(1, 1), n(1, 1), n(2, 1),
      n(3, 2), n(2, 2),
      n(1, 1), n(3, 1), n(2, 1), n(2, 1),
      n(1, 4),
    ],
  },
  {
    id: 'trad-old-macdonald',
    name: 'Old MacDonald had a farm',
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(1, 1), n(1, 1), n(1, 1), n(5, 1),
      n(6, 1), n(6, 1), n(5, 2),
      n(3, 1), n(3, 1), n(2, 1), n(2, 1),
      n(1, 4),
      n(1, 1), n(1, 1), n(1, 1), n(5, 1),
      n(6, 1), n(6, 1), n(5, 2),
      n(3, 1), n(3, 1), n(2, 1), n(2, 1),
      n(1, 4),
    ],
  },
  {
    id: 'trad-frere-jacques',
    name: 'Frère Jacques',
    // Easy on two counts the validator caught: quavers in the third phrase,
    // and the low fifth of "ding dang dong" opens it to fourteen semitones
    // where a beginner reads twelve.
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    /* Four two-bar phrases, each said twice — a canon, and the plainest
       possible demonstration of repetition as musical grammar. */
    events: [
      n(1, 1), n(2, 1), n(3, 1), n(1, 1),
      n(1, 1), n(2, 1), n(3, 1), n(1, 1),
      n(3, 1), n(4, 1), n(5, 2),
      n(3, 1), n(4, 1), n(5, 2),
      n(5, 0.5), n(6, 0.5), n(5, 0.5), n(4, 0.5), n(3, 1), n(1, 1),
      n(5, 0.5), n(6, 0.5), n(5, 0.5), n(4, 0.5), n(3, 1), n(1, 1),
      n(1, 1), n(5, 1, { octave: -1 }), n(1, 2),
      n(1, 1), n(5, 1, { octave: -1 }), n(1, 2),
    ],
  },
  {
    id: 'trad-lightly-row',
    name: 'Lightly row',
    // Beginner, on the validator's reading: nothing shorter than a crotchet,
    // no leap past a third, and a span of seven where easy allows seventeen.
    // It is a first-week tune however famous it is.
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    /* A staple of every beginner brass method, and the same German folk
       contour as Ach du lieber Augustin. */
    events: [
      n(5, 1), n(3, 1), n(3, 2),
      n(4, 1), n(2, 1), n(2, 2),
      n(1, 1), n(2, 1), n(3, 1), n(4, 1),
      n(5, 1), n(5, 1), n(5, 2),
      n(5, 1), n(3, 1), n(3, 2),
      n(4, 1), n(2, 1), n(2, 2),
      n(1, 1), n(3, 1), n(5, 1), n(5, 1),
      n(3, 1), n(1, 1), n(1, 2),
    ],
  },
  {
    id: 'trad-london-bridge',
    name: 'London Bridge',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(5, 1), n(6, 1), n(5, 1), n(4, 1),
      n(3, 1), n(4, 1), n(5, 2),
      n(2, 1), n(3, 1), n(4, 2),
      n(3, 1), n(4, 1), n(5, 2),
      n(5, 1), n(6, 1), n(5, 1), n(4, 1),
      n(3, 1), n(4, 1), n(5, 2),
      n(2, 2), n(5, 2),
      n(3, 2), n(1, 2),
    ],
  },
  {
    id: 'trad-ode-to-joy',
    name: 'Ode to joy',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    /* Beethoven, 1824. The dotted figure in bars four and eight is the whole
       character of it, and the only rhythm here that is not a plain crotchet. */
    events: [
      n(3, 1), n(3, 1), n(4, 1), n(5, 1),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1), n(1, 1), n(2, 1), n(3, 1),
      n(3, 1.5), n(2, 0.5), n(2, 2),
      n(3, 1), n(3, 1), n(4, 1), n(5, 1),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1), n(1, 1), n(2, 1), n(3, 1),
      n(2, 1.5), n(1, 0.5), n(1, 2),
    ],
  },
  {
    id: 'trad-jingle-bells',
    name: 'Jingle bells',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    /* Pierpont, 1857. The chorus only — the verse needs a pickup, which a
       theme cannot yet carry. */
    events: [
      n(3, 1), n(3, 1), n(3, 2),
      n(3, 1), n(3, 1), n(3, 2),
      n(3, 1), n(5, 1), n(1, 1), n(2, 1),
      n(3, 4),
      n(4, 1), n(4, 1), n(4, 1), n(4, 1),
      n(4, 1), n(3, 1), n(3, 1), n(3, 0.5), n(3, 0.5),
      n(3, 1), n(2, 1), n(2, 1), n(3, 1),
      n(2, 2), n(5, 2),
    ],
  },
  {
    id: 'trad-row-your-boat',
    name: 'Row, row, row your boat',
    difficulty: 'easy',
    metres: [[6, 8]],
    bars: 8,
    /* The one in six-eight, and the only tune here that reaches the octave. */
    events: [
      n(1, 1.5), n(1, 1.5),
      n(1, 1), n(2, 0.5), n(3, 1.5),
      n(3, 1), n(2, 0.5), n(3, 1), n(4, 0.5),
      n(5, 3),
      n(1, 0.5, { octave: 1 }), n(1, 0.5, { octave: 1 }), n(1, 0.5, { octave: 1 }),
      n(5, 0.5), n(5, 0.5), n(5, 0.5),
      n(3, 0.5), n(3, 0.5), n(3, 0.5), n(1, 0.5), n(1, 0.5), n(1, 0.5),
      n(5, 1), n(4, 0.5), n(3, 1), n(2, 0.5),
      n(1, 3),
    ],
  },
];
