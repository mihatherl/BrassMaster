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
 * **These reach players.** That changed on 2026-08-20, when collections became
 * selectable: this list is the Nursery collection. What holds the line is the
 * collection's `unjudged` set in `collections.ts` — a tune goes in there in the
 * same edit that adds it here, and comes out when somebody has heard it.
 *
 * **And unlike the Bach, these are written from memory.** There is no converter
 * step and no file to check them against: the melodies are common knowledge and
 * that is the whole reason they can be written at all. It is also the risk —
 * Old MacDonald shipped falling to the fifth *above* instead of the fourth
 * below, which no validator could catch because the degrees were legal either
 * way. Every tune here needs an ear on it before it is kept.
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
 *
 * The 2026-08-21 batch was aimed at exactly that, and at the level the whole
 * corpus is thinnest in: a scan that day put beginner at nine themes against
 * hard's eighteen, which is backwards for an app whose advanced players have
 * mostly moved on. Three-four now has Happy Birthday, two-four has Yankee
 * Doodle, and six-eight has a second tune.
 */

import type { Theme } from './theme';

/** A note of `beats` on `degree`, with the options a few need. */
function n(degree: number, beats: number, extra: { alter?: number; octave?: number } = {}) {
  return { degree, beats, ...extra };
}

/** A rest of `beats`, for a tune that begins part-way through its first bar. */
function r(beats: number) {
  return { rest: true as const, beats };
}

