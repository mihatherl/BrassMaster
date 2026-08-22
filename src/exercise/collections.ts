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
 * **A player chooses one.** Themes asks where its tunes come from — composed
 * from cells, or a named collection — and that is what this list fills.
 *
 * **Material versions per collection.** Accepting a batch of Bach should not
 * restate anything about the forty-seven. See `corpus.ts`, which enforces the
 * digest of every accepted collection separately.
 *
 * ## What still holds the line
 *
 * These reach players, so `unjudged` is the only thing standing between a tune
 * nobody has heard and somebody's practice. Add a theme to a collection and add
 * its id to that set in the same edit, until it has been played to somebody.
 *
 * A theme is offered only in a metre it is written in, which is quieter than it
 * sounds: material in a metre the settings screen does not list is unreachable
 * and looks fine. Nine-eight was added on 2026-08-20 for exactly that reason —
 * two Bach excerpts were sitting here that no combination of settings could
 * ever have served.
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
    name: 'Inbuilt',
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
    name: 'Nursery',
    blurb:
      'Nursery songs, rounds and singalongs, written as degrees so they transpose to any key. They double as a calibration for the ear: nobody has to adjudicate whether Twinkle is a melody, so what they settle is what the written themes’ own "deliberately plain" actually costs.',
    provenance: 'traditional',
    status: 'accepted',
    revision: 4,
    themes: TRADITIONAL,
    /*
     * Empty: the nursery tunes re-read from sources on 2026-08-22 were heard
     * the same day and kept, and the one that was not — Three Blind Mice — was
     * cut rather than kept unheard.
     */
    unjudged: new Set([]),
  },
  {
    id: 'bach',
    name: 'Bach',
    blurb:
      'Bach whole where a brass player can hold it, and in excerpt where they cannot — all six of the Two-Part Inventions complete; the obbligato from Jesu, Joy of Man’s Desiring; the vocal line of Sheep may safely graze; the Air on the G string with its ornaments simplified; the Prelude in C entire, voiced for one instrument; and Petzold’s Menuett in G. Nothing here is cut any more except where the source itself is an excerpt of a longer work. What a complete piece costs is reach rather than notes: it has the range it has, and three of these get as far as the euphonium and the tubas.',
    provenance: 'public-domain',
    status: 'accepted',
    revision: 18,
    themes: BORROWED,
    /*
     * Only the Prelude, and it is not waiting on an ear: it is waiting on
     * divisi (roadmap 1.10), so that its low arpeggio notes can be printed
     * with an alternative a player's own instrument can reach.
     *
     * Everything else here was heard and kept on 2026-08-22 — including
     * Inventions 8 and 10, which had never rendered on the review sheet at all
     * until it learned to draw a theme on an instrument that can take it.
     */
    unjudged: new Set(['bwv846-prelude']),
  },
];

export function collectionById(id: string): Collection | undefined {
  return COLLECTIONS.find((collection) => collection.id === id);
}

/**
 * The themes of every chosen collection, in the order the collections are
 * listed — which is what a medley draws from once more than one may be chosen.
 *
 * An empty choice is not an empty corpus but a different kind of material
 * altogether: no collection means the composer builds tunes from cells, which
 * is what the app did before collections existed. Callers test the length
 * rather than looking for a sentinel id, because "composed" was never a
 * collection and giving it an id made it look like one — a control listing it
 * beside the others invited the question of how many tunes it held, which it
 * has no answer to.
 */
export function themesOf(collectionIds: readonly string[]): readonly Theme[] {
  return COLLECTIONS.filter((collection) => collectionIds.includes(collection.id)).flatMap(
    (collection) => playableThemes(collection),
  );
}

/**
 * A collection's themes minus the ones nobody has heard.
 *
 * **`unjudged` used to be decorative.** Three files said it was what stood
 * between a tune nobody had listened to and somebody's practice, and it was
 * read by the review sheet and by nothing else — so every unheard tune was
 * being handed to players the moment it was written. Found on 2026-08-21 while
 * checking what a deploy would ship, which is exactly one deploy later than it
 * should have been found.
 *
 * The cells had it right all along: a candidate cell is excluded by
 * `selectCells`, so the status does work rather than describing work. This is
 * the same rule, in the one place every player-facing path already goes
 * through — the review sheet still reads `collection.themes` directly, because
 * showing the unheard ones is its entire job.
 */
export function playableThemes(collection: Collection): readonly Theme[] {
  if (!collection.unjudged?.size) return collection.themes;
  return collection.themes.filter((theme) => !collection.unjudged!.has(theme.id));
}

/** Which collection holds a theme, for grouping a list of them by their source. */
export function collectionOf(themeId: string): Collection | undefined {
  return COLLECTIONS.find((collection) =>
    collection.themes.some((theme) => theme.id === themeId),
  );
}

/** A theme by id, from anywhere in the corpus. */
export function themeById(themeId: string): Theme | undefined {
  return collectionOf(themeId)?.themes.find((theme) => theme.id === themeId);
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
