/**
 * The three rules the key gate rests on.
 *
 * All added 2026-08-29, for a fault found while authoring a course: a level
 * may name no key, and until then nothing in the structured flow could answer
 * it. The key grid lives on the free-play home screen, so "the player's own
 * key" meant "whatever you last set in the other mode" — the author could not
 * tell what they were specifying and the player could not tell what they were
 * in.
 */

import { describe, expect, it } from 'vitest';
import { courseKeyOf, isMinorRun, keyAnswerChanged, type CourseRun } from './course-run';
import { DEFAULT_SETTINGS, type Settings } from '../storage/settings';

const run = (over: Partial<CourseRun> = {}): CourseRun => ({
  kind: 'drills',
  difficultyId: 'easy',
  tempo: 80,
  levelId: 'a-level',
  ...over,
});

const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });

describe('which key a course run is in', () => {
  it('takes the key the level named, over everything else', () => {
    const at = courseKeyOf(run({ fifths: -1 }), settings({ courseFifths: 3, fifths: 2 }));
    expect(at).toBe(-1);
  });

  it('takes the player’s answer when the level named none', () => {
    expect(courseKeyOf(run(), settings({ courseFifths: 3, fifths: 2 }))).toBe(3);
  });

  it('falls back to their free-play key the first time they are asked', () => {
    // Not a guess: it is the key they were last reading in, which is a better
    // opening bid than the app's own default, and the gate lets them change it.
    const first = settings({ fifths: 2 });
    expect(first.courseFifths).toBeUndefined();
    expect(courseKeyOf(run(), first)).toBe(2);
  });

  it('never lets a level’s key be overridden by a stale answer', () => {
    /*
     * The ordering that matters most. A player answers the key on an open
     * level, then reaches one the author pinned to E flat; if the remembered
     * answer won, the course's own instruction would be silently ignored.
     */
    expect(courseKeyOf(run({ fifths: -3 }), settings({ courseFifths: 4 }))).toBe(-3);
  });
});

describe('whether a run’s keys are named as minors', () => {
  it('is true for the minor drills, and false for the major ones', () => {
    expect(isMinorRun(run({ drillId: 'harmonic-minor-scale' }))).toBe(true);
    expect(isMinorRun(run({ drillId: 'melodic-minor-scale' }))).toBe(true);
    expect(isMinorRun(run({ drillId: 'relative-minor-arpeggio' }))).toBe(true);
    expect(isMinorRun(run({ drillId: 'major-scale' }))).toBe(false);
    expect(isMinorRun(run({ drillId: 'tonic-arpeggio' }))).toBe(false);
  });

  it('is false where the level names no drill, which means the major scale', () => {
    expect(isMinorRun(run())).toBe(false);
  });

  it('is false for material that has no mode at all', () => {
    // A phrase or a theme is written in whatever it is written in; naming its
    // signature as a minor would be an invention.
    expect(isMinorRun(run({ kind: 'phrases', drillId: 'harmonic-minor-scale' }))).toBe(false);
    expect(isMinorRun(run({ kind: 'themes', drillId: 'harmonic-minor-scale' }))).toBe(false);
  });

  it('does not change the key itself, only what it is called', () => {
    /*
     * The carry, stated as a property. The player's answer survives a major
     * level into a minor one untranslated — ruled 2026-08-29 over carrying the
     * tonic — precisely because the mode lives here and the key lives there.
     */
    const chose = settings({ courseFifths: 0 });
    expect(courseKeyOf(run({ drillId: 'major-scale' }), chose)).toBe(0);
    expect(courseKeyOf(run({ drillId: 'harmonic-minor-scale' }), chose)).toBe(0);
  });
});

describe('when answering the key must regenerate the music', () => {
  it('regenerates when an open level’s key actually changed', () => {
    expect(keyAnswerChanged(run(), settings({ courseFifths: 0 }), settings({ courseFifths: -3 }))).toBe(
      true,
    );
  });

  it('regenerates on the first answer, where there was none before', () => {
    expect(keyAnswerChanged(run(), settings(), settings({ courseFifths: -3 }))).toBe(true);
  });

  it('does not regenerate when the level named its own key', () => {
    // The control is locked on such a level, so this is belt and braces — but
    // a rebuild here would throw away music the course chose.
    expect(
      keyAnswerChanged(run({ fifths: -1 }), settings({ courseFifths: 0 }), settings({ courseFifths: -3 })),
    ).toBe(false);
  });

  it('does not regenerate when some other gate setting moved', () => {
    /*
     * The gate writes every edit through the same handler, so this fires on a
     * tempo nudge and a metronome toggle too. Rebuilding then would hand the
     * player different music for changing the click volume mid-gate.
     */
    const before = settings({ courseFifths: -3, tempo: 80 });
    expect(keyAnswerChanged(run(), before, settings({ courseFifths: -3, tempo: 92 }))).toBe(false);
    expect(
      keyAnswerChanged(run(), before, settings({ courseFifths: -3, metronomeEnabled: false })),
    ).toBe(false);
  });
});
