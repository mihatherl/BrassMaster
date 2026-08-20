import { describe, expect, it } from 'vitest';
import { CELLS, type Cell } from './cells';
import { CORPUS_REVISION, corpusDigest, corpusDrift, corpusSummary, shippedCells } from './corpus';

/*
 * The one that does the work.
 *
 * Everything else here checks a property; this one enforces a habit. Editing a
 * cell without bumping the revision fails the build, which is the only reason
 * the hand-set number can be believed — and the message it fails with says
 * exactly what to write, because whoever trips it is mid-edit on something else
 * and should not have to read this file to carry on.
 */
describe('the corpus version', () => {
  it('matches the material it claims to describe', () => {
    expect(corpusDrift()).toBeNull();
  });

  it('counts what a player can be handed, not what the repository holds', () => {
    const summary = corpusSummary();
    expect(summary.cells).toBe(CELLS.filter((cell) => cell.status === 'accepted').length);
    expect(summary.revision).toBe(CORPUS_REVISION);
  });
});

/*
 * Properties of the digest, which decide whether the drift check is any use.
 *
 * A digest that moved when the file was reformatted would cry wolf until the
 * revision stopped meaning anything; one that failed to move on a changed note
 * would let material ship under a number that never described it. Both are
 * worse than having no digest, so both are tested rather than assumed.
 */
describe('the digest', () => {
  const digestOf = (cells: readonly Cell[]) => corpusDigest(cells);
  const sample = (): Cell[] => shippedCells().slice(0, 12).map((cell) => ({ ...cell }));

  it('ignores the order the cells are written in', () => {
    const cells = sample();
    expect(digestOf([...cells].reverse())).toBe(digestOf(cells));
  });

  it('moves when a note changes', () => {
    const cells = sample();
    const altered = cells.map((cell, i) =>
      i === 0
        ? { ...cell, events: cell.events.map((e, j) => (j === 0 ? { ...e, beats: e.beats / 2 } : e)) }
        : cell,
    );
    expect(digestOf(altered)).not.toBe(digestOf(cells));
  });

  it('moves when a cell is added or removed', () => {
    const cells = sample();
    expect(digestOf(cells.slice(1))).not.toBe(digestOf(cells));
  });

  /*
   * Ids are part of the material's identity: `cells.ts` requires that changing
   * the notes changes the id, so that a past review cannot silently attach to
   * music nobody judged. The digest has to agree with that rule.
   */
  it('moves when an id changes', () => {
    const cells = sample();
    expect(digestOf([{ ...cells[0], id: `${cells[0].id}-renamed` }, ...cells.slice(1)])).not.toBe(
      digestOf(cells),
    );
  });

  it('leaves candidates out, since they are not shipped', () => {
    const cells = sample();
    const withCandidate: Cell[] = [
      ...cells,
      { ...cells[0], id: 'test-candidate', status: 'candidate' },
    ];
    expect(digestOf(withCandidate)).toBe(digestOf(cells));
  });
});
