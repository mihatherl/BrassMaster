// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  barsFromGrid,
  countableSyllable,
  previewExerciseFromBars,
  syllablesForBars,
  beatCountLabels,
  CUSTOM_RHYTHMS_KEY,
  deleteCustomRhythm,
  gridFromBars,
  loadCustomRhythms,
  resolveRhythmPattern,
  saveCustomRhythm,
  type GridBeat,
  type GridCell,
  type GridDivision,
  attackIndexByNote,
  attackOnsets,
  cellAsTheme,
  cellFitsKeys,
  CELLS_KEY,
  deleteCell,
  inflectedNote,
  loadCells,
  movedNote,
  walkSteps,
  randomNotesFor,
  reconcileNotes,
  saveCell,
  type AuthoredCell,
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
import { instrumentById } from '../domain/instruments';

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
   * The heart of the annotation tool, per-beat since 2026-09-01: what
   * the player paints against what the page prints, under SHOW THE
   * BEAT, WITH TIES. In the drawings below, beats are space-separated
   * groups: four marks is a division-4 beat (1-e-&-a), three marks a
   * triplet beat (1-trip-let). `x` attacks, `-` holds, `.` rests.
   */
  const gridOf = (drawn: string): GridBeat[] =>
    drawn
      .trim()
      .split(/\s+/)
      .map((group) => {
        if (group.length !== 3 && group.length !== 4) throw new Error(`bad beat "${group}"`);
        return {
          division: group.length as GridDivision,
          cells: [...group].map((c) => (c === 'x' ? 'attack' : c === '-' ? 'hold' : 'rest')) as GridCell[],
        };
      });
  const engrave = (drawn: string, metre: [number, number] = [4, 4]) => {
    const verdict = barsFromGrid(gridOf(drawn), metre);
    if ('error' in verdict) throw new Error(verdict.error);
    return verdict.bars;
  };

  it('writes the plain figures as themselves', () => {
    expect(engrave('x--- x--- x--- x---')).toEqual(['0q 0q 0q 0q']);
    expect(engrave('x--- ---- ---- ----')).toEqual(['0w']);
    expect(engrave('x--- ---- x--- ----')).toEqual(['0h 0h']);
    expect(engrave('x--- --x- x--- --x-')).toEqual(['0q. 0e 0q. 0e']);
    expect(engrave('x-x- x-x- x-x- x-x-')).toEqual(['0e 0e 0e 0e 0e 0e 0e 0e']);
    expect(engrave('x--- x--- x---', [3, 4])).toEqual(['0q 0q 0q']);
    expect(engrave('x--- ---- ----', [3, 4])).toEqual(['0h.']);
  });

  it('writes a triplet beat in its own values, beside straight ones', () => {
    // The player's "superimposed": a triplet sits in one beat while its
    // neighbours stay in semiquavers, exactly as a printed part has it.
    expect(engrave('x--- xxx x--- x---')).toEqual(['0q 0t 0t 0t 0q 0q']);
    expect(engrave('x--- x-x x--- x---')).toEqual(['0q 0T 0t 0q 0q']);
    expect(engrave('x--- xx- x--- x---')).toEqual(['0q 0t 0T 0q 0q']);
    // Three held triplet quavers ARE a crotchet, and engrave as one.
    expect(engrave('x--- x-- x--- x---')).toEqual(['0q 0q 0q 0q']);
  });

  it('ties into and out of a triplet beat at the boundary', () => {
    // A note from beat 1 held into the first triplet third, then two
    // spoken triplet notes: crotchet tied to a triplet quaver.
    expect(engrave('x--- -xx x--- x---')).toEqual(['0q~ 0t 0t 0t 0q 0q']);
    // And both at once: a crotchet tied INTO the triplet's last third,
    // then that attack tied OUT through the whole next beat.
    expect(engrave('x--- --x ---- x---')).toEqual(['0q~ 0T 0t~ 0q 0q']);
  });

  it('writes the crotchet triplet whole — three in the time of two', () => {
    /*
     * The first entry on the shorthand list (the player, 2026-09-01):
     * a pair of triplet beats whose onsets sit on the two-thirds grid
     * engraves as triplet crotchets under one bracket, never as tied
     * triplet quavers — which is how every printed part has it.
     */
    expect(engrave('x-x -x- x--- x---')).toEqual(['0T 0T 0T 0q 0q']);
    // From the second aligned pair too.
    expect(engrave('x--- x--- x-x -x-')).toEqual(['0q 0q 0T 0T 0T']);
    // But an UNALIGNED pair still splits and ties: the figure may not
    // straddle the half-bar, exactly like the minim.
    expect(engrave('x--- x-x -x- x---')).toEqual(['0q 0T 0t~ 0t 0T 0q']);
    // And mixing a triplet crotchet with spoken triplet quavers is fine.
    expect(engrave('x-x xxx x--- x---')).toEqual(['0T 0t 0t 0t 0t 0q 0q']);
  });

  it('refuses no mixture, because the grid cannot draw one', () => {
    // A division-3 beat has three cells; there is no cell for an "e".
    // The type system carries this rule, so the test only documents it.
    expect(gridOf('x--- x-x').length).toBe(2);
  });

  it('ties across the beat rather than writing the syncopation shorthand', () => {
    expect(engrave('x-x- --x- x--- x---')).toEqual(['0e 0e~ 0e 0e 0q 0q']);
  });

  it('ties across the bar line, which the chip editor never could', () => {
    expect(engrave('x--- x--- x--- x--- --x- x--- x--- x---')).toEqual([
      '0q 0q 0q 0q~',
      '0e 0e 0q 0q 0q',
    ]);
  });

  it('permits the named mergers and no others', () => {
    expect(engrave('x--- ---- x--- x---')).toEqual(['0h 0q 0q']);
    expect(engrave('x--- x--- x--- ----')).toEqual(['0q 0q 0h']);
    expect(engrave('x--- x--- ---- x---')).toEqual(['0q 0q~ 0q 0q']);
    expect(engrave('x--- ---- x---', [3, 4])).toEqual(['0h 0q']);
    expect(engrave('x--- x--- ----', [3, 4])).toEqual(['0q 0h']);
    expect(engrave('x--- x--- --x- x---')).toEqual(['0q 0q~ 0e 0e 0q']);
    // The dotted crotchet may not borrow its half from a triplet beat —
    // half of a division-3 beat is not a place a note can end — so a
    // beat-and-a-third writes as a crotchet tied to a triplet quaver.
    expect(engrave('x--- -x- x-x x---')).toEqual(['0q~ 0t 0T 0T 0t 0q']);
  });

  it('writes rests per beat, largest first, never tied', () => {
    expect(engrave('x--- ..x- .... ....')).toEqual(['0q re 0e rh']);
    expect(engrave('..x- ..x- ..x- ..x-')).toEqual(['re 0e re 0e re 0e re 0e']);
    // Triplet rests wear the triplet QUAVER, one per third — never the
    // triplet-crotchet rest, a glyph whose value depends on noticing the
    // bracket (misread as a full beat the day it was emitted).
    expect(engrave('.x. x-- x--- x---')).toEqual(['rt 0t rt 0q 0q 0q']);
    expect(engrave('x.. x--- x--- x---')).toEqual(['0t rt rt 0q 0q 0q']);
    expect(engrave('..x x--- x--- x---')).toEqual(['rt rt 0t 0q 0q 0q']);
    // A fully silent triplet beat is no figure: a plain crotchet rest.
    expect(engrave('x--- ... x--- x---')).toEqual(['0q rq 0q 0q']);
    // A rest never dots: three sixteenths of silence split at the
    // half-beat from either side, where a NOTE keeps the march's own
    // off-beat dotted quaver.
    expect(engrave('x... x--- x--- x---')).toEqual(['0s rs re 0q 0q 0q']);
    expect(engrave('...x x--- x--- x---')).toEqual(['re rs 0s 0q 0q 0q']);
    expect(engrave('x-.. x--- x--- x---')).toEqual(['0e re 0q 0q 0q']);
    expect(engrave('.x-- x--- x--- x---')).toEqual(['rs 0e. 0q 0q 0q']);
    // A silent middle bar is the bar-rest, whatever surrounds it.
    expect(engrave('x--- ---- ---- ---- .... .... .... .... x--- ---- ---- ----')).toEqual([
      '0w', 'rw', '0w',
    ]);
  });

  it('refuses an empty grid and one that opens mid-note, by name', () => {
    const silent = barsFromGrid(gridOf('.... .... .... ....'), [4, 4]);
    expect(silent).toHaveProperty('error');
    const midNote = barsFromGrid(gridOf('---- x--- x--- x---'), [4, 4]);
    expect('error' in midNote && midNote.error).toContain('start with an attack');
  });

  it('round-trips: what the grid engraves reads back as the same grid', () => {
    for (const drawn of [
      'x--- x--- x--- x---',
      'x--- --x- x--- --x-',
      'x-x- --x- x--- x---',
      '..x- ..x- ..x- ..x-',
      'x--- xxx x--- x-x',
      'x--- -xx x--- x---',
      'x--- x--- x--- x--- --x- x--- x--- x---',
      'x-x -x- x--- x---',
    ]) {
      const bars = engrave(drawn);
      expect(gridFromBars(bars), drawn).toEqual(gridOf(drawn));
    }
  });

  it('loads every packaged pattern, triplet grammar included now', () => {
    for (const pattern of RHYTHM_PATTERNS) {
      const grid = gridFromBars(pattern.bars);
      expect(grid, pattern.id).not.toBeNull();
      const back = barsFromGrid(grid!, pattern.metre);
      expect('bars' in back, pattern.id).toBe(true);
    }
    // Mixed WITHIN one beat stays out: a quaver and a triplet third in
    // the same beat is nothing any division can hold.
    expect(gridFromBars(['0e 0t 0t 0q 0q 0q'])).toBeNull();
  });

  it('brackets a figure whole, rests included, even around a lone note', () => {
    /*
     * The player's report (2026-09-01): one painted cell in a triplet
     * beat still needs the bracket with its 3. The figure is the unit —
     * a triplet quaver between triplet rests groups with them, and the
     * bracket the renderers draw spans the whole beat.
     */
    const instrument = instrumentById('eb-bass');
    const exercise = previewExerciseFromBars(['rt 0t rt 0q 0q 0q'], [4, 4], instrument, 'treble');
    expect(exercise.notes[0].duration.tuplet).toBe(3);
    expect(exercise.notes[0].tupletGroup).toBe(0);
    const tupletRests = exercise.rests.filter((rest) => rest.tupletGroup !== undefined);
    expect(tupletRests).toHaveLength(2);
    expect(tupletRests.every((rest) => rest.tupletGroup === 0)).toBe(true);
    // The plain crotchets stay outside any figure.
    expect(exercise.notes.slice(1).every((note) => note.tupletGroup === -1)).toBe(true);
  });

  it('closes a bracket at the figure’s own length, not a notehead count', () => {
    // A triplet crotchet tied from a straight beat, then quaver triplets:
    // the T+t figure closes at one beat, the t-t-t at the next — never a
    // bracket over six that would read as a sextuplet.
    const instrument = instrumentById('eb-bass');
    const exercise = previewExerciseFromBars(['0T 0t 0t 0t 0t 0q 0q'], [4, 4], instrument, 'treble');
    const groups = exercise.notes.map((note) => note.tupletGroup);
    expect(groups).toEqual([0, 0, 1, 1, 1, -1, -1]);
  });

  it('counts every beat, at each beat’s own level — the player’s spec', () => {
    /*
     * His exact case (2026-09-01): only the "e" of beat two painted. The
     * first beat's rest carries "1"; beat two breaks into 2 e & a with
     * the e bright; the two-beat rest goes "3 4" — the count never skips
     * a beat, and dimmed means it continues, through silence or sustain.
     */
    const entries = syllablesForBars(['rq rs 0s re rh'], [4, 4]);
    expect(entries.map((entry) => `${entry.text}${entry.rest ? '·' : ''}`)).toEqual([
      '1·', '2·', 'e', '&·', 'a·', '3·', '4·',
    ]);
    // A held note's tail counts on dimmed, exactly as a rest does.
    expect(
      syllablesForBars(['0w'], [4, 4]).map((entry) => `${entry.text}${entry.rest ? '·' : ''}`),
    ).toEqual(['1', '2·', '3·', '4·']);
    // The crotchet triplet floats against plain dimmed numbers: its
    // off-beat members join neither the level nor the marks.
    expect(
      syllablesForBars(['0T 0T 0T 0q 0q'], [4, 4]).map(
        (entry) => `${entry.text}${entry.rest ? '·' : ''}`,
      ),
    ).toEqual(['1', '2·', '3', '4']);
  });

  it('silences the count on a crotchet triplet’s off-beat members', () => {
    // "trip" and "let" are one beat's subdivisions; a two-thirds note
    // belongs to a figure counted over two beats, so its off-beat
    // members say nothing rather than something false.
    expect(countableSyllable(0, 2 / 3)).toBe('1');
    expect(countableSyllable(2 / 3, 2 / 3)).toBeNull();
    expect(countableSyllable(1 + 1 / 3, 2 / 3)).toBeNull();
    // Quaver-triplet members keep their words.
    expect(countableSyllable(2 / 3, 1 / 3)).toBe('let');
  });

  it('restarts the count at every bar line', () => {
    // Two bars of crotchets read "1 2 3 4 | 1 2 3 4" — never "5 6 7 8",
    // and never silence past the sixth beat of a long pattern.
    const entries = syllablesForBars(['0q 0q 0q 0q', '0q 0q 0q 0q'], [4, 4]);
    expect(entries.map((entry) => entry.text)).toEqual(['1', '2', '3', '4', '1', '2', '3', '4']);
    // Eight bars stay fully counted end to end.
    const eight = syllablesForBars(Array(8).fill('0q 0q 0q 0q'), [4, 4]);
    expect(eight).toHaveLength(32);
    expect(eight.every((entry) => entry.text !== '')).toBe(true);
  });

  it('labels a beat in its own count', () => {
    expect(beatCountLabels(0, 4)).toEqual(['1', 'e', '&', 'a']);
    expect(beatCountLabels(2, 3)).toEqual(['3', 'trip', 'let']);
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

describe('cells — a pattern with notes on it', () => {
  /*
   * The player's structure, 2026-09-03: metre, then patterns, then the
   * cells written on each. A cell is degrees over a snapshot of its
   * pattern's rhythm, so it plays in any key and cannot break when its
   * parent is edited.
   */
  const cell: AuthoredCell = {
    id: 'c1',
    name: 'Walk',
    patternId: 'four-crotchets',
    metre: [4, 4],
    bars: ['0q 0q 0q 0q'],
    notes: [{ degree: 1 }, { degree: 2 }, { degree: 3 }, { degree: 1 }],
  };

  it('becomes a Theme the app can already realise and play', () => {
    const theme = cellAsTheme(cell);
    expect(theme.events).toHaveLength(4);
    expect(theme.events.map((e) => ('degree' in e ? e.degree : 'rest'))).toEqual([1, 2, 3, 1]);
    expect(theme.metres).toEqual([[4, 4]]);
  });

  it('keeps rests in the rhythm and spends notes only on sounded events', () => {
    const withRests: AuthoredCell = {
      ...cell,
      bars: ['0q rq 0q rq'],
      notes: [{ degree: 5 }, { degree: 4, alter: -1 }],
    };
    const theme = cellAsTheme(withRests);
    expect(theme.events.map((e) => ('rest' in e ? 'rest' : e.degree))).toEqual([5, 'rest', 4, 'rest']);
    // The chromatic inflection survives — a flattened fourth in G IS a C flat.
    expect(theme.events[2]).toMatchObject({ degree: 4, alter: -1 });
  });

  it('offers only the keys the instrument can hold, as the themes picker does', () => {
    const instrument = instrumentById('eb-bass');
    const keys = [-3, -1, 0, 2];
    const fits = cellFitsKeys(cell, instrument, 'treble', keys);
    expect(fits.length).toBeGreaterThan(0);
    // A cell that leaps two octaves fits fewer keys than a stepwise one.
    const wide: AuthoredCell = {
      ...cell,
      notes: [{ degree: 1, octave: -1 }, { degree: 1, octave: 1 }, { degree: 1 }, { degree: 1 }],
    };
    expect(cellFitsKeys(wide, instrument, 'treble', keys).length).toBeLessThanOrEqual(fits.length);
  });

  it('stores, resolves and deletes on the player’s own shelf', () => {
    localStorage.clear();
    saveCell(cell);
    expect(loadCells()).toHaveLength(1);
    saveCell({ ...cell, name: 'Walk again' });
    expect(loadCells()).toHaveLength(1);
    expect(loadCells()[0].name).toBe('Walk again');
    deleteCell('c1');
    expect(loadCells()).toEqual([]);
    localStorage.setItem(CELLS_KEY, 'not json');
    expect(loadCells()).toEqual([]);
  });

  it('writes sensible random notes over any rhythm', () => {
    /*
     * The always-available option before a cell is written: a scalewise
     * walk that opens and closes on the tonic, one note per sounded
     * event and none for the rests.
     */
    const notes = randomNotesFor(['0q rq 0e 0e 0q'], 7);
    expect(notes).toHaveLength(4);
    expect(notes[0].degree).toBe(1);
    expect(notes[notes.length - 1].degree).toBe(1);
    /*
     * And it must actually MOVE. The first draft clamped at the scale's
     * edges and opened on the tonic, so from degree 1 every downward
     * step landed back on 1 and the line came out a drone. It now opens
     * on the tonic, rises to the middle and turns at the edges.
     */
    const wide = randomNotesFor(['0e 0e 0e 0e 0e 0e 0e 0e'], 1);
    expect(new Set(wide.map((note) => note.degree)).size).toBeGreaterThan(2);
    for (const note of notes) {
      expect(note.degree).toBeGreaterThanOrEqual(1);
      expect(note.degree).toBeLessThanOrEqual(7);
    }
    // Steps mostly: no leap wider than a third anywhere in the line.
    for (let i = 1; i < notes.length - 1; i++) {
      expect(Math.abs(notes[i].degree - notes[i - 1].degree)).toBeLessThanOrEqual(2);
    }
    // Seeded, so a pattern's random line is stable while it is on screen.
    expect(randomNotesFor(['0q rq 0e 0e 0q'], 7)).toEqual(notes);
  });

  it('spends no note on a tie’s far end, which is not a new note', () => {
    // Six events, none a rest; the fourth is a tie's far end and takes
    // no new note, so five attacks get five degrees.
    const notes = randomNotesFor(['0q 0e 0e~ 0e 0e 0q'], 3);
    expect(notes).toHaveLength(5);
    // And the tie's own head still has one: only the continuation is skipped.
    expect(randomNotesFor(['0h~ 0h'], 3)).toHaveLength(1);
  });
});

describe('the line under an edited rhythm — a note belongs to its onset (2026-09-03)', () => {
  /*
   * The player's repro: seed the line with Add notes, paint another
   * attack, and the new note drew (the preview falls back to the tonic)
   * but could not be dragged, selected or nudged — the line never grew.
   * The line now reconciles by ONSET: a surviving onset keeps its note,
   * a new onset arrives on the tonic, a deleted one takes its note away.
   */
  it('places each attack at its onset, a tie’s far end taking none', () => {
    expect(attackOnsets(['0q 0e~ 0e 0e re 0q'])).toEqual([0, 1, 2, 3]);
  });

  it('measures onsets across bar lines and through triplet beats', () => {
    const onsets = attackOnsets(['0q 0t 0t 0t 0h', '0w']);
    expect(onsets).toHaveLength(6);
    [0, 1, 4 / 3, 5 / 3, 2, 4].forEach((at, i) => expect(onsets[i]).toBeCloseTo(at, 9));
  });

  it('maps every notehead to its attack, tie continuations included', () => {
    // The engraved stave draws a notehead for the tie's far end too, so
    // the hit test must fold it back onto the one attack it prolongs.
    expect(attackIndexByNote(['0q 0e~ 0e 0e re 0q'])).toEqual([0, 1, 1, 2, 3]);
    expect(attackIndexByNote(['0h 0h~', '0w'])).toEqual([0, 1, 1]);
    // Untied, the map is the identity: notehead and attack are one.
    expect(attackIndexByNote(['0q 0q rh'])).toEqual([0, 1]);
  });

  it('keeps a note on its onset when an attack is painted after it', () => {
    // The repro itself: a semiquaver on beat 1, then one painted on beat 2.
    const line = [{ degree: 3, octave: 1 }];
    expect(reconcileNotes(['0s rs re rq rq rq'], line, ['0s rs re 0s rs re rh'])).toEqual([
      { degree: 3, octave: 1 },
      { degree: 1 },
    ]);
  });

  it('an attack painted BEFORE the note does not steal its pitch', () => {
    // Matching by position in the line would hand beat 2's note to the
    // newcomer; matching by onset keeps it where it was written.
    expect(reconcileNotes(['rq 0q rh'], [{ degree: 5 }], ['0q 0q rh'])).toEqual([
      { degree: 1 },
      { degree: 5 },
    ]);
  });

  it('a deleted onset takes its note with it', () => {
    expect(reconcileNotes(['0q 0q rh'], [{ degree: 2 }, { degree: 6 }], ['rq 0q rh'])).toEqual([
      { degree: 6 },
    ]);
  });
});

describe('moving a note by scale steps', () => {
  it('returns home from either octave with no stale octave key', () => {
    /*
     * The jumping drag of 2026-09-03: built with `...(octave ? { octave }
     * : {})` over `...note`, a move landing back in the home octave kept
     * the OLD octave, pinning the note a seventh from the hand for the
     * rest of the gesture. The round trip must land exactly home.
     */
    const up = movedNote({ degree: 1 }, 9);
    expect(up).toEqual({ degree: 3, octave: 1 });
    expect(movedNote(up, -9)).toEqual({ degree: 1 });
    expect(movedNote({ degree: 7, octave: -1 }, 1)).toEqual({ degree: 1 });
  });

  it('drops the alteration — it was written on the note it inflected', () => {
    // Ruled 2026-09-03 with the accidental buttons: a fresh position
    // means the scale's own note; sharpen it again if the page says so.
    expect(movedNote({ degree: 4, alter: -1 }, 7)).toEqual({ degree: 4, octave: 1 });
    expect(movedNote({ degree: 5, alter: 1, octave: -1 }, 1)).toEqual({ degree: 6, octave: -1 });
  });
});

describe('the drag’s step walk', () => {
  /*
   * Hysteresis, not rounding (the player, 2026-09-04, on the phone: the
   * note shifted "when lifting your finger off"): from where the count
   * stands, the raw travel must COMMIT past a boundary before a step is
   * taken, so a fingertip's roll on lift-off moves nothing.
   */
  it('holds until the travel commits past a boundary', () => {
    expect(walkSteps(0.6, 0, 0.65)).toBe(0);
    expect(walkSteps(0.7, 0, 0.65)).toBe(1);
    // And having stepped, it holds the new ground the same way: drifting
    // back to 0.5 is not a return to zero.
    expect(walkSteps(0.5, 1, 0.65)).toBe(1);
    expect(walkSteps(0.3, 1, 0.65)).toBe(0);
  });

  it('walks any distance in one move, both directions', () => {
    // Each step commits from the ground just taken: 4.9 clears 4.65.
    expect(walkSteps(4.9, 0, 0.65)).toBe(5);
    expect(walkSteps(-3.7, 0, 0.65)).toBe(-4);
    expect(walkSteps(-3.7, 2, 0.65)).toBe(-4);
  });

  it('is plain rounding at a commit of a half', () => {
    expect(walkSteps(0.51, 0, 0.5)).toBe(1);
    expect(walkSteps(0.49, 0, 0.5)).toBe(0);
  });
});

describe('the accidental buttons — letter first, then the accidental (2026-09-03)', () => {
  /*
   * A half-step increment was rejected: one press up from G is G sharp
   * OR A flat, and which is right is what the page being copied says.
   * The author states the spelling — the degree names the letter, the
   * button names the accidental — and no rule ever guesses.
   */
  it('toggles: set, replaced by the other, cleared by its own second tap', () => {
    expect(inflectedNote({ degree: 5 }, 1)).toEqual({ degree: 5, alter: 1 });
    expect(inflectedNote({ degree: 5, alter: 1 }, -1)).toEqual({ degree: 5, alter: -1 });
    expect(inflectedNote({ degree: 5, alter: 1 }, 1)).toEqual({ degree: 5 });
    expect(inflectedNote({ degree: 2, octave: 1 }, -1)).toEqual({ degree: 2, octave: 1, alter: -1 });
  });

  it('the stave prints the author’s spelling, never a respelling', () => {
    /*
     * The same sound, two different things to read: degree 5 raised IS
     * G sharp and degree 6 lowered IS A flat, and each prints as the
     * one the author wrote. Left to `spellInKey`, both arrived as one
     * of them.
     */
    const instrument = instrumentById('eb-bass');
    const sharp = previewExerciseFromBars(
      ['0q rq rh'], [4, 4], instrument, 'treble', [{ degree: 5, alter: 1 }],
    );
    expect(sharp.notes[0].pitch).toMatchObject({ letter: 'G', alter: 1 });
    const flat = previewExerciseFromBars(
      ['0q rq rh'], [4, 4], instrument, 'treble', [{ degree: 6, alter: -1 }],
    );
    expect(flat.notes[0].pitch).toMatchObject({ letter: 'A', alter: -1 });
  });

  it('spells with the lens key’s own letters', () => {
    // Written in E flat, degree 6 lowered is C flat — the letter C with
    // a flat, exactly as the copied page prints it.
    const instrument = instrumentById('eb-bass');
    const exercise = previewExerciseFromBars(
      ['0q rq rh'], [4, 4], instrument, 'treble', [{ degree: 6, alter: -1 }], -3,
    );
    expect(exercise.notes[0].pitch).toMatchObject({ letter: 'C', alter: -1 });
  });

  it('never prints a double accidental, falling back to the key’s spelling', () => {
    // Written in B major, degree 7 is A sharp; raised again it would be
    // A double-sharp, which this app never prints — the fallback spells
    // the sound in the key instead.
    const instrument = instrumentById('eb-bass');
    const exercise = previewExerciseFromBars(
      ['0q rq rh'], [4, 4], instrument, 'treble', [{ degree: 7, alter: 1 }], 5,
    );
    expect(Math.abs(exercise.notes[0].pitch.alter)).toBeLessThanOrEqual(1);
  });
});
