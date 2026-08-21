/*
 * Bach's chorales: complete pieces, and the collection built to change the
 * corpus's shape rather than its ceiling.
 *
 * Chosen 2026-08-21 against a measured gap. The corpus had grown shaped like
 * the interests of the people building it — hard outnumbering beginner two to
 * one, because Bach's inventions are interesting to source and hymn tunes are
 * not. Chorales invert that at no cost to quality: their soprano lines are
 * complete hymn tunes of eight to twenty bars, mostly crotchets and minims,
 * stepwise, ending on a real cadence. They land at **easy**, which is where
 * the corpus is thinnest, and they are whole pieces rather than excerpts,
 * which is the other thing that was asked for.
 *
 * They are also core brass band repertoire. A band plays hymn tunes every week
 * and reads them at sight constantly; nothing else in the corpus is as close
 * to what these players actually do.
 *
 * ## Where the notes came from, and the wall behind them
 *
 * Read by `tools/midi-to-theme.mts` from Mutopia files marked **Public
 * Domain**, converted whole. The soprano is recovered by the converter's own
 * rule that the highest note wins where voices overlap — these files are
 * keyboard reductions, so the top line of the right hand *is* the chorale
 * melody.
 *
 * **There are only two of them, and that is a sourcing wall rather than a
 * choice.** Six routes to the 371 chorales were tried on 2026-08-21 and every
 * one is blocked: Mutopia holds five, of which three are CC BY-SA and unusable
 * in a sold app; IMSLP and CPDL both answer automated requests with a bot
 * check; the Internet Archive's copy is page scans; KernScores is CCARH, whose
 * terms this project already refuses; and the one bulk MIDI repository carries
 * no licence at all. See `docs/roadmap.md` for the decision that follows.
 *
 * ## Copyright
 *
 * The melodies are older than Bach's harmonisations of them — Lutheran hymn
 * tunes, mostly sixteenth century and anonymous — and what is taken here is
 * the melody as scale degrees. That is the composition, which is a public
 * domain fact, and never an engraver's edition of it.
 */

import type { Theme } from './theme';

/** A note of `beats` on `degree`, with the options a chorale needs. */
function n(
  degree: number,
  beats: number,
  extra: { alter?: number; octave?: number; tied?: boolean } = {},
) {
  return { degree, beats, ...extra };
}

/** A rest of `beats`. Chorales breathe between phrases. */
function r(beats: number) {
  return { rest: true as const, beats };
}

export const CHORALES: readonly Theme[] = [
{
    id: 'chorale-bwv269',
    name: 'Aus meines Herzens Grunde',
    /*
     * BWV 269, complete — twenty-one bars in three-four, ending where Bach
     * ended it. Crotchets and minims almost throughout, which is why a chorale
     * lands at easy where an invention lands at hard: the difficulty of a
     * chorale is in the tuning and the breathing, not in the reading.
     *
     * It carries the collection's first ties *inside* a bar, which is what
     * that work was for — a chorale holds a note through a fermata constantly
     * and no single value writes the result.
     */
    difficulty: 'easy',
    metres: [[3, 4]],
    bars: 21,
    events: [
      n(1, 1), n(1, 2),
      n(5, 1), n(3, 3 / 2), n(2, 1 / 2),
      n(1, 1), n(1, 3 / 2), n(2, 1 / 2),
      n(3, 1), n(2, 2),
      n(3, 1), n(5, 2),
      n(4, 1), n(3, 1), n(2, 1, { tied: true }),
      n(2, 1), n(1, 2),
      n(3, 1), n(3, 1), n(4, 1),
      n(5, 1), n(5, 3 / 2), n(4, 1 / 2),
      n(3, 1), n(2, 2),
      n(1, 1), n(3, 2),
      n(4, 1), n(5, 2),
      n(4, 1), n(3, 2, { tied: true }),
      n(3, 1), n(1, 2),
      n(3, 1), n(5, 2),
      n(4, 1), n(3, 2),
      n(2, 1), n(1, 3 / 2), n(2, 1 / 2),
      n(3, 1), n(2, 2),
      n(3, 1), n(5, 2),
      n(4, 1), n(3, 1), n(2, 1, { tied: true }),
      n(2, 1), n(1, 2),
    ],
  },
{
    id: 'chorale-bwv347',
    name: 'Ich dank dir, lieber Herre',
    /*
     * BWV 347, complete — thirteen bars in A major, the sharpest key in the
     * corpus, which is most of what makes it harder to read than its rhythm
     * suggests. Validates at easy, medium and hard; taken at easy, because
     * what it actually asks of a reader is the key signature.
     */
    difficulty: 'easy',
    metres: [[4, 4]],
    bars: 13,
    events: [
      n(1, 1), n(1, 1), n(1, 1), n(1, 1),
      n(2, 1), n(7, 1, { alter: -1, octave: -1 }), n(6, 1, { octave: -1 }), n(5, 1, { octave: -1 }),
      n(2, 1), n(3, 1), n(2, 1), n(1, 1),
      n(7, 1 / 2, { octave: -1 }), n(6, 1 / 2, { octave: -1 }), n(7, 1, { octave: -1 }), n(6, 1, { octave: -1 }), n(5, 1, { octave: -1 }),
      n(5, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1), n(1, 1 / 2), n(2, 1 / 2), n(3, 1), n(2, 1),
      n(3, 1), n(4, 1), n(3, 1), n(2, 1),
      n(1, 1, { alter: 1 }), n(2, 3),
      n(5, 1, { octave: -1 }), n(1, 1), n(2, 1), n(3, 1),
      n(4, 1), n(5, 1), n(4, 1 / 2), n(3, 1 / 2), n(2, 1),
      n(4, 1), n(3, 1), n(2, 1), n(5, 1, { tied: true }),
      n(5, 1 / 2), n(4, 1 / 2), n(3, 1 / 2), n(2, 1 / 2), n(2, 1 / 2), r(1 / 2), n(3, 1),
      n(2, 1), n(1, 3),
    ],
  },
];
