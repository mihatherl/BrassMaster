// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { CoursePlayControls, clearVetoes } from './CoursePlayControls';
import { advanceFor, COURSES, prescribedRun, startOf, stepForward } from '../exercise/course';
import { loadProgress, saveProgress } from '../storage/course';

const COURSE = COURSES[0];
const ADVANCE = advanceFor(startOf(COURSE));

/** Enough clean bars to satisfy the default rule outright. */
const CLEAN = Array.from({ length: ADVANCE.afterBars }, () => 1);

function show(overrides: Partial<Parameters<typeof CoursePlayControls>[0]> = {}) {
  const props = {
    instrumentId: 'cornet',
    clef: 'treble' as const,
    barAccuracies: [] as readonly number[],
    playing: true,
    hold: vi.fn(),
    resume: vi.fn(),
    onRun: vi.fn(),
    ...overrides,
  };
  render(<CoursePlayControls {...props} />);
  return props;
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  localStorage.clear();
  clearVetoes();
  vi.useRealTimers();
});

describe('the course on the play screen', () => {
  it('shows the position and the level, and the buttons both ways', () => {
    show();
    expect(screen.getByText('1.1')).toBeTruthy();
    expect(screen.getByText(new RegExp(COURSE.levels[0].name))).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Forward' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('restarts at the new step on a press, and remembers it', () => {
    const { onRun } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    const next = stepForward(startOf(COURSE))!;
    expect(onRun).toHaveBeenCalledWith(prescribedRun(next));
    expect(loadProgress('cornet', 'treble').position).toEqual(next);
  });

  /*
   * The revised ruling of 2026-08-27, end to end: the rule met, the music
   * held, the countdown run out, the step taken — and none of it while the
   * player was still owed their three seconds.
   */
  it('holds the music and counts down when the author rule is met, then steps', () => {
    const { hold, onRun } = show({ barAccuracies: CLEAN });
    expect(hold).toHaveBeenCalled();
    expect(screen.getByText(/moving to/i)).toBeTruthy();
    expect(onRun).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(3200));
    expect(onRun).toHaveBeenCalledWith(prescribedRun(stepForward(startOf(COURSE))!));
  });

  it('does not offer what it cannot deliver: no countdown at the top of the course', () => {
    const last = COURSE.levels[COURSE.levels.length - 1];
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: last.id, tempo: last.tempo.ceiling },
      recent: [],
    });
    const { hold } = show({ barAccuracies: CLEAN });
    expect(hold).not.toHaveBeenCalled();
  });

  it('needs the whole window clean, not a good average', () => {
    // One weak bar inside the window: an 80% mean would pass, the rule must not.
    const nearly = [...CLEAN.slice(0, -1), 0.5];
    const { hold } = show({ barAccuracies: nearly });
    expect(hold).not.toHaveBeenCalled();
  });

  it('Stay here resumes where the pause fell, and the veto holds for the step', () => {
    const { resume, onRun } = show({ barAccuracies: CLEAN });
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(resume).toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(5000));
    expect(onRun).not.toHaveBeenCalled();
    // More clean bars at the same step: still vetoed, still nothing moves.
    cleanup();
    const again = show({ barAccuracies: [...CLEAN, 1, 1] });
    expect(again.hold).not.toHaveBeenCalled();
  });

  it('the veto is about the step, not the sitting: moving on re-arms the rule', () => {
    const first = show({ barAccuracies: CLEAN });
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(first.onRun).toHaveBeenCalled();
    cleanup();
    // A fresh passage at the NEW step, rule met: the countdown returns.
    const second = show({ barAccuracies: CLEAN });
    expect(second.hold).toHaveBeenCalled();
  });

  it('watches only live play', () => {
    const { hold } = show({ barAccuracies: CLEAN, playing: false });
    expect(hold).not.toHaveBeenCalled();
  });
});
