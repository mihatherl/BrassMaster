// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { loadProgress, saveProgress } from './ladder';
import { DEFAULT_LADDER_ID, ladderById, rungFrom } from '../exercise/ladder';

const LADDER = ladderById(DEFAULT_LADDER_ID);
const FIRST = LADDER.levels[0];
const SECOND = LADDER.levels[1];
const START = SECOND.tempo.floor + SECOND.tempo.step;

const settings = { difficultyId: SECOND.id, tempo: START };

afterEach(() => localStorage.clear());

describe('remembering where the player got to', () => {
  it('opens a first session from the settings they already use', () => {
    const progress = loadProgress('cornet', 'treble', settings);
    expect(progress.rung.ladderId).toBe(DEFAULT_LADDER_ID);
    expect(progress.rung.levelId).toBe(SECOND.id);
    expect(progress.rung.tempo).toBe(START);
    expect(progress.recent).toEqual([]);
  });

  it('keeps a position across sittings', () => {
    saveProgress('cornet', 'treble', {
      rung: rungFrom(DEFAULT_LADDER_ID, SECOND.id, SECOND.tempo.ceiling),
      recent: [0.9],
    });
    const progress = loadProgress('cornet', 'treble', settings);
    expect(progress.rung.tempo).toBe(SECOND.tempo.ceiling);
    expect(progress.recent).toEqual([0.9]);
  });

  it('keeps instruments and clefs apart, because a level is not transferable', () => {
    saveProgress('cornet', 'treble', {
      rung: rungFrom(DEFAULT_LADDER_ID, SECOND.id, SECOND.tempo.ceiling),
      recent: [],
    });
    expect(loadProgress('eb-bass', 'treble', settings).rung.tempo).toBe(START);
    expect(loadProgress('cornet', 'bass', settings).rung.tempo).toBe(START);
  });

  /*
   * A store written by an older version, or edited by hand, must not leave the
   * player on a rung the ladder cannot step off — so what comes in is snapped
   * back onto the grid rather than trusted.
   */
  it('re-snaps a stored rung rather than trusting it', () => {
    const offGrid = SECOND.tempo.floor + 1;
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: SECOND.id, tempo: offGrid },
      recent: [],
    });
    const { tempo } = loadProgress('cornet', 'treble', settings).rung;
    expect(tempo).toBe(SECOND.tempo.floor);
    expect(tempo).not.toBe(offGrid);
  });

  it('clamps a stored tempo from outside the ladder', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: SECOND.id, tempo: 500 },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble', settings).rung.tempo).toBe(SECOND.tempo.ceiling);
  });

  it('falls back to an unknown level being the easiest', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: 'from-the-future', tempo: 90 },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble', settings).rung.levelId).toBe(FIRST.id);
  });

  it('falls back to an unknown ladder being the default', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: 'a-ladder-that-went-away', levelId: SECOND.id, tempo: 90 },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble', settings).rung.ladderId).toBe(DEFAULT_LADDER_ID);
  });

  it('starts again rather than throwing on unreadable history', () => {
    localStorage.setItem('brass-trainer:ladder:cornet:treble', 'not json');
    expect(loadProgress('cornet', 'treble', settings).rung.levelId).toBe(SECOND.id);
  });

  it('ignores rubbish in the evidence rather than letting it reach the verdict', () => {
    localStorage.setItem(
      'brass-trainer:ladder:cornet:treble',
      JSON.stringify({
        rung: { ladderId: DEFAULT_LADDER_ID, levelId: SECOND.id, tempo: 90 },
        recent: [0.9, 'nonsense', null],
      }),
    );
    expect(loadProgress('cornet', 'treble', settings).recent).toEqual([0.9]);
  });
});
