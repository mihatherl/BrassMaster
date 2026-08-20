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
 * What a **player is handed** — the accepted cells, from which `compose.ts`
 * builds every tune. Deliberately not the review corpora: `themes.ts`,
 * `tunes-traditional.ts` and `tunes-borrowed.ts` are not imported by the app at
 * all and never enter a bundle, so counting them would make the number describe
 * the repository rather than the build. A candidate is not material until it
 * has been heard and accepted, and this number is a claim about what shipped.
 */

import { CELLS, type Cell } from './cells';

/**
 * Bumped when accepted material changes. Record the new digest below.
 *
 * Independent of the product version on purpose — see the note above.
 */
export const CORPUS_REVISION = 1;

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
}

export function corpusSummary(): CorpusSummary {
  return { revision: CORPUS_REVISION, cells: shippedCells().length, digest: corpusDigest() };
}

/**
 * Why the revision and the material disagree, or null when they agree.
 *
 * Returns a sentence rather than a boolean because the fix is not obvious from
 * a failure: whoever trips this is mid-edit on a cell and needs telling which
 * number to bump and what to write beside it.
 */
export function corpusDrift(): string | null {
  const recorded = RECORDED[CORPUS_REVISION];
  const digest = corpusDigest();
  if (recorded === undefined) {
    return `corpus revision ${CORPUS_REVISION} has no recorded digest — add \`${CORPUS_REVISION}: '${digest}'\` to RECORDED in corpus.ts`;
  }
  if (recorded !== digest) {
    return `the accepted cells have changed (digest ${digest}, but revision ${CORPUS_REVISION} recorded ${recorded}) — bump CORPUS_REVISION to ${CORPUS_REVISION + 1} and add \`${CORPUS_REVISION + 1}: '${digest}'\` to RECORDED in corpus.ts`;
  }
  return null;
}
