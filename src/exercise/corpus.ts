/*
 * The corpus has its own version, and it is not the product's.
 *
 * Raised 2026-08-19: *"I'm wondering how we can separate out material from a
 * versioning of the code itself. I can actually see a fairly long road where we
 * iteratively expand and improve the themes... But I find this unusual that
 * doing this would run the versioning of the product upward in itself."*
 *
 * That is the right instinct. A release number is a promise about behaviour —
 * what the app *does*, what a player must relearn, what a bug report refers to.
 * Adding eight cells changes none of that. It changes what a player is handed,
 * which matters just as much and is a different axis entirely, so it gets a
 * different number. `2.27.0 · corpus 1` says both things without either
 * pretending to be the other.
 *
 * ## Two numbers, because one of them cannot be trusted alone
 *
 * `CORPUS_REVISION` is set by hand: it is the number a person cites, bumped
 * when a batch of material is accepted. A hand-set number drifts — someone
 * edits a cell and forgets — and a version that silently lies about its
 * contents is worse than no version, because it is believed.
 *
 * So each revision records the digest of the material it described, and
 * `corpusDrift` reports a mismatch. The check runs in the test suite, which
 * means material cannot change without the number moving: the edit itself
 * fails the build until the revision is bumped and its digest recorded. The
 * hand-set number stays human, and the derived one keeps it honest.
 *
 * ## What counts as the corpus
 *
 * Two things, counted separately, because they are versioned for different
 * reasons.
 *
 * `CORPUS_REVISION` counts the **accepted cells**, from which `compose.ts`
 * builds a tune on the spot. Candidates are excluded: a candidate is under
 * review, where churn is the whole activity and pinning it would be friction
 * with no reader.
 *
 * `RECORDED_COLLECTIONS` counts each **named collection** of written themes.
 * They used to be review-only, which made a single number for "the corpus"
 * sensible; since 2026-08-20 a player can choose one, and a collection now
 * moves on its own — accepting a batch of Bach must not restate anything about
 * the forty-seven.
 */

import { CELLS, type Cell } from './cells';
import { COLLECTIONS, type Collection } from './collections';
import { isRest, type Theme } from './theme';

/**
 * Bumped when accepted material changes. Record the new digest below.
 *
 * Independent of the product version on purpose — see the note above.
 */
export const CORPUS_REVISION = 2;

/**
 * The digest each revision described.
 *
 * History, not configuration: entries are added, never edited. An edited entry
 * would make a past revision describe material it never contained, which is the
 * exact failure this file exists to prevent.
 */
const RECORDED: Readonly<Record<number, string>> = {
  // 157 accepted cells, the corpus as it stood when the number was introduced.
  1: '19f9a62f',
  // 194: the thirty-seven nine-eight cells, heard and accepted 2026-08-20.
  2: '5f18741f',
};

/**
 * The same, per named collection, keyed `<id>@<revision>`.
 *
 * Kept separate from the cells so that accepting a batch of Bach restates
 * nothing about the forty-seven — which is the point of chunking the corpus at
 * all. Only `accepted` collections appear: a candidate is under review, where
 * churn is the whole activity and pinning it would be friction with no reader.
 */
const RECORDED_COLLECTIONS: Readonly<Record<string, string>> = {
  'default@1': 'e1dc294e', // 36 kept of the forty-seven
  'traditional@1': 'e0d7777b', // 12 nursery songs and rounds
  'traditional@2': '3ea333c2', // and eight more, aimed at beginner and the empty metres
  'bach@1': '90398ba7', // 2 fugue subjects, 2 converted excerpts
  'bach@2': '4c8c8104', // and four of the Two-Part Inventions
  'bach@3': 'bd73b4e2', // and Invention 10, once nine-eight existed to hold it
  'bach@4': 'facf8d92', // and Sheep may safely graze, chosen for being known
  'bach@5': '1b618b26', // Sheep recut to ten bars on the ear, and easy with it
  'bach@6': '00c5f144', // and the Air, ornaments simplified — an arrangement
  'bach@7': '8092ccf8', // and every sourced theme carrying the tempo it was read at
  'bach@8': '31851769', // and the inventions brought from keyboard speed to brass
  'bach@9': '5b6fc0c7', // and the Prelude in C, an arpeggio study rather than a tune
  'bach@10': '283d5def', // Prelude recut to bar 19, where the harmony resolves
  'bach@11': '9a169a34', // Prelude taken with both hands, leaping wider than the cap
  'bach@12': 'aeb8995d', // and Petzold's Menuett in G, complete and at medium
  'bach@13': '16621949', // the subjects withdrawn; four excerpts taken whole
};

/*
 * FNV-1a, because this is an identity check and not a security one.
 *
 * Nothing here defends against an adversary editing a cell and forging a
 * digest — a repository has git for that. What it must do is change reliably
 * when the music changes, and be computable in the browser with no dependency
 * and no measurable cost at startup.
 */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/*
 * Canonical, so the digest describes the music rather than the file.
 *
 * Sorted by id and written field by field: reordering the cells in the source,
 * or reformatting it, must not read as a change to the corpus, because neither
 * changes a single thing a player is handed.
 */
