// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PracticeScreen } from './PracticeScreen';
import { DEFAULT_LADDER_ID, ladderById, DEFAULT_MASTERY } from '../exercise/ladder';
import { loadProgress, saveProgress } from '../storage/ladder';

const LADDER = ladderById(DEFAULT_LADDER_ID);
const FIRST = LADDER.levels[0];
const SECOND = LADDER.levels[1];
const LAST = LADDER.levels[LADDER.levels.length - 1];

const fallback = { difficultyId: FIRST.difficultyId, tempo: FIRST.tempo.floor };

function show(overrides: Partial<Parameters<typeof PracticeScreen>[0]> = {}) {
  const props = {
    instrumentId: 'cornet',
    clef: 'treble' as const,
    fallback,
    pendingAccuracy: null,
    onAccuracyApplied: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<PracticeScreen {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the practice screen', () => {
  it('opens where the player already practises, naming the level and the tempo', () => {
    show();
    expect(screen.getByRole('heading', { name: FIRST.name })).toBeTruthy();
    expect(screen.getByText(String(FIRST.tempo.floor))).toBeTruthy();
  });

  /*
   * The seam that keeps the ladder out of `App`: what crosses is a difficulty
   * and a tempo, never a rung. If this ever hands over something ladder-shaped,
   * the free build is one careless import away from carrying teacher mode.
   */
  it('hands the run up as plain settings, not as a rung', () => {
    // Deliberately a rung *above* the band's floor: the two were the same
    // number in the first version of this test, which could not tell the rung's
    // tempo from the level's and passed while the wrong one was sent.
    const tempo = FIRST.tempo.floor + FIRST.tempo.step * 2;
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: FIRST.id, tempo },
      recent: [],
    });
    const { onStart } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith({ difficultyId: FIRST.difficultyId, tempo });
  });

  it('shows a slot for every run the bar asks for, filled or not', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: FIRST.id, tempo: FIRST.tempo.floor },
      recent: [0.91],
    });
    show();
    expect(screen.getByText('91%')).toBeTruthy();
    // The rest are owed, and saying so is the point — a screen that showed only
    // what had been played would not say how many were left.
    expect(screen.getAllByText('–')).toHaveLength(DEFAULT_MASTERY.runsToJudge - 1);
  });

  it('folds a finished run in, moves the player, and remembers it', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: FIRST.id, tempo: FIRST.tempo.floor },
      recent: [1],
    });
    const { onAccuracyApplied } = show({ pendingAccuracy: 1 });

    expect(onAccuracyApplied).toHaveBeenCalled();
    const stored = loadProgress('cornet', 'treble', fallback);
    expect(stored.rung.tempo).toBe(FIRST.tempo.floor + FIRST.tempo.step);
    expect(stored.recent).toEqual([]);
  });

  it('applies a run once, not on every render', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: FIRST.id, tempo: FIRST.tempo.floor },
      recent: [1],
    });
    show({ pendingAccuracy: 1 });
    expect(loadProgress('cornet', 'treble', fallback).rung.tempo).toBe(
      FIRST.tempo.floor + FIRST.tempo.step,
    );
  });

  it('offers only the levels above as somewhere to aim, and keeps the choice', () => {
    show();
    expect(screen.queryByRole('button', { name: FIRST.name })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: SECOND.name }));

    expect(screen.getByText(new RegExp(SECOND.name))).toBeTruthy();
    const stored = loadProgress('cornet', 'treble', fallback);
    expect(stored.goal?.levelId).toBe(SECOND.id);
    // Recorded so a bar can measure from where the aiming started.
    expect(stored.goalSetAt?.tempo).toBe(FIRST.tempo.floor);
  });

  it('lets a goal be cleared again', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: SECOND.name }));
    fireEvent.click(screen.getByRole('button', { name: /clear it/i }));
    expect(loadProgress('cornet', 'treble', fallback).goal).toBeUndefined();
  });

  it('says there is nothing above the top of the ladder rather than inventing a step', () => {
    saveProgress('cornet', 'treble', {
      rung: { ladderId: DEFAULT_LADDER_ID, levelId: LAST.id, tempo: LAST.tempo.ceiling },
      recent: [],
    });
    show();
    expect(screen.getByText(/nothing above this one/i)).toBeTruthy();
  });

  it('goes back when asked', () => {
    const { onBack } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
