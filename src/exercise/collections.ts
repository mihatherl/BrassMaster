/*
 * The corpus is not one thing. It is collections, and they are named.
 *
 * Asked for 2026-08-20: *"I really think we need to chunk up the corpuses to
 * have the 'Bach corpus', 'carols corpus', 'default corpus (ie the 47)'."*
 *
 * The grouping was already there and only lived in the review tool, where the
 * sheet printed four hand-written headings. Moving it here makes it the thing
 * it always was — a property of the material — and buys three things a heading
 * in a tool never could.
 *
 * **Provenance travels with the music.** Where a tune came from, and what may
 * be done with it, is a fact about the collection rather than about any tune in
 * it: Bach is out of copyright because Bach is out of copyright. That matters
 * because a *sold* app cannot carry everything a free one can — the Mutopia
 * inventions are eleven plain public domain and four CC BY-SA, and the
 * generator's models are trained on a corpus that forbids commercial use. A
 * collection marked `restricted` is one a paid build must not ship, and
 * `collections.test.ts` enforces it rather than trusting anyone to remember.
 *
 * **A player could one day choose one.** "Practise the carols" in December is a
 * feature that needs collections to exist before it can be built. Nothing
 * player-facing depends on this yet — see the note on shipping below.
 *
 * **Material versions per collection.** Accepting a batch of Bach should not
 * restate anything about the forty-seven. See `corpus.ts`, which enforces the
 * digest of every accepted collection separately.
 *
 * ## Nothing here ships yet
 *
 * The app composes its tunes from the cells in `cells.ts`, and imports none of
 * these. That is the current design, not an oversight, but it does mean
 * approved material has nowhere to go — a question worth settling deliberately
 * rather than by drift. Until it is settled, these exist to be reviewed and to
 * carry their provenance.
 */

import type { Theme } from './theme';
import { THEMES, UNJUDGED as THEMES_UNJUDGED } from './themes';
import { TRADITIONAL } from './tunes-traditional';
import { BORROWED } from './tunes-borrowed';

/**
 * Where the music came from, and what may be done with it.
 *
 * The distinction that earns its keep is the last one. The others are all
 * "safe to sell" by different routes; `restricted` is the one that has to stop
 * a build, and naming the route matters because the reasons expire differently
 * — a copyright lapses, a licence does not.
 */
export type Provenance =
  /** Written for Brass Master. Ours to sell. */
  | 'original'
  /** The composer is long dead and the notes are facts, however they were read. */
  | 'public-domain'
  /** No known author or claimant — nursery songs, folk tunes, carols. */
  | 'traditional'
  /** Carries a licence a sold app cannot honour. Free builds only, if at all. */
  | 'restricted';

export interface Collection {
  id: string;
  name: string;
  blurb: string;
  provenance: Provenance;
  /**
   * Whether the material has been through the ear.
   *
   * `accepted` means heard and approved, and pins the collection's digest in
   * `corpus.ts` so it cannot then change unremarked. `candidate` means still
   * under review, where churn is the point and pinning would only be friction.
   */
  status: 'accepted' | 'candidate';
  /** Bumped when an accepted collection's material changes. See `corpus.ts`. */
  revision: number;
  themes: readonly Theme[];
  /** Ids within an accepted collection that have not themselves been heard. */
  unjudged?: ReadonlySet<string>;
}

export const COLLECTIONS: readonly Collection[] = [
  {
    id: 'default',
    name: 'The written themes',
    blurb:
      'Written for the app rather than borrowed. What survived the review of 2026-08-20 — eleven of the forty-seven were cut, and are kept in themes.ts rather than deleted so a verdict can be revisited.',
    provenance: 'original',
    status: 'accepted',
    revision: 1,
    themes: THEMES,
    unjudged: THEMES_UNJUDGED,
  },
  {
    id: 'traditional',
    name: 'Traditional tunes',
    blurb:
      'Nursery songs and rounds, written as degrees so they transpose to any key. They double as a calibration for the ear: nobody has to adjudicate whether Twinkle is a melody, so what they settle is what the written themes’ own "deliberately plain" actually costs.',
    provenance: 'traditional',
    status: 'accepted',
    revision: 1,
    themes: TRADITIONAL,
  },
  {
    id: 'bach',
    name: 'Bach',
    blurb:
      'Two fugue subjects and two converted excerpts. A subject is a theme in the technical sense — short, self-contained, built to be recognised when it returns — which is why the canon is the shortest route to material that is genuinely hard and still a tune.',
    provenance: 'public-domain',
    status: 'accepted',
    revision: 1,
    themes: BORROWED,
    /*
     * The two subjects predate the converter and were written from memory, so
     * they have not had the scrutiny the converted pair has. Approved by ear
     * 2026-08-20: *"The two Bach themes are great"* — which was said of
     * `bwv779-invention` and `jesu-joy`, and should not be read as covering
     * these two.
     */
    unjudged: new Set(['bwv1080-subject', 'bwv1079-royal']),
  },
];

export function collectionById(id: string): Collection | undefined {
  return COLLECTIONS.find((collection) => collection.id === id);
}

/**
 * Collections a paid build may carry.
 *
 * Separate from `status` on purpose: being approved by ear and being licensed
 * to sell are different questions, and material can pass one and fail the other.
 */
export function sellableCollections(): readonly Collection[] {
  return COLLECTIONS.filter((collection) => collection.provenance !== 'restricted');
}
