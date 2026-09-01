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
    // Triplet rests wear the triplet's own values.
    expect(engrave('.x. x-- x--- x---')).toEqual(['rt 0t rt 0q 0q 0q']);
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
