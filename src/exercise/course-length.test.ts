/**
 * A course level's length, and whether the music carries on past it.
 *
 * Both found in the player's own UAT, 2026-08-29: *"rather randomly (it
 * seems) when playing through the levels of the course the system grays out
 * notes and comes up with the 'continue' button… it seems a bit
 * inconsistent."*
 *
 * It was not random. Every generated exercise carried a horizon past its
 * committed length and offered to continue there — the free-play feature from
 * `endless-play-plan.md`, built weeks before courses existed and never
 * reconsidered against them. What varied was where that end fell, because a
 * level could not say: four cycles for a scale, eight for an arpeggio,
 * sixteen bars for sight-reading, all from `defaultLengthFor`.
 *
 * And it reached further than the eye. The advance rule counts bars *within a
 * run*, so the material's default length was silently deciding how often the
 * course could offer to move the player — unboundedly often for anyone who
 * accepted the offer.
 */

import { describe, expect, it } from 'vitest';
import { readCourse } from './course';

const doc = (base: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: 'c',
  name: 'C',
  blurb: '',
  schemaVersion: 1,
  levels: [
    {
      id: 'l',
      name: 'L',
      base: { difficultyId: 'easy', ...base },
      tempo: { floor: 66, ceiling: 96, step: 6 },
      ...extra,
    },
  ],
});

const read = (value: unknown) => readCourse(value);

describe('a level saying how long its run is', () => {
  it('takes cycles for a drill', () => {
    const course = read(doc({ kind: 'drills', drillId: 'major-scale', cycles: 6 }));
    expect('error' in course).toBe(false);
    if ('error' in course) return;
    expect(course.levels[0].base.cycles).toBe(6);
  });

  it('takes bars for sight-reading', () => {
    const phrases = read(doc({ kind: 'phrases', bars: 24 }));
    expect('error' in phrases ? phrases.error : phrases.levels[0].base.bars).toBe(24);
  });

  it('refuses themeCount, which no longer exists', () => {
    /*
     * Ruled 2026-08-30: "any N" is gone, and a themes level names its tunes.
     * Refused rather than ignored — a document asking for four random tunes
     * must be told, not quietly handed something else.
     */
    const themes = read(doc({ kind: 'themes', themeCount: 2 }));
    expect('error' in themes ? themes.error : '').toContain('themeCount');
  });

  it('is optional, and absent means the material’s own default', () => {
    const course = read(doc({ kind: 'drills', drillId: 'major-scale' }));
    if ('error' in course) throw new Error(course.error);
    expect(course.levels[0].base.cycles).toBeUndefined();
  });

  it('refuses a unit the material does not measure itself in', () => {
    /*
     * Not ignored — refused, and by name. The generator would drop a `cycles`
     * on a sight-reading level while the author went on believing it, which
     * is the shape this whole reader exists to prevent: *a field the app
     * quietly ignores is worse than an absent one*.
     */
    const wrong = read(doc({ kind: 'phrases', cycles: 4 }));
    expect('error' in wrong).toBe(true);
    if (!('error' in wrong)) return;
    expect(wrong.error).toMatch(/cycles/);
    expect(wrong.error).toMatch(/use bars/);
  });

  it('refuses a length that is not a whole number of them', () => {
    for (const bad of [0, -4, 2.5]) {
      const course = read(doc({ kind: 'phrases', bars: bad }));
      expect('error' in course, `bars: ${bad}`).toBe(true);
    }
  });
});

describe('whether the music carries on past the level’s length', () => {
  it('does not, unless the author says so', () => {
    const course = read(doc({ kind: 'drills', drillId: 'major-scale' }));
    if ('error' in course) throw new Error(course.error);
    expect(course.levels[0].endless).toBeUndefined();
  });

  it('does where the author asks for it', () => {
    const course = read(doc({ kind: 'drills', drillId: 'major-scale' }, { endless: true }));
    if ('error' in course) throw new Error(course.error);
    expect(course.levels[0].endless).toBe(true);
  });

  it('treats anything but a true as no, rather than guessing', () => {
    for (const value of ['yes', 1, {}, null]) {
      const course = read(doc({ kind: 'drills' }, { endless: value }));
      if ('error' in course) throw new Error(course.error);
      expect(course.levels[0].endless, JSON.stringify(value)).toBeUndefined();
    }
  });
});
