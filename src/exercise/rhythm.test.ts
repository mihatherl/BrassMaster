import { describe, expect, it } from 'vitest';
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
