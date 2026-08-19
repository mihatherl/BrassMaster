// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProgressScreen } from './ProgressScreen';
import { saveSkills } from '../storage/skills';
import { saveSessions } from '../storage/sessions';
import type { SkillKey } from '../exercise/attributes';

const T0 = Date.UTC(2026, 7, 19, 19, 0, 0);

function withSkills(entries: Array<[SkillKey, number, number]>) {
  saveSkills('cornet', 'treble', new Map(entries.map(([k, a, c]) => [k, { attempts: a, correct: c }])));
}

function show() {
  const onBack = vi.fn();
  render(<ProgressScreen instrumentId="cornet" clef="treble" onBack={onBack} />);
  return { onBack };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the progress report', () => {
  it('says there is nothing yet rather than drawing an empty report', () => {
    show();
    expect(screen.getByText(/nothing recorded yet/i)).toBeTruthy();
  });

  /*
   * A weakness drawn from three notes is noise with a percentage on it, and a
   * player told to work on their dotted quavers because of one bad bar would
   * rightly stop believing the next thing the app said.
   */
  it('will not call something weak on too little evidence', () => {
    withSkills([['rhythm:eighth.', 2, 0]]);
    saveSessions('cornet', 'treble', [{ startedAt: T0, runs: [{ at: T0, accuracy: 0.5, tempo: 90 }] }]);
    show();
    expect(screen.queryByText(/dotted quavers/i)).toBeNull();
    expect(screen.getByText(/not enough yet/i)).toBeTruthy();
  });

  it('names a weakness in words a player would use, once there is evidence', () => {
    withSkills([
      ['rhythm:eighth.', 20, 8],
      ['rhythm:quarter', 20, 19],
    ]);
    show();
    expect(screen.getByText('dotted quavers')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('ranks the weakest of a dimension first', () => {
    withSkills([
      ['key:0', 20, 19],
      ['key:-4', 20, 6],
      ['key:2', 20, 12],
    ]);
    show();
    const names = screen.getAllByText(/major$/).map((node) => node.textContent);
    expect(names[0]).toMatch(/A.?[b♭] major|A flat major/i);
  });

  it('keeps dimensions apart, so a key is never ranked against a rhythm', () => {
    withSkills([
      ['key:0', 20, 19],
      ['rhythm:eighth.', 20, 2],
    ]);
    show();
    // Both appear, but under their own headings rather than in one list.
    expect(screen.getByRole('heading', { name: 'Keys' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rhythms' })).toBeTruthy();
  });

  it('counts the sittings and the runs in them', () => {
    saveSessions('cornet', 'treble', [
      { startedAt: T0, runs: [{ at: T0, accuracy: 0.9, tempo: 90 }] },
      {
        startedAt: T0 + 86_400_000,
        runs: [
          { at: T0 + 86_400_000, accuracy: 0.8, tempo: 90 },
          { at: T0 + 86_400_001, accuracy: 1, tempo: 90 },
        ],
      },
    ]);
    show();
    expect(screen.getByText(/3 runs across 2 sittings/i)).toBeTruthy();
  });

  it('shows the newest sitting first, since that is the one being read about', () => {
    saveSessions('cornet', 'treble', [
      { startedAt: T0, runs: [{ at: T0, accuracy: 0.5, tempo: 90 }] },
      { startedAt: T0 + 86_400_000, runs: [{ at: T0 + 86_400_000, accuracy: 1, tempo: 90 }] },
    ]);
    show();
    const values = screen.getAllByText(/^\d+%$/).map((node) => node.textContent);
    expect(values[0]).toBe('100%');
  });

  it('goes back when asked', () => {
    const { onBack } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
