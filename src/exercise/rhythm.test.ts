// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  barsFromGrid,
  CUSTOM_RHYTHMS_KEY,
  deleteCustomRhythm,
  gridCount,
  gridFromBars,
  loadCustomRhythms,
  resolveRhythmPattern,
  saveCustomRhythm,
  type GridCell,
  type RhythmPattern,
} from './rhythm';
import {
  patternEvents,
  RHYTHM_PATTERNS,
  rhythmPatternById,
  syllableFor,
  syllablesFor,
} from './rhythm';
import { parseCell } from './cells';
import { metreFor } from '../domain/metre';

/**
 * The rhythm mode's pure core, tested the way `cells.ts` is: the library
 * must be playable data, and the mapping must be the one truth both the
 * page and (when the clips exist) the voice read from.
 */

describe('the counting mapping', () => {
  it('speaks the beat numbers on the beats', () => {
    expect(syllableFor(0)).toBe('1');
    expect(syllableFor(1)).toBe('2');
    expect(syllableFor(2)).toBe('3');
    expect(syllableFor(3)).toBe('4');
    expect(syllableFor(4)).toBe('5');
    expect(syllableFor(5)).toBe('6');
  });

  it('says nothing past six, because the clip set stops there', () => {
    // 1–6 covers every metre the app writes; silence beats a false syllable.
    expect(syllableFor(6)).toBeNull();
  });

  it('divides the beat as one-e-and-a', () => {
    expect(syllableFor(0.25)).toBe('e');
    expect(syllableFor(0.5)).toBe('and');
    expect(syllableFor(0.75)).toBe('a');
    expect(syllableFor(2.5)).toBe('and');
  });

  it('speaks triplets as trip-let, surviving float arithmetic', () => {
    // A third arrives as 0.3333…, accumulated — it must still be "trip".
    expect(syllableFor(1 / 3)).toBe('trip');
    expect(syllableFor(2 / 3)).toBe('let');
    expect(syllableFor(1 + 1 / 3 + 1e-9)).toBe('trip');
    let beat = 0;
    for (const step of [1 / 3, 1 / 3, 1 / 3]) beat += step;
    expect(syllableFor(beat)).toBe('2');
  });

  it('annotates a bar, with silence over the rests', () => {
    // 0q re 0e 0q. 0e — onsets at 0, (rest), 1.5, 2 and 3.5: the dotted
    // crotchet pushes its quaver to the "and" of four.
    expect(syllablesFor(parseCell('0q re 0e 0q. 0e'))).toEqual(['1', null, 'and', '3', 'and']);
    // And the "a" itself: semiquavers after a dotted crotchet sit at the
    // "and" and "a" of two.
    expect(syllablesFor(parseCell('0q. 0s 0s 0h'))).toEqual(['1', 'and', 'a', '3']);
  });
});

describe('the pattern library', () => {
  it('holds only bars that fill their own metre exactly', () => {
    /*
     * The builder-side guarantee the rhythm-first cell editor will later
     * make unreachable, enforced here as data validation: a pattern whose
     * bar does not add up would drift the count against the metronome.
     */
    for (const pattern of RHYTHM_PATTERNS) {
      const barBeats = metreFor(pattern.metre[0], pattern.metre[1]).barBeats;
      for (const [index, events] of patternEvents(pattern).entries()) {
        const total = events.reduce((sum, event) => sum + event.beats, 0);
        expect(total, `${pattern.id} bar ${index + 1}`).toBeCloseTo(barBeats, 9);
      }
    }
  });

  it('gives every onset the mapping can name a syllable', () => {
    // The library is written for the counting system that ships: a pattern
    // whose note the voice cannot count does not belong in these stages.
    for (const pattern of RHYTHM_PATTERNS) {
      for (const events of patternEvents(pattern)) {
        const spoken = syllablesFor(events);
        events.forEach((event, index) => {
          if (!event.rest) {
            expect(spoken[index], `${pattern.id} note ${index + 1}`).not.toBeNull();
          }
        });
      }
    }
  });

  it('never repeats an id, because verdicts will be recorded against them', () => {
    const ids = RHYTHM_PATTERNS.map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the first pattern for an id it does not know', () => {
    expect(rhythmPatternById('no-such-pattern')).toBe(RHYTHM_PATTERNS[0]);
    expect(rhythmPatternById('dotted-pair').name).toBe('Dotted pairs');
  });

  it('keeps the spine ordered: every stage that appears is reachable from 1', () => {
    const stages = new Set(RHYTHM_PATTERNS.map((pattern) => pattern.stage));
    const highest = Math.max(...stages);
    for (let stage = 1; stage <= highest; stage++) {
      expect(stages.has(stage as never), `stage ${stage} has no patterns`).toBe(true);
    }
  });
});

