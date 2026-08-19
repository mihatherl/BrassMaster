// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { loadProgress, saveProgress } from './ladder';
import { rungFrom, TEMPO_CEILING, TEMPO_FLOOR } from '../exercise/ladder';
import { DIFFICULTIES } from '../exercise/difficulty';

const EASIEST = DIFFICULTIES[0].id;
const SECOND = DIFFICULTIES[1].id;

const settings = { difficultyId: SECOND, tempo: 90 };

afterEach(() => localStorage.clear());

describe('remembering where the player got to', () => {
  it('opens a first session from the settings they already use', () => {
    const progress = loadProgress('cornet', 'treble', settings);
    expect(progress.rung.difficultyId).toBe(SECOND);
    expect(progress.rung.tempo).toBe(90);
    expect(progress.recent).toEqual([]);
  });

  it('keeps a position across sittings', () => {
    saveProgress('cornet', 'treble', { rung: rungFrom(SECOND, 108), recent: [0.9] });
    const progress = loadProgress('cornet', 'treble', settings);
    expect(progress.rung.tempo).toBe(108);
    expect(progress.recent).toEqual([0.9]);
  });

  it('keeps instruments and clefs apart, because a level is not transferable', () => {
    saveProgress('cornet', 'treble', { rung: rungFrom(SECOND, 108), recent: [] });
    expect(loadProgress('eb-bass', 'treble', settings).rung.tempo).toBe(90);
    expect(loadProgress('cornet', 'bass', settings).rung.tempo).toBe(90);
  });

  /*
   * A store written by an older version, or edited by hand, must not leave the
   * player on a rung the ladder cannot step off — so what comes in is snapped
   * back onto the grid rather than trusted.
   */
  it('re-snaps a stored rung rather than trusting it', () => {
    saveProgress('cornet', 'treble', {
      rung: { difficultyId: SECOND, tempo: 95 },
      recent: [],
    });
    const { tempo } = loadProgress('cornet', 'treble', settings).rung;
    expect(tempo).toBe(rungFrom(SECOND, 95).tempo);
    expect(tempo).not.toBe(95);
  });

  it('clamps a stored tempo from outside the ladder', () => {
    saveProgress('cornet', 'treble', { rung: { difficultyId: SECOND, tempo: 500 }, recent: [] });
    expect(loadProgress('cornet', 'treble', settings).rung.tempo).toBe(TEMPO_CEILING);
  });

  it('falls back to an unknown difficulty being the easiest', () => {
    saveProgress('cornet', 'treble', {
      rung: { difficultyId: 'from-the-future', tempo: TEMPO_FLOOR },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble', settings).rung.difficultyId).toBe(EASIEST);
  });

  it('starts again rather than throwing on unreadable history', () => {
    localStorage.setItem('brass-trainer:ladder:cornet:treble', 'not json');
    expect(loadProgress('cornet', 'treble', settings).rung.difficultyId).toBe(SECOND);
  });

  it('ignores rubbish in the evidence rather than letting it reach the verdict', () => {
    localStorage.setItem(
      'brass-trainer:ladder:cornet:treble',
      JSON.stringify({ rung: { difficultyId: SECOND, tempo: 90 }, recent: [0.9, 'nonsense', null] }),
    );
    expect(loadProgress('cornet', 'treble', settings).recent).toEqual([0.9]);
  });
});
