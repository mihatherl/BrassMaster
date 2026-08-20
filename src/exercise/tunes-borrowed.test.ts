/*
 * Guards on the borrowed corpus.
 *
 * Nothing in the app imports `tunes-borrowed`, so nothing else would notice if
 * one of these were malformed — and it is the file that grows every time
 * `tools/midi-to-theme.mts` converts something, which is exactly the file where
 * an unnoticed fault would accumulate. These check the things a machine can
 * check. Whether the result is *music* is settled on the review sheet, by ear,
 * and no test here should pretend otherwise.
 */

import { describe, expect, it } from 'vitest';
import { BORROWED } from './tunes-borrowed';
import { realiseTheme, validateTheme } from './theme';
import { metreFor } from '../domain/metre';
import { INSTRUMENTS, type Clef } from '../domain/instruments';

describe('every borrowed theme', () => {
  it.each(BORROWED.map((theme) => [theme.id, theme] as const))('%s passes the theme rules', (_id, theme) => {
    expect(validateTheme(theme)).toEqual([]);
  });

  it.each(BORROWED.map((theme) => [theme.id, theme] as const))('%s fills its bars', (_id, theme) => {
    const [beatsPerBar, beatUnit] = theme.metres[0];
    const barBeats = (beatsPerBar * 4) / beatUnit;
    const total = theme.events.reduce((sum, event) => sum + event.beats, 0);
    expect(total).toBeCloseTo(theme.bars * barBeats, 9);
  });

  /*
   * Ids reach onto the review sheet and into a verdict file, so a duplicate
   * would silently attach one person's judgement to the wrong tune.
   */
  it('has an id of its own', () => {
    expect(new Set(BORROWED.map((theme) => theme.id)).size).toBe(BORROWED.length);
  });
});

/*
 * The constraint that decides what can be borrowed at all.
 *
 * `realiseTheme` returns null rather than compressing, so a theme wider than an
 * instrument's compass simply never appears for that player. That is a legal
 * outcome, not a fault — but a borrowed theme that fits *nothing* is a theme no
 * one will ever be offered, which is a fault, and the kind that shows up as
 * silence rather than as an error.
 */
describe('what a player can actually be given', () => {
  const KEYS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  it.each(BORROWED.map((theme) => [theme.id, theme] as const))(
    '%s fits some instrument in every key',
    (_id, theme) => {
      const metre = metreFor(theme.metres[0][0], theme.metres[0][1]);
      for (const fifths of KEYS) {
        // Only the clefs an instrument actually reads: asking a tenor horn for
        // bass clef throws rather than returning null, since that is a caller's
        // mistake and not a theme that will not fit.
        const fits = INSTRUMENTS.filter((instrument) =>
          (Object.keys(instrument.transposition) as Clef[]).some(
            (clef) => realiseTheme(theme, { instrument, clef, fifths, metre }) !== null,
          ),
        );
        expect(fits.length, `${theme.id} fits nothing at ${fifths}`).toBeGreaterThan(0);
      }
    },
  );
});