describe('the grid, engraved', () => {
  /*
   * The heart of the annotation tool: what the player paints against what
   * the page prints. The governing ruling (2026-09-01) is SHOW THE BEAT,
   * WITH TIES — splits at every beat boundary, mergers only where the
   * table in `mergedLength` names them — so each case here is one row of
   * that ruling made concrete. `x` attacks, `-` holds, `.` rests.
   */
  const grid = (drawn: string): GridCell[] =>
    [...drawn.replace(/\s/g, '')].map((c) => (c === 'x' ? 'attack' : c === '-' ? 'hold' : 'rest'));
  const engrave = (drawn: string, metre: [number, number] = [4, 4]) => {
    const verdict = barsFromGrid(grid(drawn), metre);
    if ('error' in verdict) throw new Error(verdict.error);
    return verdict.bars;
  };

  it('writes the plain figures as themselves', () => {
    expect(engrave('x---x---x---x---')).toEqual(['0q 0q 0q 0q']);
    expect(engrave('x---------------')).toEqual(['0w']);
    expect(engrave('x-------x-------')).toEqual(['0h 0h']);
    expect(engrave('x-----x-x-----x-')).toEqual(['0q. 0e 0q. 0e']);
    expect(engrave('x-x-x-x-x-x-x-x-')).toEqual(['0e 0e 0e 0e 0e 0e 0e 0e']);
    expect(engrave('x--- x--- x---', [3, 4])).toEqual(['0q 0q 0q']);
    expect(engrave('x--- ---- ----', [3, 4])).toEqual(['0h.']);
  });

  it('ties across the beat rather than writing the syncopation shorthand', () => {
    // A crotchet-length note from the "&" of one: two tied quavers, never
    // the off-beat crotchet — the strict half of the ruling.
    expect(engrave('x-x---x-x---x---')).toEqual(['0e 0e~ 0e 0e 0q 0q']);
  });

  it('ties across the bar line, which the chip editor never could', () => {
    expect(engrave('x---x---x---x--- --x-x---x---x---')).toEqual([
      '0q 0q 0q 0q~',
      '0e 0e 0q 0q 0q',
    ]);
  });

  it('permits the named mergers and no others', () => {
    // The half-bar minim from either half of 4/4…
    expect(engrave('x-------x---x---')).toEqual(['0h 0q 0q']);
    expect(engrave('x---x---x-------')).toEqual(['0q 0q 0h']);
    // …but never from beat two, which would hide the middle of the bar.
    expect(engrave('x---x-------x---')).toEqual(['0q 0q~ 0q 0q']);
    // The minim reads clean from either lower beat of 3/4.
    expect(engrave('x-------x---', [3, 4])).toEqual(['0h 0q']);
    expect(engrave('x---x-------', [3, 4])).toEqual(['0q 0h']);
    // The dotted crotchet may not carry across 4/4's half-bar.
    expect(engrave('x---x-----x-x---')).toEqual(['0q 0q~ 0e 0e 0q']);
  });

  it('writes rests per beat, largest first, never tied', () => {
    expect(engrave('x---..x-........')).toEqual(['0q re 0e rh']);
    expect(engrave('..x-..x-..x-..x-')).toEqual(['re 0e re 0e re 0e re 0e']);
    // A whole silent bar mid-pattern is the bar-rest convention, per metre.
    expect(engrave('x--------------- ---------------- x---------------')).toEqual([
      '0w~', '0w', '0w',
    ]);
    expect(engrave('x---x---x---x--- ................ x---x---x---x---')).toEqual([
      '0q 0q 0q 0q', 'rw', '0q 0q 0q 0q',
    ]);
  });

  it('refuses an empty grid and one that opens mid-note, by name', () => {
    expect(barsFromGrid(grid('................'), [4, 4])).toHaveProperty('error');
    const midNote = barsFromGrid(grid('----x-----------'), [4, 4]);
    expect('error' in midNote && midNote.error).toContain('start with an attack');
  });

  it('round-trips: what the grid engraves reads back as the same grid', () => {
    for (const drawn of [
      'x---x---x---x---',
      'x-----x-x-----x-',
      'x-x---x-x---x---',
      '..x-..x-..x-..x-',
      'x---x---x---x--- --x-x---x---x---',
    ]) {
      const bars = engrave(drawn);
      expect(gridFromBars(bars), drawn).toEqual(grid(drawn));
    }
  });

  it('loads every straight packaged pattern and declines the triplet grammar', () => {
    for (const pattern of RHYTHM_PATTERNS) {
      const cells = gridFromBars(pattern.bars);
      // Everything in stages 1–4 is straight; a triplet stage would be null.
      expect(cells, pattern.id).not.toBeNull();
      const back = barsFromGrid(cells!, pattern.metre);
      expect('bars' in back, pattern.id).toBe(true);
    }
    expect(gridFromBars(['0t 1t 2t 0q 0q 0q'])).toBeNull();
  });

  it('prints the count over the columns from the one mapping', () => {
    expect(gridCount([4, 4])).toEqual([
      '1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a',
    ]);
    expect(gridCount([3, 4]).slice(0, 4)).toEqual(['1', 'e', '&', 'a']);
  });
});

describe('the player’s own shelf', () => {
  it('saves, resolves ahead of the library, edits in place and deletes', () => {
    localStorage.clear();
    const own: RhythmPattern = {
      id: 'custom-mine', name: 'Mine', metre: [3, 4], stage: 1, bars: ['0q 0q 0q'],
    };
    saveCustomRhythm(own);
    expect(resolveRhythmPattern('custom-mine').name).toBe('Mine');
    saveCustomRhythm({ ...own, bars: ['0h 0q'] });
    expect(loadCustomRhythms()).toHaveLength(1);
    expect(resolveRhythmPattern('custom-mine').bars).toEqual(['0h 0q']);
    deleteCustomRhythm('custom-mine');
    // Gone, and the resolver falls back to the library's grace.
    expect(resolveRhythmPattern('custom-mine')).toBe(RHYTHM_PATTERNS[0]);
  });

  it('survives a mangled store rather than crashing the settings screen', () => {
    localStorage.setItem(CUSTOM_RHYTHMS_KEY, '{not json');
    expect(loadCustomRhythms()).toEqual([]);
    localStorage.setItem(CUSTOM_RHYTHMS_KEY, JSON.stringify([{ id: 42 }, null, 'x']));
    expect(loadCustomRhythms()).toEqual([]);
  });
});