function canonical(cells: readonly Cell[]): string {
  return [...cells]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((cell) => {
      const events = cell.events
        .map((event) => `${event.rest ? 'r' : event.step}:${event.beats}${event.tied ? '~' : ''}`)
        .join(',');
      return `${cell.id}|${cell.metre[0]}/${cell.metre[1]}|${cell.role}|${cell.level}|${events}`;
    })
    .join('\n');
}

/*
 * The same treatment for themes.
 *
 * Written out field by field rather than JSON-stringified, because the shape of
 * a `Theme` is not the material: adding an optional field nobody uses, or
 * reordering the interface, must not read as every collection changing at once.
 */
function canonicalThemes(themes: readonly Theme[]): string {
  return [...themes]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((theme) => {
      const events = theme.events
        .map((event) =>
          isRest(event)
            ? `r:${event.beats}`
            : `${event.degree}${event.alter ? `${event.alter > 0 ? '+' : ''}${event.alter}` : ''}` +
              `${event.octave ? `^${event.octave}` : ''}:${event.beats}${event.tied ? '~' : ''}`,
        )
        .join(',');
      const metres = theme.metres.map(([n, d]) => `${n}/${d}`).join('&');
      const keys = (theme.keyChanges ?? [])
        .map((change) => `${change.atBar}:${change.fifths}`)
        .join(';');
      /* Tempo appended only where a theme has one, so adding the field left
         every collection that has none exactly where it was — and a tempo is
         material, since it is half of what a difficulty level now means. */
      const speed = theme.tempo ? `|${theme.tempo}` : '';
      /* A waived rule is part of what the material *is*, so it moves the
         digest — otherwise a theme could gain an exemption unremarked. */
      const waived = theme.allowWideLeaps ? '|wide' : '';
      return `${theme.id}|${theme.difficulty}|${theme.mode ?? 'major'}|${metres}|${theme.bars}|${events}|${keys}${speed}${waived}`;
    })
    .join('\n');
}

/** A digest of one collection's material. */
export function collectionDigest(collection: Collection): string {
  return fnv1a(canonicalThemes(collection.themes));
}

/**
 * The cells a player can actually be handed.
 *
 * Takes the corpus as an argument, defaulting to the real one, so that the
 * properties of the digest can be tested on material chosen to exercise them.
 * Without that seam a test has to either mutate the exported corpus or
 * re-implement the hash, and a test that re-implements the thing it checks can
 * only ever agree with itself.
 */
export function shippedCells(cells: readonly Cell[] = CELLS): readonly Cell[] {
  return cells.filter((cell) => cell.status === 'accepted');
}

/** A digest of the shipped material, stable across reordering and reformatting. */
export function corpusDigest(cells: readonly Cell[] = CELLS): string {
  return fnv1a(canonical(shippedCells(cells)));
}

export interface CorpusSummary {
  revision: number;
  cells: number;
  digest: string;
  /** Every named collection, whether or not it ships. */
  collections: ReadonlyArray<{ id: string; revision: number; themes: number; digest: string }>;
}

export function corpusSummary(): CorpusSummary {
  return {
    revision: CORPUS_REVISION,
    cells: shippedCells().length,
    digest: corpusDigest(),
    collections: COLLECTIONS.map((collection) => ({
      id: collection.id,
      revision: collection.revision,
      themes: collection.themes.length,
      digest: collectionDigest(collection),
    })),
  };
}

/**
 * Everywhere a recorded revision and the material it names disagree.
 *
 * Sentences rather than booleans because the fix is not obvious from a failure:
 * whoever trips this is mid-edit on a cell or a tune and needs telling which
 * number to bump and what to write beside it, without reading this file.
 *
 * A list rather than the first problem, because the collections are independent
 * — finding out about one changed collection per run would make accepting a
 * batch across two of them a guessing game.
 */
export function corpusDrift(): string[] {
  const problems: string[] = [];

  const recorded = RECORDED[CORPUS_REVISION];
  const digest = corpusDigest();
  if (recorded === undefined) {
    problems.push(
      `corpus revision ${CORPUS_REVISION} has no recorded digest — add \`${CORPUS_REVISION}: '${digest}'\` to RECORDED in corpus.ts`,
    );
  } else if (recorded !== digest) {
    problems.push(
      `the accepted cells have changed (digest ${digest}, but revision ${CORPUS_REVISION} recorded ${recorded}) — bump CORPUS_REVISION to ${CORPUS_REVISION + 1} and add \`${CORPUS_REVISION + 1}: '${digest}'\` to RECORDED in corpus.ts`,
    );
  }

  for (const collection of COLLECTIONS) {
    // Candidates are under review, where churn is the activity itself.
    if (collection.status !== 'accepted') continue;
    const key = `${collection.id}@${collection.revision}`;
    const held = RECORDED_COLLECTIONS[key];
    const now = collectionDigest(collection);
    if (held === undefined) {
      problems.push(
        `collection '${collection.id}' revision ${collection.revision} has no recorded digest — add \`'${key}': '${now}'\` to RECORDED_COLLECTIONS in corpus.ts`,
      );
    } else if (held !== now) {
      const next = collection.revision + 1;
      problems.push(
        `collection '${collection.id}' has changed (digest ${now}, but revision ${collection.revision} recorded ${held}) — set its revision to ${next} in collections.ts and add \`'${collection.id}@${next}': '${now}'\` to RECORDED_COLLECTIONS in corpus.ts`,
      );
    }
  }

  return problems;
}
