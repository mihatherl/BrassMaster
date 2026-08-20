import { describe, expect, it } from 'vitest';
import { CELLS, cellAsTheme, cellsFor, parseCell, selectCells, type Cell } from './cells';

describe('the corpus as it stands', () => {
  /*
   * This used to assert the corpus was *all* accepted, which was true when the
   * status was introduced and stopped being true the day unreviewed material
   * first arrived — the nine-eight cells, written so that metre could be
   * offered at all. The status now carries real weight rather than none, which
   * is what it was for; what must stay true is that both kinds sit in the tree
   * and only one of them reaches a player.
   */
  it('holds reviewed and unreviewed material side by side', () => {
    expect(CELLS.length).toBeGreaterThan(100);
    expect(CELLS.some((cell) => cell.status === 'accepted')).toBe(true);
    expect(CELLS.some((cell) => cell.status === 'candidate')).toBe(true);
    expect(
      CELLS.every((cell) => cell.status === 'accepted' || cell.status === 'candidate'),
    ).toBe(true);
  });

  /*
   * Ids reach outside this file — onto the review sheet, and one day into a
   * player's record of which cells they have discarded — so two cells sharing
   * one would make a verdict ambiguous and a discard hit the wrong figure.
   */
  it('gives every cell an id of its own', () => {
    expect(new Set(CELLS.map((cell) => cell.id)).size).toBe(CELLS.length);
  });

  it('writes every cell in the metre it claims', () => {
    for (const cell of CELLS) {
      const bar = (cell.metre[0] * 4) / cell.metre[1];
      const total = cell.events.reduce((sum, event) => sum + event.beats, 0);
      expect(Math.abs(total - bar)).toBeLessThan(1e-9);
    }
  });
});

describe('what reaches a player', () => {
  const candidate: Cell = {
    id: 'test-candidate',
    metre: [4, 4],
    role: 'open',
    level: 'beginner',
    status: 'candidate',
    events: parseCell('0q 1q 2q 1q'),
  };

  /*
   * The whole point of the status: unreviewed material can sit in the tree, and
   * on the review sheet, without ever being composed into somebody's practice.
   */
  it('hands out accepted cells only', () => {
    const offered = cellsFor([4, 4], 'hard');
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((cell) => cell.status === 'accepted')).toBe(true);
  });

  it('leaves a candidate out, whatever else it would have matched', () => {
    const accepted: Cell = { ...candidate, id: 'test-accepted', status: 'accepted' };
    const offered = selectCells([candidate, accepted], [4, 4], 'hard');
    expect(offered.map((cell) => cell.id)).toEqual(['test-accepted']);
  });

  it('still keeps a level from reaching above itself', () => {
    for (const cell of cellsFor([4, 4], 'beginner')) expect(cell.level).toBe('beginner');
  });
});

describe('a cell on its own, for looking at', () => {
  it('turns steps from an anchor into degrees of the scale', () => {
    const events = cellAsTheme(
      { ...({} as Cell), events: parseCell('0q 1q 2q 3q') },
      0,
    ).events;
    expect(events.map((event) => ('degree' in event ? event.degree : 0))).toEqual([1, 2, 3, 4]);
  });

  it('carries a step past the octave into an octave of its own', () => {
    const [event] = cellAsTheme({ ...({} as Cell), events: parseCell('7w') }, 0).events;
    expect(event).toMatchObject({ degree: 1, octave: 1 });
  });

  it('reads a step below the anchor as the octave beneath', () => {
    const [event] = cellAsTheme({ ...({} as Cell), events: parseCell('-1w') }, 0).events;
    expect(event).toMatchObject({ degree: 7, octave: -1 });
  });

  it('keeps rests as rests', () => {
    const [event] = cellAsTheme({ ...({} as Cell), events: parseCell('rw') }, 0).events;
    expect(event).toEqual({ rest: true, beats: 4 });
  });

  /*
   * The sheet is not a claim about where the composer will place a cell — what
   * a reviewer judges is the shape, and the shape is the same wherever it
   * starts. This says so in the one way a test can: the intervals hold.
   */
  it('keeps the shape whatever it is anchored on', () => {
    const shape = (anchor: number) =>
      cellAsTheme({ ...({} as Cell), events: parseCell('0q 2q 4q 2q') }, anchor).events.map(
        (event) => ('degree' in event ? event.degree + (event.octave ?? 0) * 7 : null),
      );
    const low = shape(0);
    const high = shape(3);
    expect(high.map((n, i) => (n ?? 0) - (low[i] ?? 0))).toEqual([3, 3, 3, 3]);
  });
});