export const TRADITIONAL: readonly Theme[] = [
  {
    id: 'trad-hot-cross-buns',
    name: 'Hot cross buns',
    // Easy rather than beginner: "one a penny" is quavers, and beginner reads
    // nothing shorter than a crotchet. The validator said so, not I.
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    /* Three notes and a step-wise fall. The smallest tune anyone knows —
       twice, for the second verse. */
    events: [
      n(3, 1), n(2, 1), n(1, 2),
      n(3, 1), n(2, 1), n(1, 2),
      n(1, 0.5), n(1, 0.5), n(1, 0.5), n(1, 0.5), n(2, 0.5), n(2, 0.5), n(2, 0.5), n(2, 0.5),
      n(3, 1), n(2, 1), n(1, 2),
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
    /*
     * **Read from the score in Wikipedia's article, not remembered** — the
     * third attempt at this one, and the first that is derived. The LilyPond
     * source there was parsed for its melody alone, converted to a file, and
     * run through `tools/midi-to-theme.mts` like everything borrowed.
     *
     * Two things the memory versions got wrong, and the source settles both:
     * the "wool" figure is four quavers rising to the upper tonic and back to
     * the sixth, not five notes; and the middle section descends in threes —
     * a crotchet and two quavers on each of 5, 4, 3 — where the corpus had it
     * as repeated quavers on 4 and 2.
     *
     * The tune is *Ah! vous dirai-je, maman*, which Twinkle also uses. Keeping
     * both is deliberate: same contour, different rhythmic setting, and the
     * pair is the corpus's own evidence for what a variation may safely change.
     */
    difficulty: 'easy',
    metres: [[2, 4]],
    bars: 16,
    events: [
      n(1, 1), n(1, 1),
      n(5, 1), n(5, 1),
      n(6, 1 / 2), n(7, 1 / 2), n(1, 1 / 2, { octave: 1 }), n(6, 1 / 2),
      n(5, 2),
      n(4, 1), n(4, 1),
      n(3, 1), n(3, 1),
      n(2, 1), n(2, 1),
      n(1, 2),
      n(5, 1), n(5, 1 / 2), n(5, 1 / 2),
      n(4, 1), n(4, 1 / 2), n(4, 1 / 2),
      n(3, 1), n(3, 1 / 2), n(3, 1 / 2),
      n(2, 3 / 2), n(2, 1 / 2),
      n(5, 1), n(5, 1 / 2), n(5, 1 / 2),
      n(4, 1 / 2), n(5, 1 / 2), n(6, 1 / 2), n(4, 1 / 2),
      n(3, 1), n(2, 1 / 2), n(2, 1 / 2),
      n(1, 2),
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
    /*
     * **Read from a file, not remembered — and it is the third attempt.**
     * Source: a CC0 MIDI on Wikimedia Commons, converted by
     * `tools/midi-to-theme.mts` and read in G. The tune is 19th-century
     * American folk and long out of copyright; only the notes are taken, and
     * no words, which the corpus has never carried.
     *
     * The first version leapt a fifth up where the tune falls a fourth down.
     * The second was written from memory again and stopped before the refrain.
     * Asked for on 2026-08-22: *"can you try this again, with the second
     * verse"* — so this is sixteen bars: the verse, the verse again, the
     * refrain on its repeated note, and the verse to close.
     *
     * Easy rather than beginner, and the refrain is why: it is quavers on one
     * note where everything around it is crotchets, and Beginner reads neither
     * quavers nor rests.
     */
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 16,
    events: [
      r(2), n(1, 1), n(1, 1),
      n(1, 1), n(5, 1, { octave: -1 }), n(6, 1, { octave: -1 }), n(6, 1, { octave: -1 }),
      n(5, 2, { octave: -1 }), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
      r(1), n(5, 1, { octave: -1 }), n(1, 1), n(1, 1),
      n(1, 1), n(5, 1, { octave: -1 }), n(6, 1, { octave: -1 }), n(6, 1, { octave: -1 }),
      n(5, 2, { octave: -1 }), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
      r(1), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1), n(1, 1),
      n(1, 1), n(5, 1 / 2, { octave: -1 }), n(5, 1 / 2, { octave: -1 }), n(1, 1), n(1, 1),
      n(1, 2), n(1, 1 / 2), n(1, 1 / 2), n(1, 1),
      n(1, 1 / 2), n(1, 1 / 2), n(1, 1), n(1, 1 / 2), n(1, 1 / 2), n(1, 1 / 2), n(1, 1 / 2),
      n(1, 1), n(1, 1), n(1, 1), n(1, 1),
      n(1, 1), n(5, 1, { octave: -1 }), n(6, 1, { octave: -1 }), n(6, 1, { octave: -1 }),
      n(5, 2, { octave: -1 }), n(3, 1), n(3, 1),
      n(2, 1), n(2, 1), n(1, 2),
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
      n(3, 1), n(1, 3),
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
      n(3, 1), n(1, 3),
    ],
  },
  {
    id: 'trad-ode-to-joy',
    name: 'Ode to joy',
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 16,
    /* Beethoven, 1824. All sixteen bars: the tune, its answer, the middle
       that drops to the low fifth, and the return. Eight bars stopped it
       half-said. */
    events: [
      n(3, 1), n(3, 1), n(4, 1), n(5, 1),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1), n(1, 1), n(2, 1), n(3, 1),
      n(3, 1.5), n(2, 0.5), n(2, 2),
      n(3, 1), n(3, 1), n(4, 1), n(5, 1),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1), n(1, 1), n(2, 1), n(3, 1),
      n(2, 1.5), n(1, 0.5), n(1, 2),
      n(2, 1), n(2, 1), n(3, 1), n(1, 1),
      n(2, 1), n(3, 0.5), n(4, 0.5), n(3, 1), n(1, 1),
      n(2, 1), n(3, 0.5), n(4, 0.5), n(3, 1), n(2, 1),
      n(1, 1), n(2, 1), n(5, 2, { octave: -1 }),
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
    bars: 16,
    /* Pierpont, 1857. The whole chorus — eight bars broke off mid-sentence,
       at the half close on the dominant. The verse needs a pickup, which a
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
      n(3, 1), n(3, 1), n(3, 2),
      n(3, 1), n(3, 1), n(3, 2),
      n(3, 1), n(5, 1), n(1, 1), n(2, 1),
      n(3, 4),
      n(4, 1), n(4, 1), n(4, 1), n(4, 1),
      n(4, 1), n(3, 1), n(3, 1), n(3, 0.5), n(3, 0.5),
      n(5, 1), n(5, 1), n(4, 1), n(2, 1),
      n(1, 4),
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
  {
    id: 'trad-saints',
    name: 'When the Saints Go Marching In',
    /*
     * **Read from a published setting, not remembered.** Source: the ABC in
     * the German Wikipedia's article, parsed and converted rather than typed.
     * The verdict of 2026-08-22 was *"look up the music for this if you can,
     * your memory transcription is incorrect, sounds a little bit like it, but
     * not quite"* — which is exactly the failure mode the converter exists to
     * stop, and this file is the last place in the corpus still writing from
     * memory.
     *
     * Sixteen bars of 2/4, and it never leaves the first five degrees: the
     * whole tune sits inside a fifth, which makes it one of the plainest
     * things here to pitch and the fastest to read.
     */
    difficulty: 'easy',
    metres: [[2, 4]],
    bars: 16,
    events: [
      r(1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 2),
      r(1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 2),
      r(1 / 2), n(1, 1 / 2), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 1), n(3, 1),
      n(1, 1), n(3, 1),
      n(2, 2),
      r(1 / 2), n(3, 1 / 2), n(3, 1 / 2), n(2, 1 / 2),
      n(1, 2),
      n(3, 1), n(5, 1),
      n(5, 1 / 2), n(4, 3 / 2),
      r(1), n(3, 1 / 2), n(4, 1 / 2),
      n(5, 1), n(3, 1),
      n(1, 1), n(2, 1),
      n(1, 2),
    ],
  },
  {
    id: 'trad-michael-row',
    name: 'Michael row the boat ashore',
    /* The second beginner tune in plain crotchets, and it moves by thirds
       rather than by step — which is a different thing to read from Mary or
       Hot cross buns, both of which walk. */
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(1, 1), n(3, 1), n(5, 2),
      n(5, 1), n(3, 1), n(5, 2),
      n(3, 1), n(1, 1), n(2, 2),
      n(1, 4),
      n(1, 1), n(3, 1), n(5, 2),
      n(5, 1), n(6, 1), n(5, 2),
      n(3, 1), n(2, 1), n(1, 2),
      n(1, 4),
    ],
  },
  {
    id: 'trad-happy-birthday',
    name: 'Happy birthday',
    /*
     * **The first tune here in three-four**, which the file has wanted since it
     * was written: simple traditional tunes are overwhelmingly in two and four,
     * and the metre picker has had nothing to offer at this level.
     *
     * Public domain: the melody is "Good Morning to All" by Mildred Hill, who
     * died in 1916, and the words that made it famous were held to carry no
     * copyright of their own in 2016.
     *
     * It enters on the second half of a bar, so the first bar is filled with a
     * rest — which is also the first anacrusis in this collection, and worth a
     * beginner meeting.
     */
    difficulty: 'easy',
    metres: [[3, 4]],
    bars: 9,
    events: [
      r(2), n(5, 0.5, { octave: -1 }), n(5, 0.5, { octave: -1 }),
      n(6, 1, { octave: -1 }), n(5, 1, { octave: -1 }), n(1, 1),
      n(7, 2, { octave: -1 }), n(5, 0.5, { octave: -1 }), n(5, 0.5, { octave: -1 }),
      n(6, 1, { octave: -1 }), n(5, 1, { octave: -1 }), n(2, 1),
      n(1, 2), n(5, 0.5, { octave: -1 }), n(5, 0.5, { octave: -1 }),
      n(5, 1), n(3, 1), n(1, 1),
      n(7, 1, { octave: -1 }), n(6, 1, { octave: -1 }), n(4, 0.5), n(4, 0.5),
      n(3, 1), n(1, 1), n(2, 1),
      n(1, 3),
    ],
  },
  {
    id: 'trad-yankee-doodle',
    name: 'Yankee doodle',
    /* **The first tune here in two-four.** Quavers in pairs against a two-beat
       bar, which is a quite different feel to read from the same notes in
       four-four — the bar line comes twice as often and the eye has to keep up
       with it. */
    difficulty: 'easy',
    metres: [[2, 4]],
    bars: 8,
    events: [
      n(1, 0.5), n(1, 0.5), n(2, 0.5), n(3, 0.5),
      n(1, 0.5), n(3, 0.5), n(2, 1),
      n(1, 0.5), n(1, 0.5), n(2, 0.5), n(3, 0.5),
      n(1, 1), n(7, 1, { octave: -1 }),
      n(1, 0.5), n(1, 0.5), n(2, 0.5), n(3, 0.5),
      n(4, 0.5), n(3, 0.5), n(2, 0.5), n(1, 0.5),
      n(7, 0.5, { octave: -1 }), n(5, 0.5, { octave: -1 }), n(6, 0.5, { octave: -1 }), n(7, 0.5, { octave: -1 }),
      n(1, 2),
    ],
  },
  {
    id: 'trad-oh-susanna',
    name: 'Oh Susanna',
    /* Stephen Foster, who died in 1864. The quaver pickup into a rising
       arpeggio is the figure to watch: it is the same shape three times and a
       reader who spots that has most of the tune. */
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(1, 0.5), n(2, 0.5), n(3, 1), n(5, 1), n(5, 1),
      n(6, 1), n(5, 1), n(3, 1), n(1, 1),
      n(2, 1), n(3, 1), n(3, 1), n(2, 1),
      n(1, 2), n(2, 2),
      n(1, 0.5), n(2, 0.5), n(3, 1), n(5, 1), n(5, 1),
      n(6, 1), n(5, 1), n(3, 1), n(1, 1),
      n(2, 1), n(3, 1), n(3, 1), n(2, 1),
      n(1, 4),
    ],
  },
  {
    id: 'trad-three-blind-mice',
    name: 'Three Blind Mice',
    /*
     * **Unfolded from a round.** The only public-domain file to be had is the
     * round as it is sung, three voices entering six beats apart, so one voice
     * had to be recovered before it could be a theme: each six-beat window
     * holds the new voice plus the earlier ones replaying what they have
     * already played, and subtracting the known ones leaves the line. The
     * result is monophonic all the way through, which is the check that the
     * unfolding worked.
     *
     * Eight bars of 6/8 in D, and the climbing third phrase reaches the upper
     * tonic — which is the tune and not an error. The version this replaces
     * jumped an octave where the source does not, judged 2026-08-22.
     */
    difficulty: 'easy',
    metres: [[6, 8]],
    bars: 8,
    events: [
      n(3, 3 / 2), n(2, 3 / 2),
      n(1, 2), r(1),
      n(5, 3 / 2), n(4, 1 / 2), r(1 / 2), n(4, 1 / 2),
      n(3, 1), r(1), n(5, 1),
      n(1, 1, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(6, 1 / 2), n(7, 1 / 2),
      n(1, 1, { octave: 1 }), n(5, 1 / 2), n(5, 1), n(5, 1 / 2),
      n(1, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(1, 1 / 2, { octave: 1 }), n(7, 1 / 2), n(6, 1 / 2), n(7, 1 / 2),
      n(1, 1, { octave: 1 }), n(5, 1 / 2), n(5, 1), n(5, 1 / 2),
    ],
  },
  {
    id: 'trad-alouette',
    name: 'Alouette',
    /* Plain crotchets for two bars and then a stepwise climb, which makes it a
       gentle first meeting with a tune that moves by step rather than by the
       thirds most of this collection walks in. */
    difficulty: 'beginner',
    metres: [[4, 4]],
    bars: 8,
    events: [
      n(1, 1), n(1, 1), n(1, 1), n(2, 1),
      n(3, 1), n(3, 1), n(2, 1), n(1, 1),
      n(2, 1), n(3, 1), n(4, 1), n(3, 1),
      n(2, 2), n(1, 2),
      n(1, 1), n(1, 1), n(1, 1), n(2, 1),
      n(3, 1), n(3, 1), n(2, 1), n(1, 1),
      n(2, 1), n(3, 1), n(2, 1), n(7, 1, { octave: -1 }),
      n(1, 4),
    ],
  },

];
